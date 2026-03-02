// server/src/controllers/videoController.ts
import { Request, Response } from 'express';
import { Video } from '../models/Video.js';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { UserResponse } from '../models/UserResponse.js';
import { Course } from '../models/Course.js';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { pipeline } from '@xenova/transformers';
import { User } from '../models/User.js';
import { Worker } from 'worker_threads';
import { pathToFileURL } from 'url';
import { transformSync } from 'esbuild';
import { CourseTest } from '../models/CourseTest.js';
import { addSystemLog } from './adminController.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let semanticExtractor: any = null;

// Функция вычисления смыслового сходства текста
const calculateSemanticSimilarity = async (studentAnswer: string, correctAnswer: string) => {
    if (!studentAnswer || !correctAnswer) return 0;
    
    try {
        if (!semanticExtractor) {
            console.log('[AI] Загрузка модели семантического анализа (это займет немного времени при первом запуске)...');
            // Используем мультиязычную модель, которая отлично понимает русский
            semanticExtractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { quantized: true });
        }

        // 1. Получаем векторы (эмбеддинги) для обоих текстов
        const out1 = await semanticExtractor(studentAnswer.toLowerCase(), { pooling: 'mean', normalize: true });
        const out2 = await semanticExtractor(correctAnswer.toLowerCase(), { pooling: 'mean', normalize: true });

        // 2. Считаем косинусное сходство (dot product)
        let similarity = 0;
        for (let i = 0; i < out1.data.length; i++) {
            similarity += out1.data[i] * out2.data[i];
        }
        
        return similarity;
    } catch (e) {
        console.error('[AI] Ошибка семантического анализа:', e);
        // Фолбэк: если ИИ упал, проверяем просто вхождение ключевых слов
        return studentAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) ? 1 : 0;
    }
};

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}
const formatVttTime = (seconds: number) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substr(11, 12);
};

const createVttFile = (chunks: any[], outputPath: string) => {
    let vttContent = "WEBVTT\n\n";
    chunks.forEach((chunk) => {
        if (chunk.timestamp) {
            const start = formatVttTime(chunk.timestamp[0]);
            const end = formatVttTime(chunk.timestamp[1]);
            const text = chunk.text.trim();
            vttContent += `${start} --> ${end}\n${text}\n\n`;
        }
    });
    fs.writeFileSync(outputPath, vttContent);
};

const extractAudio = (videoPath: string, audioPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .toFormat('wav')
            .audioFrequency(16000)
            .audioChannels(1)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .save(audioPath);
    });
};
export const createCourse = async (req: Request, res: Response) => {
    try {
        const { title, description, instructor } = req.body;
        const course = await Course.create({ title, description, instructor });
        addSystemLog(`Создан новый курс: "${title}"`, 'success');
        res.status(201).json(course);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка создания курса', error: e });
    }
};

// --- ОБНОВЛЕНИЕ КУРСА ---
export const updateCourse = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { title, description, instructor } = req.body;
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        if (title) course.title = title;
        if (description !== undefined) course.description = description;
        if (instructor) course.instructor = instructor;

        await course.save();
        res.json({ success: true, course });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка обновления курса' });
    }
};

// --- УДАЛЕНИЕ КУРСА ---
export const deleteCourse = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        // Чтобы база не выдала ошибку "Foreign Key Constraint", сначала находим все видео курса
        const videos = await Video.findAll({ where: { courseId } });
        const videoIds = videos.map((v: any) => v.id);

        // Если в курсе есть видео, сносим весь их "мусор" (ответы, метки, прогресс)
        if (videoIds.length > 0) {
            await UserResponse.destroy({ where: { videoId: videoIds } });
            await UserVideoProgress.destroy({ where: { videoId: videoIds } });
            await InteractiveEvent.destroy({ where: { videoId: videoIds } });
            await Video.destroy({ where: { courseId } });
        }

        // Теперь безопасно удаляем сам курс
        await course.destroy();
        addSystemLog(`Удален курс (ID: ${courseId})`, 'error');
        res.json({ success: true, message: 'Курс удален' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка удаления курса' });
    }
};

export const getAllCourses = async (req: Request, res: Response) => {
    try {
        const courses = await Course.findAll({ include: [Video] });
        res.json(courses);
    } catch (e) {
        res.status(500).json(e);
    }
};
export const createVideo = async (req: Request, res: Response) => {
  try {
    const { title, url, subtitles, hideResults, courseId, orderIndex } = req.body;
    
    let finalOrderIndex = orderIndex;

    // 🤖 УМНАЯ ЛОГИКА: Если фронт не прислал orderIndex, находим самый большой индекс в курсе
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
        // Ищем максимальный индекс среди видео
        const maxVideoIndex = await Video.max('orderIndex', { where: { courseId: Number(courseId) } }) as number || 0;
        // Ищем максимальный индекс среди тестов
        const maxTestIndex = await CourseTest.max('orderIndex', { where: { courseId: Number(courseId) } }) as number || 0;
        
        // Берем самое большое число и делаем +1
        finalOrderIndex = Math.max(maxVideoIndex, maxTestIndex) + 1;
    }

    const video = await Video.create({ 
        title,
        url,
        subtitles, 
        hideResults: hideResults || false, 
        courseId: Number(courseId),
        orderIndex: finalOrderIndex // 👈 Железобетонно сохраняем в базу!
    });
    addSystemLog(`В курс добавлен урок: "${title}"`, 'success');
    res.status(201).json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при сохранении видео', error });
  }
};
export const getVideosByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const videos = await Video.findAll({
      where: { courseId },
      order: [['orderIndex', 'ASC'], ['createdAt', 'ASC']], 
      include: [InteractiveEvent]
    });
    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении списка', error });
  }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const { time, type, question, options, correctAnswer, isStrict, weight, rewindTo, explanation, aiThreshold } = req.body;

        const event = await InteractiveEvent.create({
            videoId: Number(videoId),
            time,
            type,
            question,
            options,
            correctAnswer,
            isStrict: isStrict || false,
            weight: weight || 1,
            rewindTo: rewindTo || null,
            explanation: explanation || null,
            aiThreshold: aiThreshold || 50
        });
        addSystemLog(`В видео (ID: ${videoId}) добавлен новый интерактивный элемент`, 'info');
        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при создании события', error });
    }
};
export const saveProgress = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { videoId, eventId, answer } = req.body;

        const event = await InteractiveEvent.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Событие не найдено' });
        }

        let isCorrect = false;
        let similarityValue: number | null = null;
        // --- ЛОГИКА ПРОВЕРКИ ---
        
        if (event.type === 'info') {
            isCorrect = true; // Инфо-панель всегда засчитывается
        } 
        else if (event.type === 'single_choice' || event.type === 'question') {
            // Поддержка и старых (строки) и новых (объекты) вариантов
            if (event.options && typeof event.options[0] === 'object') {
                const correctOpt = event.options.find((o: any) => o.isCorrect);
                isCorrect = correctOpt ? correctOpt.text === answer : false;
            } else {
                isCorrect = event.correctAnswer === answer;
            }
        } 
        else if (event.type === 'multiple_choice') {
            // Ожидаем, что answer пришел в виде строки: "Вариант 1, Вариант 2"
            const correctOpts = event.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
            const studentAnsArr = typeof answer === 'string' ? answer.split(', ') : [];
            
            isCorrect = studentAnsArr.length === correctOpts.length && 
                        studentAnsArr.every((v: string) => correctOpts.includes(v));
        } 
        else if (event.type === 'free_text') {
            // --- AI ПРОВЕРКА ОТКРЫТОГО ТЕКСТА ---
            const threshold = (event.aiThreshold || 50) / 100; // Порог: 70% смыслового совпадения
            const similarity = await calculateSemanticSimilarity(answer, event.correctAnswer || '');
            similarityValue = Math.round(similarity * 100);
            console.log(`\n[AI ОЦЕНКА]`);
            console.log(`Студент написал: "${answer}"`);
            console.log(`Эталон препода: "${event.correctAnswer}"`);
            console.log(`[AI ОЦЕНКА] Сходство: ${similarityValue}%`);
            console.log(`Вердикт: ${similarity >= threshold ? '✅ ЗАЧТЕНО' : '❌ ОШИБКА'}\n`);
            
            isCorrect = similarity >= threshold;
        }

        // Сохраняем или обновляем ответ в базе данных
        let responseRecord = await UserResponse.findOne({ where: { userId, videoId, eventId } });

        if (responseRecord) {
            responseRecord.answer = answer;
            responseRecord.isCorrect = isCorrect;
            responseRecord.similarity = similarityValue;
            await responseRecord.save();
        } else {
            responseRecord = await UserResponse.create({
                userId,
                videoId,
                eventId,
                answer,
                isCorrect,
                similarity: similarityValue
            });
        }

        res.json({ success: true, isCorrect, responseRecord });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сохранения ответа', error });
    }
};
export const getVideoStats = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;

        const stats = await UserResponse.findAll({
            where: { videoId },
            include: [
                InteractiveEvent,
                { model: User, attributes: ['id', 'firstName', 'lastName'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка получения статистики', error });
    }
};

// --- ОБНОВЛЕНИЕ НАСТРОЕК ВИДЕО (ДОБАВЛЕНЫ ПОПЫТКИ) ---
export const updateVideoSettings = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const { hideResults, maxAttempts, title } = req.body; // <--- Добавили title
        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });
        
        if (title !== undefined) video.title = title; // <--- Если прислали title, меняем
        if (hideResults !== undefined) video.hideResults = hideResults;
        if (maxAttempts !== undefined) video.maxAttempts = Number(maxAttempts); 
        
        await video.save();
        res.json(video);
    } catch (error) {
        res.status(500).json(error);
    }
};

// --- УДАЛЕНИЕ ВИДЕО ---
export const deleteVideo = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        // Сначала удаляем все связанные данные, чтобы база не ругалась
        await UserResponse.destroy({ where: { videoId } });
        await UserVideoProgress.destroy({ where: { videoId } });
        await InteractiveEvent.destroy({ where: { videoId } });
        
        // Теперь удаляем само видео
        await video.destroy();
        addSystemLog(`Удалено видео (ID: ${videoId})`, 'warning');
        res.json({ success: true, message: 'Видео успешно удалено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при удалении видео' });
    }
};

// --- СБРОС ПРОГРЕССА (ТЕПЕРЬ ТРАТИТ ПОПЫТКУ) ---
export const resetVideoProgress = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const userId = (req as any).user?.id || req.query.userId;

        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        const progress = await UserVideoProgress.findOne({
            where: { videoId: Number(videoId), userId: Number(userId) }
        });

        // Проверяем попытки (0 = бесконечно)
        if (video.maxAttempts > 0) {
            const used = progress?.attemptsUsed || 0;
            if (used >= video.maxAttempts) {
                return res.status(403).json({ message: 'Лимит попыток исчерпан!' });
            }
        }

        // Увеличиваем счетчик потраченных попыток
        if (progress) {
            progress.attemptsUsed += 1;
            await progress.save();
        } else {
            await UserVideoProgress.create({
                userId: Number(userId),
                videoId: Number(videoId),
                attemptsUsed: 1
            });
        }

        // Удаляем ответы
        await UserResponse.destroy({
            where: { videoId: Number(videoId), userId: Number(userId) }
        });
        addSystemLog(`Сброшен прогресс видео (ID: ${videoId}) для пользователя (ID: ${userId})`, 'warning');
        res.json({ success: true, attemptsUsed: progress ? progress.attemptsUsed : 1 });
    } catch (e) {
        res.status(500).json(e);
    }
};

export const saveVideoProgress = async (req: Request, res: Response) => {
    try {
        const { videoId, lastTime, isWatched } = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Авторизуйтесь для сохранения прогресса' });
        }
        const [progress, created] = await UserVideoProgress.findOrCreate({
            where: { userId, videoId: Number(videoId) },
            defaults: { lastTime, isWatched }
        });
        if (!created) {
            progress.lastTime = lastTime;
            if (isWatched) progress.isWatched = true; 
            await progress.save();
        }

        res.json({ success: true, progress });
    } catch (error) {
        console.error("Ошибка сохранения прогресса:", error);
        res.status(500).json({ message: 'Ошибка сервера', error });
    }
};
export const getVideoProgress = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) return res.json({ lastTime: 0, isWatched: false, responses: [] });

        // 1. Получаем время и попытки
        const progress = await UserVideoProgress.findOne({
            where: { userId, videoId: Number(videoId) }
        });

        // 2. Получаем ВСЕ ответы студента для этого видео вместе с текстом вопросов
        const responses = await UserResponse.findAll({
            where: { userId, videoId: Number(videoId) },
            include: [InteractiveEvent] // Подтягиваем инфу о вопросе (вес, текст и т.д.)
        });

        res.json({ 
            lastTime: progress?.lastTime || 0, 
            isWatched: progress?.isWatched || false,
            attemptsUsed: progress?.attemptsUsed || 0,
            responses: responses || [] // Отдаем историю на фронт!
        });
    } catch (error) {
        console.error("Ошибка getVideoProgress:", error);
        res.status(500).json({ message: 'Ошибка получения прогресса', error });
    }
};

export const generateSubtitles = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findByPk(videoId);

        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        const fileName = video.url.split('/').pop();
        if (!fileName) return res.status(400).json({ message: 'Некорректный URL' });
        const BASE_URL = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
        const uploadsDir = path.join(__dirname, '../../uploads'); 
        const videoPath = path.join(uploadsDir, fileName);
        const tempAudioPath = path.join(uploadsDir, `temp-${Date.now()}.wav`);
        const vttFileName = `sub-${Date.now()}.vtt`;
        const vttPath = path.join(uploadsDir, vttFileName);
        
        if (!fs.existsSync(videoPath)) {
             return res.status(404).json({ message: 'Файл видео не найден на диске' });
        }

        const workerPath = path.resolve(__dirname, '../subtitleWorker.ts');
        const tsCode = fs.readFileSync(workerPath, 'utf8');
        // ВАЖНО: Превращаем путь в URL (file:///opt/VKR/...), иначе import внутри воркера упадет
        const workerUrl = pathToFileURL(workerPath).href;

        console.log(`[DEBUG] Запускаем воркер через враппер. URL: ${workerUrl}`);

        // 2. СОЗДАЕМ ВОРКЕР
        // Мы используем eval: true, чтобы скормить ему JS-код напрямую.
        // Этот код сначала грузит tsx/esm, а потом динамически импортирует твой TS файл.
        const { code: jsCode } = transformSync(tsCode, {
            loader: 'ts',
            target: 'es2022', // Используем современный JS
            format: 'cjs',    // Важно: формат модулей
        });
        addSystemLog(`Запущена AI-генерация субтитров для видео (ID: ${videoId})`, 'info');
        res.status(202).json({ success: true, message: 'Генерация запущена в фоновом режиме!' });

        // Запускаем воркер, скармливая ему уже готовый JS код
        const worker = new Worker(jsCode, {
            eval: true,
            workerData: { videoPath, tempAudioPath, vttPath }
        });
        // 3. СЛУШАЕМ ОТВЕТЫ ОТ ВОРКЕРА
        worker.on('message', async (msg) => {
            if (msg.status === 'done') {
                console.log(`[AI WORKER] Готово! Субтитры для видео ${videoId} сгенерированы.`);
                const vttUrl = `${BASE_URL}/uploads/${vttFileName}`;
                
                const newSubtitle = { lang: 'ru-auto', label: 'Авто (AI)', src: vttUrl };
                
                // 1. Извлекаем текущие субтитры
                let currentSubs = video.subtitles ? JSON.parse(JSON.stringify(video.subtitles)) : [];
                
                // 2. ИСПРАВЛЕНИЕ: Фильтруем массив, удаляя старые авто-субтитры, чтобы избежать дублей ключей
                currentSubs = currentSubs.filter((s: any) => s.lang !== 'ru-auto');
                
                // 3. Теперь безопасно добавляем новые
                currentSubs.push(newSubtitle);
                
                video.subtitles = currentSubs;
                addSystemLog(`AI-субтитры для видео (ID: ${videoId}) успешно сгенерированы!`, 'success');
                await video.save();
                
            } else if (msg.status === 'error') {
                console.error(`[AI WORKER] Ошибка для видео ${videoId}:`, msg.error);
            } else {
                console.log(`[AI WORKER - Видео ${videoId}]: ${msg.status}`);
            }
        });
        worker.on('error', (err) => {
            console.error(`[AI WORKER FATAL ERROR] Видео ${videoId}:`, err);
        });

        // Очистка ресурсов при завершении
        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`[AI WORKER] Поток завершился с кодом ошибки: ${code}`);
            }
            console.log(`[AI WORKER] Поток для видео ${videoId} завершил работу.`);
        });
    } catch (error) {
        console.error("[AI] Ошибка старта:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Ошибка запуска генерации', error });
        }
    }
};

export const getAllVideos = async (req: Request, res: Response) => {
    try {
        const videos = await Video.findAll({ order: [['createdAt', 'DESC']], include: [InteractiveEvent] });
        res.json(videos);
    } catch (error) {
        res.status(500).json(error);
    }
};

// --- РЕДАКТИРОВАНИЕ СОБЫТИЯ ---
export const updateEvent = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { time, type, question, options, correctAnswer, isStrict, weight, rewindTo, explanation, aiThreshold } = req.body;

        const event = await InteractiveEvent.findByPk(eventId);
        if (!event) return res.status(404).json({ message: 'Событие не найдено' });

        await event.update({
            time, type, question, options, correctAnswer,
            isStrict, weight, rewindTo, explanation, aiThreshold
        });

        res.json({ success: true, event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при обновлении события', error });
    }
};

// --- УДАЛЕНИЕ СОБЫТИЯ ---
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const event = await InteractiveEvent.findByPk(eventId);
        if (!event) return res.status(404).json({ message: 'Событие не найдено' });
        await UserResponse.destroy({ where: { eventId } });
        await event.destroy();
        addSystemLog(`Удален интерактивный элемент (ID: ${eventId})`, 'warning');
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при удалении события', error });
    }
};

// --- СОХРАНЕНИЕ ПОРЯДКА ВИДЕО (DRAG & DROP) ---
export const reorderVideos = async (req: Request, res: Response) => {
    try {
        const { orderedIds } = req.body; // Ожидаем массив ID: [5, 2, 8, 1]

        // Проходимся по всем переданным ID и обновляем им индекс
        await Promise.all(
            orderedIds.map((id: number, index: number) => 
                Video.update({ orderIndex: index }, { where: { id } })
            )
        );

        res.json({ success: true, message: 'Порядок успешно сохранен' });
    } catch (error) {
        console.error("Ошибка при сортировке:", error);
        res.status(500).json({ message: 'Ошибка сохранения порядка', error });
    }
};

// Получить ответы юзера для конкретного видео (для компонента TestCards)
export const getUserVideoAnswers = async (req: Request, res: Response) => {
    try {
        const { videoId, userId } = req.params;
        const responses = await UserResponse.findAll({
            where: { videoId, userId },
            include: [{ model: InteractiveEvent }]
        });
        
        // Отдаем в том формате, который ждет TestCards (sessionResults)
        res.json({ sessionResults: responses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при загрузке прогресса ответов' });
    }
};

// --- СОХРАНЕНИЕ ПОРЯДКА ВИДЕО И ТЕСТОВ ---
export const updateCourseContentOrder = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { items } = req.body; // Ожидаем массив [{ id: 1, type: 'video', orderIndex: 0 }, ...]

        // Пробегаемся по массиву и обновляем индексы
        for (const item of items) {
            if (item.type === 'video') {
                await Video.update(
                    { orderIndex: item.orderIndex }, 
                    { where: { id: item.id, courseId: Number(courseId) } }
                );
            } else if (item.type === 'test') {
                await CourseTest.update(
                    { orderIndex: item.orderIndex }, 
                    { where: { id: item.id, courseId: Number(courseId) } }
                );
            }
        }

        res.json({ success: true, message: 'Порядок успешно сохранен' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при сохранении порядка контента' });
    }
};
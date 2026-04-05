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
import { sendNotification } from './notificationController.js';
import fsPromises from 'fs/promises';
import { TestQuestion } from '../models/TestQuestion.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { CourseCollaborator } from '../models/CourseCollaborator.js';
import bcrypt from 'bcrypt';
import sequelize from '../config/db.js';
import { createChannel } from '../utils/sseHub.js';

// ─── SSE-каналы ───────────────────────────────────────────────────────────────
// videoId → клиенты, смотрящие события конкретного видео
const videoEventsSse = createChannel<number>();
// userId студента → студент получает обновление своей заявки
const enrollStudentSse = createChannel<number>();
// courseId → препод/владелец курса видит новые заявки
const enrollCourseSse = createChannel<number>();
// courseId → преподаватель получает уведомление о завершении генерации субтитров
const subtitleDoneSse = createChannel<number>();

// ─── SSE-хендлеры (монтируются в роутах) ─────────────────────────────────────

export const sseVideoEvents = (req: Request, res: Response) =>
    videoEventsSse.subscribe(Number(req.params.videoId), req, res);

export const sseEnrollStudentEvents = (req: Request, res: Response) =>
    enrollStudentSse.subscribe((req as any).user.id, req, res);

export const sseEnrollCourseEvents = (req: Request, res: Response) =>
    enrollCourseSse.subscribe(Number(req.params.courseId), req, res);

export const sseSubtitleEvents = (req: Request, res: Response) =>
    subtitleDoneSse.subscribe(Number(req.params.courseId), req, res);
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
        const { title, description, instructor, coverImage } = req.body;
        
        // 🔥 ДОСТАЕМ ID ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ИЗ ТОКЕНА
        const ownerId = (req as any).user?.id; 

        const course = await Course.create({ 
            title, 
            description, 
            instructor, 
            coverImage,
            ownerId // 🔥 ТЕПЕРЬ СОЗДАТЕЛЬ НАВСЕГДА ПРИВЯЗАН К КУРСУ
        });
        
        addSystemLog(`Создан новый курс: "${title}"`, 'success');
        res.status(201).json(course);
    } catch (e) {
        console.error('Ошибка создания курса:', e);
        res.status(500).json({ message: 'Ошибка создания курса' });
    }
};

// --- ОБНОВЛЕНИЕ КУРСА ---
export const updateCourse = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { title, description, instructor, enrollmentType, allowTeachersFreeAccess } = req.body;
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        if (title) course.title = title;
        if (description !== undefined) course.description = description;
        if (instructor) course.instructor = instructor;
        if (enrollmentType !== undefined) course.enrollmentType = enrollmentType;
        
        // 🔥 ПРОБИВАЕМ БАГ ТАЙПСКРИПТА: Пишем напрямую в DataValues
        if (allowTeachersFreeAccess !== undefined) {
            course.setDataValue('allowTeachersFreeAccess', allowTeachersFreeAccess); 
        }

        await course.save();
        res.json({ success: true, course });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка обновления курса' });
    }
};

// --- УДАЛЕНИЕ КУРСА СО ВСЕМИ ФАЙЛАМИ ---
export const deleteCourse = async (req: Request, res: Response) => {
    try {
        const courseRole = (req as any).courseRole;
        if (courseRole === 'editor') {
            return res.status(403).json({ message: 'У вас нет прав на удаление всего курса. Это может сделать только Владелец.' });
        }

        const { courseId } = req.params;
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        const videos = await Video.findAll({ where: { courseId } });
        const videoIds = videos.map((v: any) => v.id);
        const uploadsDir = path.join(__dirname, '../../uploads');

        // Собираем пути файлов заранее (удалим после успешной транзакции)
        const filePaths: string[] = [];
        for (const video of videos) {
            if (video.url) {
                const fileName = video.url.split('/').pop();
                if (fileName) filePaths.push(path.join(uploadsDir, fileName));
            }
            if (video.subtitles && Array.isArray(video.subtitles)) {
                for (const sub of video.subtitles) {
                    if (sub.src) {
                        const subName = sub.src.split('/').pop();
                        if (subName) filePaths.push(path.join(uploadsDir, subName));
                    }
                }
            }
            if (video.qualityUrls && Array.isArray(video.qualityUrls)) {
                for (const q of video.qualityUrls as any[]) {
                    if (q.url) {
                        const qName = q.url.split('/').pop();
                        if (qName) filePaths.push(path.join(uploadsDir, qName));
                    }
                }
            }
        }

        // Каскадное удаление из БД в транзакции
        await sequelize.transaction(async (tx) => {
            if (videoIds.length > 0) {
                await UserResponse.destroy({ where: { videoId: videoIds }, transaction: tx });
                await UserVideoProgress.destroy({ where: { videoId: videoIds }, transaction: tx });
                await InteractiveEvent.destroy({ where: { videoId: videoIds }, transaction: tx });
                await Video.destroy({ where: { courseId }, transaction: tx });
            }

            const tests = await CourseTest.findAll({ where: { courseId }, transaction: tx });
            const testIds = tests.map((t: any) => t.id);
            if (testIds.length > 0) {
                await TestQuestion.destroy({ where: { testId: testIds }, transaction: tx });
                await UserTestResult.destroy({ where: { testId: testIds }, transaction: tx });
                await CourseTest.destroy({ where: { courseId }, transaction: tx });
            }

            await course.destroy({ transaction: tx });
        });

        // Удаляем файлы с диска только после успешного коммита транзакции
        for (const filePath of filePaths) {
            try { await fsPromises.unlink(filePath); } catch (e) { console.warn('Не удалось удалить файл:', filePath); }
        }
        addSystemLog(`Полностью удален курс (ID: ${courseId}) и все связанные файлы`, 'error');
        res.json({ success: true, message: 'Курс и файлы удалены' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка удаления курса' });
    }
};

export const getAllCourses = async (req: Request, res: Response) => {
    try {
        const courses = await Course.findAll({
            include: [Video],
            order: [['createdAt', 'ASC']],
            limit: 500,
        });
        res.json(courses);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка получения курсов' });
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
        orderIndex: finalOrderIndex
    });
    addSystemLog(`В курс добавлен урок: "${title}"`, 'success');
    res.status(201).json(video);

    // Авто-транскодирование: если загружен локальный файл — запускаем в фоне
    if (url && url.startsWith('/uploads/') && !url.endsWith('.vtt')) {
        transcodeVideoInBackground(video.id, url, Number(courseId));
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при сохранении видео' });
  }
};
export const getVideosByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userRole = (req as any).user?.role;
    const isStudent = userRole === 'student';

    const videos = await Video.findAll({
      where: { courseId },
      order: [['orderIndex', 'ASC'], ['createdAt', 'ASC']],
      include: [InteractiveEvent]
    });

    if (isStudent) {
      const now = new Date();
      const visible = videos.filter(v => {
        if (v.isHidden) return false;
        if (v.unlockDate && new Date(v.unlockDate) > now) return false;
        return true;
      });
      return res.json(visible);
    }

    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении списка' });
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
        videoEventsSse.broadcast(Number(videoId), { type: 'events_updated', videoId: Number(videoId) });
        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при создании события' });
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
        res.status(500).json({ message: 'Ошибка сохранения ответа' });
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
        res.status(500).json({ message: 'Ошибка получения статистики' });
    }
};

// --- ОБНОВЛЕНИЕ НАСТРОЕК ВИДЕО (ДОБАВЛЕНЫ ПОПЫТКИ) ---
export const updateVideoSettings = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const { hideResults, maxAttempts, title, isHidden, unlockDate } = req.body;
        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        if (title !== undefined) video.title = title;
        if (hideResults !== undefined) video.hideResults = hideResults;
        if (maxAttempts !== undefined) video.maxAttempts = Number(maxAttempts);
        if (isHidden !== undefined) video.isHidden = isHidden;
        if (unlockDate !== undefined) video.unlockDate = unlockDate ? new Date(unlockDate) : null;
        
        await video.save();
        res.json(video);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка обновления настроек видео' });
    }
};

// --- УДАЛЕНИЕ ОТДЕЛЬНОГО ВИДЕО СО ВСЕМИ ФАЙЛАМИ ---
export const deleteVideo = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        const uploadsDir = path.join(__dirname, '../../uploads');

        // 🔥 1. Удаляем основной видеофайл
        if (video.url) {
            const fileName = video.url.split('/').pop();
            if (fileName) {
                const filePath = path.join(uploadsDir, fileName);
                try { await fsPromises.unlink(filePath); } catch (e) {}
            }
        }

        // 🔥 2. Удаляем субтитры
        if (video.subtitles && Array.isArray(video.subtitles)) {
            for (const sub of video.subtitles) {
                if (sub.src) {
                    const subName = sub.src.split('/').pop();
                    if (subName) {
                        const subPath = path.join(uploadsDir, subName);
                        try { await fsPromises.unlink(subPath); } catch (e) {}
                    }
                }
            }
        }

        // 🔥 3. Удаляем транскодированные версии качества
        if (video.qualityUrls && Array.isArray(video.qualityUrls)) {
            for (const q of video.qualityUrls) {
                if (q.url) {
                    const qName = q.url.split('/').pop();
                    if (qName) {
                        try { await fsPromises.unlink(path.join(uploadsDir, qName)); } catch (e) {}
                    }
                }
            }
        }

        // 4. Удаляем связи из БД
        await UserResponse.destroy({ where: { videoId } });
        await UserVideoProgress.destroy({ where: { videoId } });
        await InteractiveEvent.destroy({ where: { videoId } });

        await video.destroy();
        addSystemLog(`Удалено видео (ID: ${videoId}) и его файлы`, 'warning');
        res.json({ success: true, message: 'Видео и файлы успешно удалены' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при удалении видео' });
    }
};

// --- СБРОС ПРОГРЕССА (ТЕПЕРЬ ТРАТИТ ПОПЫТКУ) ---
export const resetVideoProgress = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const userId = (req as any).user.id;

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
        res.status(500).json({ message: 'Ошибка сервера' });
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
        res.status(500).json({ message: 'Ошибка получения прогресса' });
    }
};

export const generateSubtitles = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findByPk(videoId);

        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        const fileName = video.url.split('/').pop();
        if (!fileName) return res.status(400).json({ message: 'Некорректный URL' });
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
                const vttUrl = `/uploads/${vttFileName}`;

                const newSubtitle = { lang: 'ru-auto', label: 'Авто (AI)', src: vttUrl };

                // 1. Извлекаем текущие субтитры
                let currentSubs = video.subtitles ? JSON.parse(JSON.stringify(video.subtitles)) : [];

                // 2. Фильтруем массив, удаляя старые авто-субтитры, чтобы избежать дублей
                currentSubs = currentSubs.filter((s: any) => s.lang !== 'ru-auto');

                // 3. Добавляем новые
                currentSubs.push(newSubtitle);

                video.subtitles = currentSubs;
                addSystemLog(`AI-субтитры для видео (ID: ${videoId}) успешно сгенерированы!`, 'success');
                await video.save();
                subtitleDoneSse.broadcast(video.courseId, {
                    type: 'subtitle_done',
                    videoId: Number(videoId),
                    videoTitle: video.title,
                    subtitleUrl: vttUrl,
                });

            } else if (msg.status === 'error') {
                console.error(`[AI WORKER] Ошибка для видео ${videoId}:`, msg.error);
                subtitleDoneSse.broadcast(video.courseId, {
                    type: 'subtitle_error',
                    videoId: Number(videoId),
                });
            } else {
                // Промежуточный прогресс
                subtitleDoneSse.broadcast(video.courseId, {
                    type: 'subtitle_progress',
                    videoId: Number(videoId),
                    label: msg.status,
                    progress: msg.progress ?? 0,
                });
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
        });
    } catch (error) {
        console.error("[AI] Ошибка старта:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Ошибка запуска генерации' });
        }
    }
};

// --- ФОНОВОЕ ТРАНСКОДИРОВАНИЕ — Worker Thread (не блокирует основной поток) ---
const transcodeVideoInBackground = (videoId: number, videoUrl: string, courseId: number): void => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filename = videoUrl.split('/').pop();
    if (!filename) return;

    const inputPath = path.join(uploadsDir, filename);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);

    const workerPath = path.resolve(__dirname, '../transcoderWorker.ts');
    if (!fs.existsSync(workerPath)) {
        console.error('[Transcode] transcoderWorker.ts не найден');
        return;
    }
    let jsCode: string;
    try {
        const tsCode = fs.readFileSync(workerPath, 'utf8');
        jsCode = transformSync(tsCode, { loader: 'ts', target: 'es2022', format: 'cjs' }).code;
    } catch (err) {
        console.error('[Transcode] Ошибка компиляции worker:', err);
        return;
    }

    addSystemLog(`Запущено авто-транскодирование для видео (ID: ${videoId})`, 'info');

    const worker = new Worker(jsCode, {
        eval: true,
        workerData: { inputPath, uploadsDir, base },
    });

    worker.on('message', async (msg) => {
        if (msg.status === 'done') {
            if (msg.results && msg.results.length > 0) {
                await Video.update({ qualityUrls: msg.results }, { where: { id: videoId } });
                const video = await Video.findByPk(videoId);
                subtitleDoneSse.broadcast(courseId, {
                    type: 'quality_ready',
                    videoId,
                    videoTitle: video?.title || '',
                });
                addSystemLog(`Транскодирование видео (ID: ${videoId}) завершено — ${msg.results.length} версии`, 'success');
            }
        } else if (msg.status === 'warn') {
            console.warn('[Transcode]', msg.message);
        } else {
        }
    });
    worker.on('error', err => console.error('[Transcode Worker Error]', err));
    worker.on('exit', code => { if (code !== 0) console.error(`[Transcode Worker] завершился с кодом ${code}`); });
};

export const transcodeVideo = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });

        if (!video.url.startsWith('/uploads/')) {
            return res.status(400).json({ message: 'Транскодирование доступно только для локальных файлов' });
        }

        res.status(202).json({ message: 'Транскодирование запущено' });
        // Запускаем в фоне (не await)
        transcodeVideoInBackground(video.id, video.url, video.courseId);
    } catch (e) {
        console.error('[Transcode]', e);
        if (!res.headersSent) res.status(500).json({ message: 'Ошибка запуска транскодирования' });
    }
};

export const getAllVideos = async (req: Request, res: Response) => {
    try {
        const videos = await Video.findAll({ order: [['createdAt', 'DESC']], include: [InteractiveEvent], limit: 1000 });
        res.json(videos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка получения видео' });
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

        videoEventsSse.broadcast(event.videoId, { type: 'events_updated', videoId: event.videoId });
        res.json({ success: true, event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при обновлении события' });
    }
};

// --- УДАЛЕНИЕ СОБЫТИЯ ---
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const event = await InteractiveEvent.findByPk(eventId);
        if (!event) return res.status(404).json({ message: 'Событие не найдено' });
        const { videoId } = event;
        await UserResponse.destroy({ where: { eventId } });
        await event.destroy();
        addSystemLog(`Удален интерактивный элемент (ID: ${eventId})`, 'warning');
        videoEventsSse.broadcast(videoId, { type: 'events_updated', videoId });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при удалении события' });
    }
};

// --- СОХРАНЕНИЕ ПОРЯДКА ВИДЕО (DRAG & DROP) ---
export const reorderVideos = async (req: Request, res: Response) => {
    try {
        const { orderedIds } = req.body; // Ожидаем массив ID: [5, 2, 8, 1]
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ message: 'orderedIds должен быть непустым массивом' });
        }

        // Проверяем что все видео принадлежат курсу, где у пользователя есть права
        if (userRole !== 'admin') {
            const videos = await Video.findAll({ where: { id: orderedIds } });
            const courseIds = [...new Set(videos.map((v: any) => v.courseId))];

            for (const courseId of courseIds) {
                const course = await Course.findByPk(courseId);
                if (!course) continue;
                const isOwner = course.ownerId === userId;
                const isCollab = isOwner ? false : !!(await CourseCollaborator.findOne({ where: { courseId, userId } }));
                if (!isOwner && !isCollab) {
                    return res.status(403).json({ message: 'Нет прав на изменение порядка в этом курсе' });
                }
            }
        }

        await Promise.all(
            orderedIds.map((id: number, index: number) =>
                Video.update({ orderIndex: index }, { where: { id } })
            )
        );

        res.json({ success: true, message: 'Порядок успешно сохранен' });
    } catch (error) {
        console.error("Ошибка при сортировке:", error);
        res.status(500).json({ message: 'Ошибка сохранения порядка' });
    }
};

// Получить ответы юзера для конкретного видео (для компонента TestCards)
export const getUserVideoAnswers = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        // userId берём исключительно из JWT-токена — не из URL-параметра,
        // чтобы исключить IDOR: один студент не может читать ответы другого.
        const userId = (req as any).user.id;
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


// --- ПОЛУЧИТЬ КОМАНДУ КУРСА ---
export const getCourseCollaborators = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        // 1. Проверяем базовые права (Админ или Владелец)
        let hasAccess = role === 'admin' || course.ownerId === Number(userId);

        // 2. Если не админ/владелец, проверяем, есть ли юзер в списке соавторов
        if (!hasAccess) {
            const isCollab = await CourseCollaborator.findOne({ 
                where: { courseId, userId } 
            });
            if (isCollab) hasAccess = true;
        }

        // 3. 🔥 ВЕЖЛИВЫЙ ОТКАЗ: Если прав нет, просто отдаем пустой список (вместо 403 Forbidden)
        if (!hasAccess) {
            return res.status(200).json([]);
        }

        // 4. Если права есть — отдаем реальную команду
        const collaborators = await CourseCollaborator.findAll({
            where: { courseId },
            include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'role'] }]
        });
        
        res.json(collaborators);
    } catch (e) {
        console.error('Ошибка получения команды курса:', e);
        res.status(500).json({ message: 'Ошибка получения команды курса' });
    }
};

// --- ПРИГЛАСИТЬ В КОМАНДУ ---
export const addCourseCollaborator = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { email } = req.body; // Ищем по email

        const userToAdd = await User.findOne({ where: { email } });
        if (!userToAdd) {
            return res.status(404).json({ message: 'Пользователь с таким Email не найден в системе' });
        }

        const course = await Course.findByPk(courseId);
        if (course?.ownerId === userToAdd.id) {
            return res.status(400).json({ message: 'Этот пользователь уже является владельцем курса' });
        }

        const [collaborator, created] = await CourseCollaborator.findOrCreate({
            where: { courseId, userId: userToAdd.id },
            defaults: { role: 'editor' }
        });

        if (!created) {
            return res.status(400).json({ message: 'Пользователь уже в команде курса' });
        }

        addSystemLog(`Пользователь ${email} добавлен в команду курса (ID: ${courseId})`, 'info');
        res.status(201).json(collaborator);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка добавления соавтора' });
    }
};

// --- УДАЛИТЬ ИЗ КОМАНДЫ ---
export const removeCourseCollaborator = async (req: Request, res: Response) => {
    try {
        const { courseId, userId } = req.params;
        await CourseCollaborator.destroy({
            where: { courseId, userId }
        });
        res.json({ success: true, message: 'Пользователь исключен из команды' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка при удалении соавтора' });
    }
};

// --- ПЕРЕДАЧА ПРАВ НА КУРС (СМЕНА ВЛАДЕЛЬЦА) ---
export const transferCourseOwnership = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { newOwnerId } = req.body;
        const currentUserId = (req as any).user?.id;

        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        // 1. Проверяем права (только владелец или админ)
        if (course.ownerId !== currentUserId && (req as any).user?.role !== 'admin') {
            return res.status(403).json({ message: 'Только владелец может передать права на курс' });
        }

        // 2. Ищем нового владельца в БД, чтобы взять его Имя и Фамилию
        const newOwner = await User.findByPk(newOwnerId);
        if (!newOwner) return res.status(404).json({ message: 'Новый владелец не найден' });

        // 3. Делаем старого владельца соавтором (чтобы не потерял доступ)
        if (course.ownerId) {
            await CourseCollaborator.findOrCreate({
                where: { courseId, userId: course.ownerId },
                defaults: { role: 'editor' }
            });
        }

        // 4. Удаляем нового владельца из соавторов (он теперь главный)
        await CourseCollaborator.destroy({
            where: { courseId, userId: newOwnerId }
        });

        // 5. 🔥 ОБНОВЛЯЕМ ВЛАДЕЛЬЦА И ФИО ПРЕПОДАВАТЕЛЯ
        course.ownerId = newOwnerId;
        course.instructor = `${newOwner.firstName} ${newOwner.lastName}`; 
        await course.save();

        addSystemLog(`Права на курс (ID: ${courseId}) переданы пользователю ${newOwner.email}`, 'warning');
        res.json({ success: true, message: 'Права успешно переданы', course });
    } catch (e) {
        console.error('Ошибка передачи прав:', e);
        res.status(500).json({ message: 'Ошибка при передаче прав' });
    }
};

// ==========================================
// СИСТЕМА ЗАЧИСЛЕНИЙ (ENROLLMENTS)
// ==========================================

// 1. Студент: Подать заявку на курс
export const applyForCourse = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const userId = (req as any).user.id;
        
        // 🔥 ФИКС: Берем свежую роль
        const dbUser = await User.findByPk(userId, { attributes: ['role'] });
        const realRole = dbUser ? dbUser.role : (req as any).user.role;

        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        const existing = await CourseEnrollment.findOne({ where: { courseId, userId } });
        
        const isFreeForTeachers = course.getDataValue('allowTeachersFreeAccess') === true;

        if (existing) {
            if (existing.status === 'pending' && realRole === 'teacher' && isFreeForTeachers) {
                existing.status = 'approved';
                await existing.save();
                return res.json({ success: true, status: 'approved' });
            }
            return res.status(400).json({ message: 'Заявка уже существует', status: existing.status });
        }
        
        let status = 'pending';
        
        if (course.enrollmentType === 'open') {
            status = 'approved';
        } else if (course.enrollmentType === 'request') {
            if (realRole === 'teacher' && isFreeForTeachers) {
                status = 'approved';
            }
        }

        const enrollment = await CourseEnrollment.create({ courseId, userId, status });
        
        addSystemLog(`Пользователь (ID: ${userId}) подал заявку на курс (ID: ${courseId}). Статус: ${status}`, 'info');

        // Уведомляем владельца курса о новой заявке (если статус pending)
        if (status === 'pending') {
            const applicant = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
            enrollCourseSse.broadcast(Number(courseId), {
                type: 'new_request',
                courseId: Number(courseId),
                enrollmentId: enrollment.id,
                userId,
                userName: applicant ? `${applicant.firstName} ${applicant.lastName}` : `ID:${userId}`,
            });
        }

        res.json({ success: true, status: enrollment.status });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при подаче заявки' });
    }
};

// Дашборд: все записи текущего студента с данными курса
export const getMyEnrollments = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const enrollments = await CourseEnrollment.findAll({
            where: { userId },
            include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'instructor', 'description', 'coverImage'] }],
        });
        res.json(enrollments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка' });
    }
};

// Дашборд: прогресс по всем курсам студента (процент)
export const getMyProgressAll = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const enrollments = await CourseEnrollment.findAll({ where: { userId, status: 'approved' }, attributes: ['courseId'] });
        const courseIds = enrollments.map((e: any) => e.courseId);

        const result = await Promise.all(courseIds.map(async (courseId: number) => {
            const [videos, tests, completedVideos, completedTests] = await Promise.all([
                Video.count({ where: { courseId, isHidden: false } }),
                CourseTest.count({ where: { courseId } }),
                UserVideoProgress.count({ where: { userId, courseId, completed: true } }),
                (await import('../models/UserTestResult.js')).UserTestResult.count({
                    where: { userId },
                    include: [{ model: CourseTest, as: 'test', where: { courseId }, required: true }] as any,
                }).catch(() => 0),
            ]);
            const total = videos + tests;
            const done  = completedVideos + completedTests;
            return { courseId, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
        }));

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка' });
    }
};

// 2. Студент/Фронт: Проверить статус зачисления на конкретный курс
export const checkEnrollmentStatus = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const userId = (req as any).user.id;
        
        // 🔥 ФИКС: Не верим токену! Берем свежую роль прямо из БД
        const dbUser = await User.findByPk(userId, { attributes: ['role'] });
        const realRole = dbUser ? dbUser.role : (req as any).user.role;

        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });
        
        // 1. Владельца и админа пускаем всегда
        if (course.ownerId === userId || realRole === 'admin') {
            return res.json({ status: 'approved', isOwnerOrAdmin: true });
        }

        // 2. VIP-ПРОХОД ДЛЯ ПРЕПОДАВАТЕЛЕЙ
        const isFreeForTeachers = course.getDataValue('allowTeachersFreeAccess') === true;
        if (realRole === 'teacher' && isFreeForTeachers) {
            return res.json({ status: 'approved', isAutoGranted: true });
        }

        // 3. Для обычных студентов ищем реальную заявку в БД
        const enrollment = await CourseEnrollment.findOne({ where: { courseId, userId } });
        
        if (!enrollment) return res.json({ status: null });

        res.json({ status: enrollment.status });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка проверки статуса' });
    }
};

// 3. Преподаватель: Получить список всех заявок на курс
export const getCourseEnrollments = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;

        const enrollments = await CourseEnrollment.findAll({
            where: { courseId },
            include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'] }],
            order: [['createdAt', 'DESC']],
            limit: 1000,
        });

        res.json(enrollments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения заявок' });
    }
};

// 4. Преподаватель: Одобрить или отклонить заявку
export const updateEnrollmentStatus = async (req: Request, res: Response) => {
    try {
        const { enrollmentId } = req.params;
        const { status } = req.body; // 'approved' или 'rejected'
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        const enrollment = await CourseEnrollment.findByPk(enrollmentId);
        if (!enrollment) return res.status(404).json({ message: 'Заявка не найдена' });

        // 🔥 СЕКЬЮРИТИ-ЧЕК: Находим курс, к которому относится заявка
        const course = await Course.findByPk(enrollment.courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        // 🔥 Проверяем права: пускаем админа или владельца курса
        let hasAccess = userRole === 'admin' || course.ownerId === userId;

        // Если не владелец, проверяем, вдруг он соавтор
        if (!hasAccess) {
            const isCollab = await CourseCollaborator.findOne({ 
                where: { courseId: course.id, userId } 
            });
            if (isCollab) hasAccess = true;
        }

        // Если прав нет — бьем по рукам
        if (!hasAccess) {
            addSystemLog(`Попытка взлома! Юзер ID:${userId} пытался одобрить чужую заявку ID:${enrollmentId}`, 'error');
            return res.status(403).json({ message: 'У вас нет прав управлять заявками этого курса' });
        }

        // Если всё ок — сохраняем статус
        enrollment.status = status;
        await enrollment.save();

        // Уведомляем студента о решении по его заявке
        enrollStudentSse.broadcast(enrollment.userId, {
            type: 'enrollment_updated',
            courseId: enrollment.courseId,
            status,
        });

        // Пуш-уведомление в базу + SSE
        if (status === 'approved') {
            sendNotification(
                enrollment.userId,
                'enrollment_approved',
                'Заявка одобрена',
                `Вас записали на курс «${course.title}»`,
                `/course/${course.id}`,
            );
        } else if (status === 'rejected') {
            sendNotification(
                enrollment.userId,
                'enrollment_rejected',
                'Заявка отклонена',
                `Ваша заявка на курс «${course.title}» была отклонена`,
            );
        }

        res.json({ success: true, message: `Заявка ${status === 'approved' ? 'одобрена' : 'отклонена'}`, enrollment });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка обновления статуса' });
    }
};

export const getCourseAnalytics = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findByPk(courseId, {
            include: [
                { model: Video, attributes: ['id', 'title', 'orderIndex'] },
                { model: CourseTest, attributes: ['id', 'title', 'orderIndex', 'passingScore'] }
            ]
        });

        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        const enrollments = await CourseEnrollment.findAll({
            where: { courseId, status: 'approved' },
            include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'lastLogin'] }],
            limit: 2000,
        });

        const students = enrollments.map(e => e.user);
        const studentIds = students.map(s => s.id);
        const totalStudents = students.length;

        if (totalStudents === 0) {
            return res.json({ totalStudents: 0, globalAvgProgress: 0, globalAvgScore: 0, funnel: [], studentsProgress: [] });
        }

        // 🔥 ВОРОНКА: Видео (Двойная метрика)
        const videoStats = await Promise.all(course.videos.map(async (video) => {
            const startedCount = await UserVideoProgress.count({
                where: { videoId: video.id, userId: studentIds } // Запись есть = начал
            });
            const viewsCount = await UserVideoProgress.count({
                where: { videoId: video.id, isWatched: true, userId: studentIds } // isWatched = досмотрел
            });
            return {
                id: `video-${video.id}`,
                realId: video.id,
                title: video.title,
                type: 'video',
                orderIndex: video.orderIndex,
                startedRate: Math.round((startedCount / totalStudents) * 100),
                completionRate: Math.round((viewsCount / totalStudents) * 100)
            };
        }));

        // 🔥 ВОРОНКА: Тесты (Двойная метрика)
        const testStats = await Promise.all(course.tests.map(async (test) => {
            const results = await UserTestResult.findAll({ where: { testId: test.id, userId: studentIds } });
            
            // Уникальные студенты, которые хотя бы попытались
            const startedSet = new Set(results.map(r => r.userId)); 
            const passedCount = results.filter(r => r.score >= test.passingScore).length;
            
            return {
                id: `test-${test.id}`,
                realId: test.id,
                title: test.title,
                type: 'test',
                orderIndex: test.orderIndex,
                startedRate: Math.round((startedSet.size / totalStudents) * 100),
                completionRate: Math.round((passedCount / totalStudents) * 100),
            };
        }));

        const funnel = [...videoStats, ...testStats].sort((a, b) => a.orderIndex - b.orderIndex);

        // УСПЕВАЕМОСТЬ СТУДЕНТОВ
        const studentsProgress = await Promise.all(students.map(async (student) => {
            const watchedVideos = await UserVideoProgress.count({
                where: { userId: student.id, isWatched: true, videoId: course.videos.map(v => v.id) }
            });

            const testResults = await UserTestResult.findAll({
                where: { userId: student.id, testId: course.tests.map(t => t.id) }
            });
            const passedTests = testResults.filter(r => {
                const test = course.tests.find(t => t.id === r.testId);
                return test ? r.score >= test.passingScore : false;
            }).length;

            const totalItems = course.videos.length + course.tests.length;
            const progressPercent = totalItems > 0 ? Math.round(((watchedVideos + passedTests) / totalItems) * 100) : 0;
            const avgScore = testResults.length > 0 ? Math.round(testResults.reduce((acc, r) => acc + r.score, 0) / testResults.length) : 0;

            return {
                id: student.id,
                name: `${student.lastName} ${student.firstName}`.trim(),
                email: student.email,
                lastLogin: student.lastLogin,
                progressPercent,
                avgScore
            };
        }));

        const globalAvgProgress = Math.round(studentsProgress.reduce((acc, s) => acc + s.progressPercent, 0) / totalStudents);
        const globalAvgScore = Math.round(studentsProgress.reduce((acc, s) => acc + s.avgScore, 0) / totalStudents);

        res.json({ totalStudents, globalAvgProgress, globalAvgScore, funnel, studentsProgress: studentsProgress.sort((a, b) => b.progressPercent - a.progressPercent) });

    } catch (e) {
        console.error('Ошибка генерации аналитики:', e);
        res.status(500).json({ message: 'Ошибка при сборе аналитики курса' });
    }
};

// 🔥 Глубокая аналитика конкретного студента на курсе (Таймлайн активности)
export const getStudentCourseDetails = async (req: Request, res: Response) => {
    try {
        const { courseId, studentId } = req.params;

        const student = await User.findByPk(studentId, { attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'lastLogin'] });
        if (!student) return res.status(404).json({ message: 'Студент не найден' });

        const course = await Course.findByPk(courseId, {
            include: [{ model: Video }, { model: CourseTest }]
        });
        
        const videoIds = course?.videos.map(v => v.id) || [];
        const testIds = course?.tests.map(t => t.id) || [];

        // Получаем, как он смотрел видео
        const videoProgress = await UserVideoProgress.findAll({
            where: { userId: studentId, videoId: videoIds },
            include: [{ model: Video, attributes: ['id', 'title'] }]
        });

        // Получаем результаты больших тестов (ТЕПЕРЬ ВМЕСТЕ С ВОПРОСАМИ!)
        const testResults = await UserTestResult.findAll({
            where: { userId: studentId, testId: testIds },
            include: [{ 
                model: CourseTest, 
                attributes: ['id', 'title', 'passingScore'],
                include: [{ model: TestQuestion }] // Подтягиваем сами вопросы!
            }]
        });

        // Получаем ответы на ИИ-вопросы внутри видео (с процентом сходства)
        const interactiveAnswers = await UserResponse.findAll({
            where: { userId: studentId, videoId: videoIds },
            include: [
                { model: InteractiveEvent, attributes: ['question', 'type', 'correctAnswer', 'aiThreshold'] },
                { model: Video, attributes: ['title'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ student, videoProgress, testResults, interactiveAnswers });
    } catch (e) {
        console.error('Ошибка детализации студента:', e);
        res.status(500).json({ message: 'Ошибка при получении деталей студента' });
    }
};

// 🔥 Глубокая аналитика конкретного элемента курса (Теста или Видео)
// 🔥 Глубокая аналитика конкретного элемента курса (Теста или Видео)
export const getCourseItemAnalytics = async (req: Request, res: Response) => {
    try {
        const { courseId, itemId, itemType } = req.params;
        const enrollments = await CourseEnrollment.findAll({ where: { courseId, status: 'approved' } });
        const studentIds = enrollments.map(e => e.userId);

        if (itemType === 'test') {
            const test = await CourseTest.findByPk(itemId, {
                include: [{ model: TestQuestion, order: [['orderIndex', 'ASC']] }]
            });
            if (!test) return res.status(404).json({ message: 'Тест не найден' });

            const results = await UserTestResult.findAll({
                where: { testId: itemId, userId: studentIds },
                include: [{ model: User, attributes: ['firstName', 'lastName', 'email', 'id'] }]
            });
            
            // Аналитика вопросов: ищем "Красную зону"
            const questionAnalytics = test.questions.map(q => {
                const attemptsForThisQuestion = results.length; // Все попытки сдать тест
                const correctAttempts = results.filter(r => {
                    // ИСПРАВЛЕНИЕ 1: r.answers вместо r.savedAnswers
                    const answers = r.answers || {}; 
                    return String(answers[q.id]) === String(q.correctAnswer);
                }).length;
                
                return {
                    // ИСПРАВЛЕНИЕ 2: q.text вместо q.question
                    id: q.id, question: q.text, 
                    correctRate: attemptsForThisQuestion > 0 ? Math.round((correctAttempts / attemptsForThisQuestion) * 100) : 0
                };
            }).sort((a,b) => a.correctRate - b.correctRate); // Worst first

            res.json({ item: test, type: 'test', results, questionAnalytics, totalStudents: studentIds.length });

        } else if (itemType === 'video') {
            const video = await Video.findByPk(itemId);
            if (!video) return res.status(404).json({ message: 'Видео не найдено' });

            const responses = await UserResponse.findAll({
                where: { videoId: itemId, userId: studentIds },
                include: [
                    { model: InteractiveEvent, attributes: ['question', 'type', 'correctAnswer', 'aiThreshold'] },
                    { model: User, attributes: ['firstName', 'lastName', 'email', 'id'] }
                ],
                order: [['createdAt', 'DESC']]
            });
            
            res.json({ item: video, type: 'video', responses, totalStudents: studentIds.length });
        } else {
            res.status(400).json({ message: 'Неверный тип элемента' });
        }
    } catch (e) {
        console.error('Item analytic error:', e);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

// 🔥 СЕКРЕТНЫЙ РОУТ ДЛЯ ЗАЩИТЫ ДИПЛОМА: Генерация демо-данных
// 🔥 СЕКРЕТНЫЙ РОУТ ДЛЯ ЗАЩИТЫ ДИПЛОМА: Генерация демо-данных
export const generateDemoData = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findByPk(courseId, { include: [Video, CourseTest] });
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        const firstNames = ['Александр', 'Максим', 'Иван', 'Артем', 'Дмитрий', 'Анна', 'Мария', 'Елена', 'Дарья', 'Алиса'];
        const lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров'];
        
        const hashedPassword = await bcrypt.hash('demo123', 10);
        let dropoffGlobal = 1.0; 

        // Достаем все интерактивные вопросы курса заранее
        const allVideoIds = course.videos.map(v => v.id);
        const allEvents = await InteractiveEvent.findAll({ where: { videoId: allVideoIds } });

        for (let i = 0; i < 15; i++) {
            const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
            
            // Надежная генерация уникального email
            const uniqueString = Math.random().toString(36).substring(2, 8);
            const user = await User.create({
                email: `demo_${Date.now()}_${uniqueString}@student.ru`,
                password: hashedPassword,
                firstName: fName,
                lastName: lName,
                role: 'student',
                status: 'active',
                lastLogin: new Date(Date.now() - Math.floor(Math.random() * 10000000000))
            });

            await CourseEnrollment.create({ courseId, userId: user.id, status: 'approved' });

            // Просмотры видео и ответы на ВСЕ типы вопросов
            for (const video of course.videos) {
                if (Math.random() <= dropoffGlobal) {
                    await UserVideoProgress.create({
                        userId: user.id, videoId: video.id, isWatched: true, lastTime: 120
                    });

                    // Фильтруем только вопросы (убираем просто текст и главы)
                    const videoEvents = allEvents.filter(e => e.videoId === video.id && e.type !== 'info' && e.type !== 'chapter');
                    
                    for (const event of videoEvents) {
                        let isCorrect = false;
                        let answerText = '';
                        let similarity = null;

                        if (event.type === 'free_text') {
                            similarity = Math.floor(Math.random() * 60) + 40; // 40-100%
                            isCorrect = similarity >= event.aiThreshold;
                            answerText = `Это автоматически сгенерированный ответ студента ${fName}.`;
                        } else {
                            // Для обычных тестов (один/множественный выбор) - 70% шанс успеха
                            isCorrect = Math.random() > 0.3; 
                            answerText = isCorrect ? (event.correctAnswer || 'Правильный ответ') : 'Выбран ошибочный вариант';
                        }

                        await UserResponse.create({
                            userId: user.id, videoId: video.id, eventId: event.id,
                            answer: answerText,
                            isCorrect,
                            similarity
                        });
                    }
                }
            }

           // Прохождение тестов с ГЕНЕРАЦИЕЙ ОТВЕТОВ
            for (const test of course.tests) {
                if (Math.random() <= dropoffGlobal) {
                    // Подтягиваем вопросы этого теста
                    const testQuestions = await TestQuestion.findAll({ where: { testId: test.id } });
                    const fakeAnswers: any = {};
                    let correctCount = 0;

                    for (const q of testQuestions) {
                        const isCorrect = Math.random() > 0.3; // 70% шанс ответить правильно
                        if (isCorrect) {
                            fakeAnswers[q.id] = q.correctAnswer || 'Правильный ответ';
                            correctCount++;
                        } else {
                            fakeAnswers[q.id] = 'Выбран неверный вариант';
                        }
                    }

                    // Считаем реальный балл на основе ответов
                    const score = testQuestions.length > 0 ? Math.round((correctCount / testQuestions.length) * 100) : (Math.floor(Math.random() * 50) + 50);

                    await UserTestResult.create({
                        userId: user.id, testId: test.id, score, answers: fakeAnswers
                    });
                }
            }
        }
        res.json({ message: 'Демо-студенты успешно сгенерированы! Перезагрузите страницу.' });
    } catch (e: any) {
        console.error('Ошибка генерации демо-данных:', e);
        // Теперь если сервер упадет, он отправит точную причину на фронт
        res.status(500).json({ message: 'Ошибка генерации' }); 
    }
};
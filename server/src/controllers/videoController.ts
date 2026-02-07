// server/src/controllers/videoController.ts
import { Request, Response } from 'express';
import { Video } from '../models/Video.js';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { UserResponse } from '../models/UserResponse.js';
import { Course } from '../models/Course.js';

// --- IMPORTS FOR AI ---
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка FFmpeg
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
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

// === КОНТРОЛЛЕРЫ ===

export const createCourse = async (req: Request, res: Response) => {
    try {
        const { title, description, instructor } = req.body;
        const course = await Course.create({ title, description, instructor });
        res.status(201).json(course);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка создания курса', error: e });
    }
};

export const getAllCourses = async (req: Request, res: Response) => {
    try {
        const courses = await Course.findAll({ include: [Video] }); // Подгружаем видео, чтобы посчитать их кол-во
        res.json(courses);
    } catch (e) {
        res.status(500).json(e);
    }
};

// Создать видео
export const createVideo = async (req: Request, res: Response) => {
  try {
    const { title, url, subtitles, hideResults, courseId } = req.body; // <--- берем courseId
    
    const video = await Video.create({ 
        title,
         url,
         subtitles, 
        hideResults: hideResults || false, 
        courseId: Number(courseId) 
    });
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
      where: { courseId }, // <--- Фильтр
      order: [['createdAt', 'ASC']], // В курсе логичнее от старого к новому
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
        const { time, type, question, options, correctAnswer } = req.body;

        const event = await InteractiveEvent.create({
            videoId: Number(videoId),
            time,
            type,
            question,
            options,
            correctAnswer
        });

        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при создании события', error });
    }
};

export const saveProgress = async (req: Request, res: Response) => {
    try {
        const { videoId, eventId, answer } = req.body;
        
        // 1. Получаем ID. TypeScript теперь должен видеть req.user
        // Если все равно красное - используй (req as any).user?.id
        const userId = (req as any).user?.id;

        // 2. ВАЖНО: Если юзера нет, запрещаем (так как база требует числовой ID)
        if (!userId) {
             return res.status(401).json({ message: 'Для сохранения прогресса нужно войти в систему' });
        }

        const event = await InteractiveEvent.findByPk(eventId);
        if (!event) return res.status(404).json({ message: 'Событие не найдено' });

        console.log('--- ПРОВЕРКА ОТВЕТА ---');
        console.log(`Правильный: "${event.correctAnswer}"`);
        console.log(`Студент:    "${answer}"`);

        const dbAnswer = event.correctAnswer ? event.correctAnswer.trim() : '';
        const userAnswer = answer ? answer.trim() : '';
        const isCorrect = dbAnswer.toLowerCase() === userAnswer.toLowerCase(); 
        
        console.log(`Результат: ${isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}`);

        // 3. Сохраняем ТОЛЬКО ОДИН РАЗ (убрали дубликат)
        await UserResponse.create({
            userId: userId, // Здесь теперь точно число
            videoId,
            eventId,
            answer,
            isCorrect
        });

        res.json({ success: true, isCorrect });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сохранения прогресса', error });
    }
};
export const getVideoStats = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;

        const stats = await UserResponse.findAll({
            where: { videoId },
            include: [InteractiveEvent],
            order: [['createdAt', 'DESC']]
        });

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка получения статистики', error });
    }
};

export const updateVideoSettings = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const { hideResults } = req.body;
        const video = await Video.findByPk(videoId);
        if (!video) return res.status(404).json({ message: 'Видео не найдено' });
        video.hideResults = hideResults;
        await video.save();
        res.json(video);
    } catch (error) {
        res.status(500).json(error);
    }
};

export const resetVideoProgress = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const { userId } = req.query; // Получаем "Кокорин" из URL

        await UserResponse.destroy({
            where: {
                videoId: Number(videoId),
                userId: Number(userId)
            }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json(e);
    }
};

// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ ---
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

        console.log(`[AI] Старт для видео: ${videoId}`);

        // 1. Извлекаем аудио через FFmpeg (ОБЯЗАТЕЛЬНО: 16k rate, mono, wav)
        await extractAudio(videoPath, tempAudioPath);

        // 2. Читаем WAV файл в буфер (ВАЖНО ДЛЯ NODE.JS)
        
        console.log('[AI] Запуск Whisper...');
        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
        
        // ДАВАЙ ПОПРОБУЕМ ВОТ ТАК (через wavefile):
        const wav = await import('wavefile');
        const buffer = fs.readFileSync(tempAudioPath);
        const wavFile = new wav.WaveFile(buffer);
        wavFile.toBitDepth('32f'); // Конвертируем в 32-bit float
        const audioData = wavFile.getSamples();
        
        // Если стерео, берем первый канал, если моно - просто данные
        let float32Array = Array.isArray(audioData) ? audioData[0] : audioData;

        // 3. Распознавание
        const output = await transcriber(float32Array, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'russian',
            task: 'transcribe',
            return_timestamps: true,
        });

        // 4. VTT
        // @ts-ignore
        createVttFile(output.chunks, vttPath);

        // 5. Чистка
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

        // 6. БД
        const protocol = req.protocol;
        const host = req.get('host');
        const vttUrl = `${protocol}://${host}/uploads/${vttFileName}`;

        const newSubtitle = {
            lang: 'ru-auto',
            label: 'Авто (AI)',
            src: vttUrl
        };

        const currentSubs = video.subtitles ? JSON.parse(JSON.stringify(video.subtitles)) : [];
        currentSubs.push(newSubtitle);
        
        video.subtitles = currentSubs;
        await video.save();

        console.log('[AI] Готово!');
        res.json({ success: true, subtitles: video.subtitles });

    } catch (error) {
        console.error("[AI] Ошибка:", error);
        res.status(500).json({ message: 'Ошибка генерации', error });
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
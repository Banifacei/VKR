// server/src/controllers/videoController.ts
import { Request, Response } from 'express';
import { Video } from '../models/Video.js';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { UserResponse } from '../models/UserResponse.js';

// Создать видео
export const createVideo = async (req: Request, res: Response) => {
  try {
    const { title, url, subtitles, hideResults } = req.body; // <--- берем из запроса
    
    const video = await Video.create({ 
        title, 
        url,
        subtitles,
        hideResults: hideResults || false // <--- сохраняем
    });
    
    res.status(201).json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при сохранении видео', error });
  }
};

// Получить все видео
export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.findAll({
      order: [['createdAt', 'DESC']],
      include: [InteractiveEvent]
    });
    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении списка', error });
  }
};

// Создать вопрос
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

// Сохранить ответ студента
export const saveProgress = async (req: Request, res: Response) => {
    try {
        const { videoId, eventId, answer, userId } = req.body;

        const event = await InteractiveEvent.findByPk(eventId);
        if (!event) return res.status(404).json({ message: 'Событие не найдено' });

        // --- ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ ---
        console.log('--- ПРОВЕРКА ОТВЕТА ---');
        console.log(`Правильный (из БД): "${event.correctAnswer}"`);
        console.log(`Ответ студента:     "${answer}"`);

        // СРАВНЕНИЕ:
        // 1. Проверяем, существуют ли значения
        // 2. trim() убирает пробелы в начале и конце
        const dbAnswer = event.correctAnswer ? event.correctAnswer.trim() : '';
        const userAnswer = answer ? answer.trim() : '';

        const isCorrect = dbAnswer === userAnswer;
        
        console.log(`Результат: ${isCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}`);
        console.log('-----------------------');

        await UserResponse.create({
            userId: userId || 'Anon',
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

// Получить статистику
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
        console.error(error);
        res.status(500).json({ message: 'Ошибка обновления настроек', error });
    }
};
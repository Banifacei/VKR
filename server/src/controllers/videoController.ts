// server/src/controllers/videoController.ts
import { Request, Response } from 'express';
import { Video } from '../models/Video.js';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { UserResponse } from '../models/UserResponse.js';
import { Course } from '../models/Course.js';

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
        courseId: Number(courseId) // <--- сохраняем
    });
    
    res.status(201).json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при сохранении видео', error });
  }
};

// Получить все видео
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
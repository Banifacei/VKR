import { Request, Response, NextFunction } from 'express';
import { Course } from '../models/Course.js';
import { CourseCollaborator } from '../models/CourseCollaborator.js';
import { Video } from '../models/Video.js';
import { CourseTest } from '../models/CourseTest.js';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { CourseBan } from '../models/CourseBan.js';

// Проверяет что текущий студент НЕ заблокирован в курсе
export const checkCourseBan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: 'Не авторизован' });
        if (user.role !== 'student') return next(); // не применяем к преподам/админам

        const courseId = req.params.courseId;
        if (!courseId) return next();

        const ban = await CourseBan.findOne({ where: { courseId, userId: user.id } });
        if (ban) return res.status(403).json({ message: 'Вы заблокированы в этом курсе.' });

        next();
    } catch (e) {
        next(); // не блокируем при ошибке
    }
};

export const checkCourseAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: 'Не авторизован' });

        // 1. Админам можно всё
        if (user.role === 'admin') {
            (req as any).courseRole = 'admin';
            return next();
        }

        // 2. ИЩЕМ ID КУРСА (РАССЛЕДОВАНИЕ)
        let courseId = req.params.courseId || req.body?.courseId || req.query.courseId;

        // Если это запрос к видео (например, удаление урока)
        if (!courseId && req.params.videoId) {
            const video = await Video.findByPk(req.params.videoId);
            if (video) courseId = video.courseId;
        }

        // Если это запрос к тесту (например, добавление вопроса)
        if (!courseId && req.params.testId) {
            const test = await CourseTest.findByPk(req.params.testId);
            if (test) courseId = test.courseId;
        }

        // Если это запрос к интерактивному событию (редактирование/удаление)
        if (!courseId && req.params.eventId) {
            const event = await InteractiveEvent.findByPk(req.params.eventId);
            if (event) {
                const video = await Video.findByPk(event.videoId);
                if (video) courseId = video.courseId;
            }
        }

        if (!courseId) {
            return res.status(400).json({ message: 'Не удалось определить курс для проверки прав' });
        }

        // 3. ПРОВЕРЯЕМ КУРС В БД
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Курс не найден' });

        // 4. Владельцу курса можно всё
        if (course.ownerId === user.id) {
            (req as any).courseRole = 'owner'; // Вешаем бейджик Владельца
            return next();
        }

        // 5. Проверяем, есть ли юзер в списке соавторов (Лаборант)
        const collaborator = await CourseCollaborator.findOne({
            where: { courseId, userId: user.id }
        });

        if (collaborator) {
            (req as any).courseRole = collaborator.role; // Вешаем бейджик Соавтора ('editor')
            return next();
        }

        // Если ничего не подошло — выгоняем
        return res.status(403).json({ message: 'У вас нет прав на редактирование этого материала' });

    } catch (error) {
        console.error('Ошибка проверки прав доступа к курсу:', error);
        res.status(500).json({ message: 'Ошибка сервера при проверке прав' });
    }
};
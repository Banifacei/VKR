import { Router, Request, Response } from 'express';
import { checkAuth, isTeacherOrAdmin } from '../middleware/authMiddleware.js';
import { Course } from '../models/Course.js';
import { Video } from '../models/Video.js';
import { CourseTest } from '../models/CourseTest.js';

const router = Router();

// Проверяет выполнение домашнего задания — есть ли курс, видео и тест у текущего пользователя
router.get('/status', checkAuth, isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const course = await Course.findOne({ where: { ownerId: userId } });
        if (!course) return res.json({ hasCourse: false, hasVideo: false, hasTest: false });

        const video = await Video.findOne({ where: { courseId: course.id } });
        if (!video) return res.json({ hasCourse: true, hasVideo: false, hasTest: false });

        const test = await CourseTest.findOne({ where: { videoId: video.id } });
        res.json({ hasCourse: true, hasVideo: true, hasTest: !!test });
    } catch {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удаляет первый (демонстрационный) курс пользователя
router.delete('/demo-course', checkAuth, isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const course = await Course.findOne({ where: { ownerId: userId } });
        if (course) await course.destroy();
        res.json({ ok: true });
    } catch {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;

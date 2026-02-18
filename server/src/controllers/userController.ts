import { Request, Response } from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcrypt';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { UserResponse } from '../models/UserResponse.js';
import { Video } from '../models/Video.js';
import { Course } from '../models/Course.js';
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'lastLogin'],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения списка пользователей' });
    }
};
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Недопустимая роль' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        user.role = role;
        await user.save();

        res.json({ success: true, user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка обновления роли' });
    }
};

export const updateUserByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, role, password } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.role = role;
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.json({ success: true, user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при обновлении пользователя' });
    }
};

// 👇 ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ПРОФИЛЯ СТУДЕНТА
export const getUserStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Пользователь не авторизован' });
        }

        // 1. Получаем всю историю просмотров
        const history = await UserVideoProgress.findAll({
            where: { userId },
            include: [{ 
                model: Video, 
                attributes: ['id', 'title', 'courseId'],
                include: [{ model: Course, attributes: ['title'] }] 
            }],
            order: [['updatedAt', 'DESC']],
            limit: 20 // Увеличим лимит
        });

        // 2. ОТДЕЛЯЕМ: Недорешанные (isWatched: false)
        const unfinished = await UserVideoProgress.findAll({
            where: { userId, isWatched: false },
            include: [{ 
                model: Video, 
                attributes: ['id', 'title', 'courseId'],
                include: [{ model: Course, attributes: ['title'] }] 
            }],
            order: [['updatedAt', 'DESC']]
        });

        // 3. Получаем ответы
        const responses = await UserResponse.findAll({ where: { userId } });

        const totalAnswers = responses.length;
        const correctAnswers = responses.filter(r => r.isCorrect).length;
        const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
        
        const aiChecks = responses.filter(r => r.similarity !== null);
        const averageAiScore = aiChecks.length > 0
            ? Math.round(aiChecks.reduce((sum, r) => sum + (r.similarity || 0), 0) / aiChecks.length)
            : 0;

        const watchedVideosCount = history.filter(h => h.isWatched).length;

        // Отправляем
        res.json({
            stats: {
                totalAnswers,
                successRate,
                aiChecksCount: aiChecks.length,
                averageAiScore,
                watchedVideosCount
            },
            history: history.filter(h => h.isWatched).map(h => ({ // В обычную историю кидаем только пройденные
                videoId: h.videoId,
                videoTitle: h.video?.title || 'Удаленное видео',
                courseTitle: h.video?.course?.title || 'Без курса',
                courseId: h.video?.courseId,
                lastTime: h.lastTime,
                isWatched: h.isWatched,
                updatedAt: h.updatedAt
            })),
            unfinished: unfinished.map(h => ({ // А недорешанные пойдут отдельным массивом
                videoId: h.videoId,
                videoTitle: h.video?.title || 'Удаленное видео',
                courseTitle: h.video?.course?.title || 'Без курса',
                courseId: h.video?.courseId,
                lastTime: h.lastTime,
                updatedAt: h.updatedAt
            }))
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения статистики профиля' });
    }
};
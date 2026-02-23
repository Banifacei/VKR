import { Request, Response } from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcrypt';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { UserResponse } from '../models/UserResponse.js';
import { Video } from '../models/Video.js';
import { Course } from '../models/Course.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { CourseTest } from '../models/CourseTest.js';

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
        const userIdToUpdate = Number(req.params.id);
        const adminId = Number((req as any).user?.id); // Тот, кто нажал кнопку
        const { role } = req.body;
        
        // ИБ: Защита от левых ролей
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Недопустимая роль' });
        }

        // 🔥 ИБ: Защита от случайного лишения себя прав (чтобы не заблокировать админку)
        if (userIdToUpdate === adminId && role !== 'admin') {
            return res.status(403).json({ 
                message: 'Ошибка ИБ: Вы не можете снять с себя права администратора!' 
            });
        }

        const user = await User.findByPk(userIdToUpdate);
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
        const userIdToUpdate = Number(req.params.id);
        const adminId = Number((req as any).user?.id);
        const { firstName, lastName, email, role, password } = req.body;

        // 🔥 ИБ: Защита от случайного лишения себя прав через модальное окно редактирования
        if (userIdToUpdate === adminId && role !== 'admin') {
            return res.status(403).json({ 
                message: 'Ошибка ИБ: Вы не можете снять с себя права администратора!' 
            });
        }

        const user = await User.findByPk(userIdToUpdate);
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
            limit: 20
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
        
        // 4. ИЩЕМ СДАННЫЕ ИТОГОВЫЕ ТЕСТЫ
        const globalTestResults = await UserTestResult.findAll({
            where: { userId },
            include: [{ model: CourseTest, attributes: ['title', 'passingScore'] }],
            order: [['updatedAt', 'DESC']]
        });

        const formattedTests = globalTestResults.map(tr => ({
            id: tr.id,
            testId: tr.testId,
            testTitle: tr.test?.title || 'Неизвестный тест',
            score: tr.score,
            passingScore: tr.test?.passingScore || 80,
            passed: tr.score >= (tr.test?.passingScore || 80),
            updatedAt: tr.updatedAt
        }));

        // 5. ОТПРАВЛЯЕМ ЕДИНЫЙ ОТВЕТ (дубль удален)
        res.json({
            stats: {
                totalAnswers,
                successRate,
                aiChecksCount: aiChecks.length,
                averageAiScore,
                watchedVideosCount,
                completedTestsCount: formattedTests.length
            },
            history: history.filter(h => h.isWatched).map(h => ({ 
                videoId: h.videoId,
                videoTitle: h.video?.title || 'Удаленное видео',
                courseTitle: h.video?.course?.title || 'Без курса',
                courseId: h.video?.courseId,
                lastTime: h.lastTime,
                isWatched: h.isWatched,
                updatedAt: h.updatedAt
            })),
            unfinished: unfinished.map(h => ({ 
                videoId: h.videoId,
                videoTitle: h.video?.title || 'Удаленное видео',
                courseTitle: h.video?.course?.title || 'Без курса',
                courseId: h.video?.courseId,
                lastTime: h.lastTime,
                updatedAt: h.updatedAt
            })),
            globalTests: formattedTests
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения статистики профиля' });
    }
};

export const createUserByAdmin = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, role, password } = req.body;

        // Проверяем, нет ли уже такого email
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем пользователя
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            role,
            password: hashedPassword
        });

        res.status(201).json(newUser);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при создании пользователя' });
    }
};

export const deleteUserByAdmin = async (req: Request, res: Response) => {
    try {
        const userIdToDelete = Number(req.params.id);
        const currentAdminId = Number((req as any).user?.id);

        // Защита от удаления самого себя
        if (userIdToDelete === currentAdminId) {
            return res.status(403).json({ message: 'Вы не можете удалить свой собственный аккаунт!' });
        }

        const user = await User.findByPk(userIdToDelete);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        await user.destroy(); // Удаляем из БД

        res.json({ success: true, message: 'Пользователь удален' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при удалении пользователя' });
    }
};
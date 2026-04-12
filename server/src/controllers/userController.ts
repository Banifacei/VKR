import { Request, Response } from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcrypt';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { UserResponse } from '../models/UserResponse.js';
import { Video } from '../models/Video.js';
import { Course } from '../models/Course.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { CourseTest } from '../models/CourseTest.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { addSystemLog } from './adminController.js';
import { Op } from 'sequelize';
import * as xlsx from 'xlsx';
import { createBroadcast } from '../utils/sseHub.js';

// ─── SSE-канал для администраторов ───────────────────────────────────────────
export const adminSse = createBroadcast();

export const sseAdminEvents = (req: Request, res: Response) =>
    adminSse.subscribe(req, res);
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
        const offset = (page - 1) * limit;
        const search = ((req.query.search as string) || '').trim();
        const roleFilter = req.query.role as string;
        const providerFilter = req.query.provider as string;

        const where: any = {};
        if (search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName:  { [Op.iLike]: `%${search}%` } },
                { email:     { [Op.iLike]: `%${search}%` } },
            ];
        }
        if (roleFilter && ['student', 'teacher', 'admin'].includes(roleFilter)) {
            where.role = roleFilter;
        }
        if (providerFilter && ['local', 'yandex', 'google', 'ldap', 'saml'].includes(providerFilter)) {
            where.authProvider = providerFilter;
        }

        const [{ count, rows }, studentCount, teacherCount, adminCount] = await Promise.all([
            User.findAndCountAll({
                where,
                attributes: ['id', 'email', 'firstName', 'lastName', 'middleName', 'phone', 'role', 'lastLogin', 'status', 'avatarUrl', 'authProvider'],
                order: [['createdAt', 'DESC']],
                limit,
                offset,
            }),
            User.count({ where: { role: 'student' } }),
            User.count({ where: { role: 'teacher' } }),
            User.count({ where: { role: 'admin' } }),
        ]);

        res.json({
            users: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            byRole: { student: studentCount, teacher: teacherCount, admin: adminCount },
        });
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
        addSystemLog(`Изменена роль пользователя (ID: ${userIdToUpdate}) на "${role}"`, 'warning');
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

        if (role && !['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Недопустимая роль' });
        }

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
        addSystemLog(`Админ отредактировал профиль пользователя (ID: ${userIdToUpdate})`, 'info');
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

        if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Некорректный адрес email' });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });
        }
        if (!['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Недопустимая роль' });
        }

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
            password: hashedPassword,
            authProvider: 'local',
        });
        addSystemLog(`Админ создал пользователя: ${email}`, 'success');
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

        // 🔥 СНАЧАЛА УДАЛЯЕМ ВЕСЬ "МУСОР" ПОЛЬЗОВАТЕЛЯ (ЕГО ОТВЕТЫ, ПРОГРЕСС, ТЕСТЫ)
        await UserResponse.destroy({ where: { userId: userIdToDelete } });
        await UserVideoProgress.destroy({ where: { userId: userIdToDelete } });
        await UserTestResult.destroy({ where: { userId: userIdToDelete } });

        // Теперь база данных разрешит удалить самого пользователя
        await user.destroy(); 
        
        addSystemLog(`Админ удалил пользователя (ID: ${userIdToDelete})`, 'warning');
        res.json({ success: true, message: 'Пользователь удален' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при удалении пользователя' });
    }
};
// --- ОБРАБОТКА ЗАЯВОК НА РЕГИСТРАЦИЮ ---

export const getPendingUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            where: { status: 'pending' },
            attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 500,
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка получения списка заявок' });
    }
};

export const approveUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        
        user.status = 'active';
        await user.save();

        addSystemLog(`Одобрена регистрация пользователя: ${user.email}`, 'success');
        adminSse.broadcast({ type: 'user_approved', userId: user.id, email: user.email });
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка при одобрении пользователя' });
    }
};

export const rejectUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        
        user.status = 'rejected';
        await user.save();

        addSystemLog(`Отклонена заявка пользователя: ${user.email}`, 'error');
        adminSse.broadcast({ type: 'user_rejected', userId: user.id, email: user.email });
        res.json({ success: true, message: 'Заявка отклонена' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка при отклонении пользователя' });
    }
};

// --- МАССОВЫЙ ИМПОРТ ИЗ EXCEL ---
export const importUsersFromExcel = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не загружен' });
        }

        // Читаем Excel-файл из буфера (в памяти)
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        
        // Берем имя первого листа
        const sheetName = workbook.SheetNames[0];
        
        if (!sheetName) {
            return res.status(400).json({ message: 'Excel-файл пуст или не содержит листов' });
        }

        // Берем сам лист
        const sheet = workbook.Sheets[sheetName];
        
        // 🛡 ИСПРАВЛЕНИЕ: Проверяем, что лист реально существует (успокаиваем TypeScript)
        if (!sheet) {
            return res.status(400).json({ message: 'Не удалось прочитать данные с листа' });
        }

        // Преобразуем таблицу в массив JSON-объектов
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'Файл пуст или имеет неверный формат' });
        }

        let importedCount = 0;
        let skippedCount = 0;

        for (const row of data) {
            // Поддерживаем разные названия колонок (на русском и английском)
            const firstName = row['Имя'] || row['FirstName'] || 'Студент';
            const lastName = row['Фамилия'] || row['LastName'] || '';
            const middleName = row['Отчество'] || row['MiddleName'] || null; // <--- НОВОЕ
            const email = row['Email'] || row['Почта'];
            const phone = row['Телефон'] || row['Phone'] || null;            // <--- НОВОЕ
            const rawPassword = row['Пароль'] || row['Password'];
            const role = row['Роль'] || row['Role'] || 'student';

            // Если нет обязательных данных — пропускаем строчку
            if (!email || !rawPassword) {
                skippedCount++;
                continue; 
            }

            // Если юзер с такой почтой уже есть — пропускаем
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                skippedCount++;
                continue; 
            }

            // Хэшируем пароль из эксельки
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(String(rawPassword), salt);

            // Создаем. Так как загружает Админ, статус сразу 'active'
            await User.create({
                firstName,
                lastName,
                middleName,
                email,
                phone,
                role,
                password: hashedPassword,
                status: 'active' 
            });
            importedCount++;
        }

        addSystemLog(`Массовый импорт из Excel: загружено ${importedCount}, пропущено ${skippedCount}`, 'success');
        
        res.json({ 
            success: true, 
            importedCount, 
            skippedCount, 
            message: `Импорт завершен. Добавлено: ${importedCount}, Пропущено: ${skippedCount}` 
        });

    } catch (e) {
        console.error('Ошибка Excel-импорта:', e);
        addSystemLog('Ошибка при массовом импорте пользователей из Excel', 'error');
        res.status(500).json({ message: 'Ошибка при обработке файла' });
    }
};

// --- ВЫГРУЗКА (ЭКСПОРТ) ПОЛЬЗОВАТЕЛЕЙ В EXCEL ---
export const exportUsersToExcel = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        
        // Формируем красивые данные для таблицы
        const data = users.map(u => ({
            'ID': u.id,
            'Имя': u.firstName,
            'Фамилия': u.lastName,
            'Отчество': u.middleName || '',
            'Email': u.email,
            'Телефон': u.phone || '',
            'Роль': u.role === 'admin' ? 'Администратор' : u.role === 'teacher' ? 'Преподаватель' : 'Студент',
            'Статус': u.status === 'active' ? 'Активен' : u.status === 'pending' ? 'Ожидает' : 'Заблокирован',
            'Последний вход': u.lastLogin ? new Date(u.lastLogin).toLocaleString('ru-RU') : 'Никогда',
            'Дата регистрации': new Date(u.createdAt).toLocaleString('ru-RU')
        }));

        // Создаем Excel книгу и лист в памяти
        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'База пользователей');

        // Генерируем буфер
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        addSystemLog(`Администратор выгрузил базу пользователей (${users.length} шт.)`, 'info');

        // Отправляем файл клиенту
        res.setHeader('Content-Disposition', 'attachment; filename="Lumeo_Users.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        console.error('Ошибка при экспорте:', e);
        res.status(500).json({ message: 'Ошибка при экспорте базы пользователей' });
    }
};

// --- СКАЧИВАНИЕ ШАБЛОНА EXCEL ---
export const downloadTemplate = async (req: Request, res: Response) => {
    try {
        const data = [
            {
                'Имя': 'Иван',
                'Фамилия': 'Иванов',
                'Отчество': 'Иванович',
                'Email': 'ivan@edu.ru',
                'Телефон': '+79991234567',
                'Пароль': 'password123',
                'Роль': 'student'
            },
            {
                'Имя': 'Мария',
                'Фамилия': 'Смирнова',
                'Отчество': 'Петровна',
                'Email': 'maria@edu.ru',
                'Телефон': '',
                'Пароль': 'qwerty2024',
                'Роль': 'teacher'
            }
        ];

        const worksheet = xlsx.utils.json_to_sheet(data);
        
        // Делаем красивые колонки (задаем ширину в символах)
        worksheet['!cols'] = [
            { wch: 15 }, // Имя
            { wch: 15 }, // Фамилия
            { wch: 15 }, // Отчество
            { wch: 25 }, // Email
            { wch: 15 }, // Телефон
            { wch: 15 }, // Пароль
            { wch: 10 }  // Роль
        ];

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Шаблон импорта');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="Lumeo_Template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        console.error('Ошибка при создании шаблона:', e);
        res.status(500).json({ message: 'Ошибка при создании шаблона' });
    }
};

export const searchUsers = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.length < 2) {
            return res.json([]); // Ищем только если ввели минимум 2 буквы
        }

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { email: { [Op.iLike]: `%${q}%` } },
                    { firstName: { [Op.iLike]: `%${q}%` } },
                    { lastName: { [Op.iLike]: `%${q}%` } }
                ]
            },
            // Отдаем только публичную инфу, без паролей!
            attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'role'],
            limit: 5 // Отдаем топ-5 совпадений, чтобы не перегружать интерфейс
        });

        res.json(users);
    } catch (error) {
        console.error('Ошибка поиска пользователей:', error);
        res.status(500).json({ message: 'Ошибка при поиске' });
    }
};

// --- ПОЛУЧИТЬ ВСЕХ ДОСТУПНЫХ ПОЛЬЗОВАТЕЛЕЙ (ДЛЯ СПИСКА СОАВТОРОВ) ---
export const getAvailableUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            where: {
                role: { [Op.ne]: 'admin' } // Исключаем админов из выдачи
            },
            // Отдаем только безопасные данные
            attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'role'],
            order: [['firstName', 'ASC']],
            limit: 100 // Ограничение на случай, если в вузе будут тысячи студентов
        });
        res.json(users);
    } catch (error) {
        console.error('Ошибка получения списка:', error);
        res.status(500).json({ message: 'Ошибка загрузки пользователей' });
    }
};

// GET /api/users/:id/overview — профиль + прогресс по курсам (для препода/админа)
export const getUserOverview = async (req: Request, res: Response) => {
    const targetId = Number(req.params.id);
    try {
        const user = await User.findByPk(targetId, {
            attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'createdAt'],
        });
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        // Все зачисления со статусом approved
        const enrollments = await CourseEnrollment.findAll({
            where: { userId: targetId },
            include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'instructor'] }],
        });

        // Прогресс по каждому курсу
        const courses = await Promise.all(enrollments.map(async (enroll) => {
            const course = enroll.course as any;
            if (!course) return null;

            // Всего видео в курсе
            const totalVideos = await Video.count({ where: { courseId: course.id } });
            // Просмотренных (completed = true)
            const completedVideos = await UserVideoProgress.count({
                where: { userId: targetId, completed: true },
                include: [{ model: Video, as: 'video', where: { courseId: course.id }, attributes: [] }],
            });
            // Тестов в курсе
            const totalTests = await CourseTest.count({ where: { courseId: course.id } });
            // Пройденных тестов
            const completedTests = await UserTestResult.count({
                where: { userId: targetId, courseId: course.id },
            });

            const totalItems = totalVideos + totalTests;
            const completedItems = completedVideos + completedTests;
            const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            return {
                id: course.id,
                title: course.title,
                instructor: course.instructor,
                status: enroll.status,
                progress,
                totalVideos,
                completedVideos,
                totalTests,
                completedTests,
            };
        }));

        res.json({ user, courses: courses.filter(Boolean) });
    } catch (e) {
        console.error('getUserOverview error:', e);
        res.status(500).json({ message: 'Ошибка загрузки профиля' });
    }
};

// POST /api/admin/users/:id/ban
export const banUser = async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).user?.id;
        const targetId = Number(req.params.id);
        if (targetId === adminId) return res.status(400).json({ message: 'Нельзя заблокировать себя' });
        const user = await User.findByPk(targetId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Нельзя заблокировать администратора' });
        const { reason } = req.body;
        user.status = 'banned';
        user.banReason = reason?.trim() || null;
        await user.save();
        addSystemLog(`Пользователь (ID: ${targetId}) заблокирован администратором (ID: ${adminId})${reason ? `: ${reason}` : ''}`, 'warning');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка блокировки' });
    }
};

// POST /api/admin/users/:id/unban
export const unbanUser = async (req: Request, res: Response) => {
    try {
        const targetId = Number(req.params.id);
        const user = await User.findByPk(targetId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        user.status = 'active';
        user.banReason = null;
        await user.save();
        addSystemLog(`Пользователь (ID: ${targetId}) разблокирован`, 'info');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка разблокировки' });
    }
};
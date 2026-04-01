import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { getSystemSettings, toggleSystemSetting } from '../controllers/adminController.js';
import {
    getStorageStats,
    getSystemLogs,
    getServerStats,
    clearAiCache,
    backupDatabase,
    restartServer,
    getSystemModules,
} from '../controllers/adminController.js';

const router = Router();

// Middleware для дополнительной проверки роли (защита от хитрых студентов)
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Получаем пользователя, которого добавил твой checkAuth
    const user = (req as any).user; 

    //console.log("🛠 [DEBUG isAdmin] Данные пользователя из токена:", user);

    // Вариант А: Если checkAuth передает объект с ролью
    if (user && user.role === 'admin') {
        return next();
    }

    // Вариант Б: Если у тебя в токене вообще нет роли, а есть только ID (например user.id).
    // То здесь нужно делать запрос к базе данных (User.findById / prisma.user.findUnique).
    
    // Пока что выводим ошибку, чтобы ты увидел, что пришло
    res.status(403).json({ 
        message: 'Доступ запрещен. Требуются права администратора.',
        debugData: user 
    });
};

// Комбинируем middlewares: сначала проверяем токен, затем проверяем, админ ли это
router.use(checkAuth, isAdmin);

// --- РОУТЫ ДАШБОРДА ---
router.get('/storage', getStorageStats);
router.get('/server-stats', getServerStats);
router.get('/logs', getSystemLogs);
router.get('/system-modules', getSystemModules);

// --- РОУТЫ БЫСТРЫХ ДЕЙСТВИЙ ---
router.post('/clear-cache', clearAiCache);
router.post('/backup-db', backupDatabase);
router.post('/restart', restartServer);
router.get('/settings', checkAuth, isAdmin, getSystemSettings);
router.post('/settings/toggle', checkAuth, isAdmin, toggleSystemSetting);

export default router;
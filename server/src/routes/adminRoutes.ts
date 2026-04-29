import { Router } from 'express';
import { checkAuth, isAdmin, checkAuthSse } from '../middleware/authMiddleware.js';
import {
    getSystemSettings,
    toggleSystemSetting,
    getStorageStats,
    getSystemLogs,
    getServerStats,
    clearAiCache,
    backupDatabase,
    restartServer,
    getSystemModules,
    getOnlineUsers,
    streamOnlineUsers,
} from '../controllers/adminController.js';

const router = Router();

// SSE онлайн-пользователей — до router.use(isAdmin), т.к. использует checkAuthSse
router.get('/online-users/stream', checkAuthSse, streamOnlineUsers);

// checkAuth проверяет JWT, isAdmin делает запрос в БД и проверяет актуальную роль.
// Это гарантирует что отозванный admin не сохраняет доступ до истечения токена.
router.use(checkAuth, isAdmin);

// --- РОУТЫ ДАШБОРДА ---
router.get('/storage', getStorageStats);
router.get('/server-stats', getServerStats);
router.get('/logs', getSystemLogs);
router.get('/system-modules', getSystemModules);
router.get('/online-users', getOnlineUsers);

// --- РОУТЫ БЫСТРЫХ ДЕЙСТВИЙ ---
router.post('/clear-cache', clearAiCache);
router.post('/backup-db', backupDatabase);
router.post('/restart', restartServer);
router.get('/settings', getSystemSettings);
router.post('/settings/toggle', toggleSystemSetting);

export default router;
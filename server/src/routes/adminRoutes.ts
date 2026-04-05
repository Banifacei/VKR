import { Router } from 'express';
import { checkAuth, isAdmin } from '../middleware/authMiddleware.js';
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

// checkAuth проверяет JWT, isAdmin делает запрос в БД и проверяет актуальную роль.
// Это гарантирует что отозванный admin не сохраняет доступ до истечения токена.
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
router.get('/settings', getSystemSettings);
router.post('/settings/toggle', toggleSystemSetting);

export default router;
import { Router } from 'express';
import { checkAuth, isAdmin, checkAuthSse } from '../middleware/authMiddleware.js';
import { getSystemSettings, getPublicSettings, toggleSystemSetting, testEmailSettings, getEmailTemplateDefaults, getStorageStats, getSystemLogs, getServerStats, clearAiCache, backupDatabase, restartServer, getSystemModules, getOnlineUsers, streamOnlineUsers, checkUpdates, streamUpdateLogs, } from '../controllers/adminController.js';
const router = Router();
// SSE-маршруты — до router.use(isAdmin), используют checkAuthSse
router.get('/online-users/stream', checkAuthSse, streamOnlineUsers);
router.get('/updates/stream', checkAuthSse, streamUpdateLogs);
// Публичные настройки (доступны любому авторизованному пользователю)
router.get('/settings/public', checkAuth, getPublicSettings);
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
router.post('/settings/email-test', testEmailSettings);
router.get('/settings/email-templates/defaults', getEmailTemplateDefaults);
router.get('/updates/check', checkUpdates);
export default router;

import { Router } from 'express';
import multer from 'multer';
import { 
    getAllUsers,
    updateUserRole,
    updateUserByAdmin,
    getUserStats,
    createUserByAdmin,
    deleteUserByAdmin,
    getPendingUsers,
    approveUser,
    rejectUser,
    importUsersFromExcel,
    exportUsersToExcel,
    downloadTemplate,
    searchUsers,
    getAvailableUsers
} from '../controllers/userController.js';
import { checkAuth, isAdmin, checkAuthSse } from '../middleware/authMiddleware.js';
import { validateId } from '../middleware/validateId.js';
import { sseAdminEvents } from '../controllers/userController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.get('/stats', checkAuth, getUserStats);
router.get('/search', checkAuth, searchUsers);
router.get('/available', checkAuth, getAvailableUsers);
router.get('/', checkAuth, isAdmin, getAllUsers);
router.post('/', checkAuth, isAdmin, createUserByAdmin);
const uid = validateId('id');
router.put('/:id/role', checkAuth, isAdmin, uid, updateUserRole);
router.put('/:id', checkAuth, isAdmin, uid, updateUserByAdmin);
router.delete('/:id', checkAuth, isAdmin, uid, deleteUserByAdmin);
router.get('/pending', checkAuth, isAdmin, getPendingUsers);
router.get('/export', checkAuth, isAdmin, exportUsersToExcel);
router.get('/template', checkAuth, isAdmin, downloadTemplate);
router.post('/:id/approve', checkAuth, isAdmin, uid, approveUser);
router.post('/:id/reject', checkAuth, isAdmin, uid, rejectUser);
router.post('/import', checkAuth, isAdmin, upload.single('file'), importUsersFromExcel);
// SSE: администратор получает live-уведомления о новых заявках
router.get('/admin/stream', checkAuthSse, isAdmin, sseAdminEvents);
export default router;
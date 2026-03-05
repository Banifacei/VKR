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
import {checkAuth, isAdmin} from '../middleware/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.get('/stats', checkAuth, getUserStats);
router.get('/search', checkAuth, searchUsers);
router.get('/available', checkAuth, getAvailableUsers);
router.get('/', checkAuth, isAdmin, getAllUsers);
router.post('/', checkAuth, isAdmin, createUserByAdmin);
router.put('/:id/role', checkAuth, isAdmin, updateUserRole);
router.put('/:id', checkAuth, isAdmin, updateUserByAdmin);
router.delete('/:id', checkAuth, isAdmin, deleteUserByAdmin);
router.get('/pending', checkAuth, isAdmin, getPendingUsers);
router.get('/export', checkAuth, isAdmin, exportUsersToExcel);
router.get('/template', checkAuth, isAdmin, downloadTemplate);
router.post('/:id/approve', checkAuth, isAdmin, approveUser);
router.post('/:id/reject', checkAuth, isAdmin, rejectUser);
router.post('/import', checkAuth, isAdmin, upload.single('file'), importUsersFromExcel);
export default router;
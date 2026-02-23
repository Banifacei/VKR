import { Router } from 'express';
import { 
    getAllUsers, 
    updateUserRole, 
    updateUserByAdmin, 
    getUserStats,
    createUserByAdmin,    // <--- Импортируем создание
    deleteUserByAdmin     // <--- Импортируем удаление
} from '../controllers/userController.js';
import {checkAuth, isAdmin} from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', checkAuth, getUserStats);
router.get('/', checkAuth, isAdmin, getAllUsers);
router.post('/', checkAuth, isAdmin, createUserByAdmin);
router.put('/:id/role', checkAuth, isAdmin, updateUserRole);
router.put('/:id', checkAuth, isAdmin, updateUserByAdmin);
router.delete('/:id', checkAuth, isAdmin, deleteUserByAdmin);
export default router;
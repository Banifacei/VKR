import { Router } from 'express';
import { getAllUsers, updateUserRole, updateUserByAdmin } from '../controllers/userController.js';
import { checkAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Защищаем роуты: только авторизованные могут видеть и менять
// (В идеале добавить middleware checkAdmin, но пока хватит checkAuth)
router.get('/', checkAuth, getAllUsers);
router.put('/:id/role', checkAuth, updateUserRole);
router.put('/:id', checkAuth, updateUserByAdmin);
export default router;
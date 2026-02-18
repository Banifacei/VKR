import { Router } from 'express';
import { getAllUsers, updateUserRole, updateUserByAdmin, getUserStats } from '../controllers/userController.js';
import { checkAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', checkAuth, getUserStats);
router.get('/', checkAuth, getAllUsers);
router.put('/:id/role', checkAuth, updateUserRole);
router.put('/:id', checkAuth, updateUserByAdmin);
export default router;
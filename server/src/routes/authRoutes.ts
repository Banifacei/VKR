import { Router } from 'express';
import { register, login, updateProfile, getMe } from '../controllers/authController.js';
import { checkAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Маршруты для регистрации и входа
router.post('/register', register);
router.post('/login', login);
router.put('/update', updateProfile);
router.get('/me', checkAuth, getMe);

export default router;
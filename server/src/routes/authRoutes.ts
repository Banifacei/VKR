import { Router } from 'express';
import { register, login, updateProfile } from '../models/authController.js';

const router = Router();

// Маршруты для регистрации и входа
router.post('/register', register);
router.post('/login', login);
router.put('/update', updateProfile);

export default router;
import express, { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { register, login, updateProfile, getMe, yandexLoginRedirect, yandexCallback, getAuthSettings, googleLoginRedirect, googleCallback, samlLoginRedirect, samlCallback, exchangeOAuthCode } from '../controllers/authController.js';
import { checkAuth } from '../middleware/authMiddleware.js';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 20,                   // максимум 20 запросов с одного IP
    message: { message: 'Слишком много попыток. Подождите 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Маршруты для регистрации и входа
router.get('/settings', getAuthSettings);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/exchange', authLimiter, exchangeOAuthCode);
router.put('/update', checkAuth, updateProfile);
router.get('/me', checkAuth, getMe);
router.get('/yandex', yandexLoginRedirect);
router.get('/yandex/callback', yandexCallback);
router.get('/google', googleLoginRedirect);
router.get('/google/callback', googleCallback);
router.get('/saml', samlLoginRedirect);
// ВАЖНО: Тут POST и встроенный парсер express.urlencoded
router.post('/saml/callback', express.urlencoded({ extended: true }), samlCallback);
export default router;
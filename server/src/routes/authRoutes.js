import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, loginDemo, updateProfile, getMe, completeOnboarding, dismissHomework, yandexLoginRedirect, yandexCallback, getAuthSettings, samlLoginRedirect, samlCallback, exchangeOAuthCode, forgotPassword, resetPassword, verifyEmail, resendVerification, esiaLoginRedirect } from '../controllers/authController.js';
import { checkAuth, createSseTicket } from '../middleware/authMiddleware.js';
const router = Router();
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 20, // максимум 20 запросов с одного IP
    message: { message: 'Слишком много попыток. Подождите 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Маршруты для регистрации и входа
router.get('/settings', getAuthSettings);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/exchange', authLimiter, exchangeOAuthCode);
router.post('/demo', authLimiter, loginDemo);
router.put('/update', checkAuth, updateProfile);
router.get('/me', checkAuth, getMe);
router.patch('/onboarding', checkAuth, completeOnboarding);
router.patch('/homework/dismiss', checkAuth, dismissHomework);
router.post('/sse-ticket', checkAuth, createSseTicket);
router.get('/yandex', yandexLoginRedirect);
router.get('/yandex/callback', yandexCallback);
router.get('/saml', samlLoginRedirect);
// ВАЖНО: Тут POST и встроенный парсер express.urlencoded
router.post('/saml/callback', express.urlencoded({ extended: true }), samlCallback);
// ЕСИА / Госуслуги — проектируемая интеграция (см. authController.ts для архитектуры)
router.get('/esia', esiaLoginRedirect);
export default router;

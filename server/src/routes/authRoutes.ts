import express, { Router } from 'express';
import passport from 'passport';
import { register, login, updateProfile, getMe, yandexLoginRedirect, yandexCallback, getAuthSettings, googleLoginRedirect, googleCallback, samlLoginRedirect, samlCallback } from '../controllers/authController.js';
import { checkAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Маршруты для регистрации и входа
router.get('/settings', getAuthSettings);
router.post('/register', register);
router.post('/login', login);
router.put('/update', updateProfile);
router.get('/me', checkAuth, getMe);
router.get('/yandex', yandexLoginRedirect);
router.get('/yandex/callback', yandexCallback);
router.get('/google', googleLoginRedirect);
router.get('/google/callback', googleCallback);
router.get('/saml', samlLoginRedirect);
// ВАЖНО: Тут POST и встроенный парсер express.urlencoded
router.post('/saml/callback', express.urlencoded({ extended: true }), samlCallback);
export default router;
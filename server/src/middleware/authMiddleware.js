import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
// Краткосрочные SSE-тикеты (TTL 5 мин, выдаются через POST /auth/sse-ticket)
const sseTickets = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of sseTickets)
        if (v.exp < now)
            sseTickets.delete(k);
}, 60_000);
export const createSseTicket = (req, res) => {
    const user = req.user;
    const ticket = randomUUID();
    sseTickets.set(ticket, { ...user, exp: Date.now() + 5 * 60 * 1000 });
    res.json({ ticket });
};
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET не задан в .env. Установите переменную окружения перед запуском сервера.');
}
const JWT_SECRET = process.env.JWT_SECRET;
export const isAdmin = async (req, res, next) => {
    try {
        const tokenUserId = req.user?.id;
        if (!tokenUserId) {
            return res.status(401).json({ message: 'Пользователь не идентифицирован' });
        }
        const currentUser = await User.findByPk(tokenUserId);
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                message: 'Доступ запрещен. Роль была понижена или у вас нет прав.'
            });
        }
        // Всё отлично, пускаем дальше
        next();
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка проверки прав доступа' });
    }
};
export const checkAuth = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        next();
        return;
    }
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Токен отсутствует. Пожалуйста, войдите в систему.' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        // Берём актуальные роль и статус из БД (JWT может быть выдан до смены роли)
        const dbUser = await User.findOne({ where: { id: decoded.id }, attributes: ['id', 'role', 'status', 'banReason', 'isDemo'] });
        if (!dbUser) {
            return res.status(401).json({ message: 'Пользователь не найден.' });
        }
        if (dbUser.status === 'banned') {
            return res.status(403).json({ banned: true, message: 'Ваш аккаунт заблокирован администратором.', banReason: dbUser.banReason ?? null });
        }
        req.user = { ...decoded, role: dbUser.role, isDemo: dbUser.isDemo ?? false };
        next();
    }
    catch (e) {
        res.status(401).json({ message: 'Сессия истекла или токен неверный' });
    }
};
/** Блокирует деструктивные действия для demo-пользователей. */
export const demoRestrict = (req, res, next) => {
    if (req.user?.isDemo) {
        return res.status(403).json({ code: 'DEMO_RESTRICTED', message: 'В демо-режиме это действие недоступно.' });
    }
    next();
};
/** Проверяет что пользователь имеет роль teacher или admin (из JWT).
 *  Используется для эндпоинтов, недоступных студентам. */
export const isTeacherOrAdmin = (req, res, next) => {
    const user = req.user;
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
        return next();
    }
    res.status(403).json({ message: 'Доступ запрещён. Требуется роль преподавателя или администратора.' });
};
/** Вариант checkAuth для SSE-эндпоинтов.
 *  Приоритет: ?ticket= (краткосрочный UUID) > ?token= (полный JWT, legacy) > Authorization header.
 *  Используй ?ticket= — JWT не попадает в URL-логи прокси. */
export const checkAuthSse = (req, res, next) => {
    try {
        const ticket = req.query.ticket;
        if (ticket) {
            const data = sseTickets.get(ticket);
            if (!data || data.exp < Date.now()) {
                sseTickets.delete(ticket ?? '');
                return res.status(401).end();
            }
            req.user = data;
            return next();
        }
        const token = req.query.token || req.headers.authorization?.split(' ')[1];
        if (!token)
            return res.status(401).end();
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).end();
    }
};

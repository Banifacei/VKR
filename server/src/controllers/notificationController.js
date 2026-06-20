import { Notification } from '../models/Notification.js';
import { createChannel } from '../utils/sseHub.js';
// SSE-канал: userId → уведомления в реальном времени
export const notificationSse = createChannel();
// ─── Вспомогательная функция — вызывается из других контроллеров ─────────────
export const sendNotification = async (userId, type, title, message, link) => {
    try {
        const n = await Notification.create({ userId, type, title, message, link: link || null });
        notificationSse.broadcast(userId, { ...n.toJSON() });
        return n;
    }
    catch (e) {
        console.error('[Notification] Ошибка создания:', e);
    }
};
// GET /api/notifications — получить уведомления текущего пользователя
export const getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const notifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
        const unread = await Notification.count({ where: { userId, isRead: false } });
        res.json({ notifications, unread });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения уведомлений' });
    }
};
// PATCH /api/notifications/:id/read — отметить одно как прочитанное
export const markAsRead = async (req, res) => {
    const userId = req.user.id;
    try {
        await Notification.update({ isRead: true }, { where: { id: req.params.id, userId } });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};
// PATCH /api/notifications/read-all — все прочитаны
export const markAllRead = async (req, res) => {
    const userId = req.user.id;
    try {
        await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};
// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
    const userId = req.user.id;
    try {
        await Notification.destroy({ where: { id: req.params.id, userId } });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};
// SSE endpoint — подключение клиента
export const sseNotifications = (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).end();
    notificationSse.subscribe(userId, req, res);
};

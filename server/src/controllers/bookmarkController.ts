import { Request, Response } from 'express';
import { VideoBookmark } from '../models/VideoBookmark.js';
import { Video } from '../models/Video.js';

// GET /api/bookmarks/video/:videoId
export const getBookmarks = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { videoId } = req.params;
    try {
        const bookmarks = await VideoBookmark.findAll({
            where: { videoId: Number(videoId), userId },
            order: [['timestamp', 'ASC']],
        });
        res.json(bookmarks);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /api/bookmarks/all — все закладки пользователя (для профиля)
export const getAllBookmarks = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const bookmarks = await VideoBookmark.findAll({
            where: { userId },
            include: [{ model: Video, as: 'video', attributes: ['id', 'title', 'courseId'] }],
            order: [['createdAt', 'DESC']],
            limit: 100,
        });
        res.json(bookmarks);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// POST /api/bookmarks/video/:videoId
export const addBookmark = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { videoId } = req.params;
    const { timestamp, note } = req.body;

    if (timestamp === undefined || timestamp < 0)
        return res.status(400).json({ message: 'Укажите таймкод' });

    try {
        const bookmark = await VideoBookmark.create({
            videoId: Number(videoId),
            userId,
            timestamp: Number(timestamp),
            note: note?.trim() || null,
        });
        res.status(201).json(bookmark);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка создания закладки' });
    }
};

// PATCH /api/bookmarks/:id — обновить заметку
export const updateBookmark = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const bm = await VideoBookmark.findOne({ where: { id: req.params.id, userId } });
        if (!bm) return res.status(404).json({ message: 'Не найдено' });
        bm.note = req.body.note?.trim() || null;
        await bm.save();
        res.json(bm);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// DELETE /api/bookmarks/:id
export const deleteBookmark = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        await VideoBookmark.destroy({ where: { id: req.params.id, userId } });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка' });
    }
};

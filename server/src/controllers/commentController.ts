import { Request, Response } from 'express';
import { VideoComment } from '../models/VideoComment.js';
import { User } from '../models/User.js';
import { filterText } from './bannedWordController.js';
import { createChannel } from '../utils/sseHub.js';

export const commentChannel = createChannel<number>();

// GET /api/comments/video/:videoId
export const getComments = async (req: Request, res: Response) => {
    const { videoId } = req.params;
    try {
        const comments = await VideoComment.findAll({
            where: { videoId: Number(videoId), parentId: null },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'],
                },
                {
                    model: VideoComment,
                    as: 'replies',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'],
                    }],
                    order: [['createdAt', 'ASC']],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.json(comments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения комментариев' });
    }
};

// POST /api/comments/video/:videoId
export const addComment = async (req: Request, res: Response) => {
    const { videoId } = req.params;
    const userId = (req as any).user.id;
    const { text, parentId } = req.body;

    if (!text || !text.trim()) return res.status(400).json({ message: 'Текст обязателен' });
    if (text.trim().length > 2000) return res.status(400).json({ message: 'Слишком длинный комментарий' });

    try {
        const filteredText = await filterText(text.trim(), { userId, videoId: Number(videoId) });
        const comment = await VideoComment.create({
            videoId: Number(videoId),
            userId,
            text: filteredText,
            parentId: parentId || null,
        });

        const full = await VideoComment.findByPk(comment.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }],
        });
        commentChannel.broadcast(Number(videoId), {
            type: 'new_comment',
            comment: (full as any).toJSON(),
            parentId: parentId || null,
        });
        res.status(201).json(full);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка добавления комментария' });
    }
};

// GET /api/comments/video/:videoId/stream  (SSE)
export const streamComments = (req: Request, res: Response) => {
    const videoId = Number(req.params.videoId);
    commentChannel.subscribe(videoId, req, res);
};

// DELETE /api/comments/:id
export const deleteComment = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    try {
        const comment = await VideoComment.findByPk(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Комментарий не найден' });
        if (comment.userId !== userId && userRole === 'student')
            return res.status(403).json({ message: 'Нет доступа' });

        const videoId = comment.videoId;
        const parentId = comment.parentId;
        const commentId = comment.id;

        // Удаляем ответы и сам комментарий
        await VideoComment.destroy({ where: { parentId: comment.id } });
        await comment.destroy();

        // Уведомляем всех через SSE
        commentChannel.broadcast(videoId, {
            type: 'delete_comment',
            commentId,
            parentId: parentId || null,
        });

        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка удаления' });
    }
};

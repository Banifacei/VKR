import { Request, Response } from 'express';
import { VideoComment } from '../models/VideoComment.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { Course } from '../models/Course.js';
import { filterText } from './bannedWordController.js';
import { createChannel } from '../utils/sseHub.js';
import { sendNotification } from './notificationController.js';

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
        const originalText = text.trim();
        const filteredText = await filterText(originalText, { userId, videoId: Number(videoId) });
        const hasBannedWord = filteredText !== originalText;

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

        // Уведомления — fire-and-forget после ответа
        const author = (full as any).user;
        const authorName = `${author.firstName} ${author.lastName}`;

        // 1. Если это ответ — уведомляем автора исходного комментария
        if (parentId) {
            const parent = await VideoComment.findByPk(parentId);
            if (parent && parent.userId !== userId) {
                const video = await Video.findByPk(Number(videoId), { attributes: ['id', 'title', 'courseId'] });
                sendNotification(
                    parent.userId,
                    'comment_reply',
                    'Новый ответ на ваш комментарий',
                    `${authorName} ответил(а) на ваш комментарий`,
                    video ? `/courses/${video.courseId}/video/${video.id}` : undefined,
                ).catch(() => {});
            }
        }

        // 2. Если найдено бан-слово — уведомляем владельца курса и всех админов
        if (hasBannedWord) {
            const video = await Video.findByPk(Number(videoId), { attributes: ['id', 'title', 'courseId'] });
            if (video) {
                const course = await Course.findByPk(video.courseId, { attributes: ['id', 'title', 'ownerId'] });
                if (course) {
                    const link = `/courses/${course.id}/video/${video.id}`;
                    const notifTitle = 'Нарушение правил в комментарии';
                    const notifMsg = `${authorName} написал(а) запрещённое слово в уроке "${video.title}"`;

                    // Владелец курса
                    sendNotification(course.ownerId, 'banned_word', notifTitle, notifMsg, link).catch(() => {});

                    // Все администраторы (кроме самого владельца, чтоб не дублировать)
                    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
                    for (const admin of admins) {
                        if (admin.id !== course.ownerId) {
                            sendNotification(admin.id, 'banned_word', notifTitle, notifMsg, link).catch(() => {});
                        }
                    }
                }
            }
        }
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

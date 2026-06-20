import { CourseRating } from '../models/CourseRating.js';
import { User } from '../models/User.js';
// GET /api/ratings/course/:courseId
export const getCourseRatings = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;
    try {
        const ratings = await CourseRating.findAll({
            where: { courseId: Number(courseId) },
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
        const avg = ratings.length
            ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
            : 0;
        const myRating = ratings.find(r => r.userId === userId);
        res.json({ ratings, avg, total: ratings.length, myRating: myRating || null });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения оценок' });
    }
};
// POST /api/ratings/course/:courseId — upsert
export const upsertRating = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ message: 'Оценка должна быть от 1 до 5' });
    try {
        const [record, created] = await CourseRating.findOrCreate({
            where: { courseId: Number(courseId), userId },
            defaults: { rating, review: review || null },
        });
        if (!created) {
            record.rating = rating;
            record.review = review || null;
            await record.save();
        }
        res.json(record);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка сохранения оценки' });
    }
};
// DELETE /api/ratings/course/:courseId
export const deleteRating = async (req, res) => {
    const userId = req.user.id;
    const { courseId } = req.params;
    try {
        await CourseRating.destroy({ where: { courseId: Number(courseId), userId } });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка удаления оценки' });
    }
};

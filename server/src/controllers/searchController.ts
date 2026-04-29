import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Course } from '../models/Course.js';
import { Video } from '../models/Video.js';
import { User } from '../models/User.js';
import { CourseTest } from '../models/CourseTest.js';

export const globalSearch = async (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').trim();
    if (q.length < 2) {
        return res.json({ courses: [], videos: [], tests: [], users: [] });
    }

    const userRole = (req as any).user?.role;
    const pattern = { [Op.iLike]: `%${q}%` };

    try {
        const [courses, videos, tests] = await Promise.all([
            Course.findAll({
                where: { [Op.or]: [{ title: pattern }, { description: pattern }, { instructor: pattern }] },
                attributes: ['id', 'title', 'description', 'instructor', 'coverImage'],
                limit: 6,
            }),
            Video.findAll({
                where: { title: pattern },
                attributes: ['id', 'title', 'courseId'],
                include: [{ model: Course, as: 'course', attributes: ['title'] }],
                limit: 6,
            }),
            CourseTest.findAll({
                where: { title: pattern },
                attributes: ['id', 'title', 'courseId'],
                include: [{ model: Course, as: 'course', attributes: ['title'] }],
                limit: 6,
            }),
        ]);

        let users: any[] = [];
        if (userRole === 'teacher' || userRole === 'admin') {
            const roleWhere = userRole === 'teacher'
                ? { role: { [Op.in]: ['student', 'teacher'] } }  // препод не видит админов
                : {};
            users = await User.findAll({
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { firstName: pattern },
                                { lastName: pattern },
                                { email: pattern },
                            ],
                        },
                        roleWhere,
                    ],
                },
                attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl'],
                limit: 6,
            });
        }

        res.json({ courses, videos, tests, users });
    } catch (e) {
        console.error('[Search]', e);
        res.status(500).json({ message: 'Ошибка поиска' });
    }
};

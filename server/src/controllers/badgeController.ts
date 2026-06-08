import { Request, Response } from 'express';
import { UserBadge, type BadgeType } from '../models/UserBadge.js';
import { CourseCertificate } from '../models/CourseCertificate.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { CourseTest } from '../models/CourseTest.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { HomeworkAssignment } from '../models/HomeworkAssignment.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { User } from '../models/User.js';
import { Op } from 'sequelize';
import { sendNotification } from './notificationController.js';

export const BADGE_META: Record<BadgeType, { label: string; description: string; icon: string }> = {
    first_course:  { label: 'Первые шаги',    description: 'Завершил первый курс',          icon: '🎓' },
    five_courses:  { label: 'Опытный студент', description: 'Завершил 5 курсов',             icon: '🏆' },
    perfect_score: { label: 'Отличник',        description: 'Сдал тест на 100%',             icon: '⭐' },
    speedster:     { label: 'Первый раз — отлично', description: 'Сдал тест на 100% с первой попытки', icon: '⚡' },
    punctual:      { label: 'Пунктуальный',    description: 'Сдал задание до дедлайна',      icon: '⏰' },
};

// Выдать бейдж (если ещё не выдан). Возвращает true если выдан новый.
export async function awardBadge(userId: number, badgeType: BadgeType): Promise<boolean> {
    const exists = await UserBadge.findOne({ where: { userId, badgeType } });
    if (exists) return false;
    await UserBadge.create({ userId, badgeType });
    const meta = BADGE_META[badgeType];
    sendNotification(
        userId, 'badge_earned',
        `${meta.icon} Новый бейдж: «${meta.label}»`,
        meta.description,
        '/profile',
    ).catch(() => {});
    return true;
}

// Проверка бейджей при завершении курса
export async function checkCourseCompletionBadges(userId: number) {
    const certCount = await CourseCertificate.count({ where: { userId } });
    if (certCount >= 1) await awardBadge(userId, 'first_course');
    if (certCount >= 5) await awardBadge(userId, 'five_courses');
}

// Проверка бейджей при сдаче теста
export async function checkTestBadges(userId: number, score: number, testId: number) {
    if (score < 100) return;
    await awardBadge(userId, 'perfect_score');
    // speedster — первая попытка (до записи текущего результата = ровно 0 предыдущих)
    const prevAttempts = await UserTestResult.count({ where: { userId, testId } });
    if (prevAttempts === 0) await awardBadge(userId, 'speedster');
}

// Проверка бейджей при сдаче ДЗ до дедлайна
export async function checkHomeworkBadges(userId: number, assignmentId: number) {
    const assignment = await HomeworkAssignment.findByPk(assignmentId, { attributes: ['deadline'] });
    if (!assignment || !(assignment as any).deadline) return;
    const deadline = new Date((assignment as any).deadline);
    if (new Date() <= deadline) await awardBadge(userId, 'punctual');
}

// GET /api/badges/my
export const getMyBadges = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const badges = await UserBadge.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });
    res.json(badges.map(b => ({
        badgeType: b.badgeType,
        earnedAt: b.createdAt,
        ...BADGE_META[b.badgeType as BadgeType],
    })));
};

// GET /api/badges/user/:userId
export const getUserBadges = async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const badges = await UserBadge.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });
    res.json(badges.map(b => ({ badgeType: b.badgeType, earnedAt: b.createdAt, ...BADGE_META[b.badgeType as BadgeType] })));
};

// GET /api/badges/leaderboard/:courseId
export const getCourseLeaderboard = async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    try {
        // Все студенты на курсе
        const enrollments = await CourseEnrollment.findAll({
            where: { courseId, status: 'approved' },
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
        });

        // Тесты курса
        const tests = await CourseTest.findAll({ where: { courseId, isHidden: false }, attributes: ['id', 'passingScore'] });
        const testIds = tests.map(t => t.id);

        const rows = await Promise.all(enrollments.map(async (e: any) => {
            const uid = e.userId;
            let totalScore = 0;
            let passedTests = 0;

            if (testIds.length > 0) {
                const results = await UserTestResult.findAll({ where: { userId: uid, testId: testIds } });
                const bestByTest: Record<number, number> = {};
                for (const r of results) {
                    if ((bestByTest[r.testId] ?? -1) < r.score) bestByTest[r.testId] = r.score;
                }
                for (const [testIdStr, score] of Object.entries(bestByTest)) {
                    totalScore += score as number;
                    const test = tests.find(t => t.id === Number(testIdStr));
                    if ((score as number) >= (test?.passingScore ?? 80)) passedTests++;
                }
            }

            return {
                userId: uid,
                firstName: e.user?.firstName ?? '',
                lastName: e.user?.lastName ?? '',
                avatarUrl: e.user?.avatarUrl ?? null,
                totalScore,
                passedTests,
            };
        }));

        rows.sort((a, b) => b.totalScore - a.totalScore);
        res.json(rows.map((r, i) => ({ ...r, rank: i + 1 })));
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка' });
    }
};

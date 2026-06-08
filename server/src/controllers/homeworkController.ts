import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { HomeworkAssignment } from '../models/HomeworkAssignment.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { User } from '../models/User.js';
import { sendNotification } from './notificationController.js';
import { checkHomeworkBadges } from './badgeController.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

const getMaxFileSize = async (): Promise<number> => {
    const s = await SystemSetting.findOne({ where: { key: 'homework_max_file_size_mb' } });
    return s ? Number(s.value) || 20 : 20;
};

const notifyStudents = async (assignment: HomeworkAssignment, message: string) => {
    const enrollments = await CourseEnrollment.findAll({
        where: { courseId: assignment.courseId, status: 'approved' },
    });
    for (const e of enrollments) {
        sendNotification(e.userId, 'homework_assigned', assignment.title, message, `/course/${assignment.courseId}`).catch(() => {});
    }
};

const scheduleReminders = (assignment: HomeworkAssignment) => {
    if (!assignment.reminderDays?.length) return;
    const deadline = new Date(assignment.deadline);
    for (const days of assignment.reminderDays) {
        const fireAt = new Date(deadline.getTime() - days * 86400000);
        const delay = fireAt.getTime() - Date.now();
        if (delay <= 0) continue;
        setTimeout(async () => {
            const still = await HomeworkAssignment.findByPk(assignment.id);
            if (!still) return;
            const enrollments = await CourseEnrollment.findAll({ where: { courseId: assignment.courseId, status: 'approved' } });
            for (const e of enrollments) {
                const sub = await HomeworkSubmission.findOne({ where: { assignmentId: assignment.id, studentId: e.userId } });
                if (!sub) {
                    const daysText = days === 1 ? 'день' : days < 5 ? 'дня' : 'дней';
                    sendNotification(e.userId, 'homework_reminder', `Напоминание: ${assignment.title}`, `До сдачи осталось ${days} ${daysText}`, `/assignments`).catch(() => {});
                }
            }
        }, delay);
    }
};

// ─── Attached (галочка на видео/тесте) ───────────────────────────────────────

// POST /hw/attach  { entityType, entityId, courseId, deadline, title }
export const attachHomework = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { entityType, entityId, courseId, deadline, title } = req.body;

        const existing = await HomeworkAssignment.findOne({ where: { type: 'attached', entityType, entityId } });
        if (existing) {
            // Обновить дедлайн
            await existing.update({ deadline: new Date(deadline) });
            res.json(existing);
            return;
        }

        const assignment = await HomeworkAssignment.create({
            type: 'attached', entityType, entityId,
            courseId: Number(courseId), title,
            deadline: new Date(deadline),
            createdBy: userId,
        });

        const deadlineStr = new Date(deadline).toLocaleDateString('ru-RU');
        notifyStudents(assignment, `Выполните задание до ${deadlineStr}`).catch(() => {});

        res.status(201).json(assignment);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка' });
    }
};

// DELETE /hw/attach?entityType=video&entityId=5
export const detachHomework = async (req: Request, res: Response) => {
    try {
        const { entityType, entityId } = req.query;
        const a = await HomeworkAssignment.findOne({ where: { type: 'attached', entityType: entityType as string, entityId: Number(entityId) } });
        if (a) await a.destroy();
        res.json({ ok: true });
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/by-entity?entityType=video&entityId=5
export const getAssignmentByEntity = async (req: Request, res: Response) => {
    try {
        const { entityType, entityId } = req.query;
        const a = await HomeworkAssignment.findOne({ where: { type: 'attached', entityType: entityType as string, entityId: Number(entityId) } });
        res.json(a || null);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// ─── Standalone (отдельная карточка ДЗ) ──────────────────────────────────────

// POST /hw/  — создать standalone ДЗ
export const createAssignment = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { courseId, title, description, deadline, strictDeadline, allowResubmit,
            allowedFileTypes, showFeedbackToStudent, reminderDays, maxScore, taskLink, orderIndex } = req.body;

        const assignment = await HomeworkAssignment.create({
            type: 'standalone',
            courseId: Number(courseId), title,
            description: description || null,
            taskLink: taskLink || null,
            taskFiles: [],
            deadline: new Date(deadline),
            strictDeadline: !!strictDeadline,
            allowResubmit: !!allowResubmit,
            allowedFileTypes: allowedFileTypes?.length ? allowedFileTypes : null,
            showFeedbackToStudent: showFeedbackToStudent !== false,
            reminderDays: reminderDays || [],
            maxScore: maxScore || 100,
            orderIndex: orderIndex || 0,
            createdBy: userId,
        });

        const deadlineStr = new Date(deadline).toLocaleDateString('ru-RU');
        notifyStudents(assignment, `Срок сдачи — ${deadlineStr}`).catch(() => {});
        scheduleReminders(assignment);

        res.status(201).json(assignment);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка создания задания' });
    }
};

// PATCH /hw/:id  — обновить standalone ДЗ
export const updateAssignment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const a = await HomeworkAssignment.findByPk(id);
        if (!a) { res.status(404).json({ message: 'Не найдено' }); return; }

        const { title, description, deadline, strictDeadline, allowResubmit,
            allowedFileTypes, showFeedbackToStudent, reminderDays, maxScore, taskLink } = req.body;

        await a.update({
            title: title ?? a.title,
            description: description !== undefined ? (description || null) : a.description,
            taskLink: taskLink !== undefined ? (taskLink || null) : a.taskLink,
            deadline: deadline ? new Date(deadline) : a.deadline,
            strictDeadline: strictDeadline !== undefined ? !!strictDeadline : a.strictDeadline,
            allowResubmit: allowResubmit !== undefined ? !!allowResubmit : a.allowResubmit,
            allowedFileTypes: allowedFileTypes !== undefined ? (allowedFileTypes?.length ? allowedFileTypes : null) : a.allowedFileTypes,
            showFeedbackToStudent: showFeedbackToStudent !== undefined ? showFeedbackToStudent !== false : a.showFeedbackToStudent,
            reminderDays: reminderDays ?? a.reminderDays,
            maxScore: maxScore ?? a.maxScore,
        });

        res.json(a);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// PATCH /hw/:id/files  — загрузить файлы-условия препода (multipart)
export const uploadTaskFiles = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const a = await HomeworkAssignment.findByPk(id);
        if (!a) { res.status(404).json({ message: 'Не найдено' }); return; }

        const files = (req.files as Express.Multer.File[]) || [];
        const newFiles = files.map(f => ({
            name: f.originalname,
            path: `/uploads/homework/${f.filename}`,
            size: f.size,
            mimeType: f.mimetype,
        }));

        await a.update({ taskFiles: [...(a.taskFiles || []), ...newFiles] });
        res.json(a);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// DELETE /hw/:id/files/:index  — удалить файл-условие
export const deleteTaskFile = async (req: Request, res: Response) => {
    try {
        const { id, index } = req.params;
        const a = await HomeworkAssignment.findByPk(id);
        if (!a) { res.status(404).json({ message: 'Не найдено' }); return; }

        const files = [...(a.taskFiles || [])];
        files.splice(Number(index), 1);
        await a.update({ taskFiles: files });
        res.json(a);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// POST /hw/:id/publish — опубликовать и уведомить студентов
export const publishAssignment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const a = await HomeworkAssignment.findByPk(id);
        if (!a) { res.status(404).json({ message: 'Не найдено' }); return; }

        await a.update({ isPublished: true });

        const deadlineStr = new Date(a.deadline).toLocaleDateString('ru-RU');
        notifyStudents(a, `Срок сдачи — ${deadlineStr}`).catch(() => {});
        scheduleReminders(a);

        res.json(a);
    } catch {
        res.status(500).json({ message: 'Ошибка публикации' });
    }
};

// DELETE /hw/:id
export const deleteAssignment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const a = await HomeworkAssignment.findByPk(id);
        if (!a) { res.status(404).json({ message: 'Не найдено' }); return; }
        await a.destroy();
        res.json({ ok: true });
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/course/:courseId  — standalone ДЗ курса
// Студенты видят только опубликованные, препод/admin — все включая черновики
export const getCourseAssignments = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const role = (req as any).user?.role;
        const isTeacher = role === 'teacher' || role === 'admin';

        const where: any = { courseId: Number(courseId), type: 'standalone' };
        if (!isTeacher) where.isPublished = true;

        const assignments = await HomeworkAssignment.findAll({ where, order: [['orderIndex', 'ASC']] });
        res.json(assignments);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/teacher/all  — все ДЗ препода с количеством сдач
export const getTeacherAssignments = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const assignments = await HomeworkAssignment.findAll({
            where: { createdBy: userId, type: 'standalone' },
            include: [{ model: HomeworkSubmission, as: 'submissions', attributes: ['id', 'status', 'isLate', 'grade'] }],
            order: [['deadline', 'ASC']],
        });
        res.json(assignments);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/:id/submissions  — список сдач (препод)
export const getSubmissions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const submissions = await HomeworkSubmission.findAll({
            where: { assignmentId: Number(id) },
            include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'] }],
            order: [['submittedAt', 'DESC']],
        });
        res.json(submissions);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// ─── Студент ──────────────────────────────────────────────────────────────────

// GET /hw/my  — все standalone ДЗ по курсам студента
export const getStudentAssignments = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const enrollments = await CourseEnrollment.findAll({ where: { userId, status: 'approved' } });
        const courseIds = enrollments.map(e => e.courseId);
        if (!courseIds.length) { res.json([]); return; }

        const assignments = await HomeworkAssignment.findAll({
            where: { courseId: { [Op.in]: courseIds }, type: 'standalone', isPublished: true },
            order: [['deadline', 'ASC']],
        });

        const subs = await HomeworkSubmission.findAll({
            where: { studentId: userId, assignmentId: { [Op.in]: assignments.map(a => a.id) } },
        });
        const subMap = new Map(subs.map(s => [s.assignmentId, s]));

        res.json(assignments.map(a => ({ ...a.toJSON(), submission: subMap.get(a.id) || null })));
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/:assignmentId/my-submission
export const getMySubmission = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { assignmentId } = req.params;
        const sub = await HomeworkSubmission.findOne({ where: { assignmentId: Number(assignmentId), studentId: userId } });
        res.json(sub || null);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// POST /hw/:assignmentId/submit
export const submitHomework = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { assignmentId } = req.params;
        const { textAnswer } = req.body;
        const files = (req.files as Express.Multer.File[]) || [];

        const assignment = await HomeworkAssignment.findByPk(Number(assignmentId));
        if (!assignment) { res.status(404).json({ message: 'Задание не найдено' }); return; }

        const now = new Date();
        const isLate = now > new Date(assignment.deadline);

        if (isLate && assignment.strictDeadline) {
            res.status(403).json({ message: 'Срок сдачи истёк. Приём работ закрыт.' });
            return;
        }

        if (assignment.allowedFileTypes?.length && files.length) {
            const maxMb = await getMaxFileSize();
            for (const f of files) {
                const ext = f.originalname.split('.').pop()?.toLowerCase() || '';
                if (!assignment.allowedFileTypes.includes(ext)) {
                    res.status(400).json({ message: `Тип файла .${ext} не разрешён` });
                    return;
                }
                if (f.size > maxMb * 1024 * 1024) {
                    res.status(400).json({ message: `Файл превышает ${maxMb} МБ` });
                    return;
                }
            }
        }

        const fileData = files.map(f => ({
            name: f.originalname,
            path: `/uploads/homework/${f.filename}`,
            size: f.size,
            mimeType: f.mimetype,
        }));

        const existing = await HomeworkSubmission.findOne({ where: { assignmentId: Number(assignmentId), studentId: userId } });

        if (existing) {
            if (existing.status === 'graded' && !assignment.allowResubmit) {
                res.status(403).json({ message: 'Повторная сдача не разрешена' });
                return;
            }
            await existing.update({ files: fileData, textAnswer: textAnswer || null, submittedAt: now, isLate, status: 'resubmitted' });
            res.json(existing);
        } else {
            const sub = await HomeworkSubmission.create({
                assignmentId: Number(assignmentId), studentId: userId,
                files: fileData, textAnswer: textAnswer || null,
                submittedAt: now, isLate, status: 'submitted',
            });
            sendNotification(assignment.createdBy, 'homework_submitted', `Сдано ДЗ: ${assignment.title}`, isLate ? 'Сдано с опозданием' : 'Вовремя', `/assignments`).catch(() => {});
            if (!isLate) checkHomeworkBadges(userId, Number(assignmentId)).catch(() => {});
            res.status(201).json(sub);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка сдачи' });
    }
};

// PATCH /hw/submissions/:id/grade
export const gradeSubmission = async (req: Request, res: Response) => {
    try {
        const graderId = (req as any).user.id;
        const { id } = req.params;
        const { grade, teacherComment } = req.body;

        const sub = await HomeworkSubmission.findByPk(Number(id), {
            include: [{ model: HomeworkAssignment, as: 'assignment' }],
        });
        if (!sub) { res.status(404).json({ message: 'Не найдено' }); return; }

        await sub.update({
            grade: grade !== undefined ? Number(grade) : sub.grade,
            teacherComment: teacherComment !== undefined ? (teacherComment || null) : sub.teacherComment,
            gradedAt: new Date(), gradedBy: graderId, status: 'graded',
        });

        const assignment = sub.assignment;
        if (assignment?.showFeedbackToStudent) {
            const scoreText = grade !== undefined ? ` Оценка: ${grade}/${assignment.maxScore}.` : '';
            sendNotification(sub.studentId, 'homework_graded', `Проверено ДЗ: ${assignment.title}`, `Преподаватель проверил задание.${scoreText}`, `/assignments`).catch(() => {});
        }

        res.json(sub);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/course/:courseId/stats  — средний балл за ДЗ (для аналитики)
export const getCourseHomeworkStats = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const assignments = await HomeworkAssignment.findAll({ where: { courseId: Number(courseId), type: 'standalone' } });
        if (!assignments.length) { res.json({ avgScore: null, totalAssignments: 0, gradedCount: 0 }); return; }

        const subs = await HomeworkSubmission.findAll({
            where: { assignmentId: { [Op.in]: assignments.map(a => a.id) }, status: 'graded', grade: { [Op.not]: null } },
        });

        const avgScore = subs.length ? Math.round(subs.reduce((s, x) => s + (x.grade ?? 0), 0) / subs.length) : null;
        res.json({ avgScore, totalAssignments: assignments.length, gradedCount: subs.length });
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

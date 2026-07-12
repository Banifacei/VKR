import { Request, Response } from 'express';
import fs from 'fs';
import zlib from 'zlib';
import { Op } from 'sequelize';
import { HomeworkAssignment } from '../models/HomeworkAssignment.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { User } from '../models/User.js';
import { sendNotification } from './notificationController.js';
import { checkHomeworkBadges } from './badgeController.js';
import { scanFile } from '../services/fileScanner.js';
import { PISTON_URL, FILE_NAMES, PISTON_LANG } from './codeExecutionController.js';
import { calculateSemanticSimilarity } from './testController.js';

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

type TestCaseResult = { id: string; passed: boolean; actualOutput: string; error?: string; isHidden: boolean };

// Прогоняет код студента через все тест-кейсы задания в Piston, считает автооценку.
// Для скрытых тест-кейсов actualOutput/error в результат не попадают.
const runTestCases = async (
    assignment: HomeworkAssignment,
    codeContent: string,
    codeLanguage: string,
): Promise<{ results: TestCaseResult[]; autoGrade: number }> => {
    const testCases = assignment.testCases || [];
    const pistonLang = PISTON_LANG[codeLanguage];
    const results: TestCaseResult[] = [];

    for (const tc of testCases) {
        try {
            const pistonRes = await fetch(`${PISTON_URL}/api/v2/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: pistonLang,
                    version: '*',
                    files: [{ name: FILE_NAMES[codeLanguage], content: codeContent }],
                    stdin: tc.input ?? '',
                    args: [],
                    run_timeout: 3000,
                    compile_timeout: 10000,
                    run_memory_limit: 256 * 1024 * 1024,
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (!pistonRes.ok) {
                results.push({ id: tc.id, passed: false, actualOutput: '', error: tc.isHidden ? undefined : 'Ошибка компилятора', isHidden: tc.isHidden });
                continue;
            }

            const data: any = await pistonRes.json();
            const stdout = (data.run?.stdout ?? '').trim();
            const stderr = (data.run?.stderr ?? '').trim();
            const exitCode = data.run?.code ?? -1;
            const passed = exitCode === 0 && stdout === (tc.expectedOutput ?? '').trim();

            results.push({
                id: tc.id,
                passed,
                actualOutput: tc.isHidden ? '' : stdout,
                error: tc.isHidden ? undefined : (stderr || undefined),
                isHidden: tc.isHidden,
            });
        } catch {
            results.push({ id: tc.id, passed: false, actualOutput: '', error: tc.isHidden ? undefined : 'Таймаут выполнения', isHidden: tc.isHidden });
        }
    }

    const passedCount = results.filter(r => r.passed).length;
    const autoGrade = testCases.length ? Math.round((passedCount / testCases.length) * assignment.maxScore) : 0;

    return { results, autoGrade };
};

// Убирает из ответа то, что студент не должен видеть в сыром JSON:
// эталонный ответ целиком и expectedOutput у скрытых тест-кейсов.
const sanitizeAssignmentForStudent = (a: HomeworkAssignment) => {
    const json: any = a.toJSON();
    json.hasReferenceAnswer = !!json.referenceAnswer;
    delete json.referenceAnswer;
    if (Array.isArray(json.testCases)) {
        json.testCases = json.testCases.map((tc: any) =>
            tc.isHidden ? { ...tc, expectedOutput: undefined } : tc
        );
    }
    return json;
};

// Сравнивает текстовый ответ студента с эталоном препода (косинусное сходство эмбеддингов).
// Эталон никогда не возвращается наружу — только % сходства и подсказка по баллу.
const checkTextAnswer = async (assignment: HomeworkAssignment, textAnswer: string) => {
    const similarity = await calculateSemanticSimilarity(textAnswer, assignment.referenceAnswer || '');
    const autoGrade = Math.round((similarity / 100) * assignment.maxScore);
    return { similarity, autoGrade };
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
            allowedFileTypes, showFeedbackToStudent, reminderDays, maxScore, taskLink, orderIndex,
            allowCodeSubmission, allowedCodeLanguages, recordCodeHistory, codeHistoryDeleteDays, codeTemplate, testCases, rubric,
            referenceAnswer, aiThreshold,
        } = req.body;

        const { type: reqType } = req.body;
        const hwType = reqType === 'code' ? 'code' : 'standalone';

        const assignment = await HomeworkAssignment.create({
            type: hwType,
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
            maxScore: maxScore || 5,
            orderIndex: orderIndex || 0,
            createdBy: userId,
            allowCodeSubmission: !!allowCodeSubmission,
            allowedCodeLanguages: allowedCodeLanguages || [],
            recordCodeHistory: recordCodeHistory !== false,
            codeHistoryDeleteDays: codeHistoryDeleteDays || null,
            codeTemplate: codeTemplate || null,
            testCases: testCases || [],
            rubric: rubric || [],
            referenceAnswer: referenceAnswer || null,
            aiThreshold: aiThreshold || 50,
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
            allowedFileTypes, showFeedbackToStudent, reminderDays, maxScore, taskLink,
            allowCodeSubmission, allowedCodeLanguages, recordCodeHistory, codeHistoryDeleteDays, codeTemplate, testCases, rubric,
            referenceAnswer, aiThreshold,
        } = req.body;

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
            allowCodeSubmission: allowCodeSubmission !== undefined ? !!allowCodeSubmission : a.allowCodeSubmission,
            allowedCodeLanguages: allowedCodeLanguages ?? a.allowedCodeLanguages,
            recordCodeHistory: recordCodeHistory !== undefined ? recordCodeHistory !== false : a.recordCodeHistory,
            codeHistoryDeleteDays: codeHistoryDeleteDays !== undefined ? (codeHistoryDeleteDays || null) : a.codeHistoryDeleteDays,
            codeTemplate: codeTemplate !== undefined ? (codeTemplate || null) : a.codeTemplate,
            testCases: testCases !== undefined ? testCases : a.testCases,
            rubric: rubric !== undefined ? rubric : a.rubric,
            referenceAnswer: referenceAnswer !== undefined ? (referenceAnswer || null) : a.referenceAnswer,
            aiThreshold: aiThreshold !== undefined ? aiThreshold : a.aiThreshold,
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
            name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
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

        const where: any = { courseId: Number(courseId), type: ['standalone', 'code'] };
        if (!isTeacher) where.isPublished = true;

        const assignments = await HomeworkAssignment.findAll({ where, order: [['orderIndex', 'ASC']] });
        res.json(isTeacher ? assignments : assignments.map(sanitizeAssignmentForStudent));
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// GET /hw/teacher/all  — все ДЗ препода с количеством сдач
export const getTeacherAssignments = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const assignments = await HomeworkAssignment.findAll({
            where: { createdBy: userId, type: ['standalone', 'code'] },
            include: [{ model: HomeworkSubmission, as: 'submissions', attributes: ['id', 'status', 'isLate', 'grade', 'autoGrade'] }],
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

        res.json(assignments.map(a => ({ ...sanitizeAssignmentForStudent(a), submission: subMap.get(a.id) || null })));
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

// POST /hw/:assignmentId/check-text  — прогон текстового ответа через ИИ-сверку (без фиксации сдачи)
export const checkTextHomework = async (req: Request, res: Response) => {
    try {
        const { assignmentId } = req.params;
        const { textAnswer } = req.body;

        const assignment = await HomeworkAssignment.findByPk(Number(assignmentId));
        if (!assignment) { res.status(404).json({ message: 'Задание не найдено' }); return; }
        if (!assignment.referenceAnswer) { res.status(400).json({ message: 'Для этого задания не задан эталонный ответ' }); return; }
        if (!textAnswer?.trim()) { res.status(400).json({ message: 'Напишите ответ перед проверкой' }); return; }

        const { similarity, autoGrade } = await checkTextAnswer(assignment, textAnswer);
        res.json({ similarity, autoGrade, maxScore: assignment.maxScore, threshold: assignment.aiThreshold });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка проверки ответа' });
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

        // Security scan: magic bytes + content analysis
        if (files.length) {
            for (const f of files) {
                const scan = scanFile(f.path, f.originalname);
                if (!scan.safe) {
                    for (const uploaded of files) fs.unlink(uploaded.path, () => {});

                    const student = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
                    const who = student ? `${student.firstName} ${student.lastName}` : `Студент #${userId}`;
                    const alertMsg = `${who} загрузил подозрительный файл "${f.originalname}". ${scan.reason ?? ''}`;

                    sendNotification(
                        assignment.createdBy, 'homework_threat',
                        '⚠️ Вредоносный файл', alertMsg, `/assignments`,
                    ).catch(() => {});

                    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
                    for (const admin of admins) {
                        if (admin.id !== assignment.createdBy) {
                            sendNotification(
                                admin.id, 'homework_threat',
                                '⚠️ Вредоносный файл', alertMsg, `/assignments`,
                            ).catch(() => {});
                        }
                    }

                    res.status(400).json({ message: `Файл отклонён: ${scan.reason ?? 'подозрительное содержимое'}` });
                    return;
                }
            }
        }

        const fileData = files.map(f => ({
            name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
            path: `/uploads/homework/${f.filename}`,
            size: f.size,
            mimeType: f.mimetype,
        }));

        // ИИ-сверка текстового ответа с эталоном (если препод его задал) — только подсказка
        let aiSimilarity: number | null = null;
        let autoGrade: number | null = null;
        if (assignment.referenceAnswer && textAnswer?.trim()) {
            const checked = await checkTextAnswer(assignment, textAnswer);
            aiSimilarity = checked.similarity;
            autoGrade = checked.autoGrade;
        }

        const existing = await HomeworkSubmission.findOne({ where: { assignmentId: Number(assignmentId), studentId: userId } });

        if (existing) {
            if (existing.status === 'graded' && !assignment.allowResubmit) {
                res.status(403).json({ message: 'Повторная сдача не разрешена' });
                return;
            }
            await existing.update({ files: fileData, textAnswer: textAnswer || null, aiSimilarity, autoGrade, submittedAt: now, isLate, status: 'resubmitted' });
            res.json(existing);
        } else {
            const sub = await HomeworkSubmission.create({
                assignmentId: Number(assignmentId), studentId: userId,
                files: fileData, textAnswer: textAnswer || null,
                aiSimilarity, autoGrade,
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
        const { grade, teacherComment, rubricChecks } = req.body;

        const sub = await HomeworkSubmission.findByPk(Number(id), {
            include: [{ model: HomeworkAssignment, as: 'assignment' }],
        });
        if (!sub) { res.status(404).json({ message: 'Не найдено' }); return; }

        await sub.update({
            grade: grade !== undefined ? Number(grade) : sub.grade,
            teacherComment: teacherComment !== undefined ? (teacherComment || null) : sub.teacherComment,
            rubricChecks: rubricChecks !== undefined ? rubricChecks : sub.rubricChecks,
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
        const assignments = await HomeworkAssignment.findAll({ where: { courseId: Number(courseId) } });
        if (!assignments.length) { res.json({ avgScorePercent: null, totalAssignments: 0, gradedCount: 0 }); return; }

        const maxScoreById = new Map(assignments.map(a => [a.id, a.maxScore]));
        const subs = await HomeworkSubmission.findAll({
            where: { assignmentId: { [Op.in]: assignments.map(a => a.id) }, status: 'graded', grade: { [Op.not]: null } },
        });

        const percents = subs.map(s => ((s.grade ?? 0) / (maxScoreById.get(s.assignmentId) || 100)) * 100);
        const avgScorePercent = percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null;
        res.json({ avgScorePercent, totalAssignments: assignments.length, gradedCount: subs.length });
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

// POST /hw/:assignmentId/check-code  — прогон кода студента по тест-кейсам (без фиксации сдачи)
export const checkCodeHomework = async (req: Request, res: Response) => {
    try {
        const { assignmentId } = req.params;
        const { codeContent, codeLanguage } = req.body;

        const assignment = await HomeworkAssignment.findByPk(Number(assignmentId));
        if (!assignment) { res.status(404).json({ message: 'Задание не найдено' }); return; }
        if (!assignment.allowCodeSubmission) { res.status(400).json({ message: 'Сдача кода не разрешена для этого задания' }); return; }
        if (!codeContent?.trim()) { res.status(400).json({ message: 'Код не может быть пустым' }); return; }
        if (!FILE_NAMES[codeLanguage]) { res.status(400).json({ message: 'Неподдерживаемый язык' }); return; }
        if (!assignment.testCases?.length) { res.status(400).json({ message: 'Для этого задания не заданы тест-кейсы' }); return; }

        const { results, autoGrade } = await runTestCases(assignment, codeContent, codeLanguage);
        const passedCount = results.filter(r => r.passed).length;

        res.json({ results, autoGrade, maxScore: assignment.maxScore, passedCount, totalCount: assignment.testCases.length });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка проверки кода' });
    }
};

// POST /hw/:assignmentId/submit-code  — сдача через встроенный редактор
export const submitCodeHomework = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { assignmentId } = req.params;
        const { codeLanguage, codeContent, codeHistory, codeLastOutput } = req.body;

        const assignment = await HomeworkAssignment.findByPk(Number(assignmentId));
        if (!assignment) { res.status(404).json({ message: 'Задание не найдено' }); return; }
        if (!assignment.allowCodeSubmission) { res.status(400).json({ message: 'Сдача кода не разрешена для этого задания' }); return; }
        if (!assignment.allowedCodeLanguages.includes(codeLanguage)) {
            res.status(400).json({ message: `Язык "${codeLanguage}" не разрешён для этого задания` });
            return;
        }

        const now = new Date();
        const isLate = now > new Date(assignment.deadline);
        if (isLate && assignment.strictDeadline) {
            res.status(403).json({ message: 'Срок сдачи истёк. Приём работ закрыт.' });
            return;
        }

        const historyStr = assignment.recordCodeHistory && codeHistory?.length
            ? JSON.stringify(codeHistory)
            : null;

        const codeHistoryDeleteAt = historyStr && assignment.codeHistoryDeleteDays
            ? new Date(now.getTime() + assignment.codeHistoryDeleteDays * 86_400_000)
            : null;

        // Автопроверка по тест-кейсам (если заданы) — фиксируется вместе со сдачей
        let testResults: TestCaseResult[] | null = null;
        let autoGrade: number | null = null;
        if (assignment.testCases?.length) {
            const checked = await runTestCases(assignment, codeContent, codeLanguage);
            testResults = checked.results;
            autoGrade = checked.autoGrade;
        }

        const existing = await HomeworkSubmission.findOne({
            where: { assignmentId: Number(assignmentId), studentId: userId },
        });

        if (existing) {
            if (existing.status === 'graded' && !assignment.allowResubmit) {
                res.status(403).json({ message: 'Повторная сдача не разрешена' });
                return;
            }
            await existing.update({
                codeLanguage, codeContent, codeLastOutput: codeLastOutput ?? null,
                codeHistory: historyStr, codeHistoryCompressed: false, codeHistoryDeleteAt,
                testResults, autoGrade,
                submittedAt: now, isLate, status: 'resubmitted',
            });
            res.json(existing);
        } else {
            const sub = await HomeworkSubmission.create({
                assignmentId: Number(assignmentId), studentId: userId,
                files: [], textAnswer: null,
                codeLanguage, codeContent, codeLastOutput: codeLastOutput ?? null,
                codeHistory: historyStr, codeHistoryCompressed: false, codeHistoryDeleteAt,
                testResults, autoGrade,
                submittedAt: now, isLate, status: 'submitted',
            });
            sendNotification(
                assignment.createdBy, 'homework_submitted',
                `Сдано ДЗ: ${assignment.title}`,
                isLate ? 'Сдано с опозданием (код)' : 'Вовремя (код)',
                '/assignments',
            ).catch(() => {});
            if (!isLate) checkHomeworkBadges(userId, Number(assignmentId)).catch(() => {});
            res.status(201).json(sub);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка сдачи кода' });
    }
};

// GET /hw/submissions/:id/history  — история ввода (только для препода/admin)
export const getCodeHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sub = await HomeworkSubmission.findByPk(Number(id), {
            attributes: ['id', 'codeHistory', 'codeHistoryCompressed'],
        });
        if (!sub) { res.status(404).json({ message: 'Не найдено' }); return; }
        if (!sub.codeHistory) { res.json([]); return; }

        if (sub.codeHistoryCompressed) {
            const buf = Buffer.from(sub.codeHistory, 'base64');
            const json = zlib.gunzipSync(buf).toString('utf8');
            res.json(JSON.parse(json));
        } else {
            res.json(JSON.parse(sub.codeHistory));
        }
    } catch {
        res.status(500).json({ message: 'Ошибка получения истории' });
    }
};

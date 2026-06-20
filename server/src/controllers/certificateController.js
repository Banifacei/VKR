import { CourseCertificate } from '../models/CourseCertificate.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { CourseTest } from '../models/CourseTest.js';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
async function getCourseProgress(userId, courseId) {
    const courseVideoIds = await Video.findAll({ where: { courseId, isHidden: false }, attributes: ['id'] })
        .then(vs => vs.map((v) => v.id));
    const [totalVideos, totalTests, watchedVideos, completedTests] = await Promise.all([
        Video.count({ where: { courseId, isHidden: false } }),
        CourseTest.count({ where: { courseId, isHidden: false } }),
        courseVideoIds.length > 0
            ? UserVideoProgress.count({ where: { userId, isWatched: true, videoId: courseVideoIds } })
            : Promise.resolve(0),
        UserTestResult.count({
            where: { userId },
            include: [{ model: CourseTest, as: 'test', where: { courseId, isHidden: false }, required: true }],
        }).catch(() => 0),
    ]);
    const total = totalVideos + totalTests;
    const done = watchedVideos + completedTests;
    return total > 0 ? Math.round((done / total) * 100) : 0;
}
// Получить или создать сертификат (если курс завершён)
export const getOrCreateCertificate = async (req, res) => {
    const userId = req.user.id;
    const courseId = Number(req.params.courseId);
    const enrollment = await CourseEnrollment.findOne({ where: { userId, courseId, status: 'approved' } });
    if (!enrollment)
        return res.status(403).json({ message: 'Вы не зачислены на этот курс' });
    const progress = await getCourseProgress(userId, courseId);
    if (progress < 100)
        return res.status(400).json({ message: 'Курс ещё не завершён', progress });
    let cert = await CourseCertificate.findOne({ where: { userId, courseId } });
    if (!cert) {
        const certId = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
        cert = await CourseCertificate.create({ userId, courseId, certificateId: certId });
    }
    const course = await Course.findByPk(courseId, { attributes: ['title', 'instructor'] });
    const user = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
    res.json({
        certificateId: cert.certificateId,
        issuedAt: cert.createdAt,
        courseTitle: course?.title,
        userName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    });
};
// Список моих сертификатов
export const getMyCertificates = async (req, res) => {
    const userId = req.user.id;
    const certs = await CourseCertificate.findAll({
        where: { userId },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'instructor', 'coverImage'] }],
        order: [['createdAt', 'DESC']],
    });
    res.json(certs);
};
// Скачать PDF
export const downloadCertificate = async (req, res) => {
    const userId = req.user.id;
    const courseId = Number(req.params.courseId);
    const cert = await CourseCertificate.findOne({ where: { userId, courseId } });
    if (!cert)
        return res.status(404).json({ message: 'Сертификат не найден. Завершите курс.' });
    const course = await Course.findByPk(courseId, { attributes: ['title', 'instructor'] });
    const user = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
    const userName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    const courseTitle = course?.title ?? 'Курс';
    const issuedAt = cert.createdAt instanceof Date ? cert.createdAt : new Date(cert.createdAt);
    const dateStr = issuedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.certificateId}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    doc.pipe(res);
    const W = 841.89, H = 595.28;
    // Фон
    doc.rect(0, 0, W, H).fill('#0d0d14');
    // Декоративные полосы
    doc.rect(0, 0, W, 8).fill('#7c3aed');
    doc.rect(0, H - 8, W, 8).fill('#7c3aed');
    doc.rect(0, 0, 8, H).fill('#7c3aed');
    doc.rect(W - 8, 0, 8, H).fill('#7c3aed');
    // Внутренняя рамка (stroke)
    doc.rect(24, 24, W - 48, H - 48).lineWidth(1).strokeColor('#7c3aed').strokeOpacity(0.4).stroke();
    // Заголовок платформы
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#7c3aed').fillOpacity(1)
        .text('LUMEO', 0, 52, { align: 'center', characterSpacing: 6 });
    // Декоративная линия
    doc.moveTo(W / 2 - 120, 80).lineTo(W / 2 + 120, 80).lineWidth(0.5).strokeColor('#7c3aed').strokeOpacity(0.5).stroke();
    // Главный заголовок
    doc.font('Helvetica-Bold').fontSize(36).fillColor('#ffffff').fillOpacity(1)
        .text('СЕРТИФИКАТ', 0, 100, { align: 'center', characterSpacing: 4 });
    doc.font('Helvetica').fontSize(13).fillColor('#a78bfa').fillOpacity(1)
        .text('О ПРОХОЖДЕНИИ КУРСА', 0, 148, { align: 'center', characterSpacing: 3 });
    // Подтверждение
    doc.font('Helvetica').fontSize(12).fillColor('#94a3b8').fillOpacity(1)
        .text('Настоящим подтверждается, что', 0, 208, { align: 'center' });
    // Имя студента
    doc.font('Helvetica-Bold').fontSize(30).fillColor('#ffffff').fillOpacity(1)
        .text(userName, 0, 232, { align: 'center' });
    // Линия под именем
    doc.fontSize(30);
    const nameWidth = Math.min(doc.widthOfString(userName) + 60, 400);
    doc.moveTo(W / 2 - nameWidth / 2, 278).lineTo(W / 2 + nameWidth / 2, 278)
        .lineWidth(1).strokeColor('#7c3aed').strokeOpacity(0.7).stroke();
    // Описание курса
    doc.font('Helvetica').fontSize(12).fillColor('#94a3b8').fillOpacity(1)
        .text('успешно завершил(а) курс', 0, 294, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#a78bfa').fillOpacity(1)
        .text(`«${courseTitle}»`, 60, 316, { align: 'center', width: W - 120 });
    // Дата и ID — нижняя строка
    doc.font('Helvetica').fontSize(11).fillColor('#64748b').fillOpacity(1)
        .text(`Дата выдачи: ${dateStr}`, 70, H - 72)
        .text(`ID сертификата: ${cert.certificateId}`, W - 320, H - 72, { width: 250, align: 'right' });
    doc.end();
};

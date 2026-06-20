// server/index.ts
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sequelize from './src/config/db.js';
import videoRoutes from './src/routes/videoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from 'transliteration';
import fs from 'fs';
import multer from 'multer';
import { User } from './src/models/User.js';
import { SystemSetting } from './src/models/SystemSetting.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import testRoutes from './src/routes/testRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import themeRoutes from './src/routes/themeRoutes.js';
import searchRoutes from './src/routes/searchRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import commentRoutes from './src/routes/commentRoutes.js';
import ratingRoutes from './src/routes/ratingRoutes.js';
import bookmarkRoutes from './src/routes/bookmarkRoutes.js';
import bannedWordRoutes from './src/routes/bannedWordRoutes.js';
import homeworkRoutes from './src/routes/homeworkRoutes.js';
import homeworkAssignmentRoutes from './src/routes/homeworkAssignmentRoutes.js';
import certificateRoutes from './src/routes/certificateRoutes.js';
import { CourseCertificate } from './src/models/CourseCertificate.js';
import badgeRoutes from './src/routes/badgeRoutes.js';
import assistantRoutes from './src/routes/assistantRoutes.js';
import { trackActivityMiddleware, addSystemLog, heartbeatHandler } from './src/controllers/adminController.js';
import { createDefaultAdmin, createDemoUser } from './src/models/initAdmin.js';
import { cleanupOrphanFiles } from './src/utils/cleanup.js';
import { checkAuth } from './src/middleware/authMiddleware.js';
import passport from 'passport';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5001;
const BASE_URL = process.env.API_URL || `http://localhost:${PORT}`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const uploadDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');
const logoDir   = path.join(uploadDir, 'logos');
const homeworkDir = path.join(uploadDir, 'homework');
[uploadDir, avatarDir, logoDir, homeworkDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'avatar') return cb(null, avatarDir);
        if (file.fieldname === 'logo')   return cb(null, logoDir);
        if (file.fieldname === 'hwfile') return cb(null, homeworkDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const originalName = path.basename(file.originalname, ext);
        const safeName = slugify(originalName);
        cb(null, `${Date.now()}-${safeName}${ext}`);
    }
});

const videoUpload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    fileFilter: (_req, file, cb) => {
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        const ext = path.extname(file.originalname).toLowerCase();
        // Разрешаем видео и файлы субтитров (.vtt)
        if (allowedVideoTypes.includes(file.mimetype) || ext === '.vtt') {
            cb(null, true);
        } else {
            cb(new Error('Разрешены видеофайлы (mp4, webm, ogg, mov) и файлы субтитров (.vtt).'));
        }
    }
});

const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Только изображения разрешены (jpeg, png, webp, gif, svg).'));
};

const avatarUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter,
});

const logoUpload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: imageFilter,
});

// Homework file upload — лимит берётся из SystemSetting в рантайме; multer проверяет только 100 МБ
export const homeworkUpload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
});
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // разрешаем отдавать /uploads фронту
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'"], // inline-стили нужны React
            imgSrc:         ["'self'", 'data:', 'blob:'],
            mediaSrc:       ["'self'", 'blob:', 'https://rutube.ru', 'https://www.youtube.com'],
            frameSrc:       ["'self'", 'https://rutube.ru', 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
            connectSrc:     ["'self'"],
            fontSrc:        ["'self'", 'data:'],
            objectSrc:      ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));
app.use(passport.initialize());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(trackActivityMiddleware);
app.use('/uploads', express.static(uploadDir));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/theme', themeRoutes(logoUpload));

const questionImageUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: imageFilter,
});

app.post('/api/upload/image', checkAuth, questionImageUpload.single('image'), (req: Request, res: Response): void => {
    try {
        if (!req.file) { res.status(400).json({ message: 'Файл не выбран' }); return; }
        res.json({ url: `/uploads/${req.file.filename}` });
    } catch {
        res.status(500).json({ message: 'Ошибка загрузки изображения' });
    }
});

app.post('/api/upload', checkAuth, videoUpload.single('video'), (req: Request, res: Response): void => {
    try {
        if (!req.file) {
            res.status(400).send('Файл не загружен');
            return;
        }
        
        const fullUrl = `/uploads/${req.file.filename}`;
        addSystemLog(`Загружено новое видео: ${req.file.originalname}`, 'info');
        res.json({ url: fullUrl });
    } catch (err) {
        console.error("Ошибка при обработке файла:", err);
        res.status(500).send('Ошибка сервера при загрузке');
    }
});

app.post('/api/auth/avatar', checkAuth, avatarUpload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'Файл не выбран' });
            return;
        }

        const userId = (req as any).user?.id;
        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'Пользователь не найден' });
            return;
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        user.avatarUrl = avatarUrl;
        await user.save();
        addSystemLog(`Пользователь (ID: ${userId}) обновил аватар`, 'info');
        res.json({ avatarUrl });
    } catch (err) {
        console.error("Ошибка при загрузке аватара:", err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});
app.post('/api/heartbeat', checkAuth, heartbeatHandler);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/banned-words', bannedWordRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/hw', homeworkAssignmentRoutes(homeworkUpload));
app.use('/api/certificates', certificateRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/assistant', assistantRoutes);

// Глобальный обработчик ошибок (multer и прочие middleware)
app.use((err: any, _req: Request, res: Response, _next: any) => {
    if (err?.message) {
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

let server: ReturnType<typeof app.listen>;

async function start() {
    try {
        await sequelize.authenticate();
        try {
            await sequelize.sync({ alter: true });
        } catch (syncErr: any) {
            // Sequelize генерирует невалидный SQL при ALTER self-referential FK в PostgreSQL.
            // Таблицы уже созданы корректно через CREATE — игнорируем ошибку ALTER и продолжаем.
            console.warn('⚠️  sequelize.sync alter warning (non-fatal):', syncErr?.message ?? syncErr);
        }
        // force: true — удаляет таблицы (DROP) и создает их заново (CREATE) что бы бд очистить
        //await sequelize.sync({ force: true });
        // Миграция: исправляем типы колонок, которые alter:true не меняет автоматически
        await sequelize.query(`ALTER TABLE interactive_events ALTER COLUMN "explanation" TYPE TEXT`).catch(() => {});
        // Миграция: 'none' как глобальный паттерн фона означает 'off' (без фона), а не "следовать платформе"
        await sequelize.query(`UPDATE system_settings SET value = 'off' WHERE key = 'platform_bg_pattern' AND value = 'none'`).catch(() => {});
        await createDefaultAdmin();
        await createDemoUser();
        console.log('✅ База данных подключена');
        await cleanupOrphanFiles(uploadDir, avatarDir);
        server = app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📁 Папка для загрузок: ${uploadDir}`);
            addSystemLog(`Сервер Lumeo успешно стартовал на порту ${PORT}`, 'success');
        });
        server.timeout = 600000;
    } catch (e) {
        console.error('❌ Ошибка запуска:', e);
    }
}

const shutdown = () => {
    console.log('🛑 Остановка сервера...');
    if (server) {
        server.close(async () => {
            await sequelize.close();
            console.log('✅ Сервер остановлен');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export interface IInteractiveEvent {
    id: number;
    time: number;
    type: 'question' | 'info';
    question: string;
    options?: string[];
    correctAnswer?: string;
}
export interface ISubtitle {
    lang: string;
    label: string;
    src: string;
}

export interface IVideo {
    id: number;
    title: string;
    url: string;
    subtitles?: ISubtitle[];
    events: IInteractiveEvent[];
    createdAt?: string;
    updatedAt?: string;
}

start();
// server/index.ts
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import sequelize from './src/config/db.js';
import videoRoutes from './src/routes/videoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from 'transliteration';
import fs from 'fs';
import multer from 'multer';
import { User } from './src/models/User.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import testRoutes from './src/routes/testRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import { trackActivityMiddleware, addSystemLog } from './src/controllers/adminController.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');
[uploadDir, avatarDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = file.fieldname === 'avatar' ? avatarDir : uploadDir;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const originalName = path.basename(file.originalname, ext);
        const safeName = slugify(originalName);
        cb(null, `${Date.now()}-${safeName}${ext}`);
    }
});

const upload = multer({ storage });
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(trackActivityMiddleware);
app.use('/uploads', express.static(uploadDir));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/admin', adminRoutes);
app.post('/api/upload', upload.single('video'), (req: Request, res: Response): void => {
    try {
        if (!req.file) {
            res.status(400).send('Файл не загружен');
            return;
        }
        
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        addSystemLog(`Загружено новое видео: ${req.file.originalname}`, 'info');
        res.json({ url: fullUrl });
    } catch (err) {
        console.error("Ошибка при обработке файла:", err);
        res.status(500).send('Ошибка сервера при загрузке');
    }
});

app.post('/api/auth/avatar', upload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'Файл не выбран' });
            return;
        }

        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({ message: 'ID пользователя не указан' });
            return;
        }

        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ message: 'Пользователь не найден' });
            return;
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;

        user.avatarUrl = avatarUrl;
        await user.save();
        addSystemLog(`Пользователь (ID: ${userId}) обновил аватар`, 'info');
        res.json({ avatarUrl });
    } catch (err) {
        console.error("Ошибка при загрузке аватара:", err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});
app.use('/api/videos', videoRoutes);
async function start() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        // force: true — удаляет таблицы (DROP) и создает их заново (CREATE) что бы бд очистить
        //await sequelize.sync({ force: true });
        console.log('✅ База данных подключена');
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📁 Папка для загрузок: ${uploadDir}`);
            addSystemLog(`Сервер Lumeo успешно стартовал на порту ${PORT}`, 'success');
        });
        server.timeout = 600000;
    } catch (e) {
        console.error('❌ Ошибка запуска:', e);
    }
}

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
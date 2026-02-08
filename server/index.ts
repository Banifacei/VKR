// server/index.ts
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import sequelize from './src/config/db.js';
import videoRoutes from './src/routes/videoRoutes.js'; // Используем только videoRoutes
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from 'transliteration';
import fs from 'fs';
import multer from 'multer';
import { User } from './src/models/User.js';
import authRoutes from './src/routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');

// 1. Папка для загрузок
[uploadDir, avatarDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 2. Настройка Multer (типизированная)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Если поле файла 'avatar', кладем в папку avatars
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

// 3. Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use('/api/auth', authRoutes);
// 4. Эндпоинт загрузки
app.post('/api/upload', upload.single('video'), (req: Request, res: Response): void => {
    try {
        if (!req.file) {
            res.status(400).send('Файл не загружен');
            return;
        }
        
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        
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
        // Путь с учетом подпапки avatars
        const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;

        user.avatarUrl = avatarUrl;
        await user.save();

        res.json({ avatarUrl });
    } catch (err) {
        console.error("Ошибка при загрузке аватара:", err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// 5. Роуты
// Все маршруты (видео и курсы) будут начинаться с /api/videos
// Например: /api/videos/courses
app.use('/api/videos', videoRoutes);

// 6. Запуск
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

// NEW: Тип для субтитров
export interface ISubtitle {
    lang: string;  // 'ru', 'en'
    label: string; // 'Русский'
    src: string;   // Ссылка на файл
}

export interface IVideo {
    id: number;
    title: string;
    url: string;
    subtitles?: ISubtitle[]; // <--- Добавили массив субтитров
    events: IInteractiveEvent[];
    createdAt?: string;
    updatedAt?: string;
}

start();
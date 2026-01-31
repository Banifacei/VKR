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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Папка для загрузок
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Настройка Multer (типизированная)
type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
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

// 5. Роуты
// Все маршруты (видео и курсы) будут начинаться с /api/videos
// Например: /api/videos/courses
app.use('/api/videos', videoRoutes);

// 6. Запуск
async function start() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
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
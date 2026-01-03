// server/index.ts
// @ts-ignore
import multer from 'multer';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import sequelize from './src/config/db.js';
import videoRoutes from './src/routes/videoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from 'transliteration';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Создаем путь к папке и проверяем её наличие
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Настраиваем ОДИН объект storage с транслитерацией
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    const originalName = path.basename(file.originalname, ext);
    
    // Транслитерируем: "Моё Видео" -> "moe-video"
    const safeName = slugify(originalName);
    
    // Результат: 1700000000-moe-video.mp4
    cb(null, `${Date.now()}-${safeName}${ext}`);
  }
});

// 3. Инициализация multer
const upload = multer({ storage });

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Эндпоинт загрузки
app.post('/api/upload', upload.single('video'), (req: any, res: any) => {
  try {
    if (!req.file) {
        return res.status(400).send('Файл не загружен');
    }
    const filePath = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ url: filePath });
  } catch (err) {
    console.error("Ошибка при обработке файла:", err);
    res.status(500).send('Ошибка сервера при загрузке');
  }
});

app.use('/api/videos', videoRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ База данных подключена');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📁 Папка для загрузок: ${uploadDir}`);
    });

    server.timeout = 600000; // 10 минут
  } catch (e) {
    console.error('❌ Ошибка запуска:', e);
  }
}

start();
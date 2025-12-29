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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Настройка хранилища multer
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req: any, file: any, cb: any) => {
    // Сохраняем оригинальное расширение файла (будь то avi, mkv или mp4)
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Инициализация multer без ограничений по размеру (limits удален)
const upload = multer({ storage });

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
// Раздача статики из папки uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Эндпоинт для загрузки любого видео-файла
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
      console.log(`📁 Папка для загрузок: ${path.join(__dirname, 'uploads')}`);
    });

    // Увеличиваем таймаут сервера до 10 минут для загрузки очень больших файлов
    server.timeout = 600000;

  } catch (e) {
    console.error('❌ Ошибка запуска:', e);
  }
}

start();
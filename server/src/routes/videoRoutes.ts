import { Router } from 'express';
import { 
    createVideo, 
    getVideosByCourse, 
    createEvent, 
    saveProgress, 
    getVideoStats, 
    updateVideoSettings, 
    getAllCourses, 
    createCourse,
    generateSubtitles,
    getAllVideos,
    resetVideoProgress,
    saveVideoProgress,
    getVideoProgress
} from '../controllers/videoController.js';
import { checkAuth } from '../middleware/authMiddleware.js';
import { updateEvent, deleteEvent } from '../controllers/videoController.js';
console.log("!!! ЗАГРУЖАЮТСЯ НОВЫЕ РОУТЫ С AI !!!");

const router = Router();

// Добавим лог прямо сюда, чтобы видеть, попадает ли запрос в роутер
router.post('/:videoId/autocaptions', (req, res, next) => {
    console.log(`>>> РОУТЕР ПОЙМАЛ ЗАПРОС: ${req.originalUrl}`);
    next();
}, generateSubtitles);
// --- СУЩЕСТВУЮЩИЕ РОУТЫ ---
router.post('/:videoId/autocaptions', generateSubtitles);
router.post('/', createVideo);
router.get('/courses', getAllCourses);
router.post('/courses', createCourse);
router.get('/courses/:courseId/videos', getVideosByCourse);

// --- РОУТЫ ДЛЯ ТЕСТОВ (UserResponse) ---
// saveProgress — это сохранение ответов на вопросы внутри видео
router.post('/progress', checkAuth, saveProgress); 
router.delete('/:videoId/progress', checkAuth, resetVideoProgress);
router.get('/:videoId/stats', getVideoStats);
router.patch('/:videoId', checkAuth, updateVideoSettings);

// --- НОВЫЕ РОУТЫ ДЛЯ ТАЙМЛАЙНА (UserVideoProgress) ---
// 1. Получение времени, на котором остановился пользователь
router.get('/:videoId/playback-progress', checkAuth, getVideoProgress);

// 2. Сохранение текущей секунды просмотра (фоновое)
router.post('/playback-progress', checkAuth, saveVideoProgress);

// --- ОСТАЛЬНОЕ ---
router.post('/:videoId/events', createEvent);
router.put('/events/:eventId', updateEvent);
router.delete('/events/:eventId', deleteEvent);
export default router;
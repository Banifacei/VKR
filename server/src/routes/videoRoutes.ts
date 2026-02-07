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
    resetVideoProgress
} from '../controllers/videoController.js';
import { checkAuth } from '../middleware/authMiddleware.js';

console.log("!!! ЗАГРУЖАЮТСЯ НОВЫЕ РОУТЫ С AI !!!");

const router = Router();

// Добавим лог прямо сюда, чтобы видеть, попадает ли запрос в роутер
router.post('/:videoId/autocaptions', (req, res, next) => {
    console.log(`>>> РОУТЕР ПОЙМАЛ ЗАПРОС: ${req.originalUrl}`);
    next();
}, generateSubtitles);
router.post('/', createVideo);
router.get('/', getVideosByCourse);
router.post('/:videoId/events', createEvent);
router.post('/progress', checkAuth,saveProgress);
router.get('/:videoId/stats', getVideoStats);
router.get('/courses', getAllCourses);
router.post('/courses', createCourse);
router.get('/courses/:courseId/videos', getVideosByCourse);
router.delete('/:videoId/progress', resetVideoProgress);

export default router;
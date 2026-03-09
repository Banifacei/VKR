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
    getVideoProgress,
    reorderVideos,
    deleteVideo,
    updateCourse, 
    deleteCourse,
    getUserVideoAnswers,
    updateCourseContentOrder,
    getCourseCollaborators,
    addCourseCollaborator,
    removeCourseCollaborator,
    transferCourseOwnership,
    applyForCourse,
    checkEnrollmentStatus,
    getCourseEnrollments,
    updateEnrollmentStatus,
    getCourseAnalytics,
    getStudentCourseDetails,
    getCourseItemAnalytics,
    generateDemoData

} from '../controllers/videoController.js';
import { checkCourseAccess } from '../middleware/courseAuthMiddleware.js';
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
router.put('/reorder', reorderVideos);
router.post('/:videoId/autocaptions', generateSubtitles);
router.post('/', createVideo);
router.get('/courses', getAllCourses);
router.post('/courses', checkAuth, createCourse);
router.put('/courses/:courseId', checkAuth, updateCourse);
router.delete('/courses/:courseId', checkAuth, deleteCourse);
router.get('/courses/:courseId/videos', getVideosByCourse);
router.put('/courses/:courseId/transfer', checkAuth, transferCourseOwnership);
router.post('/course/:courseId/reorder', checkAuth, updateCourseContentOrder);
router.post('/courses/:courseId/enroll', checkAuth, applyForCourse);
router.get('/courses/:courseId/enrollment-status', checkAuth, checkEnrollmentStatus);
router.get('/courses/:courseId/collaborators', checkAuth, getCourseCollaborators);
router.get('/courses/:courseId/enrollments', checkAuth, checkCourseAccess, getCourseEnrollments);
router.get('/courses/:courseId/analytics', checkAuth, checkCourseAccess, getCourseAnalytics);
router.get('/courses/:courseId/analytics/student/:studentId', checkAuth, checkCourseAccess, getStudentCourseDetails);
router.get('/courses/:courseId/analytics/item/:itemType/:itemId', checkAuth, checkCourseAccess, getCourseItemAnalytics);
router.post('/courses/:courseId/generate-demo', checkAuth, generateDemoData);
router.put('/courses/enrollments/:enrollmentId', checkAuth, updateEnrollmentStatus);
router.post('/courses/:courseId/collaborators', checkAuth, checkCourseAccess, addCourseCollaborator);
router.delete('/courses/:courseId/collaborators/:userId', checkAuth, checkCourseAccess, removeCourseCollaborator);
// --- РОУТЫ ДЛЯ ТЕСТОВ (UserResponse) ---
// saveProgress — это сохранение ответов на вопросы внутри видео
router.post('/progress', checkAuth, saveProgress); 
router.delete('/:videoId/progress', checkAuth, resetVideoProgress);
router.get('/progress/:videoId/:userId', checkAuth, getUserVideoAnswers);
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
router.delete('/:videoId', checkAuth, deleteVideo);
export default router;
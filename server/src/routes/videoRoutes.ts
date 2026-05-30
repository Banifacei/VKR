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
    generateDemoData,
    transcodeVideo,
    reTranscodeAllVideos,
    getMyEnrollments,
    getMyProgressAll,
    reorderCourses,
    banFromCourse,
    unbanFromCourse,
    getCourseBans,
    getTeacherAccessibleCourses,
} from '../controllers/videoController.js';
import { checkCourseAccess, checkCourseBan } from '../middleware/courseAuthMiddleware.js';
import { checkAuth, checkAuthSse } from '../middleware/authMiddleware.js';
import { validateId } from '../middleware/validateId.js';
import { updateEvent, deleteEvent, sseVideoEvents, sseEnrollStudentEvents, sseEnrollCourseEvents, sseSubtitleEvents } from '../controllers/videoController.js';
const router = Router();

const vId = validateId('videoId');
const cId = validateId('courseId');
const eId = validateId('eventId');
const enId = validateId('enrollmentId');
const sId = validateId('studentId');
const iId = validateId('itemId');
const uId = validateId('userId');

// --- СУЩЕСТВУЮЩИЕ РОУТЫ ---
router.get('/my-enrollments', checkAuth, getMyEnrollments);
router.get('/my-progress-all', checkAuth, getMyProgressAll);
router.get('/my-courses', checkAuth, getTeacherAccessibleCourses);
router.put('/reorder', checkAuth, reorderVideos);
router.post('/:videoId/autocaptions', checkAuth, vId, checkCourseAccess, generateSubtitles);
router.post('/:videoId/transcode', checkAuth, vId, checkCourseAccess, transcodeVideo);
router.post('/admin/retranscode-all', checkAuth, reTranscodeAllVideos);
router.post('/', checkAuth, createVideo);
router.get('/courses', checkAuth, getAllCourses);
router.post('/courses', checkAuth, createCourse);
router.put('/courses/reorder', checkAuth, reorderCourses);
router.put('/courses/:courseId', checkAuth, cId, checkCourseAccess, updateCourse);
router.delete('/courses/:courseId', checkAuth, cId, checkCourseAccess, deleteCourse);
router.get('/courses/:courseId/videos', checkAuth, cId, checkCourseBan, getVideosByCourse);
router.put('/courses/:courseId/transfer', checkAuth, cId, checkCourseAccess, transferCourseOwnership);
router.post('/course/:courseId/reorder', checkAuth, cId, checkCourseAccess, updateCourseContentOrder);
router.post('/courses/:courseId/enroll', checkAuth, cId, applyForCourse);
router.get('/courses/:courseId/enrollment-status', checkAuth, cId, checkEnrollmentStatus);
router.get('/courses/:courseId/collaborators', checkAuth, cId, getCourseCollaborators);
router.get('/courses/:courseId/enrollments', checkAuth, cId, checkCourseAccess, getCourseEnrollments);
router.get('/courses/:courseId/analytics', checkAuth, cId, checkCourseAccess, getCourseAnalytics);
router.get('/courses/:courseId/analytics/student/:studentId', checkAuth, cId, sId, checkCourseAccess, getStudentCourseDetails);
router.get('/courses/:courseId/analytics/item/:itemType/:itemId', checkAuth, cId, iId, checkCourseAccess, getCourseItemAnalytics);
router.post('/courses/:courseId/generate-demo', checkAuth, cId, checkCourseAccess, generateDemoData);
router.put('/courses/enrollments/:enrollmentId', checkAuth, enId, updateEnrollmentStatus);
router.post('/courses/:courseId/collaborators', checkAuth, cId, checkCourseAccess, addCourseCollaborator);
router.delete('/courses/:courseId/collaborators/:userId', checkAuth, cId, uId, checkCourseAccess, removeCourseCollaborator);
router.get('/courses/:courseId/bans', checkAuth, cId, checkCourseAccess, getCourseBans);
router.post('/courses/:courseId/bans/:userId', checkAuth, cId, uId, checkCourseAccess, banFromCourse);
router.delete('/courses/:courseId/bans/:userId', checkAuth, cId, uId, checkCourseAccess, unbanFromCourse);
// --- РОУТЫ ДЛЯ ТЕСТОВ (UserResponse) ---
router.post('/progress', checkAuth, saveProgress);
router.delete('/:videoId/progress', checkAuth, vId, resetVideoProgress);
router.get('/progress/:videoId', checkAuth, vId, getUserVideoAnswers);
router.get('/:videoId/stats', checkAuth, vId, checkCourseAccess, getVideoStats);
router.patch('/:videoId', checkAuth, vId, checkCourseAccess, updateVideoSettings);

// --- НОВЫЕ РОУТЫ ДЛЯ ТАЙМЛАЙНА (UserVideoProgress) ---
router.get('/:videoId/playback-progress', checkAuth, vId, getVideoProgress);
router.post('/playback-progress', checkAuth, saveVideoProgress);

// --- ОСТАЛЬНОЕ ---
router.post('/:videoId/events', checkAuth, vId, checkCourseAccess, createEvent);
router.put('/events/:eventId', checkAuth, eId, checkCourseAccess, updateEvent);
router.delete('/events/:eventId', checkAuth, eId, checkCourseAccess, deleteEvent);
router.delete('/:videoId', checkAuth, vId, checkCourseAccess, deleteVideo);

// --- SSE-стримы ---
router.get('/:videoId/events/stream', checkAuthSse, vId, sseVideoEvents);
router.get('/enrollment/stream', checkAuthSse, sseEnrollStudentEvents);
router.get('/courses/:courseId/enrollment/stream', checkAuthSse, cId, sseEnrollCourseEvents);
router.get('/courses/:courseId/processing/stream', checkAuthSse, cId, sseSubtitleEvents);

export default router;
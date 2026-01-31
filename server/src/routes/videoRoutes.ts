import { Router } from 'express';
import { createVideo, getVideosByCourse, createEvent, saveProgress, getVideoStats, updateVideoSettings, getAllCourses, createCourse } from '../controllers/videoController.js';

const router = Router();

router.post('/', createVideo);
router.get('/', getVideosByCourse);
router.post('/:videoId/events', createEvent);
router.post('/progress', saveProgress);
router.get('/:videoId/stats', getVideoStats);
router.get('/courses', getAllCourses);
router.post('/courses', createCourse);
router.get('/courses/:courseId/videos', getVideosByCourse);

export default router;
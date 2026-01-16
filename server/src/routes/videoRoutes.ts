import { Router } from 'express';
import { createVideo, getAllVideos, createEvent, saveProgress, getVideoStats, updateVideoSettings } from '../controllers/videoController.js';

const router = Router();

router.post('/', createVideo);
router.get('/', getAllVideos);
router.post('/:videoId/events', createEvent);
router.post('/progress', saveProgress);
router.get('/:videoId/stats', getVideoStats);
router.patch('/:videoId', updateVideoSettings);

export default router;
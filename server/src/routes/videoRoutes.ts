import { Router } from 'express';
import { createVideo, getAllVideos } from '../controllers/videoController.js';

const router = Router();

router.post('/', createVideo); // Маршрут для создания: POST /api/videos
router.get('/', getAllVideos);  // Маршрут для получения: GET /api/videos

export default router;
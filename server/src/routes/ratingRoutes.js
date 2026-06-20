import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { getCourseRatings, upsertRating, deleteRating } from '../controllers/ratingController.js';
const router = Router();
router.get('/course/:courseId', checkAuth, getCourseRatings);
router.post('/course/:courseId', checkAuth, upsertRating);
router.delete('/course/:courseId', checkAuth, deleteRating);
export default router;

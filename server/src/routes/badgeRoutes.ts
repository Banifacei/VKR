import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { getMyBadges, getUserBadges, getCourseLeaderboard } from '../controllers/badgeController.js';

const router = Router();

router.get('/my', checkAuth, getMyBadges);
router.get('/user/:userId', checkAuth, getUserBadges);
router.get('/leaderboard/:courseId', checkAuth, getCourseLeaderboard);

export default router;

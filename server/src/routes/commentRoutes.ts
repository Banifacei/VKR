import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { getComments, addComment, deleteComment } from '../controllers/commentController.js';

const router = Router();
router.get('/video/:videoId', checkAuth, getComments);
router.post('/video/:videoId', checkAuth, addComment);
router.delete('/:id', checkAuth, deleteComment);
export default router;

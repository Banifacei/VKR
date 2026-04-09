import { Router } from 'express';
import { checkAuth, checkAuthSse } from '../middleware/authMiddleware.js';
import { getComments, addComment, deleteComment, streamComments } from '../controllers/commentController.js';

const router = Router();
router.get('/video/:videoId/stream', checkAuthSse, streamComments);
router.get('/video/:videoId', checkAuth, getComments);
router.post('/video/:videoId', checkAuth, addComment);
router.delete('/:id', checkAuth, deleteComment);
export default router;

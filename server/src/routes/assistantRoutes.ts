import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { askAssistant } from '../controllers/assistantController.js';

const router = Router();

router.post('/ask', checkAuth, askAssistant);

export default router;

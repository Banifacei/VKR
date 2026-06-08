import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { askAssistant, getAssistantStatus } from '../controllers/assistantController.js';

const router = Router();

router.get('/status', getAssistantStatus);
router.post('/ask', checkAuth, askAssistant);

export default router;

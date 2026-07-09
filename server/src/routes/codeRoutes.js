import { Router } from 'express';
import { checkAuth, isAdmin } from '../middleware/authMiddleware.js';
import { executeCode, getPistonStatus, installPistonRuntimes } from '../controllers/codeExecutionController.js';
const router = Router();
// Студент / препод — запустить код
router.post('/execute', checkAuth, executeCode);
// Только admin — управление Piston
router.get('/piston/status', checkAuth, isAdmin, getPistonStatus);
router.post('/piston/install', checkAuth, isAdmin, installPistonRuntimes);
export default router;

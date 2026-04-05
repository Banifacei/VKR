import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { globalSearch } from '../controllers/searchController.js';

const router = Router();
router.get('/', checkAuth, globalSearch);
export default router;

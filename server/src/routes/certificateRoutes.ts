import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { getOrCreateCertificate, getMyCertificates, downloadCertificate } from '../controllers/certificateController.js';

const router = Router();

router.get('/my', checkAuth, getMyCertificates);
router.get('/:courseId', checkAuth, getOrCreateCertificate);
router.get('/:courseId/download', checkAuth, downloadCertificate);

export default router;

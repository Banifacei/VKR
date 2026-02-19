import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { 
    getCourseTests, 
    createCourseTest, 
    deleteCourseTest, 
    addTestQuestion, 
    deleteTestQuestion 
} from '../controllers/testController.js';

const router = Router();

// Маршруты для управления тестами
router.get('/courses/:courseId', checkAuth, getCourseTests);
router.post('/courses/:courseId', checkAuth, createCourseTest);
router.delete('/:testId', checkAuth, deleteCourseTest);

// Маршруты для управления вопросами внутри теста
router.post('/:testId/questions', checkAuth, addTestQuestion);
router.delete('/questions/:questionId', checkAuth, deleteTestQuestion);

export default router;
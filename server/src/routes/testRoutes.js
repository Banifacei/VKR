import { Router } from 'express';
import { checkAuth } from '../middleware/authMiddleware.js';
import { updateCourseTest } from '../controllers/testController.js';
import { getCourseTests, createCourseTest, deleteCourseTest, addTestQuestion, deleteTestQuestion, submitTestResult, getUserCourseProgress, reorderTestQuestions, getTestStats, resetTestAttempts } from '../controllers/testController.js';
const router = Router();
router.put('/:testId', checkAuth, updateCourseTest);
// Маршруты для управления тестами
router.get('/courses/:courseId', checkAuth, getCourseTests);
router.post('/courses/:courseId', checkAuth, createCourseTest);
router.delete('/:testId', checkAuth, deleteCourseTest);
router.get('/:testId/stats', checkAuth, getTestStats);
// Маршруты для управления вопросами внутри теста
router.post('/:testId/questions', checkAuth, addTestQuestion);
router.delete('/questions/:questionId', checkAuth, deleteTestQuestion);
// Сохранение результатов и получение прогресса
router.post('/:testId/submit', checkAuth, submitTestResult);
router.get('/courses/:courseId/progress', checkAuth, getUserCourseProgress);
router.post('/:testId/questions/reorder', checkAuth, reorderTestQuestions);
router.delete('/:testId/attempts', checkAuth, resetTestAttempts);
export default router;

import { Router } from 'express';
import multer from 'multer';
import { checkAuth, isTeacherOrAdmin } from '../middleware/authMiddleware.js';
import {
    attachHomework,
    detachHomework,
    getAssignmentByEntity,
    createAssignment,
    updateAssignment,
    publishAssignment,
    uploadTaskFiles,
    deleteTaskFile,
    deleteAssignment,
    getCourseAssignments,
    getTeacherAssignments,
    getSubmissions,
    getStudentAssignments,
    getMySubmission,
    submitHomework,
    submitCodeHomework,
    checkCodeHomework,
    getCodeHistory,
    gradeSubmission,
    getCourseHomeworkStats,
} from '../controllers/homeworkController.js';

export default (upload: multer.Multer) => {
    const router = Router();

    // Attached (галочка на видео/тесте)
    router.post('/attach', checkAuth, isTeacherOrAdmin, attachHomework);
    router.delete('/attach', checkAuth, isTeacherOrAdmin, detachHomework);
    router.get('/by-entity', checkAuth, getAssignmentByEntity);

    // Standalone CRUD (препод)
    router.post('/', checkAuth, isTeacherOrAdmin, createAssignment);
    router.patch('/:id', checkAuth, isTeacherOrAdmin, updateAssignment);
    router.post('/:id/publish', checkAuth, isTeacherOrAdmin, publishAssignment);
    router.delete('/:id', checkAuth, isTeacherOrAdmin, deleteAssignment);
    router.patch('/:id/files', checkAuth, isTeacherOrAdmin, upload.array('hwfile', 10), uploadTaskFiles);
    router.delete('/:id/files/:index', checkAuth, isTeacherOrAdmin, deleteTaskFile);

    // Списки
    router.get('/teacher/all', checkAuth, isTeacherOrAdmin, getTeacherAssignments);
    router.get('/course/:courseId', checkAuth, getCourseAssignments);
    router.get('/course/:courseId/stats', checkAuth, isTeacherOrAdmin, getCourseHomeworkStats);
    router.get('/:id/submissions', checkAuth, isTeacherOrAdmin, getSubmissions);
    router.patch('/submissions/:id/grade', checkAuth, isTeacherOrAdmin, gradeSubmission);

    // Студент
    router.get('/my', checkAuth, getStudentAssignments);
    router.get('/:assignmentId/my-submission', checkAuth, getMySubmission);
    router.post('/:assignmentId/submit', checkAuth, upload.array('hwfile', 10), submitHomework);
    router.post('/:assignmentId/submit-code', checkAuth, submitCodeHomework);
    router.post('/:assignmentId/check-code', checkAuth, checkCodeHomework);

    // История ввода (только препод / admin)
    router.get('/submissions/:id/history', checkAuth, isTeacherOrAdmin, getCodeHistory);

    return router;
};

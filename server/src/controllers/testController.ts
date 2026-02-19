import { Request, Response } from 'express';
import { CourseTest } from '../models/CourseTest.js';
import { TestQuestion } from '../models/TestQuestion.js';

// --- ПОЛУЧИТЬ ВСЕ ТЕСТЫ КУРСА ---
export const getCourseTests = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const tests = await CourseTest.findAll({
            where: { courseId },
            include: [TestQuestion], // Сразу подтягиваем вопросы
            order: [['createdAt', 'ASC']]
        });
        res.json(tests);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при получении тестов' });
    }
};

// --- СОЗДАТЬ ТЕСТ ---
export const createCourseTest = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { title, description } = req.body;
        const test = await CourseTest.create({ title, description, courseId: Number(courseId) });
        res.status(201).json(test);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при создании теста' });
    }
};

// --- УДАЛИТЬ ТЕСТ ---
export const deleteCourseTest = async (req: Request, res: Response) => {
    try {
        const { testId } = req.params;
        // Сначала удаляем все вопросы, привязанные к тесту
        await TestQuestion.destroy({ where: { testId } });
        // Затем удаляем сам тест
        await CourseTest.destroy({ where: { id: testId } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при удалении теста' });
    }
};

// --- ДОБАВИТЬ ВОПРОС В ТЕСТ ---
export const addTestQuestion = async (req: Request, res: Response) => {
    try {
        const { testId } = req.params;
        const { type, text, options, correctAnswer, weight, aiThreshold } = req.body;
        
        const question = await TestQuestion.create({
            testId: Number(testId),
            type, text, options, correctAnswer,
            weight: weight || 1,
            aiThreshold: aiThreshold || 50
        });
        res.status(201).json(question);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при добавлении вопроса' });
    }
};

// --- УДАЛИТЬ ВОПРОС ИЗ ТЕСТА ---
export const deleteTestQuestion = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params;
        await TestQuestion.destroy({ where: { id: questionId } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при удалении вопроса' });
    }
};
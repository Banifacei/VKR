import { Request, Response } from 'express';
import { CourseTest } from '../models/CourseTest.js';
import { TestQuestion } from '../models/TestQuestion.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { Video } from '../models/Video.js';
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
// --- СОЗДАТЬ ТЕСТ ---
export const createCourseTest = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { title, description, passingScore, maxAttempts, orderIndex } = req.body;

        let finalOrderIndex = orderIndex;

        // 🤖 УМНАЯ ЛОГИКА: Если фронт не прислал orderIndex, находим самый большой в курсе
        if (finalOrderIndex === undefined || finalOrderIndex === null) {
            const maxVideoIndex = await Video.max('orderIndex', { where: { courseId: Number(courseId) } }) as number || 0;
            const maxTestIndex = await CourseTest.max('orderIndex', { where: { courseId: Number(courseId) } }) as number || 0;
            
            finalOrderIndex = Math.max(maxVideoIndex, maxTestIndex) + 1;
        }

        const test = await CourseTest.create({ 
            title, 
            description, 
            courseId: Number(courseId),
            passingScore: passingScore || 80, // Если создаем из старой формы, ставим дефолт 80%
            maxAttempts: maxAttempts || 3,    // Дефолт 3 попытки
            orderIndex: finalOrderIndex       // 👈 Железобетонно сохраняем в базу!
        });
        
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

export const reorderTestQuestions = async (req: Request, res: Response) => {
    try {
        const { orderedIds } = req.body; // Массив ID вопросов: [5, 2, 8]
        if (!orderedIds || !Array.isArray(orderedIds)) return res.status(400).json({ message: 'Invalid payload' });

        for (let i = 0; i < orderedIds.length; i++) {
            await TestQuestion.update({ weight: i }, { where: { id: orderedIds[i] } });
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сортировки' });
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

// --- СОХРАНИТЬ РЕЗУЛЬТАТ ТЕСТА ---
export const submitTestResult = async (req: Request, res: Response) => {
    try {
        const { testId } = req.params;
        const { score, answers } = req.body;
        // @ts-ignore
        const userId = req.user.id;

        // Ищем, сдавал ли юзер этот тест раньше
        const [result, created] = await UserTestResult.findOrCreate({
            where: { userId, testId: Number(testId) },
            defaults: { score, answers, userId, testId: Number(testId) }
        });

        // Если сдавал и пересдал — обновляем
        if (!created) {
            result.score = score;
            result.answers = answers;
            await result.save();
        }

        res.status(200).json({ success: true, result });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при сохранении результата' });
    }
};

// --- ПОЛУЧИТЬ ОБЩИЙ ПРОГРЕСС ПО КУРСУ (ДЛЯ ГАЛОЧЕК) ---
// --- ПОЛУЧИТЬ ОБЩИЙ ПРОГРЕСС ПО КУРСУ (ДЛЯ ПРОГРЕСС-БАРА И ОЦЕНОК) ---
export const getUserCourseProgress = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        // @ts-ignore
        const userId = req.user.id;

        // 1. Ищем все ПРОСМОТРЕННЫЕ ДО КОНЦА видео в этом курсе (isWatched: true)
        const videoProgress = await UserVideoProgress.findAll({
            where: { userId, isWatched: true },
            include: [{ model: Video, where: { courseId: Number(courseId) }, attributes: ['id'] }]
        });
        const completedVideoIds = videoProgress.map(vp => vp.videoId);

        // 2. Ищем все тесты в этом курсе
        const courseTests = await CourseTest.findAll({ 
            where: { courseId: Number(courseId) }, 
            attributes: ['id', 'passingScore'] 
        });
        const testIds = courseTests.map(t => t.id);

        // 3. Ищем результаты юзера по этим тестам
        const userTestResults = await UserTestResult.findAll({
            where: { userId, testId: testIds }
        });

        // 4. Формируем массив с результатами тестов (прошел / не прошел / балл)
        const testResults = userTestResults.map(tr => {
            const test = courseTests.find(t => t.id === tr.testId);
            const passed = test ? tr.score >= test.passingScore : false;
            return { testId: tr.testId, score: tr.score, passed };
        });

        // Отдаем структурированные данные
        res.json({
            completedVideoIds,
            testResults
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при получении прогресса' });
    }
};
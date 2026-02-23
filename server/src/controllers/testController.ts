import { Request, Response } from 'express';
import { CourseTest } from '../models/CourseTest.js';
import { TestQuestion } from '../models/TestQuestion.js';
import { UserTestResult } from '../models/UserTestResult.js';
import { UserVideoProgress } from '../models/UserVideoProgress.js';
import { pipeline } from '@xenova/transformers';
import { Video } from '../models/Video.js';
import { User } from '../models/User.js';

export const getCourseTests = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        
        // 👇 Безопасное извлечение userId
        const user = (req as any).user;
        if (!user || !user.id) {
            return res.status(401).json({ message: 'Пользователь не идентифицирован' });
        }
        const userId = user.id;

        const tests = await CourseTest.findAll({
            where: { courseId },
            include: [
                { model: TestQuestion, as: 'questions'},
                { 
                    model: UserTestResult, 
                    as: 'results',
                    where: { userId }, 
                    required: false 
                }
            ],
            order: [
                ['orderIndex', 'ASC'], 
                [{ model: TestQuestion, as: 'questions' }, 'orderIndex', 'ASC'] 
            ]
        });

        // Добавляем счетчик попыток для фронта
        const formattedTests = tests.map(test => {
            const data = test.get({ plain: true }) as any;
            return {
                ...data,
                attemptsUsed: data.results ? data.results.length : 0
            };
        });

        res.json(formattedTests);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при получении тестов' });
    }
};

let semanticExtractor: any = null;
export const calculateSemanticSimilarity = async (studentAnswer: string, correctAnswer: string) => {
    if (!studentAnswer || !correctAnswer) return 0;
    try {
        if (!semanticExtractor) {
            semanticExtractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
        }
        const output1 = await semanticExtractor(studentAnswer, { pooling: 'mean', normalize: true });
        const output2 = await semanticExtractor(correctAnswer, { pooling: 'mean', normalize: true });
        
        const v1 = Array.from(output1.data as Float32Array);
        const v2 = Array.from(output2.data as Float32Array);
        
        const dotProduct = v1.reduce((sum, val, i) => sum + val * (v2[i] || 0), 0);
        return Math.max(0, Math.min(100, Math.round(dotProduct * 100)));
    } catch (e) {
        console.error("Ошибка ИИ:", e);
        return 0;
    }
};
export const updateCourseTest = async (req: Request, res: Response) => {
    try {
        const { testId } = req.params;
        // Сразу добавляем hideResults для нашей следующей фичи!
        const { title, description, passingScore, maxAttempts, isHidden, hideResults } = req.body;

        const test = await CourseTest.findByPk(testId);
        if (!test) return res.status(404).json({ message: 'Тест не найден' });

        if (title !== undefined) test.title = title;
        if (description !== undefined) test.description = description;
        if (passingScore !== undefined) test.passingScore = passingScore;
        if (maxAttempts !== undefined) test.maxAttempts = maxAttempts;
        if (isHidden !== undefined) test.isHidden = isHidden;
        if (hideResults !== undefined) test.hideResults = hideResults; // Сохраняем переключатель результатов

        await test.save();
        res.json(test);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка обновления теста' });
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

export const getTestStats = async (req: Request, res: Response) => {
    try {
        const { testId } = req.params;
        const results = await UserTestResult.findAll({
            where: { testId },
            include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        
        const test = await CourseTest.findByPk(testId);
        
        res.json({ results, passingScore: test?.passingScore || 80 });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка загрузки статистики' });
    }
};

export const reorderTestQuestions = async (req: Request, res: Response) => {
    try {
        const { orderedIds } = req.body; 
        if (!orderedIds || !Array.isArray(orderedIds)) return res.status(400).json({ message: 'Invalid payload' });

        // 👇 МЕНЯЕМ weight НА orderIndex, чтобы совпадало с логикой БД
        for (let i = 0; i < orderedIds.length; i++) {
            await TestQuestion.update(
                { orderIndex: i }, 
                { where: { id: orderedIds[i] } }
            );
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

// --- СОХРАНИТЬ РЕЗУЛЬТАТ ТЕСТА (УМНАЯ ПРОВЕРКА НА БЭКЕНДЕ) ---
export const submitTestResult = async (req: Request, res: Response) => {
    const { testId } = req.params;
    const { answers } = req.body; // Фронтенд теперь присылает только ответы, score мы игнорируем!
    // @ts-ignore
    const userId = req.user.id;

    try {
        // Обязательно подтягиваем вопросы вместе с тестом, чтобы с ними сверяться!
        const test = await CourseTest.findByPk(testId, { include: [TestQuestion] });
        if (!test) return res.status(404).json({ message: 'Тест не найден' });

        // 1. Проверка лимита попыток
        if (test.maxAttempts > 0) {
            const attemptsCount = await UserTestResult.count({ where: { userId, testId } });
            if (attemptsCount >= test.maxAttempts) {
                return res.status(403).json({ message: 'Превышено максимальное количество попыток' });
            }
        }

        let totalWeight = 0;
        let earnedWeight = 0;
        const detailedAnswers: any = {}; // Сюда сложим разбор каждого вопроса

        // 2. Проверяем каждый вопрос на сервере
        for (const q of test.questions) {
            const weight = q.weight || 1;
            totalWeight += weight;
            const userAns = answers[q.id];
            
            let isCorrect = false;
            let similarity = null;

            // Если ответа нет вообще
            if (!userAns || (Array.isArray(userAns) && userAns.length === 0)) {
                detailedAnswers[q.id] = { answer: null, isCorrect: false };
                continue;
            }

            // Логика проверки для разных типов
            if (q.type === 'single_choice') {
                const correctOpt = q.options?.find((o: any) => o.isCorrect);
                isCorrect = userAns === correctOpt?.text;
            } 
            else if (q.type === 'multiple_choice') {
                // Проверяем совпадение массивов (выбраны ли ВСЕ правильные и НИ ОДНОГО неправильного)
                const correctOpts = q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
                const userArr = Array.isArray(userAns) ? userAns : [];
                isCorrect = correctOpts.length === userArr.length && correctOpts.every((opt: string) => userArr.includes(opt));
            } 
            else if (q.type === 'free_text') {
                // ИИ-проверка текстового ответа
                similarity = await calculateSemanticSimilarity(userAns, q.correctAnswer || '');
                isCorrect = similarity >= (q.aiThreshold || 50);
            }

            if (isCorrect) earnedWeight += weight;
            
            // Сохраняем детальную информацию для "Работы над ошибками"
            detailedAnswers[q.id] = { answer: userAns, isCorrect, similarity };
        }

        // 3. Высчитываем итоговый балл
        const finalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

        // 4. Сохраняем результат
        const result = await UserTestResult.create({
            userId,
            testId: Number(testId),
            score: finalScore,
            answers: JSON.stringify(detailedAnswers) // Теперь тут лежит умный JSON с результатами!
        });

        // Возвращаем фронтенду посчитанный балл и детальный разбор
        res.json({ score: finalScore, detailedAnswers });
    } catch (error) {
        console.error(error);
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
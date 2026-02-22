import api from './axiosInstance';

export interface ITestQuestion {
    id: number;
    type: string;
    text: string;
    options?: any;
    correctAnswer?: string;
    weight: number;
    aiThreshold: number;
    testId: number;
}

export interface ICourseTest {
    id: number;
    title: string;
    description?: string;
    maxAttempts: number;
    passingScore: number;
    courseId: number;
    questions?: ITestQuestion[];
    orderIndex?: number;
    isHidden?: boolean;
    unlockDate?: string | null;
}

export const getCourseTests = async (courseId: number): Promise<ICourseTest[]> => {
    const res = await api.get(`/tests/courses/${courseId}`);
    return res.data;
};

export const createCourseTest = async (courseId: number, data: { title: string, description?: string }) => {
    const res = await api.post(`/tests/courses/${courseId}`, data);
    return res.data;
};

export const deleteCourseTest = async (testId: number) => {
    const res = await api.delete(`/tests/${testId}`);
    return res.data;
};

export const addTestQuestion = async (testId: number, data: any) => {
    const res = await api.post(`/tests/${testId}/questions`, data);
    return res.data;
};

export const deleteTestQuestion = async (questionId: number) => {
    const res = await api.delete(`/tests/questions/${questionId}`);
    return res.data;
};

export const submitTestResult = async (testId: number, score: number, answers: any) => {
    // answers - это объект { questionId: answerValue }
    const res = await api.post(`/tests/${testId}/submit`, { score, answers });
    return res.data;
};

// 👇 Функция для получения прогресса по тестам курса (чтобы рисовать галочки)
export const getUserCourseProgress = async (courseId: number) => {
    const res = await api.get(`/tests/courses/${courseId}/progress`);
    return res.data; // Ожидаем массив ID пройденных тестов/видео
};
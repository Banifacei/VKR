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
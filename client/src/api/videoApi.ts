import api from './axiosInstance';
import type { IVideo, IInteractiveEvent, ICourse } from '../types';

export const getVideos = async (): Promise<IVideo[]> => {
    try {
        const response = await api.get('/videos');
        return response.data;
    } catch (error) {
        console.error('Ошибка при загрузке списка:', error);
        return [];
    }
};
export const createVideo = async (videoData: Partial<IVideo>) => {
    return api.post('/videos', videoData);
};
export const updateVideo = async (videoId: number, data: Partial<IVideo>) => {
    return api.patch(`/videos/${videoId}`, data);
};
export const resetProgress = (videoId: number, userId: string) => 
    api.delete(`/videos/${videoId}/progress`, { 
        params: { userId }
    });
export const addEvent = async (videoId: number, eventData: Partial<IInteractiveEvent>) => {
    return api.post(`/videos/${videoId}/events`, eventData);
};

export const sendAnswer = async (videoId: number, eventId: number, answer: string) => {
    return api.post('/videos/progress', { videoId, eventId, answer });
};
export const getVideoStats = async (videoId: number) => {
    const response = await api.get(`/videos/${videoId}/stats`);
    return response.data;
};
export const savePlaybackProgress = async (videoId: number, lastTime: number, isWatched: boolean) => {
    return api.post('/videos/playback-progress', { videoId, lastTime, isWatched });
};
export const getPlaybackProgress = async (videoId: number) => {
    const response = await api.get(`/videos/${videoId}/playback-progress`);
    return response.data;
};

export const uploadVideoFile = async (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('video', file);
    const response = await api.post<{ url: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress ? (e) => {
            const percent = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
            onProgress(percent);
        } : undefined,
    });
    return response.data;
};
export const getCourses = async (): Promise<ICourse[]> => {
    const response = await api.get('/videos/courses'); 
    return response.data;
};
export const createCourse = async (data: Partial<ICourse>) => {
    return api.post('/videos/courses', data);
};
export const getVideosByCourse = async (courseId: number): Promise<IVideo[]> => {
    const response = await api.get(`/videos/courses/${courseId}/videos`);
    return response.data;
};
export const generateAutoSubtitles = async (videoId: number) => {
    const response = await api.post(`/videos/${videoId}/autocaptions`);
    return response.data;
};

export const generateVideoQuestions = async (videoId: number, count = 5) => {
    const response = await api.post(`/videos/${videoId}/generate-questions`, { count });
    return response.data;
};
export const updateEvent = async (eventId: number, eventData: any) => {
    const response = await api.put(`/videos/events/${eventId}`, eventData); // Убедись, что путь совпадает с бэкендом
    return response.data;
};

export const deleteEvent = async (eventId: number) => {
    const response = await api.delete(`/videos/events/${eventId}`);
    return response.data;
};

export const reorderVideos = async (orderedIds: number[]) => {
    const response = await api.put('/videos/reorder', { orderedIds });
    return response.data;
};

export const reorderCourses = async (orderedIds: number[]) => {
    const response = await api.put('/videos/courses/reorder', { orderedIds });
    return response.data;
};

export const deleteVideoApi = async (videoId: number) => {
    const response = await api.delete(`/videos/${videoId}`);
    return response.data;
};

export const updateCourseApi = async (courseId: number, data: Partial<ICourse>) => {
    const response = await api.put(`/videos/courses/${courseId}`, data);
    return response.data;
};

export const deleteCourseApi = async (courseId: number) => {
    const response = await api.delete(`/videos/courses/${courseId}`);
    return response.data;
};

export const checkEnrollment = async (courseId: number) => {
    const res = await api.get(`/videos/courses/${courseId}/enrollment-status`);
    return res.data.status;
};

export const enrollInCourse = async (courseId: number) => {
    const res = await api.post(`/videos/courses/${courseId}/enroll`);
    return res.data;
};

export const getCourseEnrollments = async (courseId: number) => {
    const res = await api.get(`/videos/courses/${courseId}/enrollments`);
    return res.data;
};

export const updateEnrollmentStatus = async (enrollmentId: number, status: 'approved' | 'rejected') => {
    const res = await api.put(`/videos/courses/enrollments/${enrollmentId}`, { status });
    return res.data;
};

export const getCourseAnalytics = async (courseId: number) => {
    const res = await api.get(`/videos/courses/${courseId}/analytics`);
    return res.data;
};

export const transcodeVideo = async (videoId: number) => {
    const res = await api.post(`/videos/${videoId}/transcode`);
    return res.data;
};
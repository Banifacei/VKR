import api from './axiosInstance';
import type { IVideo, IInteractiveEvent, ICourse } from '../types';

// Базовый URL указывает на роутер видео
const API_URL = 'http://localhost:5000/api/videos';
const UPLOAD_URL = 'http://localhost:5000/api/upload';

// === ПОМОЩНИК ДЛЯ АВТОРИЗАЦИИ ===
const getAuthHeaders = () => {
    const token = localStorage.getItem('lumeo_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- ВИДЕО ---

export const getVideos = async (): Promise<IVideo[]> => {
    try {
        const response = await api.get('/videos');
        return response.data;
    } catch (error) {
        console.error('Ошибка при загрузке списка:', error);
        return [];
    }
};

// Исправлено: добавлены headers
export const createVideo = async (videoData: Partial<IVideo>) => {
    return api.post('/videos', videoData);
};

// Исправлено: добавлены headers
export const updateVideo = async (videoId: number, data: Partial<IVideo>) => {
    return api.patch(`/videos/${videoId}`, data);
};

// Исправлено: добавлены headers
export const resetProgress = (videoId: number, userId: string) => 
    api.delete(`/videos/${videoId}/progress`, { 
        params: { userId }
    });

// Исправлено: добавлены headers
export const addEvent = async (videoId: number, eventData: Partial<IInteractiveEvent>) => {
    return api.post(`/videos/${videoId}/events`, eventData);
};

export const sendAnswer = async (videoId: number, eventId: number, answer: string) => {
    return api.post('/videos/progress', { videoId, eventId, answer });
};

// Статистику видит только препод, нужны заголовки
export const getVideoStats = async (videoId: number) => {
    const response = await api.get(`/videos/${videoId}/stats`);
    return response.data;
};

// Сохранение позиции воспроизведения (таймлайн)
export const savePlaybackProgress = async (videoId: number, lastTime: number, isWatched: boolean) => {
    // Больше не нужен fetch, используем api.post
    return api.post('/videos/playback-progress', { videoId, lastTime, isWatched });
};

// Получение сохраненной позиции
export const getPlaybackProgress = async (videoId: number) => {
    const response = await api.get(`/videos/${videoId}/playback-progress`);
    return response.data;
};

export const uploadVideoFile = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    
    // api сам подставит токен. Content-Type для FormData axios часто ставит сам,
    // но можно указать явно для надежности.
    const response = await api.post<{ url: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// --- КУРСЫ ---

export const getCourses = async (): Promise<ICourse[]> => {
    // Путь берем из твоей старой константы API_URL + /courses
    const response = await api.get('/videos/courses'); 
    return response.data;
};

// Исправлено: добавлены headers
export const createCourse = async (data: Partial<ICourse>) => {
    return api.post('/videos/courses', data);
};

// Получение видео курса (обычно публично, но если курс закрытый — можно добавить headers)
export const getVideosByCourse = async (courseId: number): Promise<IVideo[]> => {
    const response = await api.get(`/videos/courses/${courseId}/videos`);
    return response.data;
};

// Исправлено: добавлены headers
export const generateAutoSubtitles = async (videoId: number) => {
    const response = await api.post(`/videos/${videoId}/autocaptions`);
    return response.data;
};
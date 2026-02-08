import axios from 'axios';
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
        const response = await axios.get<IVideo[]>(API_URL);
        return response.data;
    } catch (error) {
        console.error('Ошибка при загрузке списка:', error);
        return [];
    }
};

// Исправлено: добавлены headers
export const createVideo = async (videoData: Partial<IVideo>) => {
    return axios.post(API_URL, videoData, { headers: getAuthHeaders() });
};

// Исправлено: добавлены headers
export const updateVideo = async (videoId: number, data: Partial<IVideo>) => {
    return axios.patch(`${API_URL}/${videoId}`, data, { headers: getAuthHeaders() });
};

// Исправлено: добавлены headers
export const resetProgress = (videoId: number, userId: string) => 
    axios.delete(`${API_URL}/${videoId}/progress`, { 
        params: { userId },
        headers: getAuthHeaders() 
    });

// Исправлено: добавлены headers
export const addEvent = async (videoId: number, eventData: Partial<IInteractiveEvent>) => {
    return axios.post(`${API_URL}/${videoId}/events`, eventData, { headers: getAuthHeaders() });
};

export const sendAnswer = async (videoId: number, eventId: number, answer: string) => {
    return axios.post(`${API_URL}/progress`, 
        { videoId, eventId, answer }, 
        { headers: getAuthHeaders() }
    );
};

// Статистику видит только препод, нужны заголовки
export const getVideoStats = async (videoId: number) => {
    const response = await axios.get(`${API_URL}/${videoId}/stats`, { headers: getAuthHeaders() });
    return response.data;
};

// Сохранение позиции воспроизведения (таймлайн)
export const savePlaybackProgress = async (videoId: number, lastTime: number, isWatched: boolean) => {
    // Используем axiosInstance или fetch с токеном
    const token = localStorage.getItem('lumeo_token');
    return fetch(`http://localhost:5000/api/videos/playback-progress`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ videoId, lastTime, isWatched })
    });
};

// Получение сохраненной позиции
export const getPlaybackProgress = async (videoId: number) => {
    const token = localStorage.getItem('lumeo_token');
    const res = await fetch(`http://localhost:5000/api/videos/${videoId}/playback-progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
};

export const uploadVideoFile = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    
    // ИСПРАВЛЕНО: Теперь мы реально передаем headers с токеном
    const headers = { 
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
    };
    
    // В твоем коде тут была ошибка (ты передавал новый объект вместо headers)
    const response = await axios.post<{ url: string }>(UPLOAD_URL, formData, { headers });
    return response.data;
};

// --- КУРСЫ ---

export const getCourses = async (): Promise<ICourse[]> => {
    const response = await axios.get(`${API_URL}/courses`); 
    return response.data;
};

// Исправлено: добавлены headers
export const createCourse = async (data: Partial<ICourse>) => {
    return axios.post(`${API_URL}/courses`, data, { headers: getAuthHeaders() });
};

// Получение видео курса (обычно публично, но если курс закрытый — можно добавить headers)
export const getVideosByCourse = async (courseId: number): Promise<IVideo[]> => {
    const response = await axios.get(`${API_URL}/courses/${courseId}/videos`, { headers: getAuthHeaders() });
    return response.data;
};

// Исправлено: добавлены headers
export const generateAutoSubtitles = async (videoId: number) => {
    const response = await axios.post(`${API_URL}/${videoId}/autocaptions`, {}, { headers: getAuthHeaders() });
    return response.data;
};
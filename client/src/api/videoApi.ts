import axios from 'axios';
import type { IVideo, IInteractiveEvent, ICourse } from '../types';

// Базовый URL указывает на роутер видео
const API_URL = 'http://localhost:5000/api/videos';
const UPLOAD_URL = 'http://localhost:5000/api/upload';

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

export const createVideo = async (videoData: Partial<IVideo>) => {
    return axios.post(API_URL, videoData);
};

export const updateVideo = async (videoId: number, data: Partial<IVideo>) => {
    return axios.patch(`${API_URL}/${videoId}`, data);
};

export const resetProgress = (videoId: number, userId: string) => 
    axios.delete(`${API_URL}/${videoId}/progress`, { params: { userId } });

export const addEvent = async (videoId: number, eventData: Partial<IInteractiveEvent>) => {
    return axios.post(`${API_URL}/${videoId}/events`, eventData);
};

export const sendAnswer = async (videoId: number, eventId: number, answer: string, userId: string) => {
    return axios.post(`${API_URL}/progress`, { videoId, eventId, answer, userId });
};

export const getVideoStats = async (videoId: number) => {
    const response = await axios.get(`${API_URL}/${videoId}/stats`);
    return response.data;
};

export const uploadVideoFile = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await axios.post<{ url: string }>(UPLOAD_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// --- КУРСЫ ---

export const getCourses = async (): Promise<ICourse[]> => {
    // URL получается: http://localhost:5000/api/videos/courses
    const response = await axios.get(`${API_URL}/courses`); 
    return response.data;
};

export const createCourse = async (data: Partial<ICourse>) => {
    return axios.post(`${API_URL}/courses`, data);
};

export const getVideosByCourse = async (courseId: number): Promise<IVideo[]> => {
    // URL получается: http://localhost:5000/api/videos/courses/1/videos
    const response = await axios.get(`${API_URL}/courses/${courseId}/videos`);
    return response.data;
};

export const generateAutoSubtitles = async (videoId: number) => {
    // Отправляем POST запрос на генерацию
    const response = await axios.post(`${API_URL}/${videoId}/autocaptions`);
    return response.data;
};
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL, // Используем наш новый динамический URL
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('lumeo_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Если ошибка 401 (Нет прав) или 404 (Пользователь удален из БД, но токен есть)
        if (error.response && (error.response.status === 401 || error.response.status === 404)) {
            // Проверяем, не на странице ли мы авторизации уже
            if (window.location.pathname !== '/auth') {
                console.warn('Сессия истекла или пользователь не найден. Выход...');
                localStorage.removeItem('lumeo_user');
                localStorage.removeItem('lumeo_token');
                window.location.href = '/auth'; // Жесткий редирект
            }
        }
        return Promise.reject(error);
    }
);

export default api;
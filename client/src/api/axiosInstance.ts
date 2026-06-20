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
        // Только 401 (токен истёк / невалиден) — кикаем на /auth
        // 404 НЕ трогаем глобально: ресурс не найден ≠ сессия протухла
        if (error.response && error.response.status === 401) {
            if (window.location.pathname !== '/auth') {
                console.warn('Токен истёк или недействителен. Выход...');
                localStorage.removeItem('lumeo_user');
                localStorage.removeItem('lumeo_token');
                window.location.href = '/auth';
            }
        }
        if (error.response?.status === 403 && error.response?.data?.code === 'DEMO_RESTRICTED') {
            window.dispatchEvent(new CustomEvent('demo-restricted'));
            return new Promise(() => {}); // поглощаем ошибку — компонент не получит reject
        }
        return Promise.reject(error);
    }
);

export default api;
import axios from 'axios';

// Создаем экземпляр
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Твой базовый URL
});

// Перехватчик запросов (автоматически добавляет токен)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('lumeo_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Перехватчик ответов (обрабатывает ошибки)
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
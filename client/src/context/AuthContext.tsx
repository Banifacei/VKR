import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react'; // Импортируем тип отдельно
import api from '../api/axiosInstance';

// Тип данных пользователя
interface User {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone?: string;
    role: string;
    avatarUrl?: string;
}

// Тип контекста (что доступно компонентам)
interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [loading, setLoading] = useState(true);
    // Инициализация из localStorage (ленивая)
    const [user, setUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('lumeo_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('lumeo_token');
    });

    // --- ЛОГИКА ---

    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('lumeo_token', newToken);
        localStorage.setItem('lumeo_user', JSON.stringify(userData));
        setLoading(false);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('lumeo_token');
        localStorage.removeItem('lumeo_user');
        window.location.href = '/auth';
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('lumeo_user', JSON.stringify(updatedUser));
    };

// 2. ГЛАВНОЕ ИЗМЕНЕНИЕ: Проверка сессии при старте
    useEffect(() => {
        const checkUser = async () => {
            const storedToken = localStorage.getItem('lumeo_token');
            
            // Если токена нет, то и проверять нечего
            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                // Пытаемся получить свежие данные о себе с сервера
                const { data } = await api.get('/auth/me');
                
                // Если успешно — обновляем данные (вдруг роль сменилась или аватарка)
                setUser(data);
                // Обновляем и в localStorage на всякий случай
                localStorage.setItem('lumeo_user', JSON.stringify(data));
            } catch (error) {
                console.error("Сессия недействительна или пользователь удален", error);
                // Если ошибка (401 или 404) — выкидываем пользователя
                logout();
            } finally {
                // В любом случае загрузка завершена
                setLoading(false);
            }
        };

        checkUser();
    }, []);

    // 3. Пока идет проверка — показываем загрузку или ничего
    // Это предотвращает "мигание" контента, если токен протух
    if (loading) {
        return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff'}}>Загрузка...</div>;
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            updateUser,
            isAuthenticated: !!token,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
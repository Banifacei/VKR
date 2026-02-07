import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react'; // Импортируем тип отдельно

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('lumeo_token');
        localStorage.removeItem('lumeo_user');
        window.location.href = '/auth'; // Жесткий редирект для очистки состояний
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('lumeo_user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            updateUser,
            isAuthenticated: !!token 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Хук для удобного использования
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
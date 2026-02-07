import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserPage } from './pages/UserPage';
import { PrepodPage } from './pages/PrepodPage';
import { AdminPage } from './pages/AdminPage';
import { CoursesPage } from './pages/CoursesPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage'; // <-- Импорт

// Компонент защиты: проверяем наличие токена
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('lumeo_token');
    
    // Если токена нет — сразу кидаем на страницу входа
    if (!token) {
        return <Navigate to="/auth" replace />;
    }
    
    return <>{children}</>; 
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 1. Публичный маршрут */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* 2. Защищенные маршруты */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <CoursesPage />
                    </ProtectedRoute>
                } />

                {/* --- НОВЫЙ РОУТ ДЛЯ ПРОФИЛЯ --- */}
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />
                
                <Route path="/course/:courseId" element={
                    <ProtectedRoute>
                        <UserPage />
                    </ProtectedRoute>
                } />

                <Route path="/prepod" element={
                    <ProtectedRoute>
                        <PrepodPage />
                    </ProtectedRoute>
                } />

                <Route path="/adminpanel" element={
                    <ProtectedRoute>
                        <AdminPage />
                    </ProtectedRoute>
                } />

                {/* 3. Редирект */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
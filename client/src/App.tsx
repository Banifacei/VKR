import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserPage } from './pages/UserPage';
import { PrepodPage } from './pages/PrepodPage';
import { AdminPage } from './pages/AdminPage';
import { CoursesPage } from './pages/CoursesPage';
import { AuthPage } from './pages/AuthPage'; // Импортируем
import React from 'react';

// Простой компонент для защиты роутов
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const user = localStorage.getItem('lumeo_user');
    if (!user) return <Navigate to="/auth" replace />;
    return <>{children}</>; // Оборачиваем во фрагмент для безопасности типов
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                
                <Route path="/" element={
                    <ProtectedRoute><CoursesPage /></ProtectedRoute>
                } />
                
                <Route path="/course/:courseId" element={
                    <ProtectedRoute><UserPage /></ProtectedRoute>
                } />

                <Route path="/prepod" element={<PrepodPage />} />
                <Route path="/adminpanel" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;
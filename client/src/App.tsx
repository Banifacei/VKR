
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { UserPage } from './pages/UserPage';
import { PrepodPage } from './pages/PrepodPage';
import { AdminPage } from './pages/AdminPage';
import { CoursesPage } from './pages/CoursesPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { HistoryPage } from './pages/HistoryPage';
import { ToastProvider } from './context/ToastContext';
import { AnalyticsPage } from './pages/AnalyticsPage';
// Обновленный ProtectedRoute с поддержкой проверки ролей
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { isAuthenticated, user } = useAuth(); // Достаем user из AuthContext

    // 1. Если не авторизован вообще -> кидаем на страницу входа
    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    // 2. Если для страницы указаны конкретные роли, а у юзера её нет -> кидаем на главную
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // 3. Всё ок -> показываем страницу
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

function App() {
    return (
    <ToastProvider>
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                    
                    {/* --- ОБЩИЕ РОУТЫ (Доступны всем авторизованным) --- */}
                    <Route path="/" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/course/:courseId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
                    <Route path="/course/:courseId/lesson/:videoId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />

                    {/* --- ПРЕПОДАВАТЕЛЬСКАЯ (Только для teacher и admin) --- */}
                    <Route path="/prepod" element={
                        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                            <PrepodPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                            <AnalyticsPage />
                        </ProtectedRoute>
                    } />
                    
                    {/* --- АДМИН ПАНЕЛЬ (Только для admin) --- */}
                    <Route path="/adminpanel" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminPage />
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    </ToastProvider>
    );
}

export default App;
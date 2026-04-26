
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { SearchProvider } from './context/SearchContext';
import { GlobalSearch } from './components/GlobalSearch';
import api from './api/axiosInstance';

function HeartbeatSender() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated) return;
        const send = () => api.post('/heartbeat', { page: location.pathname }).catch(() => {});
        send();
        const id = setInterval(send, 30_000);
        return () => clearInterval(id);
    }, [isAuthenticated, location.pathname]);

    return null;
}
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));

import { AuthPage } from './pages/AuthPage';
import { CoursesPage } from './pages/CoursesPage';
import { PrivacyPage } from './pages/PrivacyPage';

const UserPage      = lazy(() => import('./pages/UserPage').then(m => ({ default: m.UserPage })));
const AdminPage     = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ProfilePage   = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HistoryPage   = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
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
        <ThemeProvider>
        <AuthProvider>
            <BrowserRouter>
                <HeartbeatSender />
                <SearchProvider>
                <GlobalSearch />
                <Suspense fallback={null}>
                <Routes>
                    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* --- ОБЩИЕ РОУТЫ (Доступны всем авторизованным) --- */}
                    <Route path="/" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/course/:courseId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
                    <Route path="/course/:courseId/lesson/:videoId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />

                    {/* --- ПРЕПОДАВАТЕЛЬСКАЯ (Только для teacher и admin) --- */}
                    <Route path="/prepod" element={<Navigate to="/" replace />} />
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
                </Suspense>
                </SearchProvider>
            </BrowserRouter>
        </AuthProvider>
        </ThemeProvider>
    </ToastProvider>
    );
}

export default App;
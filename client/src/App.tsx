
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { SearchProvider } from './context/SearchContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { TourProvider, useTour, getTourStepsByRole } from './context/TourContext';
import { GlobalSearch } from './components/GlobalSearch';
import { AiAssistant } from './components/AiAssistant';
import { DemoRestrictedModal } from './components/DemoRestrictedModal';
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

function OnboardingLauncher() {
    const { user, isAuthenticated } = useAuth();
    const { startTour } = useTour();

    useEffect(() => {
        if (!isAuthenticated || !user) return;
        if (user.onboardingCompleted) return;
        // Небольшая задержка чтобы страница успела отрендериться
        const t = setTimeout(() => {
            const steps = getTourStepsByRole(user.role);
            startTour(steps);
        }, 800);
        return () => clearTimeout(t);
    }, [isAuthenticated, user?.id, user?.onboardingCompleted]);

    return null;
}
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));

import { AuthPage } from './pages/AuthPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CoursesPage } from './pages/CoursesPage';
import { PrivacyPage } from './pages/PrivacyPage';

const UserPage      = lazy(() => import('./pages/UserPage').then(m => ({ default: m.UserPage })));
const AdminPage     = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ProfilePage   = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HistoryPage   = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
import { NotFoundPage } from './pages/NotFoundPage';
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AssignmentsPage = lazy(() => import('./pages/AssignmentsPage').then(m => ({ default: m.AssignmentsPage })));
const CertificatesPage = lazy(() => import('./pages/CertificatesPage').then(m => ({ default: m.CertificatesPage })));
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
    <ConfirmProvider>
        <ThemeProvider>
        <AuthProvider>
        <TourProvider>
            <BrowserRouter>
                <HeartbeatSender />
                <OnboardingLauncher />
                <AiAssistant />
                <DemoRestrictedModal />
                <div style={{ position: 'fixed', bottom: 8, right: 12, fontSize: 10, color: 'rgba(255,255,255,0.18)', pointerEvents: 'none', zIndex: 9999, userSelect: 'none', letterSpacing: 0.2 }}>
                    © 2026 Lumeo · Свид. ПО № 2026615131
                </div>
                <SearchProvider>
                <GlobalSearch />
                <Suspense fallback={null}>
                <Routes>
                    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                    <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* --- ОБЩИЕ РОУТЫ (Доступны всем авторизованным) --- */}
                    <Route path="/" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/course/:courseId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
                    <Route path="/course/:courseId/lesson/:videoId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
                    <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />

                    {/* --- ПРЕПОДАВАТЕЛЬСКАЯ (Только для teacher и admin) --- */}
                    <Route path="/prepod" element={<Navigate to="/" replace />} />
                    <Route path="/assignments" element={
                        <ProtectedRoute>
                            <AssignmentsPage />
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

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </Suspense>
                </SearchProvider>
            </BrowserRouter>
        </TourProvider>
        </AuthProvider>
        </ThemeProvider>
    </ConfirmProvider>
    </ToastProvider>
    );
}

export default App;
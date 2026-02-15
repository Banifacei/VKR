import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { UserPage } from './pages/UserPage';
import { PrepodPage } from './pages/PrepodPage';
import { AdminPage } from './pages/AdminPage';
import { CoursesPage } from './pages/CoursesPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                    
                    <Route path="/" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/course/:courseId" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
                    <Route path="/prepod" element={<ProtectedRoute><PrepodPage /></ProtectedRoute>} />
                    <Route path="/adminpanel" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
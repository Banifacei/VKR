import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserPage } from './pages/UserPage';
import { PrepodPage } from './pages/PrepodPage';
import { AdminPage } from './pages/AdminPage';
import { CoursesPage } from './pages/CoursesPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ГЛАВНАЯ - СПИСОК КУРСОВ */}
        <Route path="/" element={<CoursesPage />} />

        {/* СТРАНИЦА КОНКРЕТНОГО КУРСА (БЫВШАЯ USER PAGE) */}
        <Route path="/course/:courseId" element={<UserPage />} />

        {/* ПРЕПОДАВАТЕЛЬ */}
        <Route path="/prepod" element={<PrepodPage />} />

        {/* АДМИН */}
        <Route path="/adminpanel" element={<AdminPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
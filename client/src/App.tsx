import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserPage } from './pages/UserPage';
import { PrepodPage } from './pages/PrepodPage';
import { AdminPage } from './pages/AdminPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* СТУДЕНТ: Главная */}
        <Route path="/" element={<UserPage />} />

        {/* ПРЕПОДАВАТЕЛЬ: Конструктор уроков */}
        <Route path="/prepod" element={<PrepodPage />} />

        {/* АДМИН: Статистика и настройки */}
        <Route path="/adminpanel" element={<AdminPage />} />

        {/* Редирект */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
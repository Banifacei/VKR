// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserPage } from './pages/UserPage';
import { AdminPage } from './pages/AdminPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Главная страница для студентов */}
        <Route path="/" element={<UserPage />} />

        {/* Панель управления для преподавателя */}
        <Route path="/prepod" element={<AdminPage />} />

        {/* Редирект всех непонятных путей на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
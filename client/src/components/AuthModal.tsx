// src/components/AuthModal.tsx
import { useState } from 'react';

interface AuthModalProps {
  onLogin: (name: string) => void;
}

export const AuthModal = ({ onLogin }: AuthModalProps) => {
  const [tempName, setTempName] = useState('');

  const handleStart = () => {
    if (!tempName.trim()) return alert('Введите имя!');
    onLogin(tempName);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>Добро пожаловать</h2>
        <p>Введите ваше Фамилию и Имя для начала обучения</p>
        <input 
          className="admin-input" 
          placeholder="Иванов Иван" 
          value={tempName}
          onChange={e => setTempName(e.target.value)}
        />
        <button className="primary-btn" onClick={handleStart}>
          НАЧАТЬ
        </button>
      </div>
    </div>
  );
};
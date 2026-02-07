import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

// SVG Иконка пользователя
const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

export const AuthPage = () => {
    const [tempName, setTempName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorShake, setErrorShake] = useState(false);
    const navigate = useNavigate();

    const handleLogin = () => {
        if (!tempName.trim()) {
            // Если пусто — трясем карточку
            setErrorShake(true);
            setTimeout(() => setErrorShake(false), 400);
            return;
        }
        
        setIsSubmitting(true);
        
        // Красивая задержка для ощущения "процесса входа"
        setTimeout(() => {
            localStorage.setItem('lumeo_user', tempName);
            navigate('/');
        }, 800);
    };

    return (
        <div className="auth-page">
            {/* Фоновые элементы */}
            <div className="auth-background">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>
            
            <div className={`auth-card ${isSubmitting ? 'fade-out' : ''} ${errorShake ? 'shake' : ''}`}>
                <div className="auth-header">
                    <div className="logo large">Lumeo<span className="dot">.</span></div>
                    <h1>Добро пожаловать</h1>
                    <p>Введите данные для доступа к образовательной платформе</p>
                </div>

                <div className="auth-form">
                    <div className="input-container">
                        <input 
                            className="auth-input" 
                            placeholder="Фамилия Имя" 
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            autoFocus
                            disabled={isSubmitting}
                        />
                        <div className="input-icon">
                            <UserIcon />
                        </div>
                    </div>

                    <button 
                        className="auth-submit-btn" 
                        onClick={handleLogin}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'ВХОД В СИСТЕМУ...' : 'НАЧАТЬ ОБУЧЕНИЕ'}
                    </button>
                </div>

                <div className="auth-footer">
                    <span>© 2026 Lumeo Educational Platform</span>
                </div>
            </div>
        </div>
    );
};
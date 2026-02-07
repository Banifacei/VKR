// src/components/AuthModal.tsx
import { useState } from 'react';

export const AuthModal = ({ onLoginSuccess }: { onLoginSuccess: (userData: any) => void }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const handleSubmit = async () => {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message);

            if (isLogin) {
                localStorage.setItem('lumeo_token', data.token);
                onLoginSuccess(data.user);
            } else {
                alert('Регистрация успешна! Теперь войдите.');
                setIsLogin(true);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-card">
                <h2>{isLogin ? 'Вход в Lumeo' : 'Создать аккаунт'}</h2>
                
                {!isLogin && (
                    <input 
                        className="admin-input" 
                        placeholder="Имя пользователя" 
                        onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                )}
                <input 
                    className="admin-input" 
                    placeholder="Email" 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
                <input 
                    className="admin-input" 
                    type="password" 
                    placeholder="Пароль" 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />

                <button className="primary-btn" onClick={handleSubmit}>
                    {isLogin ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
                </button>

                <p className="auth-switch" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
                </p>
            </div>
        </div>
    );
};
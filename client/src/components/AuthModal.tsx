// src/components/AuthModal.tsx
import { useState } from 'react';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';

export const AuthModal = ({ onLoginSuccess }: { onLoginSuccess: (userData: any) => void }) => {
    const { showToast } = useToast();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const handleSubmit = async () => {
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            // api сам разберется с URL
            const res = await api.post(endpoint, formData);
            const data = res.data;

            if (isLogin) {
                localStorage.setItem('lumeo_token', data.token);
                onLoginSuccess(data.user);
            } else {
                showToast('Регистрация успешна! Теперь войдите.', 'success');
                setIsLogin(true);
            }
        } catch (err: any) {
            // Обрабатываем ошибку от axios
            showToast(err.response?.data?.message || err.message, 'error');
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
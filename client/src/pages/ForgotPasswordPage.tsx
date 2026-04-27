import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';
import { Icons } from '../components/Icons';
import './AuthPage.css';

export const ForgotPasswordPage = () => {
    const { globalTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        if (!email.trim()) { setError('Введите email'); return; }
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: email.trim() });
            setSent(true);
        } catch {
            setError('Ошибка сервера. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-background">
                <div className="blob blob-1" /><div className="blob blob-2" />
            </div>
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo large">
                        <div className="logo-icon"><Icons.FileText size={28} /></div>
                        {globalTheme.platform_name}<span className="dot">.</span>
                    </div>
                </div>

                {sent ? (
                    <div className="auth-form" style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
                        <h3 style={{ marginBottom: 8 }}>Письмо отправлено</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                            Если этот email зарегистрирован, вы получите ссылку для сброса пароля. Проверьте папку «Спам».
                        </p>
                        <Link to="/auth" className="auth-submit-btn" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                            Вернуться ко входу
                        </Link>
                    </div>
                ) : (
                    <div className="auth-form">
                        <h3 style={{ marginBottom: 6 }}>Забыли пароль?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                            Введите email — пришлём ссылку для сброса.
                        </p>

                        <div className="input-container">
                            <input
                                className="auth-input"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                autoFocus
                            />
                            <div className="input-icon"><Icons.Mail /></div>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Отправка...' : 'Отправить ссылку'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Link to="/auth" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}>
                                ← Назад ко входу
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

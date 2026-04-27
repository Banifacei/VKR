import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';
import { Icons } from '../components/Icons';
import './AuthPage.css';

export const ResetPasswordPage = () => {
    const { globalTheme } = useTheme();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) setError('Ссылка недействительна. Запросите новую.');
    }, [token]);

    const handleSubmit = async () => {
        setError('');
        if (password.length < 8) { setError('Пароль должен быть не менее 8 символов'); return; }
        if (password !== confirm) { setError('Пароли не совпадают'); return; }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            setDone(true);
            setTimeout(() => navigate('/auth'), 3000);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Ссылка истекла или недействительна. Запросите новую.');
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

                {done ? (
                    <div className="auth-form" style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                        <h3 style={{ marginBottom: 8 }}>Пароль изменён</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Перенаправляем на страницу входа...</p>
                    </div>
                ) : (
                    <div className="auth-form">
                        <h3 style={{ marginBottom: 6 }}>Новый пароль</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                            Придумайте надёжный пароль — не менее 8 символов.
                        </p>

                        <div className="input-container">
                            <input
                                className="auth-input"
                                type="password"
                                placeholder="Новый пароль"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoFocus
                                disabled={!token}
                            />
                            <div className="input-icon"><Icons.Lock /></div>
                        </div>

                        <div className="input-container">
                            <input
                                className="auth-input"
                                type="password"
                                placeholder="Повторите пароль"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                disabled={!token}
                            />
                            <div className="input-icon"><Icons.Lock /></div>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading || !token}>
                            {loading ? 'Сохранение...' : 'Сохранить пароль'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}>
                                Запросить новую ссылку
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

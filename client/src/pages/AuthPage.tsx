import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './AuthPage.css';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { Icons } from '../components/Icons';
import { BannedModal } from '../components/BannedModal';

export const AuthPage = () => {
    const { globalTheme } = useTheme();
    const { showToast } = useToast();
    const [authProviders, setAuthProviders] = useState({ yandex: false, google: false, saml: false, esia: false });

    useEffect(() => {
        api.get('/auth/settings')
            .then(res => setAuthProviders(res.data))
            .catch(err => console.error("Ошибка загрузки настроек SSO", err));
    }, []);

    const [isLogin, setIsLogin] = useState(true);
    const { login } = useAuth();
    const location = useLocation();

    // Registration fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const [showSsoMenu, setShowSsoMenu] = useState(false);

    // Login field
    const [identifier, setIdentifier] = useState('');

    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pdConsent, setPdConsent] = useState(false);
    const [loginBanReason, setLoginBanReason] = useState<string | null | undefined>(undefined);
    const navigate = useNavigate();

    // Email verification step
    const [step, setStep] = useState<'form' | 'verify_email'>('form');
    const [pendingEmail, setPendingEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    // OAuth code exchange
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oauthCode = params.get('code');
        const urlError = params.get('error');

        if (oauthCode) {
            window.history.replaceState({}, document.title, location.pathname);
            api.post('/auth/exchange', { code: oauthCode })
                .then(res => {
                    const token = res.data.token;
                    return api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(meRes => {
                        login(token, meRes.data);
                        navigate('/');
                    });
                })
                .catch(() => {
                    setError('Не удалось завершить вход через OAuth');
                });
            return;
        }

        if (urlError) {
            setError(`Ошибка входа через сторонний сервис: ${urlError}`);
            window.history.replaceState({}, document.title, location.pathname);
        }
    }, [location, login, navigate]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...otpDigits];
        next[index] = value.slice(-1);
        setOtpDigits(next);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (text.length === 6) {
            setOtpDigits(text.split(''));
            setTimeout(() => otpRefs.current[5]?.focus(), 0);
            e.preventDefault();
        }
    };

    const handleVerify = async () => {
        const code = otpDigits.join('');
        if (code.length !== 6) return;
        setIsSubmitting(true);
        setError('');
        try {
            const res = await api.post('/auth/verify-email', { email: pendingEmail, code });
            const data = res.data;
            if (data.status === 'pending') {
                showToast('Почта подтверждена. Заявка будет рассмотрена администратором.', 'info');
            } else {
                showToast('Почта подтверждена! Теперь войдите.', 'success');
            }
            setStep('form');
            setIsLogin(true);
            setOtpDigits(['', '', '', '', '', '']);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка подтверждения');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        try {
            await api.post('/auth/resend-verification', { email: pendingEmail });
            showToast('Новый код отправлен на почту', 'success');
            setResendTimer(60);
        } catch {
            showToast('Не удалось отправить код', 'error');
        } finally {
            setIsResending(false);
        }
    };

    const handleSubmit = async () => {
        setError('');

        if (!password) { setError('Введите пароль'); return; }

        if (isLogin && !identifier) {
            setError('Введите Email или телефон'); return;
        }
        if (!isLogin && (!email || !firstName || !lastName)) {
            setError('Заполните обязательные поля'); return;
        }
        if (!isLogin && !pdConsent) {
            setError('Необходимо согласие на обработку персональных данных'); return;
        }

        setIsSubmitting(true);
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const body = isLogin
            ? { identifier, password }
            : { email, phone, password, firstName, lastName };

        try {
            const res = await api.post(endpoint, body);
            const data = res.data;

            if (isLogin) {
                if (data.status === 'pending') {
                    setError('Ваш аккаунт находится на рассмотрении администратора.');
                    return;
                }
                login(data.token, data.user);
                navigate('/');
            } else {
                if (data.status === 'verify_email') {
                    setPendingEmail(email);
                    setStep('verify_email');
                    setResendTimer(60);
                } else if (data.status === 'pending') {
                    showToast('Заявка отправлена! Ожидайте подтверждения администратором.', 'info');
                    setIsLogin(true);
                } else {
                    showToast('Регистрация успешна! Теперь войдите.', 'success');
                    setIsLogin(true);
                }
            }
        } catch (err: any) {
            if (err.response?.data?.banned) {
                setLoginBanReason(err.response.data.banReason ?? null);
            } else if (err.response?.data?.status === 'email_pending') {
                setError('Сначала подтвердите email. Проверьте почту.');
            } else {
                setError(err.response?.data?.message || 'Ошибка сервера');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            {loginBanReason !== undefined && (
                <BannedModal reason={loginBanReason} onClose={() => setLoginBanReason(undefined)} />
            )}
            <div className="auth-background">
                <div className="blob blob-1"></div><div className="blob blob-2"></div>
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo large">
                        {globalTheme.platform_logo && (
                            <img src={globalTheme.platform_logo} alt="logo" style={{ height: 40, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                        )}
                        {globalTheme.platform_name}<span className="dot">.</span>
                    </div>
                    <h1>
                        {step === 'verify_email'
                            ? 'Подтверждение почты'
                            : isLogin ? `Вход в ${globalTheme.platform_name}` : 'Создание аккаунта'}
                    </h1>
                </div>

                <div className="auth-form">
                    {step === 'verify_email' ? (
                        <>
                            <p style={{ color: '#888', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>
                                Мы отправили 6-значный код на{' '}
                                <strong style={{ color: '#fff' }}>{pendingEmail}</strong>
                            </p>
                            <div className="otp-boxes">
                                {otpDigits.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        className="otp-box"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        onPaste={i === 0 ? handleOtpPaste : undefined}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>
                            {error && <div style={{ color: '#ff4d4d', marginBottom: 10, textAlign: 'center' }}>{error}</div>}
                            <button
                                className="auth-submit-btn"
                                onClick={handleVerify}
                                disabled={isSubmitting || otpDigits.some(d => !d)}
                            >
                                {isSubmitting ? 'Проверяем...' : 'Подтвердить'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                {resendTimer > 0 ? (
                                    <span style={{ color: '#666', fontSize: 13 }}>
                                        Отправить повторно через {resendTimer} с.
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleResend}
                                        disabled={isResending}
                                        style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                                    >
                                        {isResending ? 'Отправляем...' : 'Отправить код повторно'}
                                    </button>
                                )}
                            </div>
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button
                                    onClick={() => { setStep('form'); setError(''); setOtpDigits(['', '', '', '', '', '']); }}
                                    style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                                >
                                    ← Назад
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {!isLogin && (
                                <>
                                    <div className="name-inputs-grid">
                                        <div className="input-container">
                                            <input className="auth-input" placeholder="Имя" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                        </div>
                                        <div className="input-container">
                                            <input className="auth-input" placeholder="Фамилия" value={lastName} onChange={e => setLastName(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="input-container">
                                        <input className="auth-input" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                                        <div className="input-icon"><Icons.Mail /></div>
                                    </div>

                                    <div className="input-container">
                                        <input className="auth-input" placeholder="Телефон (необязательно)" value={phone} onChange={e => setPhone(e.target.value)} />
                                        <div className="input-icon"><Icons.Phone /></div>
                                    </div>
                                </>
                            )}

                            {isLogin && (
                                <div className="input-container">
                                    <input
                                        className="auth-input"
                                        placeholder="Email или номер телефона"
                                        value={identifier}
                                        onChange={e => setIdentifier(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="input-icon"><Icons.User /></div>
                                </div>
                            )}

                            <div className="input-container">
                                <input className="auth-input" placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
                                <div className="input-icon"><Icons.Lock /></div>
                            </div>

                            {!isLogin && (
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={pdConsent}
                                        onChange={e => setPdConsent(e.target.checked)}
                                        style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                    />
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                        Я согласен(а) на обработку персональных данных в соответствии с{' '}
                                        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                            Политикой конфиденциальности
                                        </a>{' '}
                                        (152-ФЗ)
                                    </span>
                                </label>
                            )}

                            {error && <div style={{color: '#ff4d4d', marginBottom: '10px'}}>{error}</div>}

                            <button className="auth-submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Загрузка...' : (isLogin ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ')}
                            </button>

                            {isLogin && (
                                <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '8px' }}>
                                    <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>
                                        Забыли пароль?
                                    </Link>
                                </div>
                            )}

                            {isLogin && (authProviders.yandex || authProviders.google || authProviders.saml || true) && (
                                <div className="sso-container">
                                    <div className="auth-divider">
                                        <span>или</span>
                                    </div>

                                    {!showSsoMenu ? (
                                        <button
                                            className="btn btn-secondary"
                                            type="button"
                                            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                            onClick={() => setShowSsoMenu(true)}
                                        >
                                            <Icons.Globe /> Войти через другие сервисы
                                        </button>
                                    ) : (
                                        <div className="sso-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                                            {authProviders.google && (
                                                <button className="btn btn-secondary" type="button" onClick={() => window.location.href = `${apiUrl}/auth/google`} style={{ width: '100%' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                                    </svg>
                                                    Войти через Google
                                                </button>
                                            )}
                                            {authProviders.yandex && (
                                                <button className="btn btn-secondary" type="button" onClick={() => window.location.href = `${apiUrl}/auth/yandex`} style={{ width: '100%' }}>
                                                    <div style={{ width: '18px', height: '18px', background: '#FC3F1D', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>
                                                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', transform: 'translateY(-0.5px)' }}>Я</span>
                                                    </div>
                                                    Войти через Яндекс
                                                </button>
                                            )}
                                            {authProviders.saml && (
                                                <button className="sso-btn saml" type="button" onClick={() => window.location.href = `${apiUrl}/auth/saml`} style={{ width: '100%' }}>
                                                    <Icons.Building /> Корпоративный портал
                                                </button>
                                            )}
                                            {/* ЕСИА — проектируемая интеграция */}
                                            <div title="Интеграция с Госуслугами требует регистрации организации в Минцифры. Запланировано к подключению.">
                                                <button
                                                    className="btn btn-secondary"
                                                    type="button"
                                                    disabled
                                                    style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="50" cy="50" r="48" fill="#0066cc" stroke="#004499" strokeWidth="2"/>
                                                        <text x="50" y="67" textAnchor="middle" fill="white" fontSize="52" fontWeight="bold" fontFamily="Arial">Г</text>
                                                    </svg>
                                                    Войти через Госуслуги
                                                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px' }}>скоро</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{marginTop: '20px', color: 'var(--text-muted)', fontSize: '14px'}}>
                                {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                                <span style={{color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => { setIsLogin(!isLogin); setError(''); setPdConsent(false); }}>
                                    {isLogin ? 'Создать' : 'Войти'}
                                </span>
                            </div>

                            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
                                    Политика конфиденциальности
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

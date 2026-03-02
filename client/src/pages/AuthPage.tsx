import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AuthPage.css';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

const Icons = {
    User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    Mail: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    Phone: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    Building: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
    Globe: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
};

export const AuthPage = () => {
    const [authProviders, setAuthProviders] = useState({ yandex: false, google: false, saml: false });

    // При открытии страницы спрашиваем бэкенд, какие методы входа разрешены
    useEffect(() => {
        api.get('/auth/settings')
            .then(res => setAuthProviders(res.data))
            .catch(err => console.error("Ошибка загрузки настроек SSO", err));
    }, []);
    const [isLogin, setIsLogin] = useState(true);
    const { login } = useAuth();
    const location = useLocation();
    // Поля регистрации
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const [showSsoMenu, setShowSsoMenu] = useState(false); 
    // Поле входа (универсальное)
    const [identifier, setIdentifier] = useState(''); // Email или Телефон
    
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // 🔥 УМНЫЙ ПЕРЕХВАТЧИК ТОКЕНА ЯНДЕКСА
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlToken = params.get('token');
        const urlError = params.get('error');

        if (urlToken) {
            console.log("✅ Поймали токен от Яндекса!");
            
            // 1. Сохраняем токен под ПРАВИЛЬНЫМ ключом для axios
            localStorage.setItem('lumeo_token', urlToken);
            
            // 2. Сразу запрашиваем профиль юзера с этим токеном
            api.get('/auth/me', {
                headers: { Authorization: `Bearer ${urlToken}` }
            })
            .then(res => {
                // 3. Используем твою готовую функцию login из AuthContext!
                // Она сама положит всё в стейт и localStorage
                login(urlToken, res.data);
                // 4. Отправляем в личный кабинет
                navigate('/');
            })
            .catch(err => {
                console.error("Ошибка при загрузке профиля Яндекса", err);
                setError('Не удалось завершить вход');
            });

            // Очищаем URL от мусора
            window.history.replaceState({}, document.title, location.pathname);
            return;
        }

        if (urlError) {
            setError(`Ошибка входа через сторонний сервис: ${urlError}`);
            window.history.replaceState({}, document.title, location.pathname);
        }
    }, [location, login, navigate]);

    const handleSubmit = async () => {
        setError('');
        
        // Валидация
        if (!password) { setError('Введите пароль'); return; }
        
        if (isLogin && !identifier) {
            setError('Введите Email или телефон'); return;
        }
        if (!isLogin && (!email || !firstName || !lastName)) {
            setError('Заполните обязательные поля'); return;
        }
        
        setIsSubmitting(true);
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        
        // Тело запроса отличается для входа и регистрации
        const body = isLogin 
            ? { identifier, password } 
            : { email, phone, password, firstName, lastName };

        try {
            // 🔥 axios сам подставит нужный порт и IP из .env
            const res = await api.post(endpoint, body);
            const data = res.data;

            if (isLogin) {
                // Если с бэкенда пришел статус pending
                if (data.status === 'pending') {
                    setError('Ваш аккаунт находится на рассмотрении администратора.');
                    return;
                }
                login(data.token, data.user);
                navigate('/');
            } else {
                if (data.status === 'pending') {
                    alert('Заявка отправлена! Ожидайте подтверждения администратором.');
                } else {
                    alert('Регистрация успешна! Теперь войдите.');
                }
                setIsLogin(true);
            }
        } catch (err: any) {
            // axios умно обрабатывает ошибки с бэкенда
            setError(err.response?.data?.message || 'Ошибка сервера');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-background">
                <div className="blob blob-1"></div><div className="blob blob-2"></div>
            </div>
            
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo large">Lumeo<span className="dot">.</span></div>
                    <h1>{isLogin ? 'Вход в Lumeo' : 'Создание аккаунта'}</h1>
                </div>

                <div className="auth-form">
                    {/* РЕГИСТРАЦИЯ: Показываем подробные поля */}
                    {!isLogin && (
                        <>
                            <div style={{display: 'flex', gap: '10px'}}>
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

                    {/* ВХОД: Показываем одно поле "Email или телефон" */}
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

                    {error && <div style={{color: '#ff4d4d', marginBottom: '10px'}}>{error}</div>}

                    <button className="auth-submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Загрузка...' : (isLogin ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ')}
                    </button>
                    {/* РАЗДЕЛИТЕЛЬ И SSO */}
                    {isLogin && (authProviders.yandex || authProviders.google || authProviders.saml) && (
                        <div className="sso-container">
                            <div className="auth-divider">
                                <span>или</span>
                            </div>
                            
                            {!showSsoMenu ? (
                                /* Единая кнопка, которая раскрывает меню */
                                <button 
                                    className="btn btn-secondary" 
                                    type="button" 
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                    onClick={() => setShowSsoMenu(true)}
                                >
                                    <Icons.Globe /> Войти через другие сервисы
                                </button>
                            ) : (
                                /* Раскрывшееся меню с доступными провайдерами */
                                <div className="sso-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                                    
                                    {authProviders.google && (
                                        <button className="btn btn-secondary" type="button" onClick={() => window.location.href = 'http://localhost:5001/api/auth/google'} style={{ width: '100%' }}>
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
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{marginTop: '20px', color: '#888', fontSize: '14px'}}>
                        {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                        <span style={{color: '#00aeef', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                            {isLogin ? 'Создать' : 'Войти'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Импортируем useNavigate
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

const Icons = {
    Camera: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>,
    Save: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
    User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    Lock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    Phone: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    Mail: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
};

export const ProfilePage = () => {
    const navigate = useNavigate(); // 2. Хук навигации
    const { updateUser } = useAuth();
    const [userData, setUserData] = useState<any>(() => {
        const saved = localStorage.getItem('lumeo_user');
        try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Состояния
    const [firstName, setFirstName] = useState(userData.firstName || '');
    const [lastName, setLastName] = useState(userData.lastName || '');
    const [middleName, setMiddleName] = useState(userData.middleName || '');
    
    // Новые поля в безопасности
    const [email, setEmail] = useState(userData.email || '');
    const [phone, setPhone] = useState(userData.phone || '');
    const [newPassword, setNewPassword] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    const initial = userData.firstName ? userData.firstName.charAt(0).toUpperCase() : '?';

    const handleLogout = () => {
        localStorage.removeItem('lumeo_user');
        localStorage.removeItem('lumeo_token');
        window.location.href = '/auth';
    };

    const handleAvatarUpdate = (newUrl: string) => {
        const updated = { ...userData, avatarUrl: newUrl };
        setUserData(updated);
        localStorage.setItem('lumeo_user', JSON.stringify(updated));
        updateUser({ avatarUrl: newUrl });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('userId', String(userData.id));

        try {
            const res = await fetch('http://localhost:5000/api/auth/avatar', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                handleAvatarUpdate(data.avatarUrl);
            } else {
                alert('Ошибка загрузки');
            }
        } catch (err) { console.error(err); }
    };

    const handleSaveProfile = async () => {
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            alert('Имя, Фамилия и Email обязательны!');
            return false;
        }
        
        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    firstName, lastName, middleName, 
                    email, phone, 
                    newPassword: newPassword || undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                const updatedUser = { ...userData, ...data.user };
                setUserData(updatedUser);
                localStorage.setItem('lumeo_user', JSON.stringify(updatedUser));
                updateUser(updatedUser);
                alert('Профиль успешно обновлен!');
                setNewPassword('');
                return true;
            } else { 
                alert(data.message || 'Ошибка при сохранении'); 
                return false;
            }
        } catch (e) { 
            console.error(e); 
            alert('Ошибка сети');
            return false;
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <div className="lumeo-layout">
            <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={handleFileChange} />
            
            <header className="lumeo-header">
                <div className="logo">Lumeo<span className="dot">.</span></div>
                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                    {/* 3. Кнопка "Назад" с navigate(-1) */}
                    <button 
                        onClick={() => navigate(-1)} 
                        className="nav-link" 
                        style={{
                            background: 'transparent', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: 'inherit',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            padding: 0
                        }}
                    >
                        ← Назад
                    </button>

                    {userData.id && (
                        <UserProfile user={userData} onUpdate={handleAvatarUpdate} onLogout={handleLogout} />
                    )}
                </div>
            </header>

            <div className="lumeo-container profile-wrapper">
                
                <div className="profile-glass-card">
                    
                    {/* ЛЕВАЯ КОЛОНКА: Визуал */}
                    <aside className="profile-visual-col">
                        <div className="avatar-section">
                            <div className="profile-avatar-xl" onClick={() => fileInputRef.current?.click()}>
                                {userData.avatarUrl ? (
                                    <img src={userData.avatarUrl} alt="avatar" />
                                ) : (
                                    <div className="avatar-placeholder">{initial}</div>
                                )}
                                <div className="avatar-edit-hint">
                                    <Icons.Camera />
                                </div>
                            </div>
                            <h2 className="visual-name">
                                {firstName} <br/> {lastName}
                            </h2>
                            <div className="role-tag">{userData.role === 'teacher' ? 'Преподаватель' : 'Студент'}</div>
                        </div>
                        
                        <div className="visual-decoration">
                            <div className="glow-circle"></div>
                        </div>
                    </aside>

                    {/* ПРАВАЯ КОЛОНКА: Форма */}
                    <main className="profile-form-col">
                        <div className="form-header">
                            <h1>Настройки аккаунта</h1>
                            <p>Управляйте своими личными данными и доступом</p>
                        </div>

                        {/* Секция 1: Личные данные */}
                        <div className="form-section">
                            <div className="section-title"><Icons.User /> <span>Личные данные</span></div>
                            
                            <div className="input-grid-2">
                                <div className="form-group">
                                    <label>Фамилия</label>
                                    <input className="modern-input" value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Имя</label>
                                    <input className="modern-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Отчество</label>
                                <input className="modern-input" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Необязательно" />
                            </div>
                        </div>

                        <div className="form-divider"></div>

                        {/* Секция 2: Безопасность и Вход */}
                        <div className="form-section">
                            <div className="section-title"><Icons.Lock /> <span>Безопасность и Вход</span></div>
                            
                            <div className="input-grid-2">
                                <div className="form-group">
                                    <label><Icons.Mail /> Email (Логин)</label>
                                    <input className="modern-input" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label><Icons.Phone /> Телефон</label>
                                    <input className="modern-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Сменить пароль</label>
                                <input 
                                    className="modern-input" 
                                    type="password" 
                                    placeholder="Новый пароль (оставьте пустым, если не меняете)" 
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-footer">
                            <button 
                                className="header-save-btn" 
                                disabled={isSaving}
                                onClick={async () => {
                                    const success = await handleSaveProfile(); // Ждем результат
                                    if (success) navigate(-1);                 // Если ок -> уходим назад
                                }} 
                            >
                                {isSaving ? <span className="loader-dots">...</span> : 'Сохранить и выйти'}
                            </button>
                        </div>
                    </main>
                </div>

            </div>
        </div>
    );
};
import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppearanceTab } from '../components/Profile/AppearanceTab';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { Icons } from '../components/Icons';

export const ProfilePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser } = useAuth();
    const { showToast } = useToast();
    const [userData, setUserData] = useState<any>(() => {
        const saved = localStorage.getItem('lumeo_user');
        try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
    });

    const [activeSection, setActiveSection] = useState<'account' | 'appearance'>(
        (location.state as any)?.tab === 'appearance' ? 'appearance' : 'account'
    );
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [firstName, setFirstName] = useState(userData.firstName || '');
    const [lastName, setLastName] = useState(userData.lastName || '');
    const [middleName, setMiddleName] = useState(userData.middleName || '');
    const [email, setEmail] = useState(userData.email || '');
    const [phone, setPhone] = useState(userData.phone || '');
    const [newPassword, setNewPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const initial = userData.firstName ? userData.firstName.charAt(0).toUpperCase() : '?';

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
            const res = await api.post('/auth/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            handleAvatarUpdate(res.data.avatarUrl);
            showToast('Аватар обновлен!', 'success');
        } 
            catch (err) { 
            console.error(err);
            showToast('Ошибка при загрузке аватара', 'error');
         }
    };

    const handleSaveProfile = async () => {
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            showToast('Имя, Фамилия и Email обязательны!', 'error');
            return false;
        }
        
        setIsSaving(true);
        try {
            const res = await api.put('/auth/update', {
                userId: userData.id,
                firstName, lastName, middleName, 
                email, phone, 
                newPassword: newPassword || undefined
            });

            const updatedUser = { ...userData, ...res.data.user };
            setUserData(updatedUser);
            localStorage.setItem('lumeo_user', JSON.stringify(updatedUser));
            updateUser(updatedUser);
            showToast('Профиль успешно обновлен!', 'success');
            setNewPassword('');
            return true;
        } catch (e: any) { 
            showToast(e.response?.data?.message || 'Ошибка при сохранении', 'error');
            return false;
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <div className="lumeo-layout">
            <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={handleFileChange} />
            
            <AppHeader showSearch={false} showNotifications={false} backButton />

            <div className="profile-wrapper">
                <div className="profile-dashboard">
                    
                    {/* САЙДБАР ОБЩИЙ */}
                    <aside className="profile-sidebar">
                        <div className="sidebar-avatar-section">
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
                            <h2 className="visual-name">{firstName} {lastName}</h2>
                            <div className={`role-tag ${userData.role || 'student'}`}>
                                {userData.role === 'admin' ? 'Администратор' : 
                                 userData.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                            </div>
                        </div>

                        <div className="sidebar-divider"></div>

                        <div className="profile-nav-menu">
                            <button className={`profile-nav-btn ${activeSection === 'account' ? 'active' : ''}`} onClick={() => setActiveSection('account')}>
                                <Icons.SettingsIcon /> Настройки аккаунта
                            </button>
                            <button className={`profile-nav-btn ${activeSection === 'appearance' ? 'active' : ''}`} onClick={() => setActiveSection('appearance')}>
                                <Icons.Palette /> Внешний вид
                            </button>
                            {userData.role === 'student' && (
                                <button className={`profile-nav-btn ${location.pathname === '/history' ? 'active' : ''}`} onClick={() => navigate('/history', { replace: true })}>
                                    <Icons.StatsIcon /> Статистика и история
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* ГЛАВНАЯ ЗОНА */}
                    <main className="profile-main-area">
                        {activeSection === 'appearance' && <AppearanceTab />}
                        {activeSection === 'account' && <div className="profile-glass-card fade-in">
                            <div className="form-header">
                                <h1>Личные данные</h1>
                                <p>Управляйте своими личными данными и доступом</p>
                            </div>

                            <div className="form-section">
                                <div className="section-title"><Icons.User /> <span>Основная информация</span></div>
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
                                <button className="header-save-btn" disabled={isSaving} onClick={handleSaveProfile}>
                                    {isSaving ? <span className="loader-dots">...</span> : 'Сохранить изменения'}
                                </button>
                            </div>
                        </div>}
                    </main>

                </div>
            </div>
        </div>
    );
};
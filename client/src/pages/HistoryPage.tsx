import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css'; // Общий макет и сайдбар
import './HistoryPage.css'; // Стили конкретно истории

const Icons = {
    Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
    Brain: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 10.5"/></svg>,
    Target: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    Time: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    SettingsIcon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    StatsIcon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
};

export const HistoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser } = useAuth();
    
    const [userData, setUserData] = useState<any>(() => {
        const saved = localStorage.getItem('lumeo_user');
        try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
    });

    const [stats, setStats] = useState<any>(null);
    const initial = userData.firstName ? userData.firstName.charAt(0).toUpperCase() : '?';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('lumeo_token');
                const res = await fetch('http://localhost:5000/api/users/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e) { console.error("Ошибка загрузки статистики", e); }
        };
        if (userData.role === 'student') fetchStats();
    }, [userData.role]);

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

    return (
        <div className="lumeo-layout">
            <header className="lumeo-header">
                <div className="logo" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>Lumeo<span className="dot">.</span></div>
                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                    <button onClick={() => navigate(-1)} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
                        ← Назад
                    </button>
                    {userData.id && <UserProfile user={userData} onUpdate={handleAvatarUpdate} onLogout={handleLogout} />}
                </div>
            </header>

            <div className="lumeo-container profile-wrapper">
                <div className="profile-dashboard">
                    
                    {/* САЙДБАР (Идентичный ProfilePage) */}
                    <aside className="profile-sidebar">
                        <div className="sidebar-avatar-section">
                            <div className="profile-avatar-xl">
                                {userData.avatarUrl ? (
                                    <img src={userData.avatarUrl} alt="avatar" />
                                ) : (
                                    <div className="avatar-placeholder">{initial}</div>
                                )}
                            </div>
                            <h2 className="visual-name">{userData.firstName} {userData.lastName}</h2>
                            <div className={`role-tag ${userData.role || 'student'}`}>
                                {userData.role === 'admin' ? 'Администратор' : 
                                 userData.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                            </div>
                        </div>

                        <div className="sidebar-divider"></div>

                        <div className="profile-nav-menu">
                            <button className={`profile-nav-btn ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile', { replace: true })}>
                                <Icons.SettingsIcon /> Настройки аккаунта
                            </button>
                            
                            {userData.role === 'student' && (
                                <button className={`profile-nav-btn ${location.pathname === '/history' ? 'active' : ''}`} onClick={() => navigate('/history', { replace: true })}>
                                    <Icons.StatsIcon /> Статистика и история
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* ГЛАВНАЯ ЗОНА - ТОЛЬКО ИСТОРИЯ */}
                    <main className="profile-main-area">
                        {stats ? (
                            <div className="profile-stats-container fade-in">
                                <h1 className="dashboard-title">Ваш прогресс</h1>
                                
                                <div className="stats-widgets-grid">
                                    <div className="stat-widget">
                                        <div className="widget-icon" style={{ background: 'rgba(77, 255, 136, 0.1)', color: '#4dff88' }}>
                                            <Icons.Target />
                                        </div>
                                        <div className="widget-info">
                                            <div className="widget-value">{stats.stats.successRate}%</div>
                                            <div className="widget-label">Успешность тестов</div>
                                        </div>
                                    </div>
                                    
                                    <div className="stat-widget">
                                        <div className="widget-icon" style={{ background: 'rgba(0, 174, 239, 0.1)', color: '#00aeef' }}>
                                            <Icons.Brain />
                                        </div>
                                        <div className="widget-info">
                                            <div className="widget-value">{stats.stats.averageAiScore}%</div>
                                            <div className="widget-label">Оценка нейросети</div>
                                        </div>
                                    </div>

                                    <div className="stat-widget highlight-widget">
                                        <div className="widget-info" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div className="widget-value" style={{ fontSize: '28px' }}>{stats.stats.watchedVideosCount}</div>
                                                <div className="widget-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Уроков завершено</div>
                                            </div>
                                            <div style={{ fontSize: '46px', opacity: 0.9 }}>🏆</div>
                                        </div>
                                    </div>
                                </div>

                                {stats.unfinished?.length > 0 && (
                                    <div className="profile-history-card unfinished-card">
                                        <h3 className="history-title" style={{ color: '#ffd700', borderBottomColor: 'rgba(255, 215, 0, 0.2)' }}>
                                            ⏳ Ждут завершения
                                        </h3>
                                        <div className="history-list">
                                            {stats.unfinished.map((item: any) => (
                                                <div key={`unfin-${item.videoId}`} className="history-item unfinished-item" onClick={() => navigate(`/course/${item.courseId}/lesson/${item.videoId}`)}>
                                                    <div className="history-video-thumb">
                                                        <Icons.Play />
                                                        <div className="history-progress-bar partial" style={{ width: '60%', background: '#ffd700' }}></div>
                                                    </div>
                                                    <div className="history-video-info">
                                                        <div className="history-video-title">{item.videoTitle}</div>
                                                        <div className="history-video-course">{item.courseTitle}</div>
                                                        <div className="history-meta">
                                                            <span className="history-badge warning"><Icons.Time /> Осталось дорешать</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="profile-history-card">
                                    <h3 className="history-title">Завершенные уроки</h3>
                                    {stats.history?.length > 0 ? (
                                        <div className="history-list">
                                            {stats.history.map((item: any) => (
                                                <div key={`hist-${item.videoId}`} className="history-item" onClick={() => navigate(`/course/${item.courseId}/lesson/${item.videoId}`)}>
                                                    <div className="history-video-thumb">
                                                        <Icons.Play />
                                                        <div className="history-progress-bar full"></div>
                                                    </div>
                                                    <div className="history-video-info">
                                                        <div className="history-video-title">{item.videoTitle}</div>
                                                        <div className="history-video-course">{item.courseTitle}</div>
                                                        <div className="history-meta">
                                                            <span className="history-date">{new Date(item.updatedAt).toLocaleDateString('ru-RU')}</span>
                                                            <span className="history-badge success"><Icons.Check /> Просмотрено</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-history">
                                            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📭</div>
                                            <p>У вас пока нет полностью завершенных уроков.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* --- СКЕЛЕТОН (ПЛЕЙСХОЛДЕР ЗАГРУЗКИ) --- */
                            <div className="profile-stats-container fade-in">
                                <div className="skeleton-box" style={{ width: '200px', height: '34px', borderRadius: '8px', marginBottom: '5px' }}></div>
                                
                                <div className="stats-widgets-grid">
                                    <div className="skeleton-box" style={{ height: '110px', borderRadius: '20px' }}></div>
                                    <div className="skeleton-box" style={{ height: '110px', borderRadius: '20px' }}></div>
                                    <div className="skeleton-box" style={{ height: '110px', borderRadius: '20px', gridColumn: 'span 2' }}></div>
                                </div>

                                <div className="skeleton-box" style={{ height: '250px', borderRadius: '20px', marginTop: '10px' }}></div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
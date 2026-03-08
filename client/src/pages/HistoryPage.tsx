import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css'; // Общий макет и сайдбар
import './HistoryPage.css'; // Стили конкретно истории
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { Icons } from '../components/Icons';

export const HistoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { updateUser } = useAuth();
    const { showToast } = useToast();

    const [userData, setUserData] = useState<any>(() => {
        const saved = localStorage.getItem('lumeo_user');
        try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
    });

    const [stats, setStats] = useState<any>(null);
    const initial = userData.firstName ? userData.firstName.charAt(0).toUpperCase() : '?';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 🔥 Умный axios сам передаст токен
                const res = await api.get('/users/stats');
                setStats(res.data);
            } catch (e) { 
                console.error("Ошибка загрузки статистики", e); 
                showToast('Ошибка при загрузке статистики', 'error');
            }
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

                                    {/* НОВЫЙ ВИДЖЕТ: Сданные тесты */}
                                    <div className="stat-widget highlight-widget" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', border: '1px solid #333' }}>
                                        <div className="widget-info" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div className="widget-value" style={{ fontSize: '28px', color: '#ffd700' }}>{stats.stats.completedTestsCount || 0}</div>
                                                <div className="widget-label" style={{ color: '#888' }}>Тестов сдано</div>
                                            </div>
                                            <div style={{ fontSize: '40px', opacity: 0.9 }}>📝</div>
                                        </div>
                                    </div>
                                </div>

                                {/* НОВЫЙ БЛОК: Результаты глобальных тестов */}
                                <div className="profile-history-card" style={{ marginTop: '30px' }}>
                                    <h3 className="history-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        📝 Результаты тестов
                                    </h3>
                                    
                                    {stats.globalTests && stats.globalTests.length > 0 ? (
                                        <div className="history-list" style={{ display: 'grid', gap: '15px' }}>
                                            {stats.globalTests.map((test: any) => (
                                                <div key={test.id} className="history-card" style={{ 
                                                    background: '#111', 
                                                    padding: '15px 20px', 
                                                    borderRadius: '12px', 
                                                    border: `1px solid ${test.passed ? '#1a4d2e' : '#4d1a1a'}`,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '5px' }}>
                                                            {test.testTitle}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#666' }}>
                                                            Сдано: {new Date(test.updatedAt).toLocaleDateString('ru-RU')}
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ 
                                                            fontSize: '20px', 
                                                            fontWeight: 'bold', 
                                                            color: test.passed ? '#4dff88' : '#ff4d4d' 
                                                        }}>
                                                            {test.score}%
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#888' }}>
                                                            Порог: {test.passingScore}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-history">
                                            <div style={{ fontSize: '30px', marginBottom: '10px' }}>🤷‍♂️</div>
                                            <p style={{ color: '#666', fontSize: '14px' }}>Вы еще не сдавали тесты.</p>
                                        </div>
                                    )}
                                </div>

                                {stats.unfinished?.length > 0 && (
                                    <div className="profile-history-card unfinished-card" style={{ marginTop: '30px' }}>
                                        <h3 className="history-title" style={{ color: '#ffd700', borderBottomColor: 'rgba(255, 215, 0, 0.2)' }}>
                                            ⏳ Ждут завершения
                                        </h3>
                                        <div className="history-list">
                                            {stats.unfinished.map((item: any) => (
                                                <div key={`unfin-${item.videoId}`} className="history-item unfinished-item" onClick={() => navigate(`/course/${item.courseId}?lessonId=${item.videoId}`)}>
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

                                <div className="profile-history-card" style={{ marginTop: '30px' }}>
                                    <h3 className="history-title">Завершенные уроки</h3>
                                    {stats.history?.length > 0 ? (
                                        <div className="history-list">
                                            {stats.history.map((item: any) => (
                                                <div key={`hist-${item.videoId}`} className="history-item" onClick={() => navigate(`/course/${item.courseId}?lessonId=${item.videoId}`)}>
                                                    <div className="history-video-thumb">
                                                        <Icons.Play />
                                                        <div className="history-progress-bar full"></div>
                                                    </div>
                                                    <div className="history-video-info">
                                                        <div className="history-video-title">{item.videoTitle}</div>
                                                        <div className="history-video-course">{item.courseTitle}</div>
                                                        <div className="history-meta">
                                                            <span className="history-date">{new Date(item.updatedAt).toLocaleDateString('ru-RU')}</span>
                                                            <span className="history-badge success"><Icons.Check /></span>
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
                                    <div className="skeleton-box" style={{ height: '110px', borderRadius: '20px' }}></div>
                                    <div className="skeleton-box" style={{ height: '110px', borderRadius: '20px' }}></div>
                                </div>

                                <div className="skeleton-box" style={{ height: '200px', borderRadius: '20px', marginTop: '10px' }}></div>
                                <div className="skeleton-box" style={{ height: '250px', borderRadius: '20px', marginTop: '30px' }}></div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses } from '../api/videoApi';
import { getUserCourseProgress } from '../api/testApi';
import type { ICourse } from '../types';
import './UserPage.css';
import './CoursesPage.css'; // 🔥 Подключаем наши новые стили!
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { CorsesIcons } from '../components/Icons';
// 🔥 КАСТОМНЫЕ ИКОНКИ (БЕЗ ЭМОДЗИ)


// 🔥 ГЕНЕРАТОР СОЧНЫХ ГРАДИЕНТОВ ПО ID КУРСА
const getGradient = (id: number) => {
    const gradients = [
        'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)', // Красный
        'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)', // Океан
        'linear-gradient(135deg, #b224ef 0%, #7579ff 100%)', // Фиолетовый
        'linear-gradient(135deg, #F09819 0%, #EDDE5D 100%)', // Золотой
        'linear-gradient(135deg, #00aeef 0%, #0056b3 100%)', // Фирменный синий
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Неоновый зеленый
    ];
    return gradients[id % gradients.length];
};

export const CoursesPage = () => {
    const [courses, setCourses] = useState<ICourse[]>([]);
    const [loading, setLoading] = useState(true); // Стейт для скелетонов
    const [progressMap, setProgressMap] = useState<Record<number, number>>({}); // Стейт для прогресс-баров
    const navigate = useNavigate();
    const { user, logout, updateUser } = useAuth();
    const { globalTheme } = useTheme();
    const { showToast } = useToast();

    const [showAddModal, setShowAddModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newCourseData, setNewCourseData] = useState({ title: '', description: '', instructor: '' });

    const handleLogout = () => {
        localStorage.removeItem('lumeo_user');
        localStorage.removeItem('lumeo_token');
        logout();
        window.location.href = '/auth';
    };

    const handleAvatarUpdate = (newUrl: string) => {
        updateUser({ avatarUrl: newUrl });
    };

    // Загрузка курсов и расчет прогресса для студентов
    const loadData = async (isBackground = false) => {
        try {
            const data = await getCourses();
            let newProgressMap: Record<number, number> = {};

            // Если студент, загружаем прогресс по каждому курсу
            if (user?.role === 'student') {
                await Promise.all(data.map(async (c) => {
                    try {
                        const prog = await getUserCourseProgress(c.id);
                        const totalVideos = c.videos?.length || 0;
                        if (totalVideos === 0) {
                            newProgressMap[c.id] = 0;
                        } else {
                            const completedCount = prog.completedVideoIds?.length || 0;
                            newProgressMap[c.id] = Math.round((completedCount / totalVideos) * 100);
                        }
                    } catch (e) {
                        newProgressMap[c.id] = 0;
                    }
                }));
            }

            // Обновляем стейты только если данные РЕАЛЬНО изменились (чтобы не было мерцаний)
            setCourses(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
            
            if (user?.role === 'student') {
                setProgressMap(prev => JSON.stringify(prev) !== JSON.stringify(newProgressMap) ? newProgressMap : prev);
            }

        } catch (e) {
            // Показываем ошибку только при первичной загрузке, чтобы не спамить в фоне
            if (!isBackground) showToast('Ошибка загрузки курсов', 'error');
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true); // Включаем скелетоны
        loadData();       // Первичная загрузка

        // Фоновый поллинг каждые 15 секунд
        const interval = setInterval(() => {
            loadData(true); // Передаем true, чтобы радар работал тихо в фоне
        }, 15000);

        return () => clearInterval(interval);
    }, [user]);

    const openAddModal = () => {
        setNewCourseData({
            title: '',
            description: '',
            instructor: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Преподаватель'
        });
        setShowAddModal(true);
    };

    const handleCreateCourse = async () => {
        if (!newCourseData.title.trim()) {
            showToast('Заполните название курса!', 'error');
            return;
        }
        setIsCreating(true);
        try {
            await api.post('/videos/courses', newCourseData);
            setShowAddModal(false);
            showToast('Курс успешно создан!', 'success');
            loadData(); // Перезагружаем список
        } catch (e) {
            console.error(e);
            showToast('Ошибка при создании курса. Убедитесь, что сервер работает.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="lumeo-layout">
            <header className="lumeo-header">
                <div className="logo">
                    {globalTheme.platform_logo && <img src={globalTheme.platform_logo} alt="logo" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />}
                    {globalTheme.platform_name}<span className="dot">.</span>
                </div>
                {user && (
                    <UserProfile 
                        user={user} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={handleLogout} 
                    />
                )}
            </header>

            <div className="lumeo-container" style={{display: 'block', padding: '40px'}}>
                <h1 style={{marginBottom: '10px', fontSize: '32px'}}>Витрина курсов</h1>
                <p style={{color: '#888', marginBottom: '30px'}}>Выберите программу обучения и начните развиваться уже сегодня.</p>
                
                <div className="course-showcase-grid">
                    
                    {/* КНОПКА СОЗДАНИЯ (ДЛЯ ПРЕПОДА/АДМИНА) */}
                    {user && ['teacher', 'admin'].includes(user.role) && (
                        <div 
                            className="course-card-modern" 
                            onClick={openAddModal}
                            style={{ border: '2px dashed #333', background: 'transparent', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}
                        >
                            <div style={{ color: '#00aeef', marginBottom: '15px' }}><CorsesIcons.Plus /></div>
                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>Создать новый курс</div>
                            <div style={{ color: '#666', fontSize: '13px', marginTop: '8px' }}>Нажмите, чтобы добавить программу</div>
                        </div>
                    )}

                    {/* СКЕЛЕТОНЫ ПРИ ЗАГРУЗКЕ */}
                    {loading && Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton skeleton-cover"></div>
                            <div className="skeleton-body">
                                <div className="skeleton skeleton-title"></div>
                                <div className="skeleton skeleton-text"></div>
                                <div className="skeleton skeleton-text short"></div>
                                <div className="skeleton-tags">
                                    <div className="skeleton skeleton-tag"></div>
                                    <div className="skeleton skeleton-tag"></div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* РЕАЛЬНЫЕ КУРСЫ */}
                    {!loading && courses.map(course => {
                        const progress = progressMap[course.id] || 0;
                        const isFinished = progress >= 100;

                        return (
                            <div 
                                key={course.id} 
                                onClick={() => navigate(`/course/${course.id}`)}
                                className="course-card-modern"
                            >
                                {/* Обложка с градиентом */}
                                <div className="course-cover" style={{ background: getGradient(course.id) }}>
                                    <div className="course-badge">Курс</div>
                                </div>

                                <div className="course-body">
                                    <h2 className="course-title">{course.title}</h2>
                                    <p className="course-desc">{course.description || 'Описание отсутствует. Нажмите, чтобы узнать подробности о курсе внутри.'}</p>
                                    
                                    <div className="course-tags">
                                        <div className="course-tag"><CorsesIcons.Teacher /> {course.instructor}</div>
                                        <div className="course-tag"><CorsesIcons.Video /> {course.videos?.length || 0} уроков</div>
                                    </div>

                                    {/* Прогресс-бар для студентов */}
                                    {user?.role === 'student' && (
                                        <div className="course-progress-wrapper">
                                            <div className="course-progress-header">
                                                <span>Прогресс</span>
                                                <span style={{ color: isFinished ? '#00ff88' : '#fff', fontWeight: 'bold' }}>
                                                    {isFinished ? 'Завершен ✅' : `${progress}%`}
                                                </span>
                                            </div>
                                            <div className="course-progress-track">
                                                <div 
                                                    className="course-progress-fill" 
                                                    style={{ 
                                                        width: `${progress}%`, 
                                                        background: isFinished ? '#00ff88' : '#00aeef' 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ КУРСА */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }} onPointerDown={() => setShowAddModal(false)}>
                    
                    <div 
                        style={{ background: '#111', padding: '30px', borderRadius: '24px', border: '1px solid #333', width: '450px', animation: 'fadeIn 0.2s ease', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                        onPointerDown={(e) => e.stopPropagation()} 
                    >
                        <h2 style={{color: '#fff', marginBottom: '25px', marginTop: 0, fontSize: '22px'}}>Создание курса</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label style={{fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px'}}>Название курса</label>
                                <input 
                                    type="text" placeholder="Например: Основы TypeScript" className="modern-input"
                                    value={newCourseData.title} onChange={e => setNewCourseData({...newCourseData, title: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px'}}>Описание (необязательно)</label>
                                <textarea 
                                    placeholder="О чем этот курс? Чему научатся студенты?" className="modern-textarea" style={{ minHeight: '100px' }}
                                    value={newCourseData.description} onChange={e => setNewCourseData({...newCourseData, description: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px'}}>Автор / Преподаватель</label>
                                <input 
                                    type="text" className="modern-input"
                                    value={newCourseData.instructor} onChange={e => setNewCourseData({...newCourseData, instructor: e.target.value})}
                                />
                            </div>
                            
                            <button 
                                onClick={handleCreateCourse} 
                                disabled={isCreating} 
                                className="primary-btn"
                                style={{ marginTop: '10px' }}
                            >
                                {isCreating ? 'Создаем...' : 'Опубликовать курс'}
                            </button>
                            <button 
                                className="btn btn-ghost" style={{ marginTop: '5px', color: '#888', width: '100%' }} 
                                onClick={() => setShowAddModal(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
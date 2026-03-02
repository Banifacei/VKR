import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses } from '../api/videoApi';
import type { ICourse } from '../types';
import './UserPage.css';
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';

export const CoursesPage = () => {
    const [courses, setCourses] = useState<ICourse[]>([]);
    const navigate = useNavigate();
    const { user, logout, updateUser } = useAuth();
    const { showToast } = useToast();
    // Стейты для модалки создания курса
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

    // --- РАДАР КУРСОВ (Long Polling) ---
    useEffect(() => {
        getCourses().then(setCourses);

        const interval = setInterval(async () => {
            try {
                const freshCourses = await getCourses();
                setCourses(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(freshCourses)) {
                        console.log('🔄 Нашли новые курсы! Обновляем витрину...');
                        return freshCourses;
                    }
                    return prev;
                });
            } catch (e) {
                // Игнорируем ошибки сети
            }
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Функция открытия модалки
    const openAddModal = () => {
        setNewCourseData({
            title: '',
            description: '',
            instructor: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Преподаватель'
        });
        setShowAddModal(true);
    };

    // Функция создания курса
    const handleCreateCourse = async () => {
        // 🔥 Описание теперь необязательное! Проверяем только название.
        if (!newCourseData.title.trim()) {
            showToast('Заполните название курса!', 'error');
            return;
        }
        setIsCreating(true);
        try {
            // 🔥 ИСПРАВЛЕННЫЙ ПУТЬ: стучимся на /videos/courses
            await api.post('/videos/courses', newCourseData);
            setShowAddModal(false);
            showToast('Курс успешно создан!', 'success');
            
            // Мгновенно обновляем список
            const freshCourses = await getCourses();
            setCourses(freshCourses);
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
                <div className="logo">Lumeo<span className="dot">.</span></div>
                {user && (
                    <UserProfile 
                        user={user} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={handleLogout} 
                    />
                )}
            </header>

            <div className="lumeo-container" style={{display: 'block', padding: '40px'}}>
                <h1 style={{marginBottom: '30px'}}>Витрина курсов</h1>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    
                    {/* ПЛИТКА "ДОБАВИТЬ КУРС" */}
                    {user && ['teacher', 'admin'].includes(user.role) && (
                        <div 
                            className="course-card" 
                            onClick={openAddModal}
                            style={{ 
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
                                border: '2px dashed #444', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', minHeight: '200px',
                                transition: 'all 0.2s ease', borderRadius: '12px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00aeef'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#444'}
                        >
                            <div style={{ fontSize: '50px', color: '#666', marginBottom: '10px' }}>+</div>
                            <div style={{ color: '#888', fontWeight: 'bold' }}>Создать новый курс</div>
                        </div>
                    )}

                    {/* Существующие курсы */}
                    {courses.map(course => (
                        <div 
                            key={course.id} 
                            onClick={() => navigate(`/course/${course.id}`)}
                            style={{
                                background: '#1a1a1a', 
                                border: '1px solid #333', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                cursor: 'pointer',
                                transition: '0.2s',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            className="course-card"
                        >
                            <h2 style={{color: '#00aeef', fontSize: '1.4rem', marginTop: 0}}>{course.title}</h2>
                            <p style={{color: '#888', fontSize: '0.9rem', marginBottom: '15px'}}>👨‍🏫 {course.instructor}</p>
                            <p style={{color: '#ccc', lineHeight: '1.4', flex: 1}}>{course.description || 'Нет описания'}</p>
                            <div style={{marginTop: '20px', color: '#666', fontSize: '0.8rem', borderTop: '1px solid #333', paddingTop: '10px'}}>
                                ID: {course.id}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ КУРСА */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }} onClick={() => setShowAddModal(false)}>
                    
                    <div 
                        style={{ background: '#111', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '450px', animation: 'fadeIn 0.2s ease' }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <h2 style={{color: '#fff', marginBottom: '25px', marginTop: 0}}>🎓 Создание курса</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label style={{fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block'}}>Название курса</label>
                                <input 
                                    type="text" placeholder="Например: Основы TypeScript" className="modern-input"
                                    value={newCourseData.title} onChange={e => setNewCourseData({...newCourseData, title: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block'}}>Описание курса (необязательно)</label>
                                <textarea 
                                    placeholder="О чем этот курс? Чему научатся студенты?" className="modern-textarea" style={{ minHeight: '100px' }}
                                    value={newCourseData.description} onChange={e => setNewCourseData({...newCourseData, description: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block'}}>Автор / Преподаватель</label>
                                <input 
                                    type="text" className="modern-input"
                                    value={newCourseData.instructor} onChange={e => setNewCourseData({...newCourseData, instructor: e.target.value})}
                                />
                            </div>
                            
                            <button 
                                onClick={handleCreateCourse} 
                                disabled={isCreating} 
                                style={{ 
                                    marginTop: '10px', padding: '14px', background: '#00aeef', color: '#fff', border: 'none', 
                                    borderRadius: '8px', fontWeight: 'bold', cursor: isCreating ? 'not-allowed' : 'pointer', fontSize: '15px' 
                                }}
                            >
                                {isCreating ? 'Создаем...' : 'Опубликовать курс'}
                            </button>
                            <button 
                                className="btn btn-ghost" style={{ marginTop: '5px', color: '#888', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} 
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
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axiosInstance';
import { Icons } from '../components/Icons';
import { ExportModal } from '../components/Analytics/ExportModal';
import { AnalyticsDrillDownModal } from '../components/Analytics/AnalyticsDrillDownModal';

import './ProfilePage.css'; 
import './CoursesPage.css';

export const AnalyticsPage = () => {
    const { user } = useAuth();
    const { globalTheme } = useTheme();
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    // Стейты Уровня 1
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Стейты Уровня 2
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [isFetchingStats, setIsFetchingStats] = useState(false);

    // Стейты модалок и поиска
    const [drillDownConfig, setDrillDownConfig] = useState<{ id: number | null, type: 'student' | 'test' | 'video' | null } | null>(null);
    const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: 'gost' | 'detailed' | null}>({ isOpen: false, type: null });
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        loadTeacherCourses();
    }, []);

    const loadTeacherCourses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/videos/courses');
            const myCourses = res.data.filter((c: any) => c.ownerId === user?.id || user?.role === 'admin');
            setCourses(myCourses);
        } catch (e) {
            showToast('Ошибка загрузки курсов', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = async (course: any) => {
        setSelectedCourse(course);
        setIsFetchingStats(true);
        try {
            const res = await api.get(`/videos/courses/${course.id}/analytics`);
            setAnalytics(res.data);
        } catch (e) {
            showToast('Ошибка загрузки аналитики курса', 'error');
            setSelectedCourse(null);
        } finally {
            setIsFetchingStats(false);
        }
    };

    const handleBackToDashboard = () => {
        setSelectedCourse(null);
        setAnalytics(null);
    };

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '100vh', color: 'var(--primary)', fontSize: '18px' }}><Icons.Spinner size={20}/> Lumeo Intelligence: Загрузка...</div>;
    }

    return (
        <div className="lumeo-layout">
            <header className="lumeo-header">
                <div className="logo">
                    <span className="logo-link" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
                        {globalTheme.platform_logo && <img src={globalTheme.platform_logo} alt="logo" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />}
                        {globalTheme.platform_name}<span className="dot">.</span> <span style={{fontSize: '14px', color: '#888', fontWeight: 'normal'}}>Аналитика Intelligence</span>
                    </span>
                </div>
                <div className="user-profile">
                    <span style={{marginRight: '15px'}}>{user?.firstName} {user?.lastName}</span>
                    <button className="btn btn-ghost" onClick={() => navigate('/prepod')}>В панель управления</button>
                </div>
            </header>

            <main className="main-content" style={{ padding: '40px 20px', maxWidth: '1600px', margin: '0 auto', width: '95%' }}>
                
                {!selectedCourse ? (
                    <div className="fade-in">
                        <h1 style={{ marginBottom: '10px', fontSize: '32px', fontWeight: '800' }}>Центр аналитики</h1>
                        <p style={{ color: '#666', marginBottom: '40px' }}>Обзор успеваемости по всем вашим курсам</p>
                        <div className="course-showcase-grid">
                            {courses.map(course => (
                                <div key={course.id} className="course-card-modern" onClick={() => handleSelectCourse(course)}>
                                    <div className="course-cover" style={{ background: 'linear-gradient(135deg, #111, #1a1a1a)', borderBottom: '1px solid #333' }}>
                                        <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', zIndex: 2 }}>{course.title}</h3>
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px', height: '40px', overflow: 'hidden' }}>{course.description || 'Нет описания'}</p>
                                        <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Icons.BarChart2 size={15}/> Глубокая аналитика</button>
                                    </div>
                                </div>
                            ))}
                            {courses.length === 0 && <p style={{ color: '#888' }}>У вас пока нет курсов для анализа.</p>}
                        </div>
                    </div>
                ) : (
                    <div className="fade-in">
                        <button className="btn btn-ghost" onClick={handleBackToDashboard} style={{ marginBottom: '20px', color: '#888', padding: 0 }}>
                            ← Вернуться к списку курсов
                        </button>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: '800' }}>{selectedCourse.title}</h1>
                                <p style={{ color: '#888', margin: 0 }}>Панель управления курсом</p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                {user?.role === 'admin' && (
                                    <button 
                                        className="btn btn-ghost" 
                                        title="Сгенерировать демо-данные"
                                        style={{ color: '#b5179e', border: '1px dashed #b5179e', height: '45px' }}
                                        onClick={async () => {
                                            if(window.confirm('Сгенерировать 15 фейковых студентов?')) {
                                                try {
                                                    await api.post(`/videos/courses/${selectedCourse.id}/generate-demo`);
                                                    showToast('Демо-данные загружены!', 'success');
                                                    handleSelectCourse(selectedCourse);
                                                } catch (e) { showToast('Ошибка', 'error'); }
                                            }
                                        }}
                                    >
                                        🪄 Demo
                                    </button>
                                )}
                                <button className="btn btn-secondary" style={{ background: 'rgba(77, 255, 136, 0.05)', color: '#4dff88', borderColor: 'rgba(77, 255, 136, 0.2)', height: '45px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setExportModalConfig({ isOpen: true, type: 'detailed' })}>
                                    <Icons.Download size={15}/> Детальный .xlsx
                                </button>
                                <button className="btn btn-primary" style={{ height: '45px', padding: '0 25px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setExportModalConfig({ isOpen: true, type: 'gost' })}>
                                    <Icons.Printer size={15}/> Ведомость (ГОСТ)
                                </button>
                            </div>
                        </div>

                        {isFetchingStats || !analytics ? (
                            <div style={{ padding: '100px', textAlign: 'center', color: '#666', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Icons.Spinner size={18}/> Сбор данных по курсу...
                            </div>
                        ) : (
                            <>
                                {/* ВИДЖЕТЫ */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                    <div style={{ background: '#111', padding: '25px', borderRadius: '20px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ fontSize: '30px', background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
                                        <div><div style={{ fontSize: '13px', color: '#888' }}>Студентов на курсе</div><div style={{ fontSize: '28px', fontWeight: '800' }}>{analytics.totalStudents}</div></div>
                                    </div>
                                    <div style={{ background: '#111', padding: '25px', borderRadius: '20px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.TrendingUp size={28}/></div>
                                        <div><div style={{ fontSize: '13px', color: '#888' }}>Средний прогресс</div><div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)' }}>{analytics.globalAvgProgress}%</div></div>
                                    </div>
                                    <div style={{ background: '#111', padding: '25px', borderRadius: '20px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ background: 'rgba(77,255,136,0.1)', color: '#4dff88', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Star size={28}/></div>
                                        <div><div style={{ fontSize: '13px', color: '#888' }}>Средний балл тестов</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#4dff88' }}>{analytics.globalAvgScore}%</div></div>
                                    </div>
                                </div>

                                {/* СЕТКА BENTO GRID */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '30px', alignItems: 'start' }}>
                                    
                                    {/* ЛЕВАЯ КОЛОНКА: РЕЙТИНГ */}
                                    <div style={{ background: '#111', padding: '30px', borderRadius: '20px', border: '1px solid #333' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px' }}>
                                            <div>
                                                <h2 style={{ fontSize: '22px', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.Trophy size={20}/> Рейтинг потока</h2>
                                                <div style={{ color: '#888', fontSize: '14px' }}>Общая успеваемость студентов</div>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '14px', top: '10px', fontSize: '14px' }}>🔍</span>
                                                <input 
                                                    type="text" placeholder="Поиск студента..." 
                                                    value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                                    style={{ background: '#080808', border: '1px solid #222', color: '#fff', padding: '10px 16px 10px 40px', borderRadius: '12px', fontSize: '13px', width: '220px', outline: 'none', transition: 'all 0.2s' }}
                                                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
                                                    onBlur={e => { e.target.style.borderColor = '#222'; }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '50px 2fr 1.5fr 1fr 30px', padding: '0 15px 12px', color: '#666', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                                            <div style={{ textAlign: 'center' }}>Ранг</div>
                                            <div>Студент</div>
                                            <div>Прогресс курса</div>
                                            <div style={{ textAlign: 'right' }}>Ср. балл</div>
                                            <div></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                                            {(() => {
                                                const filteredStudents = analytics.studentsProgress.filter((s: any) => 
                                                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                                                    s.email.toLowerCase().includes(studentSearch.toLowerCase())
                                                );

                                                if (analytics.studentsProgress.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: '12px' }}>Нет студентов</div>;
                                                if (filteredStudents.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: '12px' }}>По запросу ничего не найдено</div>;

                                                return filteredStudents.map((student: any, index: number) => {
                                                    const isTop1 = index === 0;
                                                    const isTop2 = index === 1;
                                                    const isTop3 = index === 2;
                                                    
                                                    let rankBadge = <span style={{ color: '#555', fontWeight: 'bold', fontSize: '15px' }}>{index + 1}</span>;
                                                    if (isTop1) rankBadge = <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))' }}>🥇</span>;
                                                    if (isTop2) rankBadge = <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 10px rgba(192, 192, 192, 0.2))' }}>🥈</span>;
                                                    if (isTop3) rankBadge = <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 10px rgba(205, 127, 50, 0.2))' }}>🥉</span>;

                                                    return (
                                                        <div 
                                                            key={student.id} 
                                                            style={{ 
                                                                display: 'grid', gridTemplateColumns: '50px 2fr 1.5fr 1fr 30px', alignItems: 'center', 
                                                                background: isTop1 ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, #161616 100%)' : '#161616', 
                                                                padding: '12px 15px', borderRadius: '12px', border: isTop1 ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent', 
                                                                cursor: 'pointer', transition: 'all 0.2s' 
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = isTop1 ? 'rgba(255,215,0,0.5)' : '#333'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = isTop1 ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, #161616 100%)' : '#161616'; e.currentTarget.style.borderColor = isTop1 ? 'rgba(255,215,0,0.2)' : 'transparent'; }}
                                                            onClick={() => setDrillDownConfig({ id: student.id, type: 'student' })}
                                                            title={`Посмотреть профиль`}
                                                        >
                                                            <div style={{ textAlign: 'center' }}>{rankBadge}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isTop1 ? 'linear-gradient(135deg, #FFD700, #FDB931)' : '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: isTop1 ? '#000' : '#fff', flexShrink: 0 }}>
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div style={{ overflow: 'hidden' }}>
                                                                    <div style={{ fontWeight: '600', color: isTop1 ? '#FFD700' : '#fff', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{student.name}</div>
                                                                    <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{student.email}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ paddingRight: '20px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{student.progressPercent}%</span>
                                                                </div>
                                                                <div style={{ width: '100%', height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${student.progressPercent}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }}></div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ color: student.avgScore >= 70 ? '#4dff88' : student.avgScore >= 50 ? '#ffd700' : '#ff4d4d', fontSize: '14px', fontWeight: 'bold' }}>
                                                                    {student.avgScore}%
                                                                </span>
                                                            </div>
                                                            <div style={{ color: '#444', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>›</div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* ПРАВАЯ КОЛОНКА: ВОРОНКА */}
                                    <div style={{ background: '#111', padding: '30px', borderRadius: '20px', border: '1px solid #333' }}>
                                        <h2 style={{ fontSize: '20px', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>📉 Воронка отсева</h2>
                                        <div style={{ color: '#888', fontSize: '13px', marginBottom: '25px' }}>Конверсия: Начали / Закончили</div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                                            {analytics.funnel && analytics.funnel.length > 0 ? (
                                                analytics.funnel.map((item: any, index: number) => (
                                                    <div 
                                                        key={item.id} 
                                                        style={{ background: '#161616', padding: '15px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                                        onClick={() => setDrillDownConfig({ id: item.realId, type: item.type })}
                                                        title="Посмотреть аналитику материала"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', alignItems: 'flex-start' }}>
                                                            <div style={{ color: '#eee', fontWeight: '500', paddingRight: '10px', lineHeight: '1.4' }}>
                                                                {item.type === 'video' ? <Icons.Monitor size={13}/> : <Icons.FileText size={13}/>} {index + 1}. {item.title}
                                                            </div>
                                                            <div style={{ color: '#777', flexShrink: 0, fontSize: '12px' }}>
                                                                <strong style={{ color: item.completionRate < 30 ? '#ff4d4d' : '#fff', fontSize: '14px' }}>{item.completionRate}%</strong> / {item.startedRate}%
                                                            </div>
                                                        </div>
                                                        <div style={{ height: '6px', background: '#222', borderRadius: '3px', position: 'relative' }}>
                                                            <div style={{ width: `${item.startedRate}%`, height: '100%', background: 'rgba(255, 255, 255, 0.1)', position: 'absolute', left: 0, top: 0, borderRadius: '3px' }}></div>
                                                            <div style={{ width: `${item.completionRate}%`, height: '100%', background: item.type === 'video' ? 'var(--primary)' : '#b5179e', position: 'absolute', left: 0, top: 0, borderRadius: '3px', zIndex: 2 }}></div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Нет материалов</div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
            
            <AnalyticsDrillDownModal 
                config={drillDownConfig}
                courseId={selectedCourse?.id}
                onClose={() => setDrillDownConfig(null)}
            />
            
            <ExportModal 
                isOpen={exportModalConfig.isOpen}
                onClose={() => setExportModalConfig({ isOpen: false, type: null })}
                course={selectedCourse}
                analytics={analytics}
                exportType={exportModalConfig.type}
            />
        </div>
    );
};
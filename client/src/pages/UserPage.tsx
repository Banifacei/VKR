import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVideosByCourse, getCourses } from '../api/videoApi';
import { getCourseTests, getUserCourseProgress, type ICourseTest } from '../api/testApi';
import type { IVideo, ICourse } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { TestRunner } from '../components/TestRunner';
import { UserProfile } from '../components/UserProfile';
import { AuthModal } from '../components/AuthModal';
import { TestCards } from '../components/TestCards';
import './UserPage.css';

// Объединенный тип для плитки
type DashboardItem = 
    | ({ type: 'video' } & IVideo) 
    | ({ type: 'test' } & ICourseTest);

export const UserPage = () => {
    const { courseId } = useParams();
    const [userData, setUserData] = useState<any>(() => {
    const saved = localStorage.getItem('lumeo_user');
        try {
            return saved && saved.startsWith('{') ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [completedVideoIds, setCompletedVideoIds] = useState<number[]>([]);
    const [testResults, setTestResults] = useState<Record<number, {score: number, passed: boolean}>>({}); // ID пройденных элементов
    const [course, setCourse] = useState<ICourse | null>(null);
    const [items, setItems] = useState<DashboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Активный элемент (вместо selectedVideo)
    const [activeItem, setActiveItem] = useState<DashboardItem | null>(null);
    
    // Модалка авторизации
    const [showAuthModal, setShowAuthModal] = useState(!userData || !userData.id);

    // 👇 2. ЛОГИКА TEST CARDS
    const testCardsRef = useRef<HTMLDivElement>(null);
    const [testModeState, setTestModeState] = useState<Record<number, boolean>>(() => {
        try {
            const saved = localStorage.getItem('lumeo_test_modes');
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });

    useEffect(() => {
        localStorage.setItem('lumeo_test_modes', JSON.stringify(testModeState));
    }, [testModeState]);

    const handleToggleTestMode = () => {
        if (!activeItem || activeItem.type !== 'video') return;
        
        setTestModeState(prev => {
            const isNowExternal = !prev[activeItem.id];
            if (isNowExternal) {
                setTimeout(() => {
                    testCardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
            return { ...prev, [activeItem.id]: isNowExternal };
        });
    };
    // -----------------------------------------------------

    const handleAvatarUpdate = (newUrl: string) => {
        const updatedUser = { ...userData, avatarUrl: newUrl };
        setUserData(updatedUser);
        localStorage.setItem('lumeo_user', JSON.stringify(updatedUser));
    };

    const handleLogout = () => {
        localStorage.removeItem('lumeo_user');
        localStorage.removeItem('lumeo_token');
        setUserData(null);
        window.location.reload(); 
    };

    const handleLoginSuccess = (data: any) => {
        localStorage.setItem('lumeo_user', JSON.stringify(data));
        setUserData(data);
        setShowAuthModal(false);
    };

    // Загрузка данных курса
    // Загрузка данных курса
    useEffect(() => {
        const loadData = async () => {
            if (!courseId) return;
            try {
                // 👇 1. ВОЗВРАЩАЕМ ЗАГРУЗКУ ВИДЕО И ТЕСТОВ
                const allCourses = await getCourses();
                const foundCourse = allCourses.find(c => c.id === Number(courseId));
                setCourse(foundCourse || null);

                const videos = await getVideosByCourse(Number(courseId));
                const tests = await getCourseTests(Number(courseId));

                const combinedItems: DashboardItem[] = [
                    ...videos.map(v => ({ ...v, type: 'video' as const })),
                    ...tests.map(t => ({ ...t, type: 'test' as const }))
                ];
                setItems(combinedItems); // Записали контент в стейт!

                // 👇 2. А ВОТ НАШ НОВЫЙ ПРОГРЕСС
                const progressData = await getUserCourseProgress(Number(courseId));
                // Сохраняем просмотренные видео
                setCompletedVideoIds(progressData.completedVideoIds || []);
                
                // Превращаем массив тестов в удобный объект (словарь)
                const resultsMap: Record<number, {score: number, passed: boolean}> = {};
                (progressData.testResults || []).forEach((tr: any) => {
                    resultsMap[tr.testId] = { score: tr.score, passed: tr.passed };
                });
                setTestResults(resultsMap);

            } catch (err) {
                console.error("Не удалось загрузить прогресс", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [courseId]);
    // --- РАСЧЕТ ПРОГРЕССА КУРСА ---
    const totalItems = items.length;
    const completedItemsCount = items.filter(item => {
        if (item.type === 'video') return completedVideoIds.includes(item.id);
        if (item.type === 'test') return testResults[item.id]?.passed;
        return false;
    }).length;
    const progressPercent = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;
    // --- Рендер ПЛЕЕРА или ТЕСТА (Focus Mode) ---
    if (activeItem) {
        const isExternalTest = activeItem.type === 'video' ? !!testModeState[activeItem.id] : false;

        return (
            <div className="focus-mode-layout" style={{ background: '#000', minHeight: '100vh', overflowY: 'auto' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#000', zIndex: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setActiveItem(null)}>← Назад к курсу</button>
                    <div style={{ color: '#888' }}>
                        {activeItem.type === 'video' ? '📺 Просмотр видео' : '📝 Прохождение теста'}
                    </div>
                    <div style={{ width: '100px' }}></div> 
                </div>

                <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>
                    {activeItem.type === 'video' ? (
                        <div style={{ padding: '20px' }}>
                            <div className="player-wrapper-animation">
                                <VideoPlayer 
                                    key={activeItem.id} 
                                    videoId={activeItem.id}
                                    title={activeItem.title}
                                    sources={[{ quality: 'Auto', url: activeItem.url, subtitles: activeItem.subtitles }]}
                                    events={activeItem.events || []}
                                    hideResults={activeItem.hideResults}
                                    maxAttempts={activeItem.maxAttempts}
                                    userId={userData?.id} 
                                    userRole={userData?.role}
                                    
                                    // Кнопки управления режимом теста
                                    isExternalTestMode={isExternalTest}
                                    onToggleTestMode={handleToggleTestMode}
                                    
                                    // 👇 3. ФУНКЦИИ ДЛЯ СЧЕТЧИКА ПОПЫТОК
                                    onResetTest={() => alert('Прогресс сброшен')}
                                    onRefreshEvents={async () => {
                                        if (!courseId || !activeItem) return []; 
                                        try {
                                            const data = await getVideosByCourse(Number(courseId)); 
                                            const updatedVideo = data.find(v => v.id === activeItem.id);
                                            if (updatedVideo) {
                                                setActiveItem(prev => (prev && prev.id === updatedVideo.id) ? { ...prev, ...updatedVideo, type: 'video' } : prev);
                                            }
                                            return updatedVideo?.events || [];
                                        } catch (e) { return []; }
                                    }}
                                />
                            </div>
                            
                            <div className="video-info">
                                <h1>{activeItem.title}</h1>
                                <p className="video-meta">Опубликовано: {new Date(activeItem.createdAt || Date.now()).toLocaleDateString()}</p>
                            </div>

                            {/* 👇 4. БЛОК С КАРТОЧКАМИ ВОПРОСОВ */}
                            {isExternalTest && activeItem.events && activeItem.events.some(e => ['single_choice', 'multiple_choice', 'free_text', 'question'].includes(e.type)) && userData?.role === 'student' && (
                                <div ref={testCardsRef} style={{ marginTop: '30px', animation: 'fadeIn 0.4s ease' }}>
                                    <div style={{ background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #333', marginBottom: '20px' }}>
                                        <h3 style={{marginTop: 0, color: '#00aeef'}}>📝 Вопросы к уроку</h3>
                                        <p style={{color: '#666', fontSize: '14px'}}>Вы можете ответить на вопросы здесь, не просматривая видео целиком.</p>
                                    </div>
                                    
                                    <TestCards 
                                        events={activeItem.events} 
                                        videoId={activeItem.id} 
                                        userId={userData.id}
                                        onAllSolved={() => {
                                            setTimeout(() => handleToggleTestMode(), 3000);
                                        }}
                                    />
                                    
                                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                        <button 
                                            onClick={handleToggleTestMode}
                                            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                                        >
                                            Скрыть вопросы (вернуться к режиму видео)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <TestRunner 
                            test={activeItem} 
                            onExit={() => setActiveItem(null)} 
                        />
                    )}
                </div>
            </div>
        );
    }

    // --- Рендер ДАШБОРДА (Сетка Плиток) ---
    return (
        <div className="lumeo-layout">
            {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} />}

            <header className="lumeo-header">
                <div className="logo">
                    <Link to="/courses" className="logo-link">Lumeo<span className="dot">.</span></Link>
                </div>
                {userData && (
                    <UserProfile 
                        user={userData} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={handleLogout} 
                    />
                )}
            </header>

            <div className="dashboard-container">
                <div className="course-header-big">
                    <button className="btn btn-ghost" onClick={() => window.location.href='/courses'} style={{marginBottom: '10px', paddingLeft: 0, color: '#666'}}>
                        ← Все курсы
                    </button>
                    <h1 className="course-title-large">{course?.title || 'Загрузка...'}</h1>
                    <div className="course-progress-section">
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
                            <span>Прогресс курса</span>
                            <span style={{ color: progressPercent === 100 ? '#4dff88' : '#00aeef', fontWeight: 'bold' }}>{progressPercent}%</span>
                        </div>
                        <div style={{ background: '#222', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${progressPercent}%`, 
                                background: progressPercent === 100 ? '#4dff88' : '#00aeef', 
                                height: '100%', 
                                transition: 'width 0.8s ease' 
                            }} />
                        </div>
                    </div>
                        <span>👨‍🏫 {course?.instructor}</span>
                        <span>•</span>
                        <span>{items.filter(i => i.type === 'video').length} уроков</span>
                        <span>•</span>
                        <span>{items.filter(i => i.type === 'test').length} тестов</span>
                    </div>
                    <p style={{ color: '#ccc', marginTop: '15px', maxWidth: '800px', lineHeight: '1.5' }}>
                        {course?.description}
                    </p>
                </div>

                {loading ? (
                    <div className="loader" style={{padding: '50px'}}>Загрузка материалов...</div>
                ) : (
                    <div className="content-grid">
                        {items.map((item, idx) => (
                            <div 
                                key={`${item.type}-${item.id}`} 
                                className="content-card"
                                onClick={() => setActiveItem(item)}
                            >
                                <div className="card-thumbnail">
                                    <div className="card-type-icon" style={{ background: item.type === 'video' ? 'rgba(0,0,0,0.6)' : 'rgba(255, 215, 0, 0.8)', color: item.type === 'video' ? '#fff' : '#000' }}>
                                        {item.type === 'video' ? 'ВИДЕО' : 'ТЕСТ'}
                                    </div>
                                    <span style={{ fontSize: '50px' }}>
                                        {item.type === 'video' ? '📺' : '📝'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <h3 className="card-title">{idx + 1}. {item.title}</h3>
                                    <div className="card-meta">
                                        {item.type === 'video' ? <span>▶ Урок</span> : <span>{item.questions?.length || 0} вопросов</span>}

                                        {/* УМНЫЙ СТАТУС ПЛИТКИ */}
                                        {item.type === 'video' ? (
                                            completedVideoIds.includes(item.id) ? (
                                                <span style={{ color: '#4dff88', fontWeight: 'bold', fontSize: '14px' }}>✅ Просмотрено</span>
                                            ) : (
                                                <span style={{ color: '#444' }}>◯</span>
                                            )
                                        ) : (
                                            testResults[item.id] ? (
                                                <span style={{ 
                                                    color: testResults[item.id].passed ? '#4dff88' : '#ff4d4d', 
                                                    fontWeight: 'bold', 
                                                    fontSize: '14px' 
                                                }}>
                                                    {testResults[item.id].passed 
                                                        ? `✅ Сдан на ${testResults[item.id].score}% ⭐` 
                                                        : `❌ Не сдан (${testResults[item.id].score}%)`}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#444' }}>◯</span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && items.length === 0 && <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>В этом курсе пока нет материалов.</div>}
            </div>
        </div>
    );
};
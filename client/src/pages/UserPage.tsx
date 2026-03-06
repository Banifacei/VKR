import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getVideosByCourse, getCourses } from '../api/videoApi';
import { getCourseTests, getUserCourseProgress, type ICourseTest } from '../api/testApi';
import type { IVideo, ICourse } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { TestRunner } from '../components/TestRunner';
import { UserProfile } from '../components/UserProfile';
import { AuthModal } from '../components/AuthModal';
import { TestCards } from '../components/TestCards';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy} from '@dnd-kit/sortable';
import { ContentEditorModal } from '../components/ContentEditorModal';
import './UserPage.css';
import './CoursesPage.css';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { checkEnrollment, enrollInCourse, getCourseEnrollments, updateEnrollmentStatus} from '../api/videoApi';
import { CourseLanding } from '../components/Course/CourseLanding';
import { SortableCard } from '../components/Course/SortableCard';
import { AddContentModal } from '../components/Course/AddContentModal';
import { CourseSettingsModal } from '../components/Course/CourseSettingsModal';

type DashboardItem = 
    | ({ type: 'video' } & IVideo) 
    | ({ type: 'test' } & ICourseTest);


export const UserPage = () => {
    const { courseId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editorItem, setEditorItem] = useState<DashboardItem | null>(null);
    const [enrollmentsList, setEnrollmentsList] = useState<any[]>([]);
    const pendingCount = enrollmentsList.filter(req => req.status === 'pending').length;
    const [showCourseSettings, setShowCourseSettings] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [enrollStatus, setEnrollStatus] = useState<string | null | 'loading'>('loading');
    const [isEnrolling, setIsEnrolling] = useState(false);
    const prevStatusRef = useRef(enrollStatus);
    useEffect(() => {
        prevStatusRef.current = enrollStatus;
    }, [enrollStatus]);
    
    // 🔥 ЗАГРУЗИТЬ СПИСОК ЗАЯВОК
    const fetchEnrollmentsList = async (id: number) => {
        try {
            const res = await getCourseEnrollments(id);
            setEnrollmentsList(res);
        } catch (e) { console.error('Ошибка загрузки заявок', e); }
    };
    const handleEnrollmentAction = async (enrollmentId: number, status: 'approved' | 'rejected') => {
        try {
            await updateEnrollmentStatus(enrollmentId, status);
            showToast(`Заявка ${status === 'approved' ? 'одобрена' : 'отклонена'}`, 'success');
            fetchEnrollmentsList(Number(courseId)); // Обновляем список, чтобы кнопка перекрасилась
        } catch (e) {
            showToast('Ошибка при обновлении статуса', 'error');
        }
    };
    // Данные для нового теста
    const isSavingOrderRef = useRef(false);
    // Создание ВИДЕО (с поддержкой загрузки файлов!)
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
    const [isEditMode, setIsEditMode] = useState(false);
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
        showToast('Вы успешно вошли!', 'success');
    };
    // Настройки сенсоров для Drag&Drop (чтобы клики не путались с перетаскиванием)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Функция, которая срабатывает, когда мы бросаем карточку
    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            isSavingOrderRef.current = true; // 🔒 Блокируем фоновое скачивание!

            // 1. Вычисляем новый порядок прямо здесь (синхронно)
            const oldIndex = items.findIndex((i) => `${i.type}-${i.id}` === active.id);
            const newIndex = items.findIndex((i) => `${i.type}-${i.id}` === over.id);
            
            const newItems = arrayMove(items, oldIndex, newIndex);
            const updatedItems = newItems.map((item, index) => ({ ...item, orderIndex: index }));
            
            // 2. Мгновенно обновляем UI
            setItems(updatedItems); 

            // 3. Отправляем ЖЕЛЕЗОБЕТОННЫЙ payload на бэкенд
            try {
                const payload = updatedItems.map((i: any) => ({ id: i.id, type: i.type, orderIndex: i.orderIndex }));
                // 🔥 Чистый axios
                await api.post(`/videos/course/${courseId}/reorder`, { items: payload });
                console.log("✅ Порядок успешно сохранен в БД!");
            } catch (e) {
                console.error("❌ Ошибка при сохранении сортировки:", e);
                showToast('Ошибка при сохранении порядка', 'error');
            } finally {
                isSavingOrderRef.current = false; // 🔓 Снимаем блокировку
            }
        }
    };
    // Загрузка данных курса
    // 👇 1. Вынесли функцию загрузки, чтобы вызывать её откуда угодно!
    const fetchCourseData = async () => {
        if (!courseId) return;
        try {
            const status = await checkEnrollment(Number(courseId));
            setEnrollStatus(status);
            const allCourses = await getCourses();
            const foundCourse = allCourses.find(c => c.id === Number(courseId));
            setCourse(foundCourse || null);
            
            // 🔥 ПРОВЕРКА ПРАВ (ФРОНТЕНД-ИЗОЛЯЦИЯ)
            let hasRights = false;
            if (userData?.role === 'admin') hasRights = true;
            if (foundCourse?.ownerId === userData?.id) hasRights = true;

            // 👇 ВОТ ЭТОГО У ТЕБЯ НЕТ В КОДЕ ВЫШЕ:
            try {
                const collabRes = await api.get(`/videos/courses/${courseId}/collaborators`);
                if (collabRes.data.some((c: any) => Number(c.userId) === Number(userData?.id))) {
                    hasRights = true;
                }
            } catch (e) { /* Не соавтор */ }
            setCanEdit(hasRights); // Включаем или выключаем права редактирования
            if (hasRights) {
                fetchEnrollmentsList(Number(courseId));
            }
            // Дальше грузим видео и тесты
            const videos = await getVideosByCourse(Number(courseId));
            const tests = await getCourseTests(Number(courseId));

            const combinedItems: DashboardItem[] = [
                ...videos.map(v => ({ ...v, type: 'video' as const })),
                ...tests.map(t => ({ ...t, type: 'test' as const }))
            ].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
            setItems(combinedItems); 

            // Грузим прогресс
            const progressData = await getUserCourseProgress(Number(courseId));
            setCompletedVideoIds(progressData.completedVideoIds || []);
            
            const resultsMap: Record<number, {score: number, passed: boolean}> = {};
            (progressData.testResults || []).forEach((tr: any) => {
                resultsMap[tr.testId] = { score: tr.score, passed: tr.passed };
            });
            setTestResults(resultsMap);

        } catch (err: any) {
            console.error("❌ Ошибка при загрузке данных:", err);
            showToast('Ошибка связи с сервером', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

    // 🔥 МАГИЯ: Ловим параметр из URL и сразу открываем видео!
    useEffect(() => {
        const lessonId = searchParams.get('lessonId');
        // Если в URL есть lessonId, контент загрузился и ничего еще не открыто
        if (lessonId && items.length > 0 && !activeItem) {
            const targetItem = items.find(i => i.type === 'video' && i.id === Number(lessonId));
            if (targetItem) {
                setActiveItem(targetItem); // Открываем плеер
                // Очищаем ссылку от параметра, чтобы при нажатии "Назад" урок не открылся заново
                searchParams.delete('lessonId');
                setSearchParams(searchParams, { replace: true });
            }
        }
    }, [items, searchParams, setSearchParams, activeItem]);
    // Универсальное удаление (и для видео, и для тестов)
    const handleDeleteItem = async (item: any) => {
        const isVideo = item.type === 'video';
        if (!window.confirm(`Вы уверены, что хотите навсегда удалить ${isVideo ? 'урок' : 'тест'} "${item.title}"?`)) return;

        try {
            // 🔥 Чистый axios
            const endpoint = isVideo ? `/videos/${item.id}` : `/tests/${item.id}`;
            await api.delete(endpoint);
            showToast(`${isVideo ? 'Урок' : 'Тест'} успешно удален`, 'info');
            fetchCourseData(); 
        } catch (e) {
            console.error(e);
            showToast('Сбой сети при удалении', 'error');
        }
    };
    // --- ДИНАМИЧЕСКОЕ ОБНОВЛЕНИЕ СЕТКИ И ПРОГРЕССА (Каждые 10 секунд) ---
    useEffect(() => {
        if (!courseId) return;

        const interval = setInterval(async () => {
            // 🛑 ВАЖНО: Если препод прямо сейчас тащит карточку, отменяем фоновое обновление!
            // Иначе карточка "вырвется" из курсора при перерисовке сетки.
            if (activeDragId || isSavingOrderRef.current) return;

            try {
                // 1. Узнаем наш текущий статус
                const status = await checkEnrollment(Number(courseId));
                
                // 🔥 МАГИЯ: Ловим момент, когда препод нажал кнопку!
                if (prevStatusRef.current === 'pending' && status === 'approved') {
                    showToast('Ваша заявка одобрена! Добро пожаловать на курс 🎉', 'success');
                    fetchCourseData(); // Мгновенно подтягиваем все уроки
                } else if (prevStatusRef.current === 'pending' && status === 'rejected') {
                    showToast('Преподаватель отклонил вашу заявку ❌', 'error');
                }
                
                setEnrollStatus(status);

                // 2. Если препод — качаем новые заявки в фоне (для бейджика)
                if (canEdit) {
                    const enrolls = await getCourseEnrollments(Number(courseId));
                    setEnrollmentsList(enrolls);
                }

                // 3. Если мы зачислены ИЛИ мы препод — тихо обновляем сами уроки и прогресс
                // (Если студент еще сидит на лендинге - не качаем контент, чтобы не было ошибок доступа)
                if (status === 'approved' || canEdit) {
                    const videos = await getVideosByCourse(Number(courseId));
                    const tests = await getCourseTests(Number(courseId));

                    const combinedItems: DashboardItem[] = [
                        ...videos.map(v => ({ ...v, type: 'video' as const })),
                        ...tests.map(t => ({ ...t, type: 'test' as const }))
                    ].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

                    setItems(prevItems => {
                        const prevHash = JSON.stringify(prevItems.map(i => `${i.type}-${i.id}-${i.title}-${(i as any).orderIndex}`));
                        const newHash = JSON.stringify(combinedItems.map(i => `${i.type}-${i.id}-${i.title}-${(i as any).orderIndex}`));
                        if (prevHash !== newHash) return combinedItems;
                        return prevItems;
                    });

                    const progressData = await getUserCourseProgress(Number(courseId));
                    setCompletedVideoIds(progressData.completedVideoIds || []);
                    
                    const resultsMap: Record<number, {score: number, passed: boolean}> = {};
                    (progressData.testResults || []).forEach((tr: any) => {
                        resultsMap[tr.testId] = { score: tr.score, passed: tr.passed };
                    });
                    setTestResults(resultsMap);
                }

            } catch (e) {
                // Игнорируем сетевые ошибки в фоне
            }
        }, 10000); // 10 секунд

        return () => clearInterval(interval);
    }, [courseId, activeDragId, canEdit]); // 👈 Обязательно передаем activeDragId в зависимости!
    // --- РАСЧЕТ ПРОГРЕССА КУРСА ---
    // 🔥 ФУНКЦИЯ ДЛЯ КНОПКИ "ЗАПИСАТЬСЯ"
    const handleEnroll = async () => {
        if (!courseId) return;
        setIsEnrolling(true);
        try {
            const res = await enrollInCourse(Number(courseId));
            setEnrollStatus(res.status); 
            if (res.status === 'approved') {
                showToast('Вы успешно записаны на курс!', 'success');
            } else {
                showToast('Заявка отправлена преподавателю!', 'info');
            }
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка записи', 'error');
        } finally {
            setIsEnrolling(false);
        }
    };
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
                                    onResetTest={() => showToast('Прогресс сброшен', 'info')}
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
                            onSuccess={() => fetchCourseData()}
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
            {/* 🔥 ЕСЛИ СТАТУС ГРУЗИТСЯ */}
            {enrollStatus === 'loading' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: '#888', height: 'calc(100vh - 60px)' }}>
                    <span className="loader-dots">Загрузка курса...</span>
                </div>
            ) : enrollStatus !== 'approved' && !canEdit ? (
                /* 🔥 ИСПОЛЬЗУЕМ ВЫНЕСЕННЫЙ КОМПОНЕНТ ЛЕНДИНГА */
                <CourseLanding 
                    course={course}
                    enrollStatus={enrollStatus}
                    isEnrolling={isEnrolling}
                    onEnroll={handleEnroll}
                />
            ) : (
            <div className="dashboard-container">
                <div className="course-header-big">
                    <button className="btn btn-ghost" onClick={() => navigate('/courses')} style={{marginBottom: '10px', paddingLeft: 0, color: '#666'}}>
                        ← Все курсы
                    </button>

                    {/* 🔥 1. ПРОВЕРКА ДЛЯ ШАПКИ */}
                    {loading ? (
                        <div style={{ animation: 'fadeIn 0.3s ease', marginTop: '10px' }}>
                            <div className="skeleton" style={{ width: '40%', minWidth: '300px', height: '40px', borderRadius: '8px', marginBottom: '25px' }}></div>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '12px' }}></div>
                                <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div>
                                <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div>
                            </div>
                            <div className="skeleton" style={{ width: '60%', height: '14px', borderRadius: '4px', marginBottom: '8px' }}></div>
                            <div className="skeleton" style={{ width: '40%', height: '14px', borderRadius: '4px' }}></div>
                        </div>
                    ) : (
                        <>
                            <h1 className="course-title-large">{course?.title}</h1>
                            <div className="course-progress-section">
                                {canEdit && (
                                    <div style={{ marginTop: '25px', display: 'flex', gap: '5px', background: '#111', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid #333' }}>
                                        <button 
                                            onClick={() => setIsEditMode(false)}
                                            style={{ background: !isEditMode ? '#2a2a2a' : 'transparent', color: !isEditMode ? '#fff' : '#888', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                                        >
                                            👁️ Глазами студента
                                        </button>
                                        <button 
                                            onClick={() => setIsEditMode(true)} 
                                            style={{ background: isEditMode ? '#00aeef' : 'transparent', color: isEditMode ? '#fff' : '#888', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                                        >
                                            ✏️ Редактирование
                                            {pendingCount > 0 && (
                                                    <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', lineHeight: 1 }}>
                                                        {pendingCount}
                                                    </span>
                                            )}
                                        </button>
                                        <button onClick={() => setShowCourseSettings(true)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            ⚙️ Настройки
                                            {pendingCount > 0 && (
                                                <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', lineHeight: 1 }}>
                                                    {pendingCount}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )}
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
                                        <span>Прогресс курса</span>
                                        <span style={{ color: progressPercent === 100 ? '#4dff88' : '#00aeef', fontWeight: 'bold' }}>{progressPercent}%</span>
                                    </div>
                                    <div style={{ background: '#222', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPercent}%`, background: progressPercent === 100 ? '#4dff88' : '#00aeef', height: '100%', transition: 'width 0.8s ease' }} />
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
                        </>
                    )}
                </div>

                {/* 🔥 2. ПРОВЕРКА ДЛЯ КАРТОЧЕК */}
                {loading ? (
                    <div className="content-grid" style={{ animation: 'fadeIn 0.3s ease' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="content-card" style={{ borderColor: 'rgba(255,255,255,0.05)', cursor: 'default' }}>
                                <div className="skeleton" style={{ height: '140px', width: '100%', borderRadius: '12px 12px 0 0' }}></div>
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                                    <div className="skeleton" style={{ height: '18px', width: '80%', borderRadius: '4px' }}></div>
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                                        <div className="skeleton" style={{ height: '14px', width: '40%', borderRadius: '4px' }}></div>
                                        <div className="skeleton" style={{ height: '14px', width: '20%', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCenter} 
                            onDragStart={(e) => setActiveDragId(String(e.active.id))}
                            onDragEnd={handleDragEnd}
                            onDragCancel={() => setActiveDragId(null)}
                        >
                            <SortableContext items={items.map(i => `${i.type}-${i.id}`)} strategy={rectSortingStrategy}>
                                <div className={`content-grid ${activeDragId ? 'is-global-dragging' : ''}`}>
                                    {items.map((item, idx) => (
                                        <SortableCard 
                                            key={`${item.type}-${item.id}`}
                                            item={item}
                                            idx={idx}
                                            isEditMode={isEditMode}
                                            completedVideoIds={completedVideoIds}
                                            testResults={testResults}
                                            onClick={(clickedItem: any) => setActiveItem(clickedItem)}
                                            onEdit={(i: any) => setEditorItem(i)}
                                            onDelete={(i: any) => handleDeleteItem(i)}
                                        />
                                    ))}

                                    {isEditMode && (
                                        <div className="content-card" onClick={() => setShowAddModal(true)} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed #444', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', minHeight: '200px' }}>
                                            <div style={{ fontSize: '50px', color: '#666', marginBottom: '10px' }}>+</div>
                                            <div style={{ color: '#888', fontWeight: 'bold' }}>Добавить материал</div>
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                        {items.length === 0 && <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>В этом курсе пока нет материалов.</div>}
                    </>
                )}
            </div>
            )}
            {/* 🌟 ДИНАМИЧЕСКАЯ МОДАЛКА ДОБАВЛЕНИЯ */}
            <AddContentModal 
                isOpen={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                courseId={Number(courseId)} 
                nextOrderIndex={items.length > 0 ? Math.max(...items.map((i: any) => i.orderIndex || 0)) + 1 : 0}
                onSuccess={fetchCourseData} 
            />
            {/* МОДАЛКА РЕДАКТОРА КОНТЕНТА (Твой код из PrepodPage) */}
            {editorItem && (
                <ContentEditorModal 
                    item={editorItem}
                    userData={userData}
                    onClose={() => setEditorItem(null)} 
                    onSuccess={() => {
                        fetchCourseData(); // Мгновенно обновляем сетку при добавлении вопроса!
                    }} 
                />
            )}
            {/* 🔥 ВЫНЕСЕННАЯ МОДАЛКА НАСТРОЕК */}
            {course && (
                <CourseSettingsModal 
                    isOpen={showCourseSettings}
                    onClose={() => setShowCourseSettings(false)}
                    course={course}
                    userData={userData}
                    enrollmentsList={enrollmentsList}
                    pendingCount={pendingCount}
                    onEnrollmentAction={handleEnrollmentAction}
                    onCourseUpdated={fetchCourseData}
                    fetchEnrollments={() => fetchEnrollmentsList(Number(courseId))}
                />
            )}
        </div>
    );
};
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getVideosByCourse, getCourses } from '../api/videoApi';
import { getCourseTests, getUserCourseProgress, type ICourseTest } from '../api/testApi';
import type { IVideo, ICourse } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { TestRunner } from '../components/TestRunner';
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
import { Icons } from '../components/Icons';
import { VideoComments } from '../components/VideoComments';
import { VideoBookmarks } from '../components/VideoBookmarks';
import { StarRating } from '../components/StarRating';
import { AppHeader } from '../components/AppHeader';
import '../components/GlobalSearch.css';
import '../components/VideoComments.css';
import { sseQuery } from '../utils/sseTicket';
import { pluralizeRu } from '../utils/pluralize';

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
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [testResults, setTestResults] = useState<Record<number, {score: number, passed: boolean}>>({}); // ID пройденных элементов
    const [course, setCourse] = useState<ICourse | null>(null);
    const [items, setItems] = useState<DashboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    // Активный элемент (вместо selectedVideo)
    const [activeItem, setActiveItem] = useState<DashboardItem | null>(null);

    const handleRefreshEvents = useCallback(async () => {
        if (!courseId || !activeItem) return [];
        try {
            const data = await getVideosByCourse(Number(courseId));
            const updatedVideo = data.find((v: any) => v.id === activeItem.id);
            if (updatedVideo) {
                setActiveItem(prev => (prev && prev.id === updatedVideo.id) ? { ...prev, ...updatedVideo, type: 'video' } : prev);
            }
            return updatedVideo?.events || [];
        } catch (e) { return []; }
    }, [courseId, activeItem?.id]);

    // Модалка авторизации
    const [showAuthModal, setShowAuthModal] = useState(!userData || !userData.id);

    // 👇 2. ЛОГИКА TEST CARDS
    const testCardsRef = useRef<HTMLDivElement>(null);
    const videoSeekRef = useRef<((t: number) => void) | null>(null);
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

        const isNowExternal = !testModeState[activeItem.id];

        if (isNowExternal) {
            // Выходим из полноэкранного режима если активен
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitFullscreenElement) {
                (document as any).webkitExitFullscreen?.();
            }
        }

        setTestModeState(prev => ({ ...prev, [activeItem.id]: isNowExternal }));
    };

    // Скролл к тесту после рендера — через useEffect, надёжнее чем setTimeout
    const isExternalTestActive = activeItem?.type === 'video' ? !!testModeState[activeItem.id] : false;
    useEffect(() => {
        if (!isExternalTestActive) return;
        const timer = setTimeout(() => {
            testCardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return () => clearTimeout(timer);
    }, [isExternalTestActive]);
    // -----------------------------------------------------


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

            setCanEdit(hasRights);
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
    // --- SSE: мгновенное обновление статуса записи на курс ---
    useEffect(() => {
        if (!courseId) return;
        let es: EventSource | null = null;
        let esCourse: EventSource | null = null;
        let active = true;

        sseQuery().then(q => {
            if (!active || !q) return;

            es = new EventSource(`/api/videos/enrollment/stream?${q}`);
            es.onmessage = async ({ data }) => {
                try {
                    const d = JSON.parse(data);
                    if (d.type !== 'enrollment_updated' || d.courseId !== Number(courseId)) return;
                    if (prevStatusRef.current === 'pending' && d.status === 'approved') {
                        showToast('Ваша заявка одобрена! Добро пожаловать на курс', 'success');
                        fetchCourseData();
                    } else if (prevStatusRef.current === 'pending' && d.status === 'rejected') {
                        showToast('Преподаватель отклонил вашу заявку', 'error');
                    }
                    setEnrollStatus(d.status);
                    prevStatusRef.current = d.status;
                } catch { /* игнорируем */ }
            };
            es.onerror = () => es?.close();

            if (canEdit) {
                esCourse = new EventSource(`/api/videos/courses/${courseId}/enrollment/stream?${q}`);
                esCourse.onmessage = async ({ data }) => {
                    try {
                        const d = JSON.parse(data);
                        if (d.type !== 'new_request') return;
                        const enrolls = await getCourseEnrollments(Number(courseId));
                        setEnrollmentsList(enrolls);
                    } catch { /* игнорируем */ }
                };
                esCourse.onerror = () => esCourse?.close();
            }
        });

        return () => { active = false; es?.close(); esCourse?.close(); };
    }, [courseId, canEdit]);
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
    // Для студентов: скрываем isHidden, сохраняем orderIndex-порядок преподавателя
    const sortForStudent = (src: typeof items) =>
        src.filter(item => !(item as any).isHidden);

    const displayItems = isEditMode ? items : sortForStudent(items);

    const totalItems = displayItems.length;
    const completedItemsCount = displayItems.filter(item => {
        if (item.type === 'video') return completedVideoIds.includes(item.id);
        if (item.type === 'test') return testResults[item.id]?.passed;
        return false;
    }).length;
    const progressPercent = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;
    // --- Рендер ПЛЕЕРА или ТЕСТА (Focus Mode) ---
    if (activeItem) {
        const isExternalTest = isExternalTestActive;

        return (
            <div className="focus-mode-layout" style={{ background: 'var(--bg-deep)', minHeight: '100vh', overflowY: 'auto' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-deep)', zIndex: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setActiveItem(null)}>← Назад к курсу</button>
                    <div style={{ color: 'var(--text-muted)' }}>
                        {activeItem.type === 'video'
                            ? <><Icons.Monitor size={16}/> Просмотр видео</>
                            : <><Icons.FileText size={16}/> Прохождение теста</>
                        }
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
                                    sources={[
                                        { quality: 'Оригинал', url: activeItem.url, subtitles: activeItem.subtitles },
                                        ...[...(activeItem.qualityUrls || [])]
                                            .sort((a, b) => parseInt(b.quality) - parseInt(a.quality))
                                            .map(q => ({ quality: q.quality, url: q.url, subtitles: activeItem.subtitles })),
                                    ]}
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
                                    onRefreshEvents={handleRefreshEvents}
                                    onTimeUpdate={setVideoCurrentTime}
                                    seekRef={videoSeekRef}
                                    noForwardSeek={activeItem.type === 'video' ? (activeItem as any).noForwardSeek || false : false}
                                />
                            </div>
                            
                            <div className="video-info">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <h1 style={{ margin: 0 }}>{activeItem.title}</h1>
                                    {userData && (
                                        <button
                                            className={`btn btn-ghost${showBookmarks ? ' btn-active' : ''}`}
                                            style={{ fontSize: 13, padding: '6px 14px' }}
                                            onClick={() => setShowBookmarks(b => !b)}
                                        >
                                            <Icons.Time size={14} /> Закладки
                                        </button>
                                    )}
                                </div>
                                <p className="video-meta">Опубликовано: {new Date(activeItem.createdAt || Date.now()).toLocaleDateString()}</p>
                            </div>

                            {/* Закладки */}
                            {userData && (
                                <VideoBookmarks
                                    videoId={activeItem.id}
                                    currentTime={videoCurrentTime}
                                    visible={showBookmarks}
                                    onSeek={t => videoSeekRef.current?.(t)}
                                />
                            )}

                            {/* 👇 4. БЛОК С КАРТОЧКАМИ ВОПРОСОВ */}
                            {isExternalTest && activeItem.events && activeItem.events.some(e => ['single_choice', 'multiple_choice', 'free_text', 'question'].includes(e.type)) && (
                                <div ref={testCardsRef} style={{ marginTop: '30px', animation: 'fadeIn 0.4s ease' }}>
                                    <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                                        <h3 style={{marginTop: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.FileText size={16}/> Вопросы к уроку</h3>
                                        <p style={{color: 'var(--text-muted)', fontSize: '14px'}}>Вы можете ответить на вопросы здесь, не просматривая видео целиком.</p>
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
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                                        >
                                            Скрыть вопросы (вернуться к режиму видео)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Комментарии к уроку — скрываются в режиме теста */}
                            {!isExternalTest && (
                                <VideoComments
                                    videoId={activeItem.id}
                                    currentUserId={userData?.id}
                                    currentUserRole={userData?.role}
                                />
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

            <AppHeader logoTo="/courses" />
            {/* 🔥 ЕСЛИ СТАТУС ГРУЗИТСЯ */}
            {enrollStatus === 'loading' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-muted)', height: 'calc(100vh - 60px)' }}>
                    <span className="loader-dots">Загрузка курса...</span>
                </div>
            ) : enrollStatus !== 'approved' && !canEdit ? (
                /* 🔥 ИСПОЛЬЗУЕМ ВЫНЕСЕННЫЙ КОМПОНЕНТ ЛЕНДИНГА */
                <CourseLanding 
                    course={course}
                    enrollStatus={enrollStatus}
                    isEnrolling={isEnrolling}
                    onEnroll={handleEnroll}
                    userData={userData}
                />
            ) : (
            <div className="dashboard-container">
                <div className="course-header-big">
                    <button className="btn btn-ghost" onClick={() => navigate('/courses')} style={{marginBottom: '10px', paddingLeft: 0, color: 'var(--text-muted)'}}>
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
                                    <div className="view-mode-switcher">
                                        <button
                                            className={`vms-btn ${!isEditMode ? 'active' : ''}`}
                                            onClick={() => setIsEditMode(false)}
                                        >
                                            <Icons.Eye size={14}/>
                                            <span className="vms-label-full">Глазами студента</span>
                                            <span className="vms-label-short">Студент</span>
                                        </button>
                                        <button
                                            className={`vms-btn ${isEditMode ? 'active-primary' : ''}`}
                                            onClick={() => setIsEditMode(true)}
                                        >
                                            <Icons.Edit size={14}/>
                                            <span className="vms-label-full">Редактирование</span>
                                            <span className="vms-label-short">Редактор</span>
                                        </button>
                                        <button className="vms-btn vms-settings" onClick={() => setShowCourseSettings(true)}>
                                            <Icons.Settings size={14}/>
                                            <span className="vms-label-full">Настройки</span>
                                            <span className="vms-label-short">Настройки</span>
                                            {pendingCount > 0 && <span className="vms-badge">{pendingCount}</span>}
                                        </button>
                                    </div>
                                )}
                                <div className="course-meta-row">
                                    <div className="course-progress-bar-wrap">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                            <span>Прогресс курса</span>
                                            <span style={{ color: progressPercent === 100 ? '#4dff88' : 'var(--primary)', fontWeight: 'bold' }}>{progressPercent}%</span>
                                        </div>
                                        <div style={{ background: 'var(--bg-input)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                            <div style={{ width: `${progressPercent}%`, background: progressPercent === 100 ? '#4dff88' : 'var(--primary)', height: '100%', transition: 'width 0.8s ease' }} />
                                        </div>
                                    </div>
                                    <span><Icons.Teacher size={14}/> {course?.instructor}</span>
                                    <span>•</span>
                                    <span>{(() => { const n = displayItems.filter(i => i.type === 'video').length; return `${n} ${pluralizeRu(n, 'урок', 'урока', 'уроков')}`; })()}</span>
                                    <span>•</span>
                                    <span>{(() => { const n = displayItems.filter(i => i.type === 'test').length; return `${n} ${pluralizeRu(n, 'тест', 'теста', 'тестов')}`; })()}</span>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-main)', marginTop: '15px', maxWidth: '800px', lineHeight: '1.5' }}>
                                {course?.description}
                            </p>
                            {userData?.role === 'student' && course && (
                                <div style={{ marginTop: 16 }}>
                                    <StarRating courseId={course.id} />
                                </div>
                            )}
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
                            <SortableContext items={displayItems.map(i => `${i.type}-${i.id}`)} strategy={rectSortingStrategy}>
                                <div className={`content-grid ${activeDragId ? 'is-global-dragging' : ''}`}>
                                    {displayItems.map((item, idx) => (
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
                                            <div style={{ fontSize: '50px', color: 'var(--text-muted)', marginBottom: '10px' }}>+</div>
                                            <div style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Добавить материал</div>
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                        {displayItems.length === 0 && <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>{isEditMode ? 'В этом курсе пока нет материалов.' : 'Нет доступных материалов.'}</div>}
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
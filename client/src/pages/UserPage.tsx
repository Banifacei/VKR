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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AddVideoForm } from '../components/AddVideoForm';
import { ContentEditorModal } from '../components/ContentEditorModal';
import './UserPage.css';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
// Объединенный тип для плитки
type DashboardItem = 
    | ({ type: 'video' } & IVideo) 
    | ({ type: 'test' } & ICourseTest);

const SortableCard = ({ item, idx, isEditMode, completedVideoIds, testResults, onClick, onEdit, onDelete }: any) => {
    const id = `${item.type}-${item.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });

    const style = {
        // 1. Используем Translate вместо Transform (убирает дерганье размеров в сетках)
        transform: CSS.Translate.toString(transform), 
        
        // 2. ЖЕЛЕЗОБЕТОННО отключаем CSS-анимации во время самого перетаскивания (это уберет лаги)
        transition: transition || 'none', 
        
        position: 'relative' as const,
        
        // 3. Задираем z-index повыше, чтобы летящая карточка точно не цеплялась за соседей
        zIndex: isDragging ? 9999 : (transform ? 1 : 0),
        
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        
        // 4. Добавим немного визуальной магии для летящей карточки
        opacity: isDragging ? 0.8 : 1, 
        boxShadow: isDragging ? '0px 15px 30px rgba(0,0,0,0.6)' : 'none',
        scale: isDragging ? '1.02' : '1', // Чуть-чуть увеличиваем, чтобы визуально "оторвать" от стола
    };

    return (
        <div ref={setNodeRef} style={style} {...(isEditMode ? attributes : {})} {...(isEditMode ? listeners : {})} 
             className={`content-card ${isDragging ? 'is-dragging' : ''}`} 
             onClick={!isEditMode ? () => onClick(item) : undefined}>
            
            {/* 🛠 ОВЕРЛЕЙ РЕДАКТОРА (Показывается только в Режиме Редактирования) */}
            {isEditMode && (
                <div className="edit-overlay" style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 10, borderRadius: 'inherit',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(item); }} style={{background: '#00aeef', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', width: '70%', fontWeight: 'bold'}}>📝 Контент</button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(item); }} style={{background: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', width: '70%', fontWeight: 'bold'}}>🗑️ Удалить</button>
                </div>
            )}

            {/* Стандартное содержимое карточки */}
            <div className="card-thumbnail">
                <div className="card-type-icon" style={{ background: item.type === 'video' ? 'rgba(0,0,0,0.6)' : 'rgba(255, 215, 0, 0.8)', color: item.type === 'video' ? '#fff' : '#000' }}>
                    {item.type === 'video' ? 'ВИДЕО' : 'ТЕСТ'}
                </div>
                <span style={{ fontSize: '50px' }}>{item.type === 'video' ? '📺' : '📝'}</span>
            </div>
            <div className="card-body">
                <h3 className="card-title">{idx + 1}. {item.title}</h3>
                <div className="card-meta">
                    {item.type === 'video' ? <span>▶ Урок</span> : <span>{item.questions?.length || 0} вопросов</span>}
                    {/* Логика галочек */}
                    {item.type === 'video' ? (
                        completedVideoIds.includes(item.id) ? <span style={{ color: '#4dff88', fontWeight: 'bold', fontSize: '14px' }}>✅</span> : <span style={{ color: '#444' }}>◯</span>
                    ) : (
                        testResults[item.id] ? (
                            <span style={{ color: testResults[item.id].passed ? '#4dff88' : '#ff4d4d', fontWeight: 'bold', fontSize: '14px' }}>
                                {testResults[item.id].passed ? `✅ Сдан на ${testResults[item.id].score}%` : `❌ Не сдан (${testResults[item.id].score}%)`}
                            </span>
                        ) : <span style={{ color: '#444' }}>◯</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const UserPage = () => {
    const { courseId } = useParams();
    const { showToast } = useToast();
    const [activeDragId, setActiveDragId] = useState<string | null>(null); // Кто сейчас летит?
    const [showAddModal, setShowAddModal] = useState(false);
    const [editorItem, setEditorItem] = useState<DashboardItem | null>(null); // 👈 Стейт для редактора контента
    const [modalView, setModalView] = useState<'select' | 'create_test' | 'create_video'>('select');
    const [isCreating, setIsCreating] = useState(false);
    // Данные для нового теста
    const [newTestData, setNewTestData] = useState({ title: '', description: '', passingScore: 80, maxAttempts: 3 });
    const isSavingOrderRef = useRef(false);
    
    // Создание ТЕСТА
    const handleCreateTest = async () => {
        if (!newTestData.title.trim()) {
            showToast('Введите название теста!', 'error');
            return;
        }
        setIsCreating(true);
        const nextIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.orderIndex || 0)) + 1 : 0;
        try {
            // 🔥 Чистый axios
            await api.post(`/tests/courses/${courseId}`, { ...newTestData, orderIndex: nextIndex });
            setNewTestData({ title: '', description: '', passingScore: 80, maxAttempts: 3 });
            setShowAddModal(false);
            setModalView('select');
            fetchCourseData();
            showToast('Тест успешно создан!', 'success');
        } catch (e) { console.error(e);
             showToast('Ошибка при создании теста', 'error');
            } 
        finally { setIsCreating(false); }
    };

    // Создание ВИДЕО (пока по URL, загрузку файлов прикрутим позже, если надо)
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
            const allCourses = await getCourses();
            const foundCourse = allCourses.find(c => c.id === Number(courseId));
            setCourse(foundCourse || null);

            const videos = await getVideosByCourse(Number(courseId));
            const tests = await getCourseTests(Number(courseId));

            const combinedItems: DashboardItem[] = [
                ...videos.map(v => ({ ...v, type: 'video' as const })),
                ...tests.map(t => ({ ...t, type: 'test' as const }))
            ].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
            setItems(combinedItems); 

            const progressData = await getUserCourseProgress(Number(courseId));
            setCompletedVideoIds(progressData.completedVideoIds || []);
            
            const resultsMap: Record<number, {score: number, passed: boolean}> = {};
            (progressData.testResults || []).forEach((tr: any) => {
                resultsMap[tr.testId] = { score: tr.score, passed: tr.passed };
            });
            setTestResults(resultsMap);

        } catch (err) {
            console.error("Не удалось загрузить данные", err);
        } finally {
            setLoading(false);
        }
    };

    // 👇 2. Оставили useEffect чистым
    useEffect(() => {
        fetchCourseData();
    }, [courseId]);
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
                // 1. Тихо скачиваем свежий контент
                const videos = await getVideosByCourse(Number(courseId));
                const tests = await getCourseTests(Number(courseId));

                const combinedItems: DashboardItem[] = [
                    ...videos.map(v => ({ ...v, type: 'video' as const })),
                    ...tests.map(t => ({ ...t, type: 'test' as const }))
                ].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

                // Сравниваем легкий "слепок" массива (тип, ID, порядок, название)
                setItems(prevItems => {
                    const prevHash = JSON.stringify(prevItems.map(i => `${i.type}-${i.id}-${i.title}-${(i as any).orderIndex}`));
                    const newHash = JSON.stringify(combinedItems.map(i => `${i.type}-${i.id}-${i.title}-${(i as any).orderIndex}`));
                    
                    if (prevHash !== newHash) {
                        console.log("🔄 [Фон] Кто-то изменил порядок или добавил урок! Обновляем сетку...");
                        return combinedItems;
                    }
                    return prevItems;
                });

                // 2. Заодно тихо обновляем прогресс-бар и оценки (вдруг студент сдал тест с телефона)
                const progressData = await getUserCourseProgress(Number(courseId));
                setCompletedVideoIds(progressData.completedVideoIds || []);
                
                const resultsMap: Record<number, {score: number, passed: boolean}> = {};
                (progressData.testResults || []).forEach((tr: any) => {
                    resultsMap[tr.testId] = { score: tr.score, passed: tr.passed };
                });
                setTestResults(resultsMap);

            } catch (e) {
                // Игнорируем сетевые ошибки в фоне
            }
        }, 10000); // 10 секунд

        return () => clearInterval(interval);
    }, [courseId, activeDragId]); // 👈 Обязательно передаем activeDragId в зависимости!
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

            <div className="dashboard-container">
                <div className="course-header-big">
                    <button className="btn btn-ghost" onClick={() => window.location.href='/courses'} style={{marginBottom: '10px', paddingLeft: 0, color: '#666'}}>
                        ← Все курсы
                    </button>
                    <h1 className="course-title-large">{course?.title || 'Загрузка...'}</h1>
                    <div className="course-progress-section">
                        {userData && ['teacher', 'admin'].includes(userData.role) && (
                            <div style={{ 
                                marginTop: '25px', 
                                display: 'flex', 
                                gap: '5px', 
                                background: '#111', 
                                padding: '6px', 
                                borderRadius: '12px', 
                                width: 'fit-content',
                                border: '1px solid #333'
                            }}>
                                <button 
                                    onClick={() => setIsEditMode(false)}
                                    style={{ 
                                        background: !isEditMode ? '#2a2a2a' : 'transparent', 
                                        color: !isEditMode ? '#fff' : '#888',
                                        border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s'
                                    }}
                                >
                                    👁️ Глазами студента
                                </button>
                                <button 
                                    onClick={() => setIsEditMode(true)}
                                    style={{ 
                                        background: isEditMode ? '#00aeef' : 'transparent', 
                                        color: isEditMode ? '#fff' : '#888',
                                        border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s'
                                    }}
                                >
                                    ✏️ Редактирование
                                </button>
                            </div>
                        )}
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
                    <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragStart={(e) => setActiveDragId(String(e.active.id))} // 👈 Фиксируем старт
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveDragId(null)} // 👈 Если отменили (Esc)
                >
                    <SortableContext items={items.map(i => `${i.type}-${i.id}`)} strategy={rectSortingStrategy}>
                        {/* 👇 Вешаем класс is-global-dragging, если что-то тащим */}
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

                                {/* 🌟 ПЛИТКА "ДОБАВИТЬ" (Только в режиме редактирования) */}
                                {isEditMode && (
                                    <div 
                                        className="content-card" 
                                        onClick={() => setShowAddModal(true)}
                                        style={{ 
                                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
                                            border: '2px dashed #444', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', minHeight: '200px' 
                                        }}
                                    >
                                        <div style={{ fontSize: '50px', color: '#666', marginBottom: '10px' }}>+</div>
                                        <div style={{ color: '#888', fontWeight: 'bold' }}>Добавить материал</div>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
                {!loading && items.length === 0 && <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>В этом курсе пока нет материалов.</div>}
            </div>
            {/* 🌟 ДИНАМИЧЕСКАЯ МОДАЛКА ДОБАВЛЕНИЯ */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }} onClick={() => { setShowAddModal(false); setModalView('select'); }}>
                    
                    <div 
                        style={{ background: '#111', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '400px', animation: 'fadeIn 0.2s ease' }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        {/* ЭКРАН 1: ВЫБОР */}
                        {modalView === 'select' && (
                            <>
                                <h2 style={{color: '#fff', marginBottom: '25px', marginTop: 0, textAlign: 'center'}}>Что добавим в курс?</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <button 
                                        onClick={() => setModalView('create_video')} 
                                        style={{ background: '#2a2a2a', border: '1px solid #444', color: '#fff', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' }}
                                    >
                                        <span style={{fontSize: '24px'}}>📺</span> 
                                        <div style={{textAlign: 'left'}}>
                                            <div style={{fontWeight: 'bold'}}>Видео-урок</div>
                                            <div style={{fontSize: '12px', color: '#888'}}>Добавить обучающее видео</div>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => setModalView('create_test')} 
                                        style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#fff', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' }}
                                    >
                                        <span style={{fontSize: '24px'}}>📝</span> 
                                        <div style={{textAlign: 'left'}}>
                                            <div style={{fontWeight: 'bold', color: '#ffd700'}}>Тест</div>
                                            <div style={{fontSize: '12px', color: '#888'}}>Проверка знаний</div>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ЭКРАН 2: ФОРМА СОЗДАНИЯ ТЕСТА */}
                        {modalView === 'create_test' && (
                            <>
                                <h2 style={{color: '#fff', marginBottom: '20px', marginTop: 0}}>📝 Новый тест</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <input 
                                        type="text" placeholder="Название теста" className="modern-input"
                                        value={newTestData.title} onChange={e => setNewTestData({...newTestData, title: e.target.value})}
                                    />
                                    <textarea 
                                        placeholder="Краткое описание" className="modern-textarea" style={{ minHeight: '80px' }}
                                        value={newTestData.description} onChange={e => setNewTestData({...newTestData, description: e.target.value})}
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', color: '#888' }}>Проходной балл (%)</label>
                                            <input type="number" className="modern-input" min="1" max="100" value={newTestData.passingScore} onChange={e => setNewTestData({...newTestData, passingScore: Number(e.target.value)})} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', color: '#888' }}>Попытки (0 = ∞)</label>
                                            <input type="number" className="modern-input" min="0" value={newTestData.maxAttempts} onChange={e => setNewTestData({...newTestData, maxAttempts: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    <button className="primary-btn" onClick={handleCreateTest} disabled={isCreating}>
                                        {isCreating ? 'Создаем...' : 'Сохранить тест'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ЭКРАН 3: ФОРМА СОЗДАНИЯ ВИДЕО (ИСПОЛЬЗУЕМ ГОТОВЫЙ КОМПОНЕНТ!) */}
                        {modalView === 'create_video' && (
                            <>
                                <h2 style={{color: '#fff', marginBottom: '20px', marginTop: 0}}>📺 Новый урок</h2>
                                
                                {/* 👇 Вот он, твой готовый рабочий компонент! */}
                                <AddVideoForm 
                                    courseId={Number(courseId)} 
                                    onVideoAdded={() => {
                                        setShowAddModal(false);
                                        setModalView('select');
                                        fetchCourseData();
                                    }} 
                                />
                            </>
                        )}

                        <button 
                            className="btn btn-ghost" style={{ marginTop: '20px', color: '#666', width: '100%' }} 
                            onClick={() => { setShowAddModal(false); setModalView('select'); }}
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}
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
        </div>
    );
};
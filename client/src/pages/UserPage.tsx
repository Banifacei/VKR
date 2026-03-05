import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getVideosByCourse, getCourses, updateCourseApi, deleteCourseApi } from '../api/videoApi';
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
import './CoursesPage.css';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { checkEnrollment, enrollInCourse, getCourseEnrollments, updateEnrollmentStatus} from '../api/videoApi';


const Icons = {
    Video: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    Test: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    Fail: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    Empty: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
    Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
};

type DashboardItem = 
    | ({ type: 'video' } & IVideo) 
    | ({ type: 'test' } & ICourseTest);

// 🔥 ПОЛНОСТЬЮ ОБНОВЛЕННАЯ КАРТОЧКА
const SortableCard = ({ item, idx, isEditMode, completedVideoIds, testResults, onClick, onEdit, onDelete }: any) => {
    const id = `${item.type}-${item.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });

    const style = {
        transform: CSS.Translate.toString(transform), 
        transition: transition || 'none', 
        position: 'relative' as const,
        zIndex: isDragging ? 9999 : (transform ? 1 : 0),
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.8 : 1, 
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.8)' : 'none',
        scale: isDragging ? '1.05' : '1',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#111',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column' as const
    };

    const isVideo = item.type === 'video';
    const isCompleted = isVideo ? completedVideoIds.includes(item.id) : (testResults[item.id]?.passed || false);

    return (
        <div ref={setNodeRef} style={style} {...(isEditMode ? attributes : {})} {...(isEditMode ? listeners : {})} 
             onClick={!isEditMode ? () => onClick(item) : undefined}
             // 🔥 1. ВЕРНУЛИ КЛАССЫ ДЛЯ АНИМАЦИЙ
             className={`content-card ${isDragging ? 'is-dragging' : ''}`}
        >
            
            {/* 🔥 2. ОВЕРЛЕЙ РЕДАКТОРА (Теперь управляется через CSS) */}
            {isEditMode && (
                <div className="edit-overlay">
                    <button 
                        className="edit-btn primary"
                        onPointerDown={(e) => e.stopPropagation()} 
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
                    >
                        <Icons.Edit /> Контент
                    </button>
                    <button 
                        className="edit-btn danger"
                        onPointerDown={(e) => e.stopPropagation()} 
                        onClick={(e) => { e.stopPropagation(); onDelete(item); }} 
                    >
                        <Icons.Trash /> Удалить
                    </button>
                </div>
            )}

            {/* ЯРКАЯ ОБЛОЖКА */}
            <div style={{ 
                height: '140px', 
                background: isVideo ? 'linear-gradient(135deg, #00aeef 0%, #0056b3 100%)' : 'linear-gradient(135deg, #F09819 0%, #EDDE5D 100%)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative'
            }}>
                <div style={{ 
                    position: 'absolute', top: '12px', left: '12px', 
                    background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '8px', 
                    fontSize: '11px', fontWeight: 'bold', color: '#fff', backdropFilter: 'blur(4px)' 
                }}>
                    {isVideo ? 'ВИДЕО-УРОК' : 'ТЕСТИРОВАНИЕ'}
                </div>
                {isVideo ? <Icons.Video /> : <Icons.Test />}
            </div>

            {/* ИНФОРМАЦИЯ */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff', lineHeight: '1.4' }}>
                    <span style={{ color: '#888', marginRight: '8px' }}>{idx + 1}.</span>
                    {item.title}
                </h3>
                
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                        {isVideo ? 'Учебный материал' : `${item.questions?.length || 0} вопросов`}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isVideo ? (
                            isCompleted ? <><Icons.Check /> <span style={{fontSize: '13px', color: '#00ff88'}}>Пройдено</span></> : <Icons.Empty />
                        ) : (
                            testResults[item.id] ? (
                                testResults[item.id].passed ? (
                                    <><Icons.Check /> <span style={{fontSize: '13px', color: '#00ff88'}}>{testResults[item.id].score}%</span></>
                                ) : (
                                    <><Icons.Fail /> <span style={{fontSize: '13px', color: '#ff4d4d'}}>{testResults[item.id].score}%</span></>
                                )
                            ) : <Icons.Empty />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const UserPage = () => {
    const { courseId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editorItem, setEditorItem] = useState<DashboardItem | null>(null);
    const [modalView, setModalView] = useState<'select' | 'create_test' | 'create_video'>('select');
    const [editCourseData, setEditCourseData] = useState<{
        title: string;
        description: string;
        instructor: string;
        enrollmentType: 'open' | 'request' | 'closed';
    }>({ title: '', description: '', instructor: '', enrollmentType: 'open' });
    const [enrollmentsList, setEnrollmentsList] = useState<any[]>([]);
    const pendingCount = enrollmentsList.filter(req => req.status === 'pending').length;
    const [settingsTab, setSettingsTab] = useState<'info' | 'team' | 'enrollments'>('info');
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCourseSettings, setShowCourseSettings] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [transferUserId, setTransferUserId] = useState<number | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [enrollStatus, setEnrollStatus] = useState<string | null | 'loading'>('loading');
    const [isEnrolling, setIsEnrolling] = useState(false);
    const prevStatusRef = useRef(enrollStatus);
    useEffect(() => {
        prevStatusRef.current = enrollStatus;
    }, [enrollStatus]);
    const fetchCollaborators = async (id: number) => {
        try {
            const res = await api.get(`/videos/courses/${id}/collaborators`);
            setCollaborators(res.data);
        } catch (e) { console.error('Ошибка загрузки команды'); }
    };
    // 🔥 ЗАГРУЗИТЬ СПИСОК ЗАЯВОК
    const fetchEnrollmentsList = async (id: number) => {
        try {
            const res = await getCourseEnrollments(id);
            setEnrollmentsList(res);
        } catch (e) { console.error('Ошибка загрузки заявок', e); }
    };

    // 🔥 ОДОБРИТЬ ИЛИ ОТКЛОНИТЬ ЗАЯВКУ
    const handleEnrollmentAction = async (enrollmentId: number, status: 'approved' | 'rejected') => {
        try {
            await updateEnrollmentStatus(enrollmentId, status);
            showToast(`Заявка ${status === 'approved' ? 'одобрена' : 'отклонена'}`, 'success');
            fetchEnrollmentsList(Number(courseId)); // Обновляем список, чтобы кнопка перекрасилась
        } catch (e) {
            showToast('Ошибка при обновлении статуса', 'error');
        }
    };
    const loadAllUsers = async () => {
        setIsSearching(true);
        try {
            const res = await api.get('/users/available');
            setSearchResults(res.data);
        } catch(e) { }
        finally { setIsSearching(false); }
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                // Ищем по тексту
                setIsSearching(true);
                try {
                    const res = await api.get(`/users/search?q=${searchQuery}`);
                    setSearchResults(res.data);
                } catch(e) { }
                finally { setIsSearching(false); }
            } else if (searchQuery.trim().length === 0 && showDropdown) {
                // Если стерли текст до нуля — снова показываем всех!
                loadAllUsers();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, showDropdown]);

    const handleInviteUser = async (userEmail: string) => {
        if (!courseId) return;
        try {
            await api.post(`/videos/courses/${courseId}/collaborators`, { email: userEmail });
            showToast('Пользователь добавлен в команду!', 'success');
            setSearchQuery(''); // Сбрасываем строку
            setShowDropdown(false); // Закрываем выпадашку
            fetchCollaborators(Number(courseId)); // Обновляем список
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка приглашения', 'error');
        }
    };
    
    const handleRemoveCollaborator = async (userId: number) => {
        if (!courseId || !window.confirm('Удалить пользователя из команды?')) return;
        try {
            await api.delete(`/videos/courses/${courseId}/collaborators/${userId}`);
            showToast('Пользователь удален', 'info');
            fetchCollaborators(Number(courseId));
        } catch (e) { showToast('Ошибка удаления', 'error'); }
    };
    // 🔥 ФУНКЦИЯ ПЕРЕДАЧИ ПРАВ (Вызывается из красивой модалки)
    const handleTransferOwnership = async () => {
        if (!courseId || !transferUserId) return;
        
        setIsTransferring(true);
        try {
            await api.put(`/videos/courses/${courseId}/transfer`, { newOwnerId: transferUserId });
            showToast('Права успешно переданы!', 'success');
            setShowCourseSettings(false); // Закрываем окно настроек
            setTransferUserId(null); // Закрываем окно подтверждения
            fetchCourseData(); // Обновляем курс
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка передачи прав', 'error');
        } finally {
            setIsTransferring(false);
        }
    };
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
            const status = await checkEnrollment(Number(courseId));
            setEnrollStatus(status);
            const allCourses = await getCourses();
            const foundCourse = allCourses.find(c => c.id === Number(courseId));
            setCourse(foundCourse || null);
            
            // 🔥 ПРОВЕРКА ПРАВ (ФРОНТЕНД-ИЗОЛЯЦИЯ)
            let hasRights = false;
            if (userData?.role === 'admin') hasRights = true;
            if (foundCourse?.ownerId === userData?.id) hasRights = true;

            // Тихо пытаемся загрузить команду курса. 
            // Если бэкенд отдаст 403 (Forbidden) — мы не соавторы, ошибка просто проигнорируется.
            try {
                const collabRes = await api.get(`/videos/courses/${courseId}/collaborators`);
                setCollaborators(collabRes.data);
                // Если наш ID есть в списке соавторов
                if (collabRes.data.some((c: any) => c.userId === userData?.id)) {
                    hasRights = true;
                }
            } catch (e) { /* Ничего не делаем, доступ запрещен */ }

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
                /* 🔥 ЛЕНДИНГ ДЛЯ НЕЗАЧИСЛЕННЫХ ГОСТЕЙ (canEdit пускает владельцев и админов) */
                <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
                    <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', background: '#111', padding: '50px', borderRadius: '24px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.4s ease' }}>
                        
                        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #00aeef, #0077a3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 20px rgba(0, 174, 239, 0.3)' }}>
                            <Icons.Test /> {/* Используем твою иконку из словаря */}
                        </div>
                        
                        <h1 style={{ fontSize: '32px', marginBottom: '15px', color: '#fff' }}>{course?.title || 'Загрузка...'}</h1>
                        <p style={{ color: '#888', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
                            {course?.description || 'Описание курса скоро появится. Здесь вы узнаете много нового и интересного.'}
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '40px', color: '#aaa', fontSize: '14px' }}>
                            <span>👨‍🏫 Преподаватель: <strong style={{color: '#fff'}}>{course?.instructor}</strong></span>
                        </div>

                        {enrollStatus === 'pending' ? (
                            <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                                ⏳ Ваша заявка на рассмотрении...
                            </button>
                        ) : enrollStatus === 'rejected' ? (
                            <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                                ❌ В доступе отказано
                            </button>
                        ) : course?.enrollmentType === 'closed' ? (
                            <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }}>
                                🔒 Запись на курс закрыта
                            </button>
                        ) : (
                            <button 
                                className="btn btn-primary" 
                                onClick={handleEnroll}
                                disabled={isEnrolling}
                                style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #00aeef 0%, #0077a3 100%)', boxShadow: '0 10px 20px rgba(0, 174, 239, 0.3)', fontWeight: 'bold' }}
                            >
                                {isEnrolling ? 'Запись...' : (course?.enrollmentType === 'open' ? '🚀 Записаться бесплатно' : '📝 Подать заявку на участие')}
                            </button>
                        )}
                    </div>
                </main>
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
                                        {isEditMode && (
                                            <button onClick={() => {
                                                if (course) {
                                                    setEditCourseData({ 
                                                        title: course.title, 
                                                        description: course.description || '', 
                                                        instructor: course.instructor || '',
                                                        enrollmentType: (course.enrollmentType as 'open' | 'request' | 'closed') || 'open' // <--- Добавили это
                                                    });
                                                    setSettingsTab('info');
                                                    setShowCourseSettings(true);
                                                }
                                            }} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                ⚙️ Настройки
                                                {pendingCount > 0 && (
                                                    <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', lineHeight: 1 }}>
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </button>
                                        )}
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
            {/* 🔥 МОДАЛКА НАСТРОЕК И КОМАНДЫ */}
            {showCourseSettings && course && (() => {
                const isOwner = course.ownerId === userData?.id || userData?.role === 'admin';
                const isChanged = course.title !== editCourseData.title || 
                  (course.description || '') !== editCourseData.description || 
                  (course.instructor || '') !== editCourseData.instructor ||
                  (course.enrollmentType || 'open') !== editCourseData.enrollmentType;
                
                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        
                        <div style={{ background: '#111', borderRadius: '24px', border: '1px solid #333', width: '100%', maxWidth: '700px',height: '600px', margin: '0 20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column'}}>
                            
                            <div style={{ padding: '20px 25px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{margin: 0, color: '#fff'}}>Настройки курса</h3>
                                <button style={{background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:'20px'}} onClick={() => setShowCourseSettings(false)}>✕</button>
                            </div>

                            <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#0a0a0a' }}>
                                <button onClick={() => setSettingsTab('info')} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'info' ? '2px solid #00aeef' : '2px solid transparent', color: settingsTab === 'info' ? '#00aeef' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>Основное</button>
                                <button onClick={() => { setSettingsTab('enrollments'); fetchEnrollmentsList(course.id); }} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'enrollments' ? '2px solid #00aeef' : '2px solid transparent', color: settingsTab === 'enrollments' ? '#00aeef' : '#888', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    Заявки
                                    {pendingCount > 0 && (
                                        <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', lineHeight: 1 }}>
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                                <button onClick={() => { setSettingsTab('team'); fetchCollaborators(course.id); }} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'team' ? '2px solid #00aeef' : '2px solid transparent', color: settingsTab === 'team' ? '#00aeef' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>Команда</button>
                            </div>

                        <div style={{ padding: '25px' }}>
                                            {/* --- ВКЛАДКА 1: ОСНОВНОЕ --- */}
                                            {settingsTab === 'info' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    <div><label style={{ fontSize: '12px', color: '#888' }}>Название курса</label><input className="modern-input" value={editCourseData.title} onChange={e => setEditCourseData({...editCourseData, title: e.target.value})} /></div>
                                                    <div><label style={{ fontSize: '12px', color: '#888' }}>ФИО Преподавателя</label><input className="modern-input" value={editCourseData.instructor} onChange={e => setEditCourseData({...editCourseData, instructor: e.target.value})} /></div>
                                                    <div><label style={{ fontSize: '12px', color: '#888' }}>Описание</label><textarea className="modern-input" style={{ minHeight: '150px' }} value={editCourseData.description} onChange={e => setEditCourseData({...editCourseData, description: e.target.value})} /></div>
                                                    
                                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                        <button className="btn btn-primary" style={{ flex: 1, opacity: isChanged ? 1 : 0.5 }} disabled={!isChanged} onClick={async () => {
                                                            try {
                                                                await updateCourseApi(course.id, editCourseData);
                                                                fetchCourseData(); setShowCourseSettings(false); showToast('Курс обновлен!', 'success');
                                                            } catch (e) { showToast('Ошибка', 'error'); }
                                                        }}>Сохранить</button>
                                                        
                                                        {isOwner && (
                                                            <button className="btn btn-ghost" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d' }} onClick={async () => {
                                                                if (window.confirm('⚠️ Вы уверены, что хотите навсегда удалить этот курс?')) {
                                                                    try { await deleteCourseApi(course.id); window.location.href = '/courses'; } catch (e) { showToast('Ошибка', 'error'); }
                                                                }
                                                            }}>🗑️ Удалить</button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- ВКЛАДКА 2: КОМАНДА --- */}
                                            {settingsTab === 'team' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    {isOwner ? (
                                                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a', borderRadius: '12px', padding: '0 15px', border: '1px solid #333', transition: 'border-color 0.2s', position: 'relative', zIndex: 101 }}>
                                                                <span style={{color: '#888'}}>🔍</span>
                                                                <input 
                                                                    className="modern-input" 
                                                                    style={{ marginBottom: 0, border: 'none', background: 'transparent', boxShadow: 'none', flex: 1, padding: '15px 10px' }} 
                                                                    placeholder="Поиск или выбор из списка..." 
                                                                    value={searchQuery} 
                                                                    onChange={e => setSearchQuery(e.target.value)} 
                                                                    onFocus={() => { 
                                                                        setShowDropdown(true);
                                                                        if (!searchQuery.trim()) {
                                                                            loadAllUsers();
                                                                        }
                                                                    }}
                                                                />
                                                                {isSearching && <span className="loader-dots" style={{color: '#00aeef', paddingRight: '10px'}}>...</span>}
                                                            </div>

                                                            {showDropdown && searchResults.length > 0 && (
                                                                <div style={{
                                                                    position: 'absolute', top: '55px', left: 0, right: 0,
                                                                    background: '#161616', border: '1px solid #333', borderRadius: '12px',
                                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 102, overflowY: 'auto', 
                                                                    maxHeight: '260px',
                                                                    animation: 'fadeIn 0.2s ease'
                                                                }}>
                                                                    {searchResults.map(userItem => {
                                                                        if (collaborators.some(c => c.userId === userItem.id)) return null;
                                                                        return (
                                                                            <div key={userItem.id} 
                                                                                onClick={() => handleInviteUser(userItem.email)}
                                                                                style={{
                                                                                    padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px',
                                                                                    cursor: 'pointer', borderBottom: '1px solid #222', transition: 'background 0.2s'
                                                                                }}
                                                                                onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                            >
                                                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                                    {userItem.avatarUrl ? <img src={userItem.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <span style={{color:'#fff', fontSize:'14px'}}>{userItem.firstName?.[0] || '?'}</span>}
                                                                                </div>
                                                                                <div style={{ flex: 1 }}>
                                                                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{userItem.firstName} {userItem.lastName}</div>
                                                                                    <div style={{ color: '#888', fontSize: '12px' }}>{userItem.email}</div>
                                                                                </div>
                                                                                <div style={{ fontSize: '11px', color: '#00aeef', background: 'rgba(0,174,239,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                                                                    {userItem.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {showDropdown && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex: 99}} onClick={() => setShowDropdown(false)} />}
                                                        </div>
                                                    ) : (
                                                        <div style={{color: '#ff9900', fontSize: '13px', background: 'rgba(255,153,0,0.1)', padding: '10px', borderRadius: '8px'}}>Только Владелец курса может управлять командой.</div>
                                                    )}

                                                    <div style={{ background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
                                                        {collaborators.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>Никого нет</div> : collaborators.map(col => (
                                                            <div key={col.userId} style={{ padding: '12px 15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div>
                                                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{col.user?.firstName} {col.user?.lastName}</div>
                                                                    <div style={{ color: '#888', fontSize: '12px' }}>{col.user?.email}</div>
                                                                </div>
                                                                {isOwner && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <button 
                                                                            onClick={() => setTransferUserId(col.userId)}
                                                                            style={{ 
                                                                                background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#ffd700', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: '0.2s'
                                                                            }}
                                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'}
                                                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'}
                                                                            title="Передать права владельца курса"
                                                                        >
                                                                            👑 Сделать владельцем
                                                                        </button>
                                                                        <button className="btn-icon" style={{ color: '#ff4d4d', padding: '4px 8px' }} onClick={() => handleRemoveCollaborator(col.userId)}>✕</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- ВКЛАДКА 3: ЗАЯВКИ --- */}
                                            {settingsTab === 'enrollments' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '420px', overflowY: 'auto' }}>
                                                    
                                                    <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                                                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Режим доступа к курсу</label>
                                                        <select 
                                                            className="modern-input" 
                                                            value={editCourseData.enrollmentType} 
                                                            onChange={async (e) => {
                                                                const newType = e.target.value as 'open' | 'request' | 'closed';
                                                                setEditCourseData({...editCourseData, enrollmentType: newType});
                                                                try {
                                                                    await updateCourseApi(course.id, { enrollmentType: newType });
                                                                    fetchCourseData(); 
                                                                    showToast('Режим доступа успешно изменен!', 'success');
                                                                } catch (error) {
                                                                    showToast('Ошибка при сохранении режима', 'error');
                                                                }
                                                            }}
                                                            style={{ cursor: 'pointer', appearance: 'auto', marginBottom: 0 }}
                                                        >
                                                            <option value="open">🟢 Открытый (Свободный вход)</option>
                                                            <option value="request">🟡 По заявкам (Ручная модерация)</option>
                                                            <option value="closed">🔴 Закрытый (Запись остановлена)</option>
                                                        </select>
                                                    </div>

                                                    {enrollmentsList.length === 0 ? (
                                                        <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                                                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                                                            Пока нет ни одной заявки
                                                        </div>
                                                    ) : (
                                                        enrollmentsList.map(req => (
                                                            <div key={req.id} style={{ background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                        {req.user?.avatarUrl ? <img src={req.user.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <span style={{color:'#fff', fontWeight: 'bold'}}>{req.user?.firstName?.[0] || '?'}</span>}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>{req.user?.firstName} {req.user?.lastName}</div>
                                                                        <div style={{ color: '#888', fontSize: '12px' }}>{req.user?.email}</div>
                                                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                                            Заявка от: {new Date(req.createdAt).toLocaleDateString()}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    {req.status === 'pending' ? (
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <button className="btn-icon" style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,136,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(0,255,136,0.1)'} onClick={() => handleEnrollmentAction(req.id, 'approved')}>
                                                                                ✅ Принять
                                                                            </button>
                                                                            <button className="btn-icon" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 77, 77, 0.3)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,77,77,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,77,77,0.1)'} onClick={() => handleEnrollmentAction(req.id, 'rejected')}>
                                                                                ❌ Отклонить
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', background: req.status === 'approved' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 77, 77, 0.1)', color: req.status === 'approved' ? '#00ff88' : '#ff4d4d', border: `1px solid ${req.status === 'approved' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 77, 77, 0.3)'}` }}>
                                                                            {req.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                        {/* 🔥 КРАСИВАЯ МОДАЛКА ПОДТВЕРЖДЕНИЯ ПЕРЕДАЧИ ПРАВ */}
            {transferUserId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000
                }} onClick={() => setTransferUserId(null)}>
                    
                    <div 
                        style={{ background: '#111', padding: '30px', borderRadius: '20px', border: '1px solid #ff4d4d', width: '450px', animation: 'fadeIn 0.2s ease', textAlign: 'center', boxShadow: '0 20px 50px rgba(255, 77, 77, 0.15)' }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                        <h2 style={{color: '#fff', marginBottom: '15px', marginTop: 0}}>Передача прав</h2>
                        
                        <p style={{color: '#aaa', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px'}}>
                            Вы уверены, что хотите передать права Владельца этому пользователю? <br/><br/>
                            <span style={{color: '#ff4d4d', fontWeight: 'bold'}}>Вы станете обычным соавтором</span>, а ФИО преподавателя на обложке курса изменится. Отменить это действие самостоятельно будет невозможно.
                        </p>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button 
                                className="btn btn-ghost" style={{ flex: 1, color: '#888' }} 
                                onClick={() => setTransferUserId(null)}
                                disabled={isTransferring}
                            >
                                Отмена
                            </button>
                            <button 
                                style={{ flex: 1, background: 'rgba(255, 77, 77, 0.2)', border: '1px solid rgba(255, 77, 77, 0.4)', color: '#ff4d4d', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.3)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.2)'}
                                onClick={handleTransferOwnership}
                                disabled={isTransferring}
                            >
                                {isTransferring ? 'Передаем...' : 'Да, передать права'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../api/axiosInstance';
import { Icons } from '../components/Icons';
import { AppHeader } from '../components/AppHeader';
import '../components/GlobalSearch.css';
import { ExportModal } from '../components/Analytics/ExportModal';
import { AnalyticsDrillDownModal } from '../components/Analytics/AnalyticsDrillDownModal';

import './ProfilePage.css';
import './CoursesPage.css';
import './AnalyticsPage.css';

const DEMO_COURSES = [
    { id: -1, title: 'Администрирование Linux-серверов', description: 'Базовые и продвинутые навыки работы с Linux: файловая система, сервисы, сеть, безопасность.' },
    { id: -2, title: 'Основы сетевых технологий', description: 'Протоколы TCP/IP, маршрутизация, коммутация, настройка сетевого оборудования.' },
    { id: -3, title: 'Веб-разработка: React + Node.js', description: 'Полный стек: от компонентов React до REST API на Express и PostgreSQL.' },
];

const DEMO_ANALYTICS: Record<number, any> = {
    [-1]: {
        totalStudents: 34, globalAvgProgress: 78, globalAvgScore: 82,
        studentsProgress: [
            { id: 1, name: 'Иванов Дмитрий', email: 'ivanov.d@edu.ru', progressPercent: 100, avgScore: 94 },
            { id: 2, name: 'Петрова Анна', email: 'petrova.a@edu.ru', progressPercent: 100, avgScore: 91 },
            { id: 3, name: 'Сидоров Кирилл', email: 'sidorov.k@edu.ru', progressPercent: 96, avgScore: 88 },
            { id: 4, name: 'Козлова Мария', email: 'kozlova.m@edu.ru', progressPercent: 90, avgScore: 85 },
            { id: 5, name: 'Новиков Артём', email: 'novikov.a@edu.ru', progressPercent: 87, avgScore: 83 },
            { id: 6, name: 'Морозова Елена', email: 'morozova.e@edu.ru', progressPercent: 82, avgScore: 79 },
            { id: 7, name: 'Волков Павел', email: 'volkov.p@edu.ru', progressPercent: 75, avgScore: 76 },
            { id: 8, name: 'Зайцева Ирина', email: 'zaiceva.i@edu.ru', progressPercent: 70, avgScore: 72 },
            { id: 9, name: 'Лебедев Фёдор', email: 'lebedev.f@edu.ru', progressPercent: 64, avgScore: 68 },
            { id: 10, name: 'Орлова Наталья', email: 'orlova.n@edu.ru', progressPercent: 55, avgScore: 61 },
            { id: 11, name: 'Семёнов Игорь', email: 'semenov.i@edu.ru', progressPercent: 48, avgScore: 54 },
            { id: 12, name: 'Захарова Вера', email: 'zaharova.v@edu.ru', progressPercent: 35, avgScore: 42 },
        ],
        funnel: [
            { id: 1, realId: 1, type: 'video', title: 'Введение в Linux. Файловая система', startedRate: 100, completionRate: 97 },
            { id: 2, realId: 2, type: 'video', title: 'Управление пользователями и правами', startedRate: 95, completionRate: 91 },
            { id: 3, realId: 1, type: 'test',  title: 'Тест: базовые команды', startedRate: 90, completionRate: 87 },
            { id: 4, realId: 3, type: 'video', title: 'Сервисы systemd и автозапуск', startedRate: 85, completionRate: 80 },
            { id: 5, realId: 4, type: 'video', title: 'Настройка сети: IP, маршруты, DNS', startedRate: 78, completionRate: 72 },
            { id: 6, realId: 2, type: 'test',  title: 'Тест: сеть и сервисы', startedRate: 70, completionRate: 65 },
            { id: 7, realId: 5, type: 'video', title: 'SSH, ключи, безопасность сервера', startedRate: 62, completionRate: 57 },
            { id: 8, realId: 3, type: 'test',  title: 'Итоговый тест', startedRate: 55, completionRate: 48 },
        ],
    },
    [-2]: {
        totalStudents: 21, globalAvgProgress: 65, globalAvgScore: 74,
        studentsProgress: [
            { id: 101, name: 'Алексеев Роман', email: 'alekseev.r@edu.ru', progressPercent: 100, avgScore: 96 },
            { id: 102, name: 'Фёдорова Юлия', email: 'fedorova.yu@edu.ru', progressPercent: 95, avgScore: 89 },
            { id: 103, name: 'Михайлов Денис', email: 'mihaylov.d@edu.ru', progressPercent: 88, avgScore: 84 },
            { id: 104, name: 'Соколова Ксения', email: 'sokolova.k@edu.ru', progressPercent: 80, avgScore: 77 },
            { id: 105, name: 'Яковлев Антон', email: 'yakovlev.a@edu.ru', progressPercent: 72, avgScore: 71 },
            { id: 106, name: 'Попова Светлана', email: 'popova.s@edu.ru', progressPercent: 60, avgScore: 63 },
            { id: 107, name: 'Кузнецов Олег', email: 'kuznecov.o@edu.ru', progressPercent: 45, avgScore: 55 },
            { id: 108, name: 'Васильева Надежда', email: 'vasilieva.n@edu.ru', progressPercent: 30, avgScore: 40 },
        ],
        funnel: [
            { id: 1, realId: 1, type: 'video', title: 'Модель OSI и TCP/IP', startedRate: 100, completionRate: 95 },
            { id: 2, realId: 2, type: 'video', title: 'IP-адресация и подсети', startedRate: 93, completionRate: 87 },
            { id: 3, realId: 1, type: 'test',  title: 'Тест: адресация', startedRate: 85, completionRate: 78 },
            { id: 4, realId: 3, type: 'video', title: 'Маршрутизация: OSPF, RIP', startedRate: 75, completionRate: 65 },
            { id: 5, realId: 2, type: 'test',  title: 'Итоговый тест', startedRate: 60, completionRate: 48 },
        ],
    },
    [-3]: {
        totalStudents: 47, globalAvgProgress: 58, globalAvgScore: 70,
        studentsProgress: [
            { id: 201, name: 'Тихонов Максим', email: 'tihonov.m@edu.ru', progressPercent: 100, avgScore: 98 },
            { id: 202, name: 'Громова Диана', email: 'gromova.d@edu.ru', progressPercent: 100, avgScore: 95 },
            { id: 203, name: 'Беляев Сергей', email: 'belyaev.s@edu.ru', progressPercent: 93, avgScore: 90 },
            { id: 204, name: 'Никитина Алина', email: 'nikitina.a@edu.ru', progressPercent: 86, avgScore: 85 },
            { id: 205, name: 'Виноградов Илья', email: 'vinogradov.i@edu.ru', progressPercent: 79, avgScore: 80 },
            { id: 206, name: 'Рыбакова Татьяна', email: 'rybakova.t@edu.ru', progressPercent: 71, avgScore: 74 },
            { id: 207, name: 'Щербаков Андрей', email: 'sherbakov.a@edu.ru', progressPercent: 64, avgScore: 68 },
            { id: 208, name: 'Павлова Оксана', email: 'pavlova.o@edu.ru', progressPercent: 55, avgScore: 61 },
            { id: 209, name: 'Соловьёв Вадим', email: 'soloviev.v@edu.ru', progressPercent: 43, avgScore: 52 },
            { id: 210, name: 'Крылова Людмила', email: 'krylova.l@edu.ru', progressPercent: 28, avgScore: 38 },
        ],
        funnel: [
            { id: 1, realId: 1, type: 'video', title: 'Введение в React: компоненты и JSX', startedRate: 100, completionRate: 96 },
            { id: 2, realId: 2, type: 'video', title: 'Состояние и хуки (useState, useEffect)', startedRate: 94, completionRate: 89 },
            { id: 3, realId: 1, type: 'test',  title: 'Тест: основы React', startedRate: 87, completionRate: 81 },
            { id: 4, realId: 3, type: 'video', title: 'REST API на Node.js + Express', startedRate: 78, completionRate: 70 },
            { id: 5, realId: 4, type: 'video', title: 'PostgreSQL и Sequelize ORM', startedRate: 68, completionRate: 58 },
            { id: 6, realId: 2, type: 'test',  title: 'Тест: бэкенд и БД', startedRate: 55, completionRate: 45 },
            { id: 7, realId: 5, type: 'video', title: 'Аутентификация: JWT + bcrypt', startedRate: 42, completionRate: 33 },
            { id: 8, realId: 3, type: 'test',  title: 'Финальный проект', startedRate: 30, completionRate: 22 },
        ],
    },
};

export const AnalyticsPage = () => {
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
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        loadTeacherCourses();
    }, []);

    const loadTeacherCourses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/videos/my-courses');
            setCourses(res.data);
        } catch (e) {
            showToast('Ошибка загрузки курсов', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleDemo = () => {
        const entering = !isDemoMode;
        setIsDemoMode(entering);
        setSelectedCourse(null);
        setAnalytics(null);
        setStudentSearch('');
        if (entering) showToast('Демо-режим включён — показаны учебные данные', 'info');
    };

    const handleSelectCourseDemo = (course: any) => {
        setSelectedCourse(course);
        setIsFetchingStats(true);
        setTimeout(() => {
            setAnalytics(DEMO_ANALYTICS[course.id]);
            setIsFetchingStats(false);
        }, 600);
    };

    const handleSelectCourse = async (course: any) => {
        if (isDemoMode) { handleSelectCourseDemo(course); return; }
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

    const displayCourses = isDemoMode ? DEMO_COURSES : courses;

    return (
        <div className="lumeo-layout">
            <AppHeader subtitle="Аналитика">
                <button
                    className="btn btn-ghost"
                    style={{ fontSize: 13, color: isDemoMode ? '#b5179e' : undefined, borderColor: isDemoMode ? 'rgba(181,23,158,0.4)' : undefined, background: isDemoMode ? 'rgba(181,23,158,0.08)' : undefined }}
                    onClick={handleToggleDemo}
                >
                    {isDemoMode ? '✕ Выйти из демо' : '✦ Демо-режим'}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate('/')}>Мои курсы</button>
            </AppHeader>

            {isDemoMode && (
                <div style={{ background: 'rgba(181,23,158,0.12)', borderBottom: '1px solid rgba(181,23,158,0.3)', padding: '8px 24px', fontSize: '13px', color: '#d966d6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✦</span> Демо-режим — отображаются учебные данные для презентации
                </div>
            )}

            <main className="analytics-main">

                {!selectedCourse ? (
                    <div className="fade-in" style={{ width: '100%' }}>
                        <h1 style={{ marginBottom: '10px', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: '800' }}>Центр аналитики</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Обзор успеваемости по всем вашим курсам</p>
                        <div className="course-showcase-grid">
                            {displayCourses.map(course => (
                                <div key={course.id} className="course-card-modern" onClick={() => handleSelectCourse(course)}>
                                    <div className="course-cover analytics-cover" style={{ background: 'linear-gradient(135deg, #111, #1a1a1a)', borderBottom: '1px solid #333' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', zIndex: 2 }}>{course.title}</h3>
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '15px', height: '40px', overflow: 'hidden' }}>{course.description || 'Нет описания'}</p>
                                        <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>📊 Глубокая аналитика</button>
                                    </div>
                                </div>
                            ))}
                            {!isDemoMode && courses.length === 0 && <p style={{ color: 'var(--text-muted)' }}>У вас пока нет курсов для анализа.</p>}
                        </div>
                    </div>
                ) : (
                    <div className="fade-in" style={{ width: '100%' }}>
                        <button className="btn btn-ghost" onClick={handleBackToDashboard} style={{ marginBottom: '20px', color: 'var(--text-muted)', padding: 0 }}>
                            ← Вернуться к списку курсов
                        </button>
                        
                        <div className="analytics-course-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h1 style={{ margin: '0 0 10px 0', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: '800' }}>{selectedCourse.title}</h1>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Панель управления курсом</p>
                            </div>

                            <div className="analytics-export-btns" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button className="btn btn-secondary" style={{ background: 'rgba(77, 255, 136, 0.05)', color: '#4dff88', borderColor: 'rgba(77, 255, 136, 0.2)', height: '45px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setExportModalConfig({ isOpen: true, type: 'detailed' })}>
                                    📥 Детальный .xlsx
                                </button>
                                <button className="btn btn-primary" style={{ height: '45px', padding: '0 25px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setExportModalConfig({ isOpen: true, type: 'gost' })}>
                                    {'🖨'} Ведомость (ГОСТ)
                                </button>
                            </div>
                        </div>

                        {isFetchingStats || !analytics ? (
                            <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Icons.Spinner size={18}/> Сбор данных по курсу...
                            </div>
                        ) : (
                            <>
                                {/* ВИДЖЕТЫ */}
                                <div className="analytics-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                    <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ fontSize: '30px', background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
                                        <div><div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Студентов на курсе</div><div style={{ fontSize: '28px', fontWeight: '800' }}>{analytics.totalStudents}</div></div>
                                    </div>
                                    <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ fontSize: '30px', background: 'rgba(var(--primary-rgb),0.1)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📈</div>
                                        <div><div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Средний прогресс</div><div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)' }}>{analytics.globalAvgProgress}%</div></div>
                                    </div>
                                    <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ fontSize: '30px', background: 'rgba(77,255,136,0.1)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</div>
                                        <div><div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Средний балл тестов</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#4dff88' }}>{analytics.globalAvgScore}%</div></div>
                                    </div>
                                </div>

                                {/* СЕТКА BENTO GRID */}
                                <div className="analytics-bento-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '30px', alignItems: 'start' }}>
                                    
                                    {/* ЛЕВАЯ КОЛОНКА: РЕЙТИНГ */}
                                    <div style={{ background: 'var(--bg-card)', padding: 'clamp(16px, 3vw, 30px)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                        <div className="analytics-ranking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', gap: '12px', flexWrap: 'wrap' }}>
                                            <div>
                                                <h2 style={{ fontSize: 'clamp(16px, 3vw, 22px)', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>🏆 Рейтинг потока</h2>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Общая успеваемость студентов</div>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>
                                                    🔍
                                                </span>
                                                <input
                                                    type="text" placeholder="Поиск студента..."
                                                    value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '10px 16px 10px 38px', borderRadius: '12px', fontSize: '13px', width: 'clamp(150px, 30vw, 220px)', outline: 'none', transition: 'all 0.2s' }}
                                                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
                                                    onBlur={e => { e.target.style.borderColor = '#222'; }}
                                                />
                                            </div>
                                        </div>

                                        <div className="analytics-rank-header" style={{ display: 'grid', gridTemplateColumns: '50px 2fr 1.5fr 1fr 30px', padding: '0 15px 12px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                                            <div style={{ textAlign: 'center' }}>Ранг</div>
                                            <div>Студент</div>
                                            <div className="analytics-rank-progress-col">Прогресс курса</div>
                                            <div style={{ textAlign: 'right' }}>Ср. балл</div>
                                            <div></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                                            {(() => {
                                                const filteredStudents = analytics.studentsProgress.filter((s: any) =>
                                                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                    s.email.toLowerCase().includes(studentSearch.toLowerCase())
                                                );

                                                if (analytics.studentsProgress.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>Нет студентов</div>;
                                                if (filteredStudents.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>По запросу ничего не найдено</div>;

                                                return filteredStudents.map((student: any) => {
                                                    const originalRank = analytics.studentsProgress.findIndex((s: any) => s.id === student.id);
                                                    const isTop1 = originalRank === 0;
                                                    const isTop2 = originalRank === 1;
                                                    const isTop3 = originalRank === 2;

                                                    let rankBadge = <span style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '15px' }}>{originalRank + 1}</span>;
                                                    if (isTop1) rankBadge = <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))' }}>🥇</span>;
                                                    if (isTop2) rankBadge = <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 10px rgba(192, 192, 192, 0.2))' }}>🥈</span>;
                                                    if (isTop3) rankBadge = <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 10px rgba(205, 127, 50, 0.2))' }}>🥉</span>;

                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className={`analytics-rank-row${isTop1 ? ' top1' : ''}`}
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
                                                                <div className="rank-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: isTop1 ? 'linear-gradient(135deg, #FFD700, #FDB931)' : '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: isTop1 ? '#000' : '#fff', flexShrink: 0 }}>
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                                                    <div className="rank-name" style={{ fontWeight: '600', color: isTop1 ? '#FFD700' : '#fff', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{student.name}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{student.email}</div>
                                                                </div>
                                                            </div>
                                                            <div className="analytics-rank-progress-col" style={{ paddingRight: '20px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{student.progressPercent}%</span>
                                                                </div>
                                                                <div style={{ width: '100%', height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${student.progressPercent}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }}></div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ color: student.avgScore >= 70 ? '#4dff88' : student.avgScore >= 50 ? '#ffd700' : '#ff4d4d', fontSize: '14px', fontWeight: 'bold' }}>
                                                                    {student.avgScore}%
                                                                </span>
                                                            </div>
                                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>›</div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* ПРАВАЯ КОЛОНКА: ВОРОНКА */}
                                    <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                        <h2 style={{ fontSize: '20px', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>📉 Воронка отсева</h2>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '25px' }}>Конверсия: Начали / Закончили</div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                                            {analytics.funnel && analytics.funnel.length > 0 ? (
                                                analytics.funnel.map((item: any, index: number) => (
                                                    <div 
                                                        key={item.id} 
                                                        style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                                        onClick={() => setDrillDownConfig({ id: item.realId, type: item.type })}
                                                        title="Посмотреть аналитику материала"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', alignItems: 'flex-start' }}>
                                                            <div style={{ color: 'var(--text-main)', fontWeight: '500', paddingRight: '10px', lineHeight: '1.4' }}>
                                                                {item.type === 'video' ? '🎬' : '📝'} {index + 1}. {item.title}
                                                            </div>
                                                            <div style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: '12px' }}>
                                                                <strong style={{ color: item.completionRate < 30 ? '#ff4d4d' : '#fff', fontSize: '14px' }}>{item.completionRate}%</strong> / {item.startedRate}%
                                                            </div>
                                                        </div>
                                                        <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '3px', position: 'relative' }}>
                                                            <div style={{ width: `${item.startedRate}%`, height: '100%', background: 'rgba(255, 255, 255, 0.1)', position: 'absolute', left: 0, top: 0, borderRadius: '3px' }}></div>
                                                            <div style={{ width: `${item.completionRate}%`, height: '100%', background: item.type === 'video' ? 'var(--primary)' : '#b5179e', position: 'absolute', left: 0, top: 0, borderRadius: '3px', zIndex: 2 }}></div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Нет материалов</div>
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
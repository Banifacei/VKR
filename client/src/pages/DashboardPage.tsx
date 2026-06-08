import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { Icons } from '../components/Icons';
import { AppHeader } from '../components/AppHeader';
import './DashboardPage.css';

interface ICourse      { id: number; title: string; instructor: string; coverImage?: string; }
interface IEnrollment  { courseId: number; status: string; course: ICourse }
interface IProgress    { courseId: number; percent: number }
interface IDeadline    { id: number; title: string; deadline: string; courseId: number; submission: any }
interface IBadge       { badgeType: string; label: string; icon: string; earnedAt: string }

export const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
    const [progress,    setProgress]    = useState<Record<number, number>>({});
    const [deadlines,   setDeadlines]   = useState<IDeadline[]>([]);
    const [badges,      setBadges]      = useState<IBadge[]>([]);
    const [certCount,   setCertCount]   = useState(0);
    const [loading,     setLoading]     = useState(true);
    const [calMonth,    setCalMonth]    = useState(() => new Date());

    useEffect(() => {
        const load = async () => {
            try {
                const [enrollRes, progressRes, hwRes, badgeRes, certRes] = await Promise.all([
                    api.get('/videos/my-enrollments'),
                    api.get('/videos/my-progress-all').catch(() => ({ data: [] })),
                    api.get('/hw/my').catch(() => ({ data: [] })),
                    api.get('/badges/my').catch(() => ({ data: [] })),
                    api.get('/certificates/my').catch(() => ({ data: [] })),
                ]);
                setEnrollments(enrollRes.data || []);
                const map: Record<number, number> = {};
                (progressRes.data as IProgress[]).forEach(p => { map[p.courseId] = p.percent; });
                setProgress(map);
                setDeadlines(hwRes.data || []);
                setBadges(badgeRes.data || []);
                setCertCount((certRes.data || []).length);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const active     = enrollments.filter(e => e.status === 'approved');
    const pending    = enrollments.filter(e => e.status === 'pending');
    const completed  = active.filter(e => (progress[e.courseId] ?? 0) >= 100);
    const inProgress = active.filter(e => (progress[e.courseId] ?? 0) < 100);

    const now = new Date();
    const upcoming = deadlines
        .filter(d => d.deadline && !d.submission && new Date(d.deadline) > now)
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 8);

    const overdue = deadlines
        .filter(d => d.deadline && !d.submission && new Date(d.deadline) <= now)
        .length;

    // Дни месяца с дедлайнами
    const deadlineDays = useMemo(() => {
        const set = new Set<number>();
        deadlines.forEach(d => {
            if (!d.deadline || d.submission) return;
            const date = new Date(d.deadline);
            if (date.getFullYear() === calMonth.getFullYear() && date.getMonth() === calMonth.getMonth())
                set.add(date.getDate());
        });
        return set;
    }, [deadlines, calMonth]);

    const greeting = () => {
        const h = now.getHours();
        if (h < 6)  return 'Доброй ночи';
        if (h < 12) return 'Доброе утро';
        if (h < 18) return 'Добрый день';
        return 'Добрый вечер';
    };

    return (
        <div className="lumeo-layout">
            <AppHeader />

            <main className="db-main">
                {/* Hero */}
                <div className="db-hero">
                    <div>
                        <h1 className="db-greeting">{greeting()}, {user?.firstName}!</h1>
                        <p className="db-sub">Ваш учебный прогресс — всё в одном месте</p>
                    </div>
                    <div className="db-stats-row">
                        <StatCard icon={<Icons.Monitor size={18}/>}  value={active.length}    label="Курсов" />
                        <StatCard icon={<Icons.Check size={18}/>}    value={completed.length} label="Завершено"  color="#00ff88" />
                        <StatCard icon={<Icons.Spinner size={18}/>}  value={inProgress.length} label="В процессе" color="#f09819" />
                        {certCount > 0 && <StatCard icon={<Icons.Trophy size={18}/>} value={certCount} label="Сертификатов" color="#a78bfa" />}
                        {pending.length > 0 && <StatCard icon={<Icons.Time size={18}/>} value={pending.length} label="Ожидает" color="#888"/>}
                    </div>
                </div>

                {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Icons.Spinner size={24}/> Загрузка...</div>}

                {!loading && (
                    <div className="db-layout">
                        {/* Левая колонка — курсы */}
                        <div className="db-courses-col">
                            {inProgress.length > 0 && (
                                <Section title="Продолжить обучение" icon={<Icons.Play size={16}/>}>
                                    <div className="db-grid">
                                        {inProgress.map(e => <CourseCard key={e.courseId} enrollment={e} pct={progress[e.courseId] ?? 0}/>)}
                                    </div>
                                </Section>
                            )}
                            {completed.length > 0 && (
                                <Section title="Завершённые курсы" icon={<Icons.Check size={16}/>}>
                                    <div className="db-grid">
                                        {completed.map(e => <CourseCard key={e.courseId} enrollment={e} pct={100} done/>)}
                                    </div>
                                </Section>
                            )}
                            {pending.length > 0 && (
                                <Section title="Ожидают одобрения" icon={<Icons.Time size={16}/>}>
                                    <div className="db-grid">
                                        {pending.map(e => <CourseCard key={e.courseId} enrollment={e} pct={0} pending/>)}
                                    </div>
                                </Section>
                            )}
                            {active.length === 0 && pending.length === 0 && (
                                <div className="db-empty">
                                    <Icons.Monitor size={40}/>
                                    <h3>Вы ещё не записаны ни на один курс</h3>
                                    <p>Найдите интересный курс на витрине</p>
                                    <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block' }}>
                                        Перейти к курсам
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Правая колонка — дедлайны, календарь, бейджи */}
                        <aside className="db-sidebar-col">

                            {/* Мини-календарь */}
                            <div className="db-widget">
                                <MiniCalendar month={calMonth} onMonthChange={setCalMonth} markedDays={deadlineDays}/>
                            </div>

                            {/* Дедлайны */}
                            {(upcoming.length > 0 || overdue > 0) && (
                                <div className="db-widget">
                                    <div className="db-widget-title">
                                        <Icons.Time size={15}/> Дедлайны
                                        {overdue > 0 && <span className="db-overdue-badge">{overdue} просрочено</span>}
                                    </div>
                                    <div className="db-deadlines-list">
                                        {upcoming.map(d => {
                                            const dl = new Date(d.deadline);
                                            const diffDays = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
                                            const urgent = diffDays <= 2;
                                            return (
                                                <div key={d.id} className={`db-deadline-item ${urgent ? 'urgent' : ''}`}
                                                     onClick={() => navigate('/assignments')}>
                                                    <div className="db-deadline-dot" style={{ background: urgent ? '#ef4444' : '#f59e0b' }}/>
                                                    <div className="db-deadline-body">
                                                        <span className="db-deadline-title">{d.title}</span>
                                                        <span className="db-deadline-date" style={{ color: urgent ? '#ef4444' : 'var(--text-muted)' }}>
                                                            {urgent
                                                                ? diffDays === 0 ? 'Сегодня!' : `${diffDays} дн.`
                                                                : dl.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button className="db-widget-link" onClick={() => navigate('/assignments')}>
                                        Все задания →
                                    </button>
                                </div>
                            )}

                            {/* Бейджи */}
                            {badges.length > 0 && (
                                <div className="db-widget">
                                    <div className="db-widget-title"><Icons.Trophy size={15}/> Достижения</div>
                                    <div className="db-badges-row">
                                        {badges.map(b => (
                                            <div key={b.badgeType} className="db-badge-chip" title={b.label}>
                                                <span className="db-badge-icon">{b.icon}</span>
                                                <span className="db-badge-label">{b.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {certCount > 0 && (
                                        <button className="db-widget-link" style={{ marginTop: 8 }} onClick={() => navigate('/certificates')}>
                                            Мои сертификаты ({certCount}) →
                                        </button>
                                    )}
                                </div>
                            )}

                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
};

// ── MiniCalendar ───────────────────────────────────────────────────────────────

const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const MiniCalendar = ({ month, onMonthChange, markedDays }: {
    month: Date; onMonthChange: (d: Date) => void; markedDays: Set<number>
}) => {
    const today = new Date();
    const year = month.getFullYear();
    const mon  = month.getMonth();
    const firstDay = new Date(year, mon, 1);
    // ISO week: Monday=0
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const isToday = (d: number) => today.getDate() === d && today.getMonth() === mon && today.getFullYear() === year;

    return (
        <div className="db-calendar">
            <div className="db-cal-header">
                <button className="db-cal-nav" onClick={() => onMonthChange(new Date(year, mon - 1, 1))}>‹</button>
                <span className="db-cal-title">{MONTHS[mon]} {year}</span>
                <button className="db-cal-nav" onClick={() => onMonthChange(new Date(year, mon + 1, 1))}>›</button>
            </div>
            <div className="db-cal-grid">
                {DAYS.map(d => <div key={d} className="db-cal-day-name">{d}</div>)}
                {cells.map((d, i) => (
                    <div key={i} className={`db-cal-cell ${d === null ? 'empty' : ''} ${d && isToday(d) ? 'today' : ''} ${d && markedDays.has(d) ? 'marked' : ''}`}>
                        {d}
                        {d && markedDays.has(d) && <div className="db-cal-dot"/>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const Section = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
    <section className="db-section">
        <h2 className="db-section-title">{icon} {title}</h2>
        {children}
    </section>
);

const StatCard = ({ icon, value, label, color = 'var(--primary)' }: { icon: React.ReactNode; value: number; label: string; color?: string }) => (
    <div className="db-stat">
        <div className="db-stat-icon" style={{ color }}>{icon}</div>
        <div className="db-stat-value" style={{ color }}>{value}</div>
        <div className="db-stat-label">{label}</div>
    </div>
);

const CourseCard = ({ enrollment: e, pct, done, pending }: { enrollment: IEnrollment; pct: number; done?: boolean; pending?: boolean }) => {
    const navigate = useNavigate();
    return (
        <div className={`db-course-card ${done ? 'done' : ''} ${pending ? 'pending' : ''}`}
             onClick={() => !pending && navigate(`/course/${e.courseId}`)}>
            <div className="db-course-cover">
                {e.course?.coverImage
                    ? <img src={e.course.coverImage} alt={e.course.title}/>
                    : <div className="db-course-cover-placeholder"><Icons.Monitor size={28}/></div>
                }
                {done    && <div className="db-done-badge"><Icons.Check size={12}/> Завершён</div>}
                {pending && <div className="db-pending-badge"><Icons.Time size={12}/> Ожидание</div>}
            </div>
            <div className="db-course-info">
                <h4>{e.course?.title}</h4>
                <p>{e.course?.instructor}</p>
                {!pending && <div className="db-progress-bar"><div className="db-progress-fill" style={{ width: `${pct}%` }}/></div>}
                {!pending && <div className="db-pct">{pct}%</div>}
            </div>
        </div>
    );
};

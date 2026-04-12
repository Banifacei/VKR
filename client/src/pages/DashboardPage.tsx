import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { Icons } from '../components/Icons';
import { AppHeader } from '../components/AppHeader';
import './DashboardPage.css';
import '../components/GlobalSearch.css';

interface ICourse {
    id: number; title: string; instructor: string;
    description?: string; coverImage?: string;
}
interface IEnrollment { courseId: number; status: string; course: ICourse }
interface IProgress   { courseId: number; percent: number }

export const DashboardPage = () => {
    const { user } = useAuth();

    const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
    const [progress, setProgress]       = useState<Record<number, number>>({});
    const [loading, setLoading]         = useState(true);



    useEffect(() => {
        const load = async () => {
            try {
                const [enrollRes, progressRes] = await Promise.all([
                    api.get('/videos/my-enrollments'),
                    api.get('/videos/my-progress-all').catch(() => ({ data: [] })),
                ]);
                setEnrollments(enrollRes.data || []);
                const map: Record<number, number> = {};
                (progressRes.data as IProgress[]).forEach(p => { map[p.courseId] = p.percent; });
                setProgress(map);
            } catch {
                // fallback — просто покажем курсы без прогресса
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const active    = enrollments.filter(e => e.status === 'approved');
    const pending   = enrollments.filter(e => e.status === 'pending');
    const completed = active.filter(e => (progress[e.courseId] ?? 0) >= 100);
    const inProgress = active.filter(e => (progress[e.courseId] ?? 0) < 100);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 6)  return 'Доброй ночи';
        if (h < 12) return 'Доброе утро';
        if (h < 18) return 'Добрый день';
        return 'Добрый вечер';
    };

    return (
        <div className="lumeo-layout">
            <AppHeader />

            <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,48px) clamp(16px,3vw,24px)' }}>

                {/* Приветствие */}
                <div className="db-hero">
                    <div>
                        <h1 className="db-greeting">{greeting()}, {user?.firstName}!</h1>
                        <p className="db-sub">Ваш учебный прогресс — всё в одном месте</p>
                    </div>
                    <div className="db-stats-row">
                        <StatCard icon={<Icons.Monitor size={18} />} value={active.length}     label="Курсов" />
                        <StatCard icon={<Icons.Check   size={18} />} value={completed.length}  label="Завершено" color="#00ff88" />
                        <StatCard icon={<Icons.Spinner size={18} />} value={inProgress.length} label="В процессе" color="#f09819" />
                        {pending.length > 0 && <StatCard icon={<Icons.Time size={18} />} value={pending.length} label="Ожидает" color="#888" />}
                    </div>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
                        <Icons.Spinner size={24} /> Загрузка...
                    </div>
                )}

                {/* В процессе */}
                {inProgress.length > 0 && (
                    <Section title="Продолжить обучение" icon={<Icons.Play size={16} />}>
                        <div className="db-grid">
                            {inProgress.map(e => (
                                <CourseCard key={e.courseId} enrollment={e} pct={progress[e.courseId] ?? 0} />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Завершённые */}
                {completed.length > 0 && (
                    <Section title="Завершённые курсы" icon={<Icons.Check size={16} />}>
                        <div className="db-grid">
                            {completed.map(e => (
                                <CourseCard key={e.courseId} enrollment={e} pct={100} done />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Ожидают одобрения */}
                {pending.length > 0 && (
                    <Section title="Ожидают одобрения" icon={<Icons.Time size={16} />}>
                        <div className="db-grid">
                            {pending.map(e => (
                                <CourseCard key={e.courseId} enrollment={e} pct={0} pending />
                            ))}
                        </div>
                    </Section>
                )}

                {!loading && active.length === 0 && pending.length === 0 && (
                    <div className="db-empty">
                        <Icons.Monitor size={40} />
                        <h3>Вы ещё не записаны ни на один курс</h3>
                        <p>Найдите интересный курс на витрине</p>
                        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block' }}>
                            Перейти к курсам
                        </Link>
                    </div>
                )}
            </main>
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

const StatCard = ({ icon, value, label, color = 'var(--primary,#00ff88)' }: { icon: React.ReactNode; value: number; label: string; color?: string }) => (
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
                    ? <img src={e.course.coverImage} alt={e.course.title} />
                    : <div className="db-course-cover-placeholder"><Icons.Monitor size={28} /></div>
                }
                {done && <div className="db-done-badge"><Icons.Check size={12} /> Завершён</div>}
                {pending && <div className="db-pending-badge"><Icons.Time size={12} /> Ожидание</div>}
            </div>
            <div className="db-course-info">
                <h4>{e.course?.title}</h4>
                <p>{e.course?.instructor}</p>
                {!pending && (
                    <div className="db-progress-bar">
                        <div className="db-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                )}
                {!pending && <div className="db-pct">{pct}%</div>}
            </div>
        </div>
    );
};

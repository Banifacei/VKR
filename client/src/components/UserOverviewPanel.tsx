import { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { Icons } from './Icons';
import { useAuth } from '../context/AuthContext';

interface CourseRow {
    id: number; title: string; instructor: string; status: string;
    progress: number; totalVideos: number; completedVideos: number;
    totalTests: number; completedTests: number;
}
interface SimpleCourse { id: number; title: string; instructor: string; }

interface Overview {
    user: {
        id: number; firstName: string; lastName: string; email: string;
        role: string; avatarUrl?: string; createdAt: string;
        status?: string; banReason?: string | null; lastLogin?: string | null;
    };
    viewerRole: string;
    mode: 'student_profile' | 'teacher_profile';
    courses?: CourseRow[];
    ownedCourses?: SimpleCourse[];
    collabCourses?: SimpleCourse[];
}

interface Props {
    userId: number | null;
    onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = { student: 'Студент', teacher: 'Преподаватель', admin: 'Администратор' };
const ROLE_COLORS: Record<string, string> = { student: '#4a9eff', teacher: '#ffd700', admin: '#ff4d4d' };
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    approved: { label: 'Зачислен', color: '#4dff88' },
    pending:  { label: 'Ожидает',  color: '#f0c040' },
    rejected: { label: 'Отклонён', color: '#ff4b4b' },
};

export const UserOverviewPanel = ({ userId, onClose }: Props) => {
    const { user: viewer } = useAuth();
    const [data, setData]         = useState<Overview | null>(null);
    const [loading, setLoading]   = useState(false);
    const [banReason, setBanReason] = useState('');
    const [showBanForm, setShowBanForm] = useState(false);
    const [banning, setBanning]   = useState(false);

    const [neverLoggedIn, setNeverLoggedIn] = useState(false);

    const load = () => {
        if (!userId) return;
        setData(null);
        setNeverLoggedIn(false);
        setLoading(true);
        setShowBanForm(false);
        setBanReason('');
        api.get(`/users/${userId}/overview`)
            .then(r => setData(r.data))
            .catch(err => {
                if (err?.response?.status === 500) setNeverLoggedIn(true);
                setData(null);
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, [userId]);

    const handleBan = async () => {
        if (!data) return;
        setBanning(true);
        try {
            await api.post(`/users/${data.user.id}/ban`, { reason: banReason });
            setData(d => d ? { ...d, user: { ...d.user, status: 'banned', banReason } } : d);
            setShowBanForm(false);
        } catch { /* ignore */ }
        finally { setBanning(false); }
    };

    const handleUnban = async () => {
        if (!data) return;
        try {
            await api.post(`/users/${data.user.id}/unban`);
            setData(d => d ? { ...d, user: { ...d.user, status: 'active', banReason: null } } : d);
        } catch { /* ignore */ }
    };

    if (!userId) return null;

    const u = data?.user;
    const initials = u ? `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase() : '?';
    const joinDate  = u ? new Date(u.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const lastLogin = u?.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    const roleColor = ROLE_COLORS[u?.role ?? ''] ?? '#888';
    const isBanned  = u?.status === 'banned';
    const isAdmin   = viewer?.role === 'admin';

    const panelTitle = !data ? 'Профиль' :
        data.mode === 'teacher_profile' ? 'Профиль преподавателя' : 'Профиль студента';

    return (
        <>
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.5)' }}
                onClick={e => { e.stopPropagation(); onClose(); }}
            />
            <div
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: 'clamp(320px, 40vw, 480px)',
                    background: '#111', borderLeft: '1px solid #2a2a2a',
                    zIndex: 10002, display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.22s ease', overflowY: 'auto',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Заголовок */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #1e1e1e' }}>
                    <span style={{ color: '#888', fontSize: 13 }}>{panelTitle}</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4, display: 'flex' }}>
                        <Icons.Close size={18} />
                    </button>
                </div>

                {/* Скелетон */}
                {loading && (
                    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div className="skeleton" style={{ width: '60%', height: 18, borderRadius: 6 }} />
                                <div className="skeleton" style={{ width: '40%', height: 13, borderRadius: 6 }} />
                            </div>
                        </div>
                        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ width: '100%', height: 72, borderRadius: 10 }} />)}
                    </div>
                )}

                {/* Данные */}
                {!loading && data && u && (
                    <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Аватар + инфо */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2a2a2a', flexShrink: 0 }} />
                            ) : (
                                <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: roleColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: roleColor }}>
                                    {initials}
                                </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{u.firstName} {u.lastName}</div>
                                <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{u.email}</div>
                                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: roleColor + '22', color: roleColor, border: `1px solid ${roleColor}44` }}>
                                        {ROLE_LABELS[u.role] ?? u.role}
                                    </span>
                                    {isAdmin && u.status && (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: isBanned ? '#ff4d4d22' : '#4dff8822', color: isBanned ? '#ff4d4d' : '#4dff88', border: `1px solid ${isBanned ? '#ff4d4d44' : '#4dff8844'}` }}>
                                            {isBanned ? 'Заблокирован' : 'Активен'}
                                        </span>
                                    )}
                                    <span style={{ fontSize: 11, color: '#555' }}>с {joinDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Причина бана (только для админа) */}
                        {isAdmin && isBanned && u.banReason && (
                            <div style={{ background: '#ff4d4d11', border: '1px solid #ff4d4d33', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ fontSize: 11, color: '#ff4d4d', marginBottom: 4, fontWeight: 600 }}>Причина блокировки</div>
                                <div style={{ fontSize: 13, color: '#ccc' }}>{u.banReason}</div>
                            </div>
                        )}

                        {/* Последний вход (только для админа) */}
                        {isAdmin && lastLogin && (
                            <div style={{ fontSize: 12, color: '#555' }}>Последний вход: {lastLogin}</div>
                        )}

                        {/* ── Режим СТУДЕНТА: прогресс по курсам ── */}
                        {data.mode === 'student_profile' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        { label: 'Курсов',          value: data.courses?.length ?? 0 },
                                        { label: 'Завершено',       value: data.courses?.filter(c => c.progress >= 100).length ?? 0 },
                                        { label: 'Видео пройдено',  value: data.courses?.reduce((s, c) => s + c.completedVideos, 0) ?? 0 },
                                        { label: 'Тестов сдано',    value: data.courses?.reduce((s, c) => s + c.completedTests, 0) ?? 0 },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
                                            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</div>
                                        </div>
                                    ))}
                                </div>

                                {data.courses && data.courses.length > 0 ? (
                                    <div>
                                        <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                            {viewer?.role === 'teacher' ? 'Ваши курсы' : 'Курсы'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {data.courses.map(c => {
                                                const st = STATUS_LABELS[c.status] ?? { label: c.status, color: '#888' };
                                                return (
                                                    <div key={c.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{c.title}</span>
                                                            <span style={{ fontSize: 11, color: st.color, flexShrink: 0, marginTop: 2 }}>{st.label}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 5 }}>
                                                            <span>{c.completedVideos}/{c.totalVideos} видео · {c.completedTests}/{c.totalTests} тестов</span>
                                                            <span style={{ color: c.progress >= 100 ? '#4dff88' : 'var(--primary)', fontWeight: 700 }}>{c.progress}%</span>
                                                        </div>
                                                        <div style={{ background: '#111', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                                                            <div style={{ width: `${c.progress}%`, height: '100%', background: c.progress >= 100 ? '#4dff88' : 'var(--primary)', transition: 'width 0.6s ease' }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#555', fontSize: 14, padding: '20px 0' }}>
                                        {viewer?.role === 'teacher' ? 'Студент не записан ни на один ваш курс' : 'Нет зачислений на курсы'}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Режим ПРЕПОДАВАТЕЛЯ: owned + collab курсы ── */}
                        {data.mode === 'teacher_profile' && (
                            <>
                                {(data.ownedCourses?.length ?? 0) > 0 && (
                                    <div>
                                        <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Авторские курсы</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {data.ownedCourses!.map(c => (
                                                <div key={c.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#fff', fontWeight: 500 }}>
                                                    {c.title}
                                                    {c.instructor && <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{c.instructor}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(data.collabCourses?.length ?? 0) > 0 && (
                                    <div>
                                        <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Соавтор в курсах</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {data.collabCourses!.map(c => (
                                                <div key={c.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#ccc' }}>
                                                    {c.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {!(data.ownedCourses?.length) && !(data.collabCourses?.length) && (
                                    <div style={{ textAlign: 'center', color: '#555', fontSize: 14, padding: '20px 0' }}>Нет курсов</div>
                                )}
                            </>
                        )}

                        {/* ── Кнопки бана/разбана (только для админа, не для самого себя) ── */}
                        {isAdmin && viewer?.id !== u.id && (
                            <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16, marginTop: 4 }}>
                                {!isBanned ? (
                                    <>
                                        {!showBanForm ? (
                                            <button
                                                onClick={() => setShowBanForm(true)}
                                                style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#ff4d4d11', border: '1px solid #ff4d4d44', color: '#ff4d4d', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                            >
                                                Заблокировать
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <textarea
                                                    placeholder="Причина блокировки (необязательно)"
                                                    value={banReason}
                                                    onChange={e => setBanReason(e.target.value)}
                                                    rows={3}
                                                    style={{ width: '100%', borderRadius: 10, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 12px', fontSize: 13, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                                />
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => setShowBanForm(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'transparent', border: '1px solid #333', color: '#888', cursor: 'pointer', fontSize: 13 }}>
                                                        Отмена
                                                    </button>
                                                    <button onClick={handleBan} disabled={banning} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#ff4d4d', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: banning ? 0.6 : 1 }}>
                                                        {banning ? 'Блокировка...' : 'Подтвердить'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={handleUnban}
                                        style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#4dff8811', border: '1px solid #4dff8844', color: '#4dff88', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                    >
                                        Разблокировать
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {!loading && !data && (
                    <div style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 14 }}>
                        {neverLoggedIn
                            ? 'Этот пользователь ещё не заходил на платформу'
                            : 'Не удалось загрузить данные'}
                    </div>
                )}
            </div>
        </>
    );
};

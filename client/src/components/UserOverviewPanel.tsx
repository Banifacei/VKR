import { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { Icons } from './Icons';

interface CourseRow {
    id: number;
    title: string;
    instructor: string;
    status: string;
    progress: number;
    totalVideos: number;
    completedVideos: number;
    totalTests: number;
    completedTests: number;
}

interface Overview {
    user: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        avatarUrl?: string;
        createdAt: string;
    };
    courses: CourseRow[];
}

interface Props {
    userId: number | null;
    onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
    student: 'Студент',
    teacher: 'Преподаватель',
    admin: 'Администратор',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    approved: { label: 'Зачислен',  color: '#4dff88' },
    pending:  { label: 'Ожидает',   color: '#f0c040' },
    rejected: { label: 'Отклонён',  color: '#ff4b4b' },
};

export const UserOverviewPanel = ({ userId, onClose }: Props) => {
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setData(null);
        setLoading(true);
        api.get(`/users/${userId}/overview`)
            .then(r => setData(r.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [userId]);

    if (!userId) return null;

    const u = data?.user;
    const initials = u ? `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase() : '?';
    const joinDate = u ? new Date(u.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    return (
        <>
            {/* затемнение поверх поиска */}
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 10001,
                    background: 'rgba(0,0,0,0.5)',
                }}
                onClick={onClose}
            />

            {/* панель */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 'clamp(320px, 40vw, 480px)',
                background: '#111',
                borderLeft: '1px solid #2a2a2a',
                zIndex: 10002,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.22s ease',
                overflowY: 'auto',
            }}>
                {/* Заголовок */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #1e1e1e' }}>
                    <span style={{ color: '#888', fontSize: 13 }}>Профиль студента</span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4, display: 'flex' }}
                    >
                        <Icons.Close size={18} />
                    </button>
                </div>

                {loading && (
                    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div className="skeleton" style={{ width: '60%', height: 18, borderRadius: 6 }} />
                                <div className="skeleton" style={{ width: '40%', height: 13, borderRadius: 6 }} />
                            </div>
                        </div>
                        {[1,2,3].map(i => (
                            <div key={i} className="skeleton" style={{ width: '100%', height: 72, borderRadius: 10 }} />
                        ))}
                    </div>
                )}

                {!loading && data && (
                    <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Аватар + инфо */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            {u!.avatarUrl ? (
                                <img
                                    src={u!.avatarUrl}
                                    alt="avatar"
                                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2a2a2a', flexShrink: 0 }}
                                />
                            ) : (
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                                    background: 'var(--primary)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff',
                                }}>
                                    {initials}
                                </div>
                            )}
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                                    {u!.firstName} {u!.lastName}
                                </div>
                                <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{u!.email}</div>
                                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '2px 8px', color: '#ccc' }}>
                                        {ROLE_LABELS[u!.role] ?? u!.role}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#555' }}>с {joinDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Статистика */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                { label: 'Курсов',     value: data.courses.length },
                                { label: 'Завершено',  value: data.courses.filter(c => c.progress >= 100).length },
                                { label: 'Видео пройдено', value: data.courses.reduce((s, c) => s + c.completedVideos, 0) },
                                { label: 'Тестов сдано',   value: data.courses.reduce((s, c) => s + c.completedTests, 0) },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '12px 14px' }}>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
                                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Курсы */}
                        {data.courses.length > 0 ? (
                            <div>
                                <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Курсы</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {data.courses.map(c => {
                                        const st = STATUS_LABELS[c.status] ?? { label: c.status, color: '#888' };
                                        return (
                                            <div key={c.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{c.title}</span>
                                                    <span style={{ fontSize: 11, color: st.color, flexShrink: 0, marginTop: 2 }}>{st.label}</span>
                                                </div>
                                                {/* Прогресс-бар */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 5 }}>
                                                    <span>{c.completedVideos}/{c.totalVideos} видео · {c.completedTests}/{c.totalTests} тестов</span>
                                                    <span style={{ color: c.progress >= 100 ? '#4dff88' : 'var(--primary)', fontWeight: 700 }}>{c.progress}%</span>
                                                </div>
                                                <div style={{ background: '#111', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${c.progress}%`,
                                                        height: '100%',
                                                        background: c.progress >= 100 ? '#4dff88' : 'var(--primary)',
                                                        transition: 'width 0.6s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#555', fontSize: 14, padding: '20px 0' }}>
                                Нет зачислений на курсы
                            </div>
                        )}
                    </div>
                )}

                {!loading && !data && (
                    <div style={{ padding: 32, textAlign: 'center', color: '#555' }}>Не удалось загрузить данные</div>
                )}
            </div>
        </>
    );
};

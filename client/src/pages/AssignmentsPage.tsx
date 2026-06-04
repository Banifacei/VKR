import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { Icons } from '../components/Icons';
import '../components/Homework/Homework.css';

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

const isPast = (iso: string) => new Date() > new Date(iso);

const statusBadge = (sub: any) => {
    if (!sub) return { label: 'Не сдано', color: 'var(--text-muted)', bg: 'var(--bg-input)' };
    if (sub.status === 'graded') return { label: 'Проверено', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
    if (sub.isLate) return { label: 'Сдано с опозданием', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'Сдано', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
};

// ─── Компонент панели проверки (препод) ──────────────────────────────────────

const GradePanel: React.FC<{ sub: any; maxScore: number; onGraded: (updated: any) => void }> = ({ sub, maxScore, onGraded }) => {
    const { showToast } = useToast();
    const [grade, setGrade] = useState<string>(sub.grade !== null ? String(sub.grade) : '');
    const [comment, setComment] = useState(sub.teacherComment || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await api.patch(`/hw/submissions/${sub.id}/grade`, {
                grade: grade !== '' ? Number(grade) : undefined,
                teacherComment: comment || undefined,
            });
            onGraded(r.data);
            showToast('Оценка сохранена', 'success');
        } catch {
            showToast('Ошибка', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', padding: '14px', background: 'var(--bg-input)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Оценка (из {maxScore})</label>
                    <input
                        type="number" min={0} max={maxScore}
                        className="deck-input"
                        style={{ background: 'var(--bg-card)', width: '90px', fontSize: '14px' }}
                        value={grade}
                        onChange={e => setGrade(e.target.value)}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Комментарий</label>
                    <input
                        className="deck-input"
                        style={{ background: 'var(--bg-card)', width: '100%', fontSize: '13px' }}
                        placeholder="Что сделано не так..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleSave} disabled={saving}>
                    {saving ? '...' : 'Сохранить'}
                </button>
            </div>
        </div>
    );
};

// ─── Вид препода/admin ────────────────────────────────────────────────────────

const TeacherView: React.FC = () => {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'ungraded' | 'late'>('all');
    const { showToast } = useToast();

    useEffect(() => {
        api.get('/hw/teacher/all').then(r => setAssignments(r.data)).catch(() => {});
    }, []);

    const selectAssignment = async (a: any) => {
        setSelected(a);
        setLoadingSubs(true);
        try {
            const r = await api.get(`/hw/${a.id}/submissions`);
            setSubmissions(r.data);
        } catch {
            showToast('Ошибка загрузки сдач', 'error');
        } finally {
            setLoadingSubs(false);
        }
    };

    const filtered = submissions.filter(s => {
        if (filterStatus === 'ungraded') return s.status !== 'graded';
        if (filterStatus === 'late') return s.isLate;
        return true;
    });

    const ungradedCount = (a: any) => (a.submissions || []).filter((s: any) => s.status !== 'graded').length;

    return (
        <div className="assignments-layout" style={{ gridTemplateColumns: selected ? undefined : '1fr' }}>
            {/* Список заданий */}
            <div className="assignments-list-panel" style={{ display: selected ? undefined : 'flex' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', color: 'var(--text-main)' }}>Все задания</div>
                {assignments.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>
                        Нет созданных заданий
                    </div>
                )}
                {assignments.map(a => {
                    const ug = ungradedCount(a);
                    const past = isPast(a.deadline);
                    return (
                        <div
                            key={a.id}
                            onClick={() => selectAssignment(a)}
                            className={`hw-assignment-card${selected?.id === a.id ? ' active' : ''}`}
                            style={{ padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s', border: '1px solid var(--border-color)' }}
                        >
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</div>
                            <div style={{ fontSize: '12px', color: past ? '#ef4444' : 'var(--text-muted)', marginBottom: '6px' }}>
                                до {fmtDate(a.deadline)}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                                    {(a.submissions || []).length} сдач
                                </span>
                                {ug > 0 && (
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700 }}>
                                        {ug} не проверено
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Сдачи */}
            {selected && (
                <div className="assignments-detail-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ padding: '6px 10px' }}>←</button>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '16px' }}>{selected.title}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>до {fmtDate(selected.deadline)} · макс. {selected.maxScore} баллов</div>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="hw-filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {(['all', 'ungraded', 'late'] as const).map(f => (
                            <button key={f} onClick={() => setFilterStatus(f)}
                                style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: '1px solid',
                                    background: filterStatus === f ? 'rgba(124,58,237,0.15)' : 'var(--bg-input)',
                                    borderColor: filterStatus === f ? 'rgba(124,58,237,0.4)' : 'var(--border-color)',
                                    color: filterStatus === f ? '#a78bfa' : 'var(--text-muted)',
                                }}>
                                {f === 'all' ? 'Все' : f === 'ungraded' ? 'Не проверено' : 'С опозданием'}
                            </button>
                        ))}
                    </div>

                    {loadingSubs && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Загрузка...</div>}

                    {!loadingSubs && filtered.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Нет сдач</div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filtered.map(sub => {
                            const badge = statusBadge(sub);
                            return (
                                <SubmissionCard
                                    key={sub.id}
                                    sub={sub}
                                    badge={badge}
                                    maxScore={selected.maxScore}
                                    onGraded={updated => setSubmissions(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const SubmissionCard: React.FC<{ sub: any; badge: any; maxScore: number; onGraded: (u: any) => void }> = ({ sub, badge, maxScore, onGraded }) => {
    const [open, setOpen] = useState(false);
    const student = sub.student;

    return (
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div onClick={() => setOpen(o => !o)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {student?.avatarUrl
                        ? <img src={student.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <Icons.User size={16} color="#a78bfa" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                        {student?.firstName} {student?.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmt(sub.submittedAt)}</div>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '8px', background: badge.bg, color: badge.color, fontWeight: 600, flexShrink: 0 }}>
                    {badge.label}
                </span>
                {sub.grade !== null && (
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#22c55e', flexShrink: 0 }}>{sub.grade}/{maxScore}</span>
                )}
                <Icons.ChevronDown size={14} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
            </div>

            {open && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                    {sub.files?.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Файлы:</div>
                            {sub.files.map((f: any, i: number) => (
                                <a key={i} href={f.path} target="_blank" rel="noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--primary)', marginBottom: '4px' }}>
                                    <Icons.File size={13} /> {f.name}
                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({(f.size / 1024 / 1024).toFixed(1)} МБ)</span>
                                </a>
                            ))}
                        </div>
                    )}
                    {sub.textAnswer && (
                        <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                            {sub.textAnswer}
                        </div>
                    )}
                    <GradePanel sub={sub} maxScore={maxScore} onGraded={onGraded} />
                </div>
            )}
        </div>
    );
};

// ─── Вид студента ─────────────────────────────────────────────────────────────

const StudentView: React.FC = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/hw/my').then(r => setAssignments(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const now = new Date();
    const upcoming = assignments.filter(a => new Date(a.deadline) >= now);
    const past = assignments.filter(a => new Date(a.deadline) < now);

    const renderGroup = (list: any[], title: string) => list.length === 0 ? null : (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '10px' }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {list.map(a => {
                    const badge = statusBadge(a.submission);
                    const past = isPast(a.deadline);
                    return (
                        <div key={a.id} style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icons.FileText size={17} color="#a78bfa" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</div>
                                    <div style={{ fontSize: '12px', color: past ? '#ef4444' : 'var(--text-muted)' }}>
                                        Срок: {fmtDate(a.deadline)}
                                    </div>
                                    {a.description && (
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>{a.description}</div>
                                    )}
                                    {/* Оценка */}
                                    {a.submission?.status === 'graded' && a.showFeedbackToStudent !== false && (
                                        <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, fontSize: '16px', color: '#22c55e' }}>{a.submission.grade}/{a.maxScore}</span>
                                            {a.submission.teacherComment && (
                                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.submission.teacherComment}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '8px', background: badge.bg, color: badge.color, fontWeight: 600, flexShrink: 0 }}>
                                    {badge.label}
                                </span>
                            </div>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ fontSize: '13px' }}
                                    onClick={() => navigate(`/course/${a.courseId}`)}
                                >
                                    Перейти к курсу
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>;

    if (assignments.length === 0) return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icons.FileText size={40} color="var(--text-muted)" />
            <div style={{ marginTop: '16px', fontSize: '16px', fontWeight: 600 }}>Нет заданий</div>
            <div style={{ fontSize: '14px', marginTop: '6px' }}>Когда преподаватель создаст домашнее задание — оно появится здесь</div>
        </div>
    );

    return (
        <div style={{ padding: '20px', maxWidth: '720px', margin: '0 auto' }}>
            {renderGroup(upcoming, 'Активные')}
            {renderGroup(past, 'Завершённые')}
        </div>
    );
};

// ─── Страница ─────────────────────────────────────────────────────────────────

export const AssignmentsPage: React.FC = () => {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    return (
        <div className="lumeo-layout">
            <AppHeader subtitle="Задания" />
            <main style={{ flex: 1, overflow: 'hidden' }}>
                {isTeacher ? <TeacherView /> : <StudentView />}
            </main>
        </div>
    );
};

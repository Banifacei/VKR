import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { Icons } from '../components/Icons';
import '../components/Homework/Homework.css';

const CodeHistoryReplay = lazy(() =>
    import('../components/CodeEditor/CodeEditorPanel').then(m => ({ default: m.CodeHistoryReplay }))
);

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

const isPast = (iso: string) => new Date() > new Date(iso);

const statusBadge = (sub: any) => {
    if (!sub) return { label: 'Не сдано', color: 'var(--text-muted)', bg: 'var(--bg-input)', Icon: Icons.Time };
    if (sub.status === 'graded') return { label: 'Проверено', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: Icons.CheckCircle };
    if (sub.isLate) return { label: 'Сдано с опозданием', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: Icons.AlertTriangle };
    return { label: 'Сдано', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', Icon: Icons.Upload };
};

// Визуальный язык по типу задания — та же палитра, что и на карточках курса
const TYPE_META: Record<string, { Icon: React.FC<any>; gradient: string; accent: string; label: string }> = {
    standalone: { Icon: Icons.FileText, gradient: 'linear-gradient(135deg, #7c3aed, #b5179e)', accent: '#a78bfa', label: 'Задание' },
    code: { Icon: Icons.Code, gradient: 'linear-gradient(135deg, #0891b2, #6366f1)', accent: '#22d3ee', label: 'Код-задание' },
};
const typeMeta = (type: string) => TYPE_META[type] || TYPE_META.standalone;

const Badge: React.FC<{ label: string; color: string; bg: string; Icon?: React.FC<any> }> = ({ label, color, bg, Icon }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: bg, color, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
        {Icon && <Icon size={11} color={color} />}
        {label}
    </span>
);

const SectionLabel: React.FC<{ children: React.ReactNode; Icon?: React.FC<any>; color?: string }> = ({ children, Icon, color = 'var(--text-muted)' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '8px' }}>
        {Icon && <Icon size={12} color={color} />}
        {children}
    </div>
);

// ─── Компонент панели проверки (препод) ──────────────────────────────────────

const GradePanel: React.FC<{ sub: any; maxScore: number; rubric?: { id: string; label: string; points: number }[]; onGraded: (updated: any) => void }> = ({ sub, maxScore, rubric, onGraded }) => {
    const { showToast } = useToast();
    const [grade, setGrade] = useState<string>(sub.grade !== null ? String(sub.grade) : '');
    const [comment, setComment] = useState(sub.teacherComment || '');
    const [saving, setSaving] = useState(false);
    const [checked, setChecked] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        (sub.rubricChecks || []).forEach((c: any) => { initial[c.id] = c.checked; });
        return initial;
    });

    const toggleCriterion = (id: string) => {
        const next = { ...checked, [id]: !checked[id] };
        setChecked(next);
        const sum = (rubric || []).reduce((s, c) => s + (next[c.id] ? c.points : 0), 0);
        setGrade(String(sum));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await api.patch(`/hw/submissions/${sub.id}/grade`, {
                grade: grade !== '' ? Number(grade) : undefined,
                teacherComment: comment || undefined,
                rubricChecks: rubric?.length ? rubric.map(c => ({ id: c.id, checked: !!checked[c.id] })) : undefined,
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
        <div style={{ marginTop: '14px', padding: '14px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <SectionLabel Icon={Icons.Edit} color="#a78bfa">Оценка</SectionLabel>

            {rubric && rubric.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Критерии — подсказка, оценку ниже можно поправить вручную:</div>
                    {rubric.map(c => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', padding: '5px 8px', borderRadius: '8px', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <input type="checkbox" checked={!!checked[c.id]} onChange={() => toggleCriterion(c.id)} style={{ accentColor: '#a78bfa', width: '15px', height: '15px', flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{c.label || '(без названия)'}</span>
                            <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{c.points} б.</span>
                        </label>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Оценка (из {maxScore})</label>
                    <input
                        type="number" min={0} max={maxScore}
                        className="deck-input"
                        style={{ background: 'var(--bg-card)', width: '90px', fontSize: '14px', fontWeight: 700 }}
                        value={grade}
                        onChange={e => setGrade(e.target.value)}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '160px' }}>
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
                    {saving ? '...' : <><Icons.Save size={14} /> Сохранить</>}
                </button>
            </div>
        </div>
    );
};

// ─── Вид препода/admin ────────────────────────────────────────────────────────

const FILTERS = [
    { key: 'all', label: 'Все', Icon: Icons.Layers },
    { key: 'ungraded', label: 'Не проверено', Icon: Icons.AlertTriangle },
    { key: 'late', label: 'С опозданием', Icon: Icons.Time },
    { key: 'autochecked', label: 'Автопроверено', Icon: Icons.AI },
] as const;

const TeacherView: React.FC = () => {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'ungraded' | 'late' | 'autochecked'>('all');
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
        if (filterStatus === 'autochecked') return s.testResults?.length > 0;
        return true;
    });

    const ungradedCount = (a: any) => (a.submissions || []).filter((s: any) => s.status !== 'graded').length;

    return (
        <div className="assignments-layout" style={{ gridTemplateColumns: selected ? undefined : '1fr' }}>
            {/* Список заданий */}
            <div className="assignments-list-panel" style={{ display: selected ? undefined : 'flex' }}>
                <div style={{ fontWeight: 800, fontSize: '17px', marginBottom: '2px', color: 'var(--text-main)' }}>Все задания</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{assignments.length ? `${assignments.length} шт.` : 'Список пуст'}</div>

                {assignments.length === 0 && (
                    <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Icons.Empty size={32} color="var(--text-muted)" />
                        <div style={{ marginTop: '12px', fontSize: '13px' }}>Нет созданных заданий</div>
                    </div>
                )}

                {assignments.map(a => {
                    const ug = ungradedCount(a);
                    const past = isPast(a.deadline);
                    const total = (a.submissions || []).length;
                    const meta = typeMeta(a.type);
                    const active = selected?.id === a.id;
                    return (
                        <div
                            key={a.id}
                            onClick={() => selectAssignment(a)}
                            className={`hw-assignment-card${active ? ' active' : ''}`}
                            style={{ padding: '13px 14px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${active ? `${meta.accent}66` : 'var(--border-color)'}`, background: active ? `${meta.accent}14` : 'var(--bg-card)', display: 'flex', gap: '11px' }}
                        >
                            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 10px ${meta.accent}33` }}>
                                <meta.Icon size={16} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                                <div style={{ fontSize: '12px', color: past ? '#ef4444' : 'var(--text-muted)', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Icons.Time size={11} /> до {fmtDate(a.deadline)}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                                        <Icons.Upload size={10} /> {total} сдач
                                    </span>
                                    {ug > 0 && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.14)', color: '#f59e0b', fontWeight: 700 }}>
                                            <Icons.AlertTriangle size={10} /> {ug} не проверено
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Сдачи */}
            {selected && (
                <div className="assignments-detail-panel">
                    {(() => {
                        const meta = typeMeta(selected.type);
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                                <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ padding: '8px 10px', flexShrink: 0 }}>
                                    <Icons.Back size={16} />
                                </button>
                                <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 12px ${meta.accent}33` }}>
                                    <meta.Icon size={18} color="#fff" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <Icons.Time size={12} /> до {fmtDate(selected.deadline)} <span style={{ opacity: 0.5 }}>·</span> макс. {selected.maxScore} баллов
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Фильтры */}
                    <div className="hw-filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => setFilterStatus(f.key)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                    background: filterStatus === f.key ? 'rgba(124,58,237,0.15)' : 'var(--bg-input)',
                                    borderColor: filterStatus === f.key ? 'rgba(124,58,237,0.4)' : 'var(--border-color)',
                                    color: filterStatus === f.key ? '#a78bfa' : 'var(--text-muted)',
                                    transition: '0.15s',
                                }}>
                                <f.Icon size={13} color={filterStatus === f.key ? '#a78bfa' : 'var(--text-muted)'} />
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {loadingSubs && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
                            <Icons.Spinner size={16} /> Загрузка...
                        </div>
                    )}

                    {!loadingSubs && filtered.length === 0 && (
                        <div style={{ padding: '50px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Icons.Empty size={32} color="var(--text-muted)" />
                            <div style={{ marginTop: '12px', fontSize: '13px' }}>Нет сдач по этому фильтру</div>
                        </div>
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
                                    rubric={selected.rubric}
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

const SubmissionCard: React.FC<{ sub: any; badge: any; maxScore: number; rubric?: { id: string; label: string; points: number }[]; onGraded: (u: any) => void }> = ({ sub, badge, maxScore, rubric, onGraded }) => {
    const [open, setOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const student = sub.student;

    return (
        <div className="hw-submission-card" style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden', transition: 'border-color 0.15s' }}>
            <div onClick={() => setOpen(o => !o)} style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {student?.avatarUrl
                        ? <img src={student.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <Icons.User size={16} color="#a78bfa" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student?.firstName} {student?.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icons.Time size={11} /> {fmt(sub.submittedAt)}
                    </div>
                </div>
                <Badge label={badge.label} color={badge.color} bg={badge.bg} Icon={badge.Icon} />
                {sub.grade !== null && (
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#22c55e', flexShrink: 0, minWidth: '46px', textAlign: 'right' }}>{sub.grade}/{maxScore}</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-flex', flexShrink: 0 }}>
                    ▾
                </span>
            </div>

            {open && (
                <div style={{ padding: '2px 16px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sub.files?.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <SectionLabel Icon={Icons.FileText}>Файлы</SectionLabel>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {sub.files.map((f: any, i: number) => (
                                    <a key={i} href={f.path} target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--primary)', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '8px', textDecoration: 'none' }}>
                                        <Icons.FileText size={13} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {sub.textAnswer && (
                        <div style={{ marginTop: sub.files?.length ? 0 : '12px' }}>
                            <SectionLabel Icon={Icons.FileText}>Текстовый ответ</SectionLabel>
                            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {sub.textAnswer}
                            </div>
                        </div>
                    )}

                    {sub.aiSimilarity !== null && sub.aiSimilarity !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '10px' }}>
                            <Icons.AI size={15} color="#a78bfa" />
                            <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                                Сходство с эталоном: <strong style={{ color: '#a78bfa' }}>{sub.aiSimilarity}%</strong>
                                {sub.autoGrade !== null && sub.autoGrade !== undefined && (
                                    <span style={{ color: 'var(--text-muted)' }}> · подсказка по баллу: <strong style={{ color: 'var(--text-main)' }}>{sub.autoGrade}</strong></span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Сдача кода */}
                    {sub.codeContent && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                <Icons.Code size={12} color="#22d3ee" />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Код</span>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}>
                                    {sub.codeLanguage}
                                </span>
                                <button
                                    className="btn btn-ghost"
                                    style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
                                    onClick={() => setShowHistory(h => !h)}
                                >
                                    {showHistory ? 'Скрыть историю' : 'История ввода'}
                                </button>
                            </div>
                            <pre style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: 'var(--text-main)', overflowX: 'auto', maxHeight: '220px', margin: 0, fontFamily: 'monospace', lineHeight: 1.5 }}>
                                {sub.codeContent}
                            </pre>
                            {sub.codeLastOutput && (
                                <div style={{ marginTop: '8px', padding: '10px 12px', background: '#0d0d0d', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', color: '#e5e7eb', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'auto' }}>
                                    {sub.codeLastOutput}
                                </div>
                            )}
                            {sub.testResults?.length > 0 && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-input)', borderRadius: '10px', padding: '12px' }}>
                                    <SectionLabel Icon={Icons.CheckCircle} color="#22c55e">Автопроверка тест-кейсами</SectionLabel>
                                    {sub.testResults.map((r: any, i: number) => (
                                        <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12.5px' }}>
                                            {r.passed ? <Icons.CheckCircle size={13} color="#22c55e" /> : <Icons.Fail size={13} color="#ef4444" />}
                                            <span style={{ color: 'var(--text-main)' }}>
                                                Тест {i + 1}
                                                {r.isHidden ? ' [скрытый]' : null}
                                                {!r.isHidden && r.error ? <span style={{ color: '#ef4444' }}> — {r.error}</span> : null}
                                                {!r.isHidden && !r.passed && r.actualOutput ? <span style={{ color: 'var(--text-muted)' }}> — получено: {r.actualOutput}</span> : null}
                                            </span>
                                        </div>
                                    ))}
                                    {sub.autoGrade !== null && sub.autoGrade !== undefined && (
                                        <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                                            Автооценка: {sub.autoGrade} из {maxScore}
                                        </div>
                                    )}
                                </div>
                            )}
                            {showHistory && (
                                <div style={{ marginTop: '10px' }}>
                                    <Suspense fallback={<div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Загрузка...</div>}>
                                        <CodeHistoryReplay submissionId={sub.id} language={sub.codeLanguage} />
                                    </Suspense>
                                </div>
                            )}
                        </div>
                    )}

                    <GradePanel sub={sub} maxScore={maxScore} rubric={rubric} onGraded={onGraded} />
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '12px' }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {list.map(a => {
                    const badge = statusBadge(a.submission);
                    const past = isPast(a.deadline);
                    const meta = typeMeta(a.type);
                    return (
                        <div key={a.id} className="hw-submission-card" style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 10px ${meta.accent}33` }}>
                                    <meta.Icon size={17} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>{a.title}</div>
                                    <div style={{ fontSize: '12px', color: past ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Icons.Time size={11} /> Срок: {fmtDate(a.deadline)}
                                    </div>
                                    {a.description && (
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>{a.description}</div>
                                    )}
                                    {/* Оценка */}
                                    {a.submission?.status === 'graded' && a.showFeedbackToStudent !== false && (
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '16px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Icons.CheckCircle size={14} color="#22c55e" /> {a.submission.grade}/{a.maxScore}
                                            </span>
                                            {a.submission.teacherComment && (
                                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.submission.teacherComment}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Badge label={badge.label} color={badge.color} bg={badge.bg} Icon={badge.Icon} />
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

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '60px', color: 'var(--text-muted)' }}>
            <Icons.Spinner size={18} /> Загрузка...
        </div>
    );

    if (assignments.length === 0) return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icons.FileText size={40} color="var(--text-muted)" />
            <div style={{ marginTop: '16px', fontSize: '16px', fontWeight: 700 }}>Нет заданий</div>
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

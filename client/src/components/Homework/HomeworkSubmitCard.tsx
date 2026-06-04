import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';

// Два режима:
// 1. Standalone — передаётся готовый объект assignment
// 2. Attached   — передаётся entityType + entityId, грузим с API
type Props =
    | { assignment: any; entityType?: never; entityId?: never }
    | { assignment?: never; entityType: 'video' | 'test'; entityId: number };

const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const useCountdown = (deadline: string | null) => {
    const [text, setText] = useState('');
    useEffect(() => {
        if (!deadline) return;
        const tick = () => {
            const diff = new Date(deadline).getTime() - Date.now();
            if (diff <= 0) { setText('Срок истёк'); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setText(d > 0 ? `${d}д ${h}ч ${m}м` : h > 0 ? `${h}ч ${m}м` : `${m}м`);
        };
        tick();
        const id = setInterval(tick, 60000);
        return () => clearInterval(id);
    }, [deadline]);
    return text;
};

export const HomeworkSubmitCard: React.FC<Props> = (props) => {
    const { showToast } = useToast();
    const [assignment, setAssignment] = useState<any>(props.assignment || null);
    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(!props.assignment);
    const [submitting, setSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [textAnswer, setTextAnswer] = useState('');
    const [showForm, setShowForm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const countdown = useCountdown(assignment?.deadline || null);

    useEffect(() => {
        if (props.assignment) {
            // Standalone — загружаем только сдачу
            setAssignment(props.assignment);
            api.get(`/hw/${props.assignment.id}/my-submission`)
                .then(r => { setSubmission(r.data); if (!r.data) setShowForm(true); })
                .catch(() => {})
                .finally(() => setLoading(false));
        } else {
            // Attached — грузим само задание + сдачу
            api.get('/hw/by-entity', { params: { entityType: props.entityType, entityId: props.entityId } })
                .then(async r => {
                    if (!r.data) return;
                    setAssignment(r.data);
                    const s = await api.get(`/hw/${r.data.id}/my-submission`).catch(() => ({ data: null }));
                    setSubmission(s.data);
                    if (!s.data) setShowForm(true);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, []);

    const isPastDeadline = assignment ? new Date() > new Date(assignment.deadline) : false;
    const canSubmit = !isPastDeadline || !assignment?.strictDeadline;
    const canResubmit = submission?.status === 'graded' ? assignment?.allowResubmit : true;

    const handleSubmit = async () => {
        if (files.length === 0 && !textAnswer.trim()) {
            showToast('Прикрепите файлы или напишите ответ', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            files.forEach(f => fd.append('hwfile', f));
            if (textAnswer.trim()) fd.append('textAnswer', textAnswer.trim());
            const r = await api.post(`/hw/${assignment.id}/submit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSubmission(r.data);
            setShowForm(false);
            setFiles([]);
            setTextAnswer('');
            showToast(isPastDeadline ? 'Сдано с опозданием — могут не проверить' : 'Задание сдано!', isPastDeadline ? 'info' : 'success');
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка отправки', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;
    if (!assignment) return null;

    const isStandalone = assignment.type === 'standalone';
    const statusColor = submission?.status === 'graded' ? '#22c55e' : submission ? '#f59e0b' : 'var(--text-muted)';
    const statusText = submission?.status === 'graded' ? 'Проверено' : submission?.status === 'resubmitted' ? 'Пересдано' : submission ? 'На проверке' : 'Не сдано';

    return (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {/* Шапка */}
            <div style={{ padding: '16px 20px', borderBottom: (isStandalone && (assignment.description || assignment.taskFiles?.length || assignment.taskLink)) || showForm || submission ? '1px solid var(--border-color)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Upload size={18} color="#a78bfa" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>{assignment.title}</div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: isPastDeadline ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Icons.Clock size={12} /> {formatDeadline(assignment.deadline)}
                            </span>
                            {!isPastDeadline && countdown && (
                                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>⏱ {countdown}</span>
                            )}
                            <span style={{ fontSize: '12px', color: statusColor, fontWeight: 600 }}>● {statusText}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Условие задания (только для standalone) */}
            {isStandalone && (assignment.description || assignment.taskFiles?.length > 0 || assignment.taskLink) && (
                <div style={{ padding: '14px 20px', background: 'rgba(124,58,237,0.04)', borderBottom: '1px solid var(--border-color)' }}>
                    {assignment.description && (
                        <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: assignment.taskFiles?.length || assignment.taskLink ? '12px' : 0 }}>
                            {assignment.description}
                        </div>
                    )}
                    {assignment.taskFiles?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: assignment.taskLink ? '8px' : 0 }}>
                            {assignment.taskFiles.map((f: any, i: number) => (
                                <a key={i} href={f.path} target="_blank" rel="noreferrer"
                                    style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Icons.File size={13} /> {f.name}
                                </a>
                            ))}
                        </div>
                    )}
                    {assignment.taskLink && (
                        <a href={assignment.taskLink} target="_blank" rel="noreferrer"
                            style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icons.Link size={13} /> {assignment.taskLink}
                        </a>
                    )}
                </div>
            )}

            {/* Результат (если проверено и showFeedback) */}
            {submission?.status === 'graded' && assignment.showFeedbackToStudent && (
                <div style={{ padding: '14px 20px', background: 'rgba(34,197,94,0.06)', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#22c55e' }}>{submission.grade}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>из {assignment.maxScore}</div>
                        </div>
                        {submission.teacherComment && (
                            <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                                <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Комментарий:</span>
                                {submission.teacherComment}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Форма сдачи */}
            {showForm && canSubmit && (submission?.status !== 'graded' || canResubmit) ? (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isPastDeadline && (
                        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#f87171' }}>
                            ⚠ Срок сдачи истёк. Задание может остаться непроверенным.
                        </div>
                    )}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                    >
                        <Icons.Upload size={20} color="var(--text-muted)" />
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            {files.length ? `${files.length} файл(ов) выбрано` : 'Нажмите чтобы выбрать файлы'}
                        </div>
                        {assignment.allowedFileTypes?.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Разрешено: {assignment.allowedFileTypes.map((t: string) => `.${t}`).join(', ')}
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                            onChange={e => setFiles(Array.from(e.target.files || []))}
                            accept={assignment.allowedFileTypes?.length ? assignment.allowedFileTypes.map((t: string) => `.${t}`).join(',') : undefined}
                        />
                    </div>
                    {files.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {files.map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <Icons.File size={13} color="var(--text-muted)" />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Текстовый ответ (необязательно)</label>
                        <textarea className="deck-input" style={{ background: 'var(--bg-input)', width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5 }}
                            placeholder="Пояснение или код..." value={textAnswer} onChange={e => setTextAnswer(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Отправка...' : submission ? 'Пересдать' : 'Сдать задание'}
                        </button>
                        {submission && <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>}
                    </div>
                </div>
            ) : submission && !showForm ? (
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {submission.files?.length > 0 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {submission.files.map((f: any, i: number) => (
                                <a key={i} href={f.path} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Icons.File size={13} /> {f.name}
                                </a>
                            ))}
                        </div>
                    )}
                    {canResubmit && (
                        <button className="btn btn-ghost" style={{ fontSize: '13px', flexShrink: 0 }} onClick={() => setShowForm(true)}>Пересдать</button>
                    )}
                </div>
            ) : !canSubmit ? (
                <div style={{ padding: '14px 20px', fontSize: '13px', color: '#ef4444' }}>
                    Срок истёк. Преподаватель закрыл приём работ.
                </div>
            ) : null}
        </div>
    );
};

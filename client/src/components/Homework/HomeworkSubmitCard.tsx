import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';
import { CodeEditorPanel } from '../CodeEditor/CodeEditorPanel';
import type { HistoryEntry } from '../CodeEditor/CodeEditorPanel';

// Три режима:
// 1. Standalone — передаётся готовый объект assignment
// 2. Attached   — передаётся entityType + entityId, грузим с API
// 3. codeOnly   — только вкладка кода (для код-заданий)
type Props =
    | { assignment: any; codeOnly?: boolean; entityType?: never; entityId?: never }
    | { assignment?: never; codeOnly?: never; entityType: 'video' | 'test'; entityId: number };

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
    const codeOnly = 'codeOnly' in props ? !!props.codeOnly : false;
    const [assignment, setAssignment] = useState<any>(props.assignment || null);
    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(!props.assignment);
    const [submitting, setSubmitting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [textAnswer, setTextAnswer] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [submitTab, setSubmitTab] = useState<'files' | 'code'>(codeOnly ? 'code' : 'files');
    const [codeState, setCodeState] = useState<{ code: string; lang: string; history: HistoryEntry[] }>({ code: '', lang: '', history: [] });
    const [submittingCode, setSubmittingCode] = useState(false);
    const [checkingCode, setCheckingCode] = useState(false);
    const [checkResult, setCheckResult] = useState<{ results: { id: string; passed: boolean; actualOutput: string; error?: string; isHidden: boolean }[]; autoGrade: number; maxScore: number; passedCount: number; totalCount: number } | null>(null);
    const [checkingText, setCheckingText] = useState(false);
    const [textCheckResult, setTextCheckResult] = useState<{ similarity: number; autoGrade: number; maxScore: number; threshold: number } | null>(null);
    const flushHistoryRef = useRef<(() => HistoryEntry[]) | null>(null);
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

    const handleCheckText = async () => {
        if (!textAnswer.trim()) { showToast('Напишите ответ перед проверкой', 'error'); return; }
        setCheckingText(true);
        try {
            const r = await api.post(`/hw/${assignment.id}/check-text`, { textAnswer: textAnswer.trim() });
            setTextCheckResult(r.data);
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка проверки ответа', 'error');
        } finally {
            setCheckingText(false);
        }
    };

    const handleCheckCode = async () => {
        if (!codeState.code.trim()) { showToast('Напишите код перед проверкой', 'error'); return; }
        if (!codeState.lang) { showToast('Выберите язык программирования', 'error'); return; }
        setCheckingCode(true);
        try {
            const r = await api.post(`/hw/${assignment.id}/check-code`, {
                codeLanguage: codeState.lang,
                codeContent: codeState.code,
            });
            setCheckResult(r.data);
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка проверки кода', 'error');
        } finally {
            setCheckingCode(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!codeState.code.trim()) { showToast('Напишите код перед сдачей', 'error'); return; }
        if (!codeState.lang) { showToast('Выберите язык программирования', 'error'); return; }
        setSubmittingCode(true);
        try {
            const finalHistory = assignment.recordCodeHistory !== false
                ? (flushHistoryRef.current?.() ?? codeState.history)
                : [];
            const r = await api.post(`/hw/${assignment.id}/submit-code`, {
                codeLanguage: codeState.lang,
                codeContent: codeState.code,
                codeHistory: finalHistory,
            });
            setSubmission(r.data);
            setShowForm(false);
            showToast(isPastDeadline ? 'Код сдан с опозданием' : 'Код сдан!', isPastDeadline ? 'info' : 'success');
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка отправки кода', 'error');
        } finally {
            setSubmittingCode(false);
        }
    };

    if (loading) return null;
    if (!assignment) return null;

    const hasContent = !!(assignment.description || assignment.taskFiles?.length > 0 || assignment.taskLink);
    const statusColor = submission?.status === 'graded' ? '#22c55e' : submission ? '#f59e0b' : 'var(--text-muted)';
    const statusText = submission?.status === 'graded' ? 'Проверено' : submission?.status === 'resubmitted' ? 'Пересдано' : submission ? 'На проверке' : 'Не сдано';

    return (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {/* Шапка */}
            <div style={{ padding: '16px 20px', borderBottom: hasContent || showForm || submission ? '1px solid var(--border-color)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Upload size={18} color="#a78bfa" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>{assignment.title}</div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: isPastDeadline ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Icons.Time size={12} /> {formatDeadline(assignment.deadline)}
                            </span>
                            {!isPastDeadline && countdown && (
                                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '20px' }}>⏱ {countdown}</span>
                            )}
                            <span style={{ fontSize: '12px', color: statusColor, fontWeight: 600, background: `${statusColor}18`, padding: '2px 8px', borderRadius: '20px' }}>● {statusText}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Условие задания */}
            {hasContent && (
                <div style={{ padding: '16px 20px', background: 'rgba(124,58,237,0.04)', borderBottom: '1px solid var(--border-color)' }}>
                    {assignment.description && (
                        <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: assignment.taskFiles?.length || assignment.taskLink ? '14px' : 0 }}>
                            {assignment.description}
                        </div>
                    )}
                    {assignment.taskFiles?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: assignment.taskLink ? '10px' : 0 }}>
                            {assignment.taskFiles.map((f: any, i: number) => (
                                f.mimeType?.startsWith('image/') ? (
                                    <a key={i} href={f.path} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                        <img src={f.path} alt={f.name} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '10px', display: 'block', objectFit: 'contain', background: 'var(--bg-input)' }} />
                                    </a>
                                ) : (
                                    <a key={i} href={f.path} target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '10px', textDecoration: 'none', transition: 'background 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-input)')}>
                                        <Icons.FileText size={16} color="#a78bfa" />
                                        <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                                    </a>
                                )
                            ))}
                        </div>
                    )}
                    {assignment.taskLink && (
                        <a href={assignment.taskLink} target="_blank" rel="noreferrer"
                            style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icons.LinkIcon size={13} /> {assignment.taskLink}
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

                    {/* Табы: Файлы / Код */}
                    {assignment.allowCodeSubmission && !codeOnly && (
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '0' }}>
                            {(['files', 'code'] as const).map(t => (
                                <button key={t} onClick={() => setSubmitTab(t)}
                                    style={{ flex: 1, padding: '8px', background: 'none', border: 'none', borderBottom: submitTab === t ? '2px solid #a78bfa' : '2px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: submitTab === t ? 700 : 400, color: submitTab === t ? '#a78bfa' : 'var(--text-muted)' }}>
                                    {t === 'files' ? 'Файлы' : 'Редактор кода'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Вкладка файлов */}
                    {submitTab === 'files' && !codeOnly && (
                        <>
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
                                            <Icons.FileText size={13} color="var(--text-muted)" />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                                            <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Текстовый ответ{assignment.hasReferenceAnswer ? '' : ' (необязательно)'}</label>
                                <textarea className="deck-input" style={{ background: 'var(--bg-input)', width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5 }}
                                    placeholder="Пояснение..." value={textAnswer}
                                    onChange={e => { setTextAnswer(e.target.value); setTextCheckResult(null); }} />
                            </div>

                            {textCheckResult && (
                                <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: textCheckResult.similarity >= textCheckResult.threshold ? '#22c55e' : '#f59e0b' }}>
                                        Сходство с ожидаемым ответом: {textCheckResult.similarity}%
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        Оценка-подсказка: {textCheckResult.autoGrade} из {textCheckResult.maxScore} — финальную оценку выставит преподаватель
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                {assignment.hasReferenceAnswer && (
                                    <button className="btn btn-ghost" onClick={handleCheckText} disabled={checkingText}>
                                        {checkingText ? 'Проверка...' : 'Проверить'}
                                    </button>
                                )}
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? 'Отправка...' : submission ? 'Пересдать' : 'Сдать задание'}
                                </button>
                                {submission && <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>}
                            </div>
                        </>
                    )}

                    {/* Вкладка кода */}
                    {submitTab === 'code' && assignment.allowCodeSubmission && (
                        <>
                            <CodeEditorPanel
                                allowedLanguages={assignment.allowedCodeLanguages || []}
                                codeTemplate={assignment.codeTemplate}
                                recordHistory={assignment.recordCodeHistory !== false}
                                initialCode={submission?.codeContent ?? undefined}
                                initialLanguage={submission?.codeLanguage ?? undefined}
                                onCodeChange={(code, lang, hist) => { setCodeState({ code, lang, history: hist }); setCheckResult(null); }}
                                onFlushHistory={flush => { flushHistoryRef.current = flush; }}
                            />

                            {checkResult && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-input)', borderRadius: '12px', padding: '12px' }}>
                                    {checkResult.results.map((r, i) => (
                                        <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                                            <span style={{ color: r.passed ? '#22c55e' : '#ef4444', fontWeight: 700, flexShrink: 0 }}>{r.passed ? '✓' : '✗'}</span>
                                            <span style={{ color: 'var(--text-main)' }}>
                                                Тест {i + 1}
                                                {r.isHidden ? ' [скрытый]' : null}
                                                {!r.isHidden && r.error ? <span style={{ color: '#ef4444' }}> — {r.error}</span> : null}
                                                {!r.isHidden && !r.passed && r.actualOutput ? <span style={{ color: 'var(--text-muted)' }}> — получено: {r.actualOutput}</span> : null}
                                            </span>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                                        Автооценка: {checkResult.passedCount}/{checkResult.totalCount} → {checkResult.autoGrade} из {checkResult.maxScore}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                {assignment.testCases?.length > 0 && (
                                    <button className="btn btn-ghost" onClick={handleCheckCode} disabled={checkingCode}>
                                        {checkingCode ? 'Проверка...' : 'Проверить'}
                                    </button>
                                )}
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmitCode} disabled={submittingCode}>
                                    {submittingCode ? 'Отправка...' : submission ? 'Пересдать код' : 'Сдать код'}
                                </button>
                                {submission && <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>}
                            </div>
                        </>
                    )}
                </div>
            ) : submission && !showForm ? (
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {submission.files?.length > 0 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {submission.files.map((f: any, i: number) => (
                                <a key={i} href={f.path} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Icons.FileText size={13} /> {f.name}
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

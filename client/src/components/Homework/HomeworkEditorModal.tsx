import React, { useState, useRef } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';
import './Homework.css';

interface Props {
    assignment: any;
    onClose: () => void;
    onUpdated: (updated: any) => void;
}

const FILE_TYPE_OPTIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'txt', 'png', 'jpg', 'zip', 'py', 'js', 'ts', 'java', 'cpp', 'c'];

const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const HomeworkEditorModal: React.FC<Props> = ({ assignment, onClose, onUpdated }) => {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tab, setTab] = useState<'content' | 'settings'>('content');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [taskFiles, setTaskFiles] = useState<any[]>(assignment.taskFiles || []);
    const [isPublished, setIsPublished] = useState(assignment.isPublished || false);

    const [form, setForm] = useState({
        title: assignment.title,
        description: assignment.description || '',
        taskLink: assignment.taskLink || '',
        deadline: toDatetimeLocal(assignment.deadline),
        strictDeadline: assignment.strictDeadline,
        allowResubmit: assignment.allowResubmit,
        showFeedbackToStudent: assignment.showFeedbackToStudent,
        allowedFileTypes: (assignment.allowedFileTypes || []) as string[],
        reminderDays: (assignment.reminderDays || []) as number[],
        maxScore: assignment.maxScore ?? 100,
    });

    const toggleFileType = (ext: string) =>
        setForm(f => ({ ...f, allowedFileTypes: f.allowedFileTypes.includes(ext) ? f.allowedFileTypes.filter(x => x !== ext) : [...f.allowedFileTypes, ext] }));

    const toggleReminderDay = (day: number) =>
        setForm(f => ({ ...f, reminderDays: f.reminderDays.includes(day) ? f.reminderDays.filter(x => x !== day) : [...f.reminderDays, day] }));

    const handleSave = async () => {
        if (!form.deadline) { showToast('Укажите дедлайн', 'error'); return; }
        setSaving(true);
        try {
            const r = await api.patch(`/hw/${assignment.id}`, {
                ...form,
                deadline: new Date(form.deadline).toISOString(),
                allowedFileTypes: form.allowedFileTypes.length ? form.allowedFileTypes : null,
            });
            onUpdated({ ...r.data, taskFiles, isPublished });
            showToast('Сохранено', 'success');
        } catch {
            showToast('Ошибка сохранения', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!form.deadline) { showToast('Укажите дедлайн перед публикацией', 'error'); return; }
        setPublishing(true);
        try {
            // Сначала сохраняем актуальные данные
            await api.patch(`/hw/${assignment.id}`, {
                ...form,
                deadline: new Date(form.deadline).toISOString(),
                allowedFileTypes: form.allowedFileTypes.length ? form.allowedFileTypes : null,
            });
            // Потом публикуем и отправляем уведомления
            const r = await api.post(`/hw/${assignment.id}/publish`);
            setIsPublished(true);
            onUpdated({ ...r.data, taskFiles, isPublished: true });
            showToast(isPublished ? 'Студенты уведомлены повторно' : 'Задание опубликовано, студенты уведомлены!', 'success');
        } catch {
            showToast('Ошибка публикации', 'error');
        } finally {
            setPublishing(false);
        }
    };

    const handleUploadTaskFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploadingFiles(true);
        try {
            const fd = new FormData();
            Array.from(files).forEach(f => fd.append('hwfile', f));
            const r = await api.patch(`/hw/${assignment.id}/files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setTaskFiles(r.data.taskFiles || []);
            onUpdated({ ...assignment, taskFiles: r.data.taskFiles });
            showToast('Файлы загружены', 'success');
        } catch {
            showToast('Ошибка загрузки файлов', 'error');
        } finally {
            setUploadingFiles(false);
        }
    };

    const handleDeleteTaskFile = async (index: number) => {
        try {
            const r = await api.delete(`/hw/${assignment.id}/files/${index}`);
            setTaskFiles(r.data.taskFiles || []);
            onUpdated({ ...assignment, taskFiles: r.data.taskFiles });
        } catch {
            showToast('Ошибка удаления', 'error');
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 9999 }}
            onClick={onClose}
        >
            <div
                className="hw-modal-sheet"
                style={{ background: 'var(--bg-panel)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border-color)', borderBottom: 'none', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', margin: '0 auto' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Шапка */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: isPublished ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Upload size={17} color={isPublished ? '#22c55e' : '#a78bfa'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                            style={{ background: 'none', border: 'none', outline: 'none', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', width: '100%' }}
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        />
                        <div style={{ fontSize: '11px', marginTop: '2px', color: isPublished ? '#22c55e' : 'var(--text-muted)' }}>
                            {isPublished ? '● Опубликовано' : '○ Черновик — студенты не видят'}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', padding: '4px', lineHeight: 1 }}>✕</button>
                </div>

                {/* Табы */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                    {([['content', 'Условие'], ['settings', 'Настройки']] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            style={{ flex: 1, padding: '11px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #a78bfa' : '2px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: tab === key ? 700 : 400, color: tab === key ? '#a78bfa' : 'var(--text-muted)', transition: '0.15s' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Скролл-область */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {tab === 'content' && (
                        <>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Текст задания</label>
                                <textarea
                                    className="deck-input"
                                    style={{ background: 'var(--bg-input)', width: '100%', minHeight: '110px', resize: 'vertical', fontSize: '14px', lineHeight: 1.6 }}
                                    placeholder="Опишите что нужно сделать..."
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Файлы условия</label>
                                {taskFiles.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                        {taskFiles.map((f: any, i: number) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
                                                <Icons.FileText size={14} color="var(--text-muted)" />
                                                <a href={f.path} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '13px', color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</a>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                                                <button onClick={() => handleDeleteTaskFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, flexShrink: 0 }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    className="btn btn-ghost"
                                    style={{ width: '100%', border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '12px', fontSize: '13px' }}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFiles}
                                >
                                    {uploadingFiles ? 'Загрузка...' : <><Icons.Upload size={14} /> Добавить файлы (PDF, картинки, видео...)</>}
                                </button>
                                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUploadTaskFiles(e.target.files)} />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Ссылка на материал</label>
                                <input
                                    className="deck-input"
                                    style={{ background: 'var(--bg-input)', width: '100%', fontSize: '14px' }}
                                    placeholder="https://..."
                                    value={form.taskLink}
                                    onChange={e => setForm(f => ({ ...f, taskLink: e.target.value }))}
                                />
                            </div>
                        </>
                    )}

                    {tab === 'settings' && (
                        <>
                            <div className="hw-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Дедлайн</label>
                                    <input type="datetime-local" className="deck-input" style={{ background: 'var(--bg-input)', width: '100%', fontSize: '14px' }}
                                        value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Макс. балл</label>
                                    <input type="number" className="deck-input" style={{ background: 'var(--bg-input)', width: '100%', fontSize: '14px' }} min={1}
                                        value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: Number(e.target.value) }))} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                    Разрешённые типы файлов <span style={{ fontWeight: 400 }}>(не выбрано = любые)</span>
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {FILE_TYPE_OPTIONS.map(ext => (
                                        <button key={ext} onClick={() => toggleFileType(ext)}
                                            style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                                background: form.allowedFileTypes.includes(ext) ? 'rgba(124,58,237,0.15)' : 'var(--bg-input)',
                                                borderColor: form.allowedFileTypes.includes(ext) ? 'rgba(124,58,237,0.5)' : 'var(--border-color)',
                                                color: form.allowedFileTypes.includes(ext) ? '#a78bfa' : 'var(--text-muted)',
                                            }}>.{ext}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Напоминания (за N дней до дедлайна)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {[1, 2, 3, 5, 7].map(d => (
                                        <button key={d} onClick={() => toggleReminderDay(d)}
                                            style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: '1px solid',
                                                background: form.reminderDays.includes(d) ? 'rgba(181,23,158,0.15)' : 'var(--bg-input)',
                                                borderColor: form.reminderDays.includes(d) ? 'rgba(181,23,158,0.4)' : 'var(--border-color)',
                                                color: form.reminderDays.includes(d) ? '#e879f9' : 'var(--text-muted)',
                                            }}>{d}д</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {([
                                    ['strictDeadline', 'Строгий дедлайн — блокировать после срока'],
                                    ['allowResubmit', 'Разрешить пересдачу после проверки'],
                                    ['showFeedbackToStudent', 'Показывать студенту оценку и комментарий'],
                                ] as [string, string][]).map(([key, label]) => (
                                    <label key={key} className="toggle-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" className="toggle-input" checked={(form as any)[key]}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                                        <div className="toggle-track"><div className="toggle-thumb" /></div>
                                        <span className="toggle-label" style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-main)' }}>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Подвал с кнопками */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Кнопка публикации — главная */}
                    <button
                        onClick={handlePublish}
                        disabled={publishing || saving}
                        style={{ flex: 1, minWidth: '160px', padding: '11px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: publishing ? 'not-allowed' : 'pointer', border: 'none', color: '#fff', background: isPublished ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #7c3aed, #b5179e)', boxShadow: isPublished ? '0 4px 14px rgba(22,163,74,0.3)' : '0 4px 14px rgba(124,58,237,0.35)', opacity: publishing ? 0.7 : 1, transition: '0.2s' }}
                    >
                        {publishing ? 'Публикация...' : isPublished ? '🔔 Уведомить повторно' : '🚀 Опубликовать'}
                    </button>

                    {/* Сохранить черновик */}
                    <button className="btn btn-ghost" onClick={handleSave} disabled={saving} style={{ flexShrink: 0 }}>
                        {saving ? '...' : <><Icons.Save size={14} /> Сохранить</>}
                    </button>
                </div>
            </div>

        </div>
    );
};

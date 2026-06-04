import React, { useState, useRef } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';

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
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [taskFiles, setTaskFiles] = useState<any[]>(assignment.taskFiles || []);

    const [form, setForm] = useState({
        title: assignment.title,
        description: assignment.description || '',
        taskLink: assignment.taskLink || '',
        deadline: toDatetimeLocal(assignment.deadline),
        strictDeadline: assignment.strictDeadline,
        allowResubmit: assignment.allowResubmit,
        showFeedbackToStudent: assignment.showFeedbackToStudent,
        allowedFileTypes: assignment.allowedFileTypes || [] as string[],
        reminderDays: assignment.reminderDays || [] as number[],
        maxScore: assignment.maxScore ?? 100,
    });

    const toggleFileType = (ext: string) =>
        setForm(f => ({ ...f, allowedFileTypes: f.allowedFileTypes.includes(ext) ? f.allowedFileTypes.filter((x: string) => x !== ext) : [...f.allowedFileTypes, ext] }));

    const toggleReminderDay = (day: number) =>
        setForm(f => ({ ...f, reminderDays: f.reminderDays.includes(day) ? f.reminderDays.filter((x: number) => x !== day) : [...f.reminderDays, day] }));

    const handleSave = async () => {
        if (!form.deadline) { showToast('Укажите дедлайн', 'error'); return; }
        setSaving(true);
        try {
            const r = await api.patch(`/hw/${assignment.id}`, {
                ...form,
                deadline: new Date(form.deadline).toISOString(),
                allowedFileTypes: form.allowedFileTypes.length ? form.allowedFileTypes : null,
            });
            onUpdated({ ...r.data, taskFiles });
            showToast('Сохранено', 'success');
        } catch {
            showToast('Ошибка сохранения', 'error');
        } finally {
            setSaving(false);
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
            showToast('Ошибка удаления файла', 'error');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}
            onClick={onClose}>
            <div style={{ background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border-color)', width: 'calc(100% - 32px)', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}
                onClick={e => e.stopPropagation()}>

                {/* Шапка */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Upload size={18} color="#a78bfa" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                            style={{ background: 'none', border: 'none', outline: 'none', fontWeight: 700, fontSize: '16px', color: 'var(--text-main)', width: '100%' }}
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        />
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}>✕</button>
                </div>

                {/* Табы */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                    {([['content', 'Условие'], ['settings', 'Настройки']] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #a78bfa' : '2px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: tab === key ? 700 : 400, color: tab === key ? '#a78bfa' : 'var(--text-muted)', transition: '0.15s' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Контент */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {tab === 'content' && (
                        <>
                            {/* Текст задания */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Текст задания</label>
                                <textarea
                                    className="deck-input"
                                    style={{ background: 'var(--bg-input)', width: '100%', minHeight: '120px', resize: 'vertical', fontSize: '14px', lineHeight: 1.6 }}
                                    placeholder="Опишите что нужно сделать..."
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            {/* Файлы условия */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Файлы с заданием</label>
                                {taskFiles.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                        {taskFiles.map((f: any, i: number) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
                                                <Icons.File size={14} color="var(--text-muted)" />
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

                            {/* Ссылка */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Ссылка на материал (необязательно)</label>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                                    Разрешённые типы файлов от студентов <span style={{ fontWeight: 400 }}>(не выбрано = любые)</span>
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
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Напоминания (за N дней)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[1, 2, 3, 5, 7].map(d => (
                                        <button key={d} onClick={() => toggleReminderDay(d)}
                                            style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: '1px solid',
                                                background: form.reminderDays.includes(d) ? 'rgba(181,23,158,0.15)' : 'var(--bg-input)',
                                                borderColor: form.reminderDays.includes(d) ? 'rgba(181,23,158,0.4)' : 'var(--border-color)',
                                                color: form.reminderDays.includes(d) ? '#e879f9' : 'var(--text-muted)',
                                            }}>{d}д</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {([
                                    ['strictDeadline', 'Строгий дедлайн — блокировать сдачу после срока'],
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

                {/* Подвал */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                        {saving ? 'Сохранение...' : <><Icons.Save size={14} /> Сохранить</>}
                    </button>
                    <button className="btn btn-ghost" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
};

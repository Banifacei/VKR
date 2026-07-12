import React, { useState } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';
import { DateTimePicker } from '../DateTimePicker';
import './Homework.css';

interface Props {
    assignment: any;
    onClose: () => void;
    onUpdated: (updated: any) => void;
}

interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    description?: string;
}

const makeTestCaseId = () => `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const CODE_LANGUAGES = [
    { id: 'python',     label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'java',       label: 'Java' },
    { id: 'c',          label: 'C' },
    { id: 'c++',        label: 'C++' },
];

export const CodeTaskEditorModal: React.FC<Props> = ({ assignment, onClose, onUpdated }) => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<'content' | 'tests' | 'settings'>('content');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(assignment.isPublished || false);

    const [form, setForm] = useState({
        title: assignment.title,
        description: assignment.description || '',
        deadline: assignment.deadline as string | null,
        maxScore: assignment.maxScore ?? 100,
        allowedCodeLanguages: (assignment.allowedCodeLanguages || []) as string[],
        codeTemplate: assignment.codeTemplate || '',
        recordCodeHistory: assignment.recordCodeHistory !== false,
        showFeedbackToStudent: assignment.showFeedbackToStudent !== false,
        allowResubmit: assignment.allowResubmit || false,
        strictDeadline: assignment.strictDeadline || false,
        testCases: (assignment.testCases || []) as TestCase[],
    });

    const toggleLang = (id: string) =>
        setForm(f => ({
            ...f,
            allowedCodeLanguages: f.allowedCodeLanguages.includes(id)
                ? f.allowedCodeLanguages.filter(x => x !== id)
                : [...f.allowedCodeLanguages, id],
        }));

    const addTestCase = () =>
        setForm(f => ({
            ...f,
            testCases: [...f.testCases, { id: makeTestCaseId(), input: '', expectedOutput: '', isHidden: false }],
        }));

    const updateTestCase = (id: string, patch: Partial<TestCase>) =>
        setForm(f => ({
            ...f,
            testCases: f.testCases.map(tc => tc.id === id ? { ...tc, ...patch } : tc),
        }));

    const removeTestCase = (id: string) =>
        setForm(f => ({ ...f, testCases: f.testCases.filter(tc => tc.id !== id) }));

    const handleSave = async () => {
        if (!form.deadline) { showToast('Укажите дедлайн', 'error'); return; }
        setSaving(true);
        try {
            const r = await api.patch(`/hw/${assignment.id}`, {
                ...form,
                allowCodeSubmission: true,
                codeTemplate: form.codeTemplate || null,
            });
            onUpdated({ ...r.data, isPublished });
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
            await api.patch(`/hw/${assignment.id}`, {
                ...form,
                allowCodeSubmission: true,
                codeTemplate: form.codeTemplate || null,
            });
            const r = await api.post(`/hw/${assignment.id}/publish`);
            setIsPublished(true);
            onUpdated({ ...r.data, isPublished: true });
            showToast(isPublished ? 'Студенты уведомлены повторно' : 'Задание опубликовано!', 'success');
        } catch {
            showToast('Ошибка публикации', 'error');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}
            onClick={onClose}
        >
            <div
                className="hw-modal-sheet"
                style={{ background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border-color)', width: 'calc(100% - 32px)', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Шапка */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: isPublished ? 'rgba(34,197,94,0.15)' : 'rgba(8,145,178,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icons.Code size={17} color={isPublished ? '#22c55e' : '#22d3ee'} />
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
                    {([['content', 'Условие'], ['tests', `Тесты${form.testCases.length ? ` (${form.testCases.length})` : ''}`], ['settings', 'Настройки']] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            style={{ flex: 1, padding: '11px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #22d3ee' : '2px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: tab === key ? 700 : 400, color: tab === key ? '#22d3ee' : 'var(--text-muted)', transition: '0.15s' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Контент */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {tab === 'content' && (
                        <>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Описание задачи</label>
                                <textarea
                                    className="deck-input"
                                    style={{ background: 'var(--bg-input)', width: '100%', minHeight: '110px', resize: 'vertical', fontSize: '14px', lineHeight: 1.6 }}
                                    placeholder="Опишите что нужно реализовать..."
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Шаблон кода (необязательно)</label>
                                <textarea
                                    className="deck-input"
                                    style={{ background: 'var(--bg-deep)', width: '100%', minHeight: '120px', resize: 'vertical', fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.5 }}
                                    placeholder="# Стартовый код для студентов..."
                                    value={form.codeTemplate}
                                    onChange={e => setForm(f => ({ ...f, codeTemplate: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                    Разрешённые языки <span style={{ fontWeight: 400 }}>(не выбрано = все)</span>
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {CODE_LANGUAGES.map(l => {
                                        const active = form.allowedCodeLanguages.includes(l.id);
                                        return (
                                            <button key={l.id} onClick={() => toggleLang(l.id)}
                                                style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                                    background: active ? 'rgba(8,145,178,0.15)' : 'var(--bg-input)',
                                                    borderColor: active ? 'rgba(8,145,178,0.5)' : 'var(--border-color)',
                                                    color: active ? '#22d3ee' : 'var(--text-muted)',
                                                }}>{l.label}</button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'tests' && (
                        <>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Код студента прогоняется через каждый тест: на вход подаётся «Вход» (stdin), вывод программы сверяется с «Ожидаемый вывод». Скрытые тесты студент не видит — только результат (прошёл / не прошёл).
                            </div>

                            {form.testCases.map((tc, i) => (
                                <div key={tc.id} style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Тест {i + 1}</span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={tc.isHidden}
                                                onChange={e => updateTestCase(tc.id, { isHidden: e.target.checked })} />
                                            🔒 Скрытый
                                        </label>
                                        <button onClick={() => removeTestCase(tc.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px', padding: '2px 6px' }}>
                                            Удалить
                                        </button>
                                    </div>
                                    <input
                                        className="deck-input"
                                        style={{ background: 'var(--bg-deep)', width: '100%', fontSize: '13px' }}
                                        placeholder="Описание (необязательно)"
                                        value={tc.description || ''}
                                        onChange={e => updateTestCase(tc.id, { description: e.target.value })}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Вход (stdin)</label>
                                            <textarea className="deck-input"
                                                style={{ background: 'var(--bg-deep)', width: '100%', minHeight: '60px', resize: 'vertical', fontSize: '13px', fontFamily: 'monospace' }}
                                                value={tc.input}
                                                onChange={e => updateTestCase(tc.id, { input: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ожидаемый вывод</label>
                                            <textarea className="deck-input"
                                                style={{ background: 'var(--bg-deep)', width: '100%', minHeight: '60px', resize: 'vertical', fontSize: '13px', fontFamily: 'monospace' }}
                                                value={tc.expectedOutput}
                                                onChange={e => updateTestCase(tc.id, { expectedOutput: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button className="btn btn-ghost" onClick={addTestCase} style={{ alignSelf: 'flex-start' }}>
                                + Добавить тест
                            </button>
                        </>
                    )}

                    {tab === 'settings' && (
                        <>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Дедлайн</label>
                                <DateTimePicker
                                    value={form.deadline}
                                    onChange={val => setForm(f => ({ ...f, deadline: val }))}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Макс. балл</label>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    {[5, 10, 100].map(p => (
                                        <button key={p} onClick={() => setForm(f => ({ ...f, maxScore: p }))}
                                            style={{ padding: '4px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                                background: form.maxScore === p ? 'rgba(8,145,178,0.15)' : 'var(--bg-input)',
                                                borderColor: form.maxScore === p ? 'rgba(8,145,178,0.5)' : 'var(--border-color)',
                                                color: form.maxScore === p ? '#22d3ee' : 'var(--text-muted)',
                                            }}>{p}-балльная</button>
                                    ))}
                                </div>
                                <input type="number" className="deck-input" style={{ background: 'var(--bg-input)', width: '100%', fontSize: '14px' }} min={1}
                                    value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: Number(e.target.value) }))} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {([
                                    ['strictDeadline', 'Строгий дедлайн — блокировать после срока'],
                                    ['allowResubmit', 'Разрешить пересдачу после проверки'],
                                    ['showFeedbackToStudent', 'Показывать студенту оценку и комментарий'],
                                    ['recordCodeHistory', 'Записывать историю ввода кода'],
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
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handlePublish}
                        disabled={publishing || saving}
                        style={{ flex: 1, minWidth: '160px', padding: '11px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: publishing ? 'not-allowed' : 'pointer', border: 'none', color: '#fff', background: isPublished ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #0891b2, #0e7490)', boxShadow: isPublished ? '0 4px 14px rgba(22,163,74,0.3)' : '0 4px 14px rgba(8,145,178,0.35)', opacity: publishing ? 0.7 : 1, transition: '0.2s' }}
                    >
                        {publishing ? 'Публикация...' : isPublished ? '🔔 Уведомить повторно' : '🚀 Опубликовать'}
                    </button>
                    <button className="btn btn-ghost" onClick={handleSave} disabled={saving} style={{ flexShrink: 0 }}>
                        {saving ? '...' : <><Icons.Save size={14} /> Сохранить</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

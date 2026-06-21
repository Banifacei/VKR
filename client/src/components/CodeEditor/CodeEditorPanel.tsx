import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';

export interface HistoryEntry { ts: number; code: string }

const LANGUAGES: { id: string; label: string; monacoLang: string; placeholder: string }[] = [
    { id: 'python',     label: 'Python',     monacoLang: 'python',     placeholder: 'print("Hello, World!")' },
    { id: 'javascript', label: 'JavaScript', monacoLang: 'javascript', placeholder: 'console.log("Hello, World!");' },
    { id: 'typescript', label: 'TypeScript', monacoLang: 'typescript', placeholder: 'const msg: string = "Hello";\nconsole.log(msg);' },
    { id: 'java',       label: 'Java',       monacoLang: 'java',       placeholder: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
    { id: 'c',          label: 'C',          monacoLang: 'c',          placeholder: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
    { id: 'c++',        label: 'C++',        monacoLang: 'cpp',        placeholder: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
];

interface Props {
    allowedLanguages: string[];
    codeTemplate?: string | null;
    recordHistory: boolean;
    initialCode?: string;
    initialLanguage?: string;
    readOnly?: boolean;
    onCodeChange?: (code: string, lang: string, history: HistoryEntry[]) => void;
    /** Вызывается перед сдачей, чтобы сделать финальный снимок истории */
    onFlushHistory?: (flush: () => HistoryEntry[]) => void;
}

export const CodeEditorPanel: React.FC<Props> = ({
    allowedLanguages, codeTemplate, recordHistory,
    initialCode, initialLanguage, readOnly = false, onCodeChange, onFlushHistory,
}) => {
    const { showToast } = useToast();

    const available = LANGUAGES.filter(l => allowedLanguages.includes(l.id));
    const defaultLang = available.find(l => l.id === initialLanguage) ?? available[0];

    const [lang, setLang] = useState(defaultLang ?? LANGUAGES[0]);
    const [code, setCode] = useState(initialCode ?? codeTemplate ?? defaultLang?.placeholder ?? '');
    const [stdin, setStdin] = useState('');
    const [output, setOutput] = useState<{ stdout: string; stderr: string; exitCode: number; compileOutput?: string | null } | null>(null);
    const [running, setRunning] = useState(false);
    const [showStdin, setShowStdin] = useState(false);

    const history = useRef<HistoryEntry[]>([]);
    const lastSnapshotCode = useRef('');

    const snapshot = useCallback((currentCode: string) => {
        if (!recordHistory || currentCode === lastSnapshotCode.current) return;
        history.current.push({ ts: Date.now(), code: currentCode });
        lastSnapshotCode.current = currentCode;
    }, [recordHistory]);

    const handleChange = (value: string | undefined) => {
        const v = value ?? '';
        setCode(v);
        if (!readOnly) {
            snapshot(v);
            onCodeChange?.(v, lang.id, history.current);
        }
    };

    // Expose flush function to parent so submit captures the final state
    useEffect(() => {
        onFlushHistory?.(() => {
            snapshot(code);
            return history.current;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onFlushHistory, code]);

    const run = async () => {
        if (!code.trim()) { showToast('Напишите код перед запуском', 'error'); return; }
        snapshot(code); // snapshot before run
        setRunning(true);
        setOutput(null);
        try {
            const r = await api.post('/code/execute', { language: lang.id, code, stdin });
            setOutput(r.data);
        } catch (e: any) {
            const msg = e.response?.data?.message ?? e.message ?? 'Ошибка запуска';
            const hint = e.response?.status === 400 ? ' (язык не установлен — обратитесь к администратору)' : '';
            showToast(msg + hint, 'error');
        } finally {
            setRunning(false);
        }
    };

    const exitColor = output == null ? 'var(--text-muted)' : output.exitCode === 0 ? '#22c55e' : '#ef4444';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Language selector + controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {available.map(l => (
                        <button
                            key={l.id}
                            onClick={() => { setLang(l); setCode(codeTemplate ?? l.placeholder); setOutput(null); }}
                            disabled={readOnly}
                            style={{
                                padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                border: '1px solid',
                                borderColor: lang.id === l.id ? 'rgba(124,58,237,0.5)' : 'var(--border-color)',
                                background: lang.id === l.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-input)',
                                color: lang.id === l.id ? '#a78bfa' : 'var(--text-muted)',
                                cursor: readOnly ? 'default' : 'pointer',
                            }}
                        >{l.label}</button>
                    ))}
                </div>
                {!readOnly && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setShowStdin(s => !s)}
                        >stdin</button>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '4px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            onClick={run}
                            disabled={running}
                        >
                            {running ? 'Запуск...' : <><Icons.Play size={12} /> Запустить</>}
                        </button>
                    </div>
                )}
            </div>

            {showStdin && !readOnly && (
                <textarea
                    placeholder="stdin (входные данные для программы)"
                    value={stdin}
                    onChange={e => setStdin(e.target.value)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', minHeight: '60px', color: 'var(--text-main)' }}
                />
            )}

            {/* Monaco Editor */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', minHeight: '320px' }}>
                <Editor
                    height="320px"
                    language={lang.monacoLang}
                    value={code}
                    onChange={handleChange}
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        tabSize: 4,
                        theme: 'vs-dark',
                        padding: { top: 10 },
                    }}
                    theme="vs-dark"
                />
            </div>

            {/* Output */}
            {output && (
                <div style={{ background: '#0d0d0d', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', fontFamily: 'monospace', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <span style={{ color: exitColor }}>●</span>
                        Код завершения: <span style={{ color: exitColor, fontWeight: 700 }}>{output.exitCode}</span>
                    </div>
                    {output.compileOutput && (
                        <div style={{ color: '#f59e0b', whiteSpace: 'pre-wrap', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                            <div style={{ fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>КОМПИЛЯЦИЯ:</div>
                            {output.compileOutput}
                        </div>
                    )}
                    {output.stdout && (
                        <div style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>STDOUT:</div>
                            {output.stdout}
                        </div>
                    )}
                    {output.stderr && (
                        <div style={{ color: '#f87171', whiteSpace: 'pre-wrap', marginTop: output.stdout ? '8px' : 0 }}>
                            <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>STDERR:</div>
                            {output.stderr}
                        </div>
                    )}
                    {!output.stdout && !output.stderr && !output.compileOutput && (
                        <span style={{ color: 'var(--text-muted)' }}>(нет вывода)</span>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Replay (просмотр истории ввода преподом) ──────────────────────────────────
export const CodeHistoryReplay: React.FC<{ submissionId: number; language: string }> = ({ submissionId, language }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [idx, setIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const monacoLang = LANGUAGES.find(l => l.id === language)?.monacoLang ?? 'plaintext';

    useEffect(() => {
        api.get(`/hw/submissions/${submissionId}/history`)
            .then(r => { setHistory(r.data); setIdx(r.data.length - 1); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [submissionId]);

    if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px' }}>Загрузка истории...</div>;
    if (!history.length) return <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px' }}>История ввода не записывалась или была удалена.</div>;

    const entry = history[idx];
    const start = history[0].ts;
    const elapsed = Math.round((entry.ts - start) / 1000);
    const totalSecs = Math.round((history[history.length - 1].ts - start) / 1000);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(elapsed)} / {fmt(totalSecs)}
                </span>
                <input
                    type="range" min={0} max={history.length - 1} value={idx}
                    onChange={e => setIdx(Number(e.target.value))}
                    style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {idx + 1} / {history.length} снимков
                </span>
            </div>
            {idx > 0 && history[idx].code === history[idx - 1].code && (
                <div style={{ fontSize: '12px', color: '#f59e0b' }}>Код не изменился с предыдущего снимка</div>
            )}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <Editor
                    height="300px"
                    language={monacoLang}
                    value={entry.code}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, theme: 'vs-dark', padding: { top: 8 } }}
                    theme="vs-dark"
                />
            </div>
        </div>
    );
};

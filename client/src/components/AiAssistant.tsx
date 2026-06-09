import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import './AiAssistant.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    blocked?: boolean;
}

const SUGGESTIONS = [
    'Как получить сертификат?',
    'Что такое бейджи?',
    'Как сдать домашнее задание?',
    'Как работает таймер на вопросы?',
];

const LumiIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M10 1C10 1 11.2 5.8 13.5 8C15.8 10.2 19 10 19 10C19 10 15.8 10.4 13.5 12.5C11.2 14.6 10 19 10 19C10 19 8.8 14.6 6.5 12.5C4.2 10.4 1 10 1 10C1 10 4.2 9.6 6.5 8C8.8 6.4 10 1 10 1Z"
            fill="currentColor"
        />
        <circle cx="16" cy="4" r="1.5" fill="currentColor" opacity="0.55" />
    </svg>
);

const UserIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="4.5" r="2.5" fill="currentColor" opacity="0.8"/>
        <path d="M1.5 12.5C1.5 10 4 8 7 8C10 8 12.5 10 12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
    </svg>
);

export function AiAssistant() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [hiddenByTest, setHiddenByTest] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Re-fetch status on every page navigation so disabling in admin takes effect immediately
    useEffect(() => {
        api.get<{ enabled: boolean }>('/assistant/status')
            .then(r => {
                setEnabled(r.data.enabled);
                if (!r.data.enabled) setOpen(false);
            })
            .catch(() => setEnabled(true));
    }, [location.pathname]);

    // Hide when TestRunner is active
    useEffect(() => {
        const handler = (e: Event) => {
            const hide = (e as CustomEvent<boolean>).detail;
            setHiddenByTest(hide);
            if (hide) setOpen(false);
        };
        window.addEventListener('lumeo:assistant-hide', handler);
        return () => window.removeEventListener('lumeo:assistant-hide', handler);
    }, []);

    // Scroll to bottom and focus input when panel opens or new message arrives
    useEffect(() => {
        if (open) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            inputRef.current?.focus();
        }
    }, [open, messages.length]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const fab = document.getElementById('aia-fab-btn');
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                e.target !== fab &&
                !fab?.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const sendMessage = useCallback(async (text: string) => {
        const q = text.trim();
        if (!q || loading) return;

        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
            const { data } = await api.post<{ answer: string; blocked: boolean }>('/assistant/ask', {
                question: q,
                history,
            });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                blocked: data.blocked,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Произошла ошибка при обращении к ассистенту. Попробуй ещё раз.',
            }]);
        } finally {
            setLoading(false);
        }
    }, [messages, loading]);

    // All hooks above — conditional render below is safe
    const isLessonPage = /\/course\/[^/]+\/lesson\//.test(location.pathname);
    if (!isAuthenticated || isLessonPage || hiddenByTest || enabled === null || enabled === false) return null;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    };

    return (
        <>
            {open && (
                <div className="aia-panel" ref={panelRef}>
                    {/* Header */}
                    <div className="aia-header">
                        <div className="aia-header-icon">
                            <LumiIcon size={16} />
                        </div>
                        <div className="aia-header-info">
                            <div className="aia-header-title">Луми — ИИ-ассистент</div>
                            <div className="aia-header-sub">Помогу разобраться с платформой</div>
                        </div>
                        <button className="aia-header-close" onClick={() => setOpen(false)} title="Закрыть">✕</button>
                    </div>

                    {/* Messages */}
                    <div className="aia-messages">
                        {messages.length === 0 ? (
                            <div className="aia-suggestions">
                                <div className="aia-suggestion-label">Популярные вопросы</div>
                                {SUGGESTIONS.map(s => (
                                    <button key={s} className="aia-suggestion-btn" onClick={() => sendMessage(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`aia-msg ${msg.role}${msg.blocked ? ' blocked' : ''}`}>
                                    <div className="aia-msg-avatar">
                                        {msg.role === 'user' ? <UserIcon /> : <LumiIcon size={14} />}
                                    </div>
                                    <div className="aia-bubble">{msg.content}</div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="aia-typing">
                                <div className="aia-msg-avatar aia-msg-avatar--assistant">
                                    <LumiIcon size={14} />
                                </div>
                                <div className="aia-typing-dots">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="aia-input-row">
                        <textarea
                            ref={inputRef}
                            className="aia-input"
                            placeholder="Задай вопрос..."
                            rows={1}
                            value={input}
                            onChange={handleTextareaInput}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            className="aia-send"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            title="Отправить"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 8L14 2L8 14L7 9L2 8Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating button */}
            <button
                id="aia-fab-btn"
                className={`aia-fab${open ? ' open' : ''}`}
                onClick={() => setOpen(v => !v)}
                title={open ? 'Закрыть ассистента' : 'Открыть ИИ-ассистента'}
            >
                {open
                    ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    : <LumiIcon size={22} />
                }
            </button>
        </>
    );
}

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

export function AiAssistant() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Hide on video lesson pages and test pages
    const isLessonPage = /\/course\/[^/]+\/lesson\//.test(location.pathname);
    if (!isAuthenticated || isLessonPage) return null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (open) {
            scrollToBottom();
            inputRef.current?.focus();
        }
    }, [open, messages.length]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const fab = document.getElementById('aia-fab-btn');
            if (panelRef.current && !panelRef.current.contains(e.target as Node) && e.target !== fab && !fab?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const sendMessage = useCallback(async (text: string) => {
        const q = text.trim();
        if (!q || loading) return;

        const userMsg: Message = { role: 'user', content: q };
        setMessages(prev => [...prev, userMsg]);
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // Auto-resize
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
                        <div className="aia-header-icon">🤖</div>
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
                                    <button
                                        key={s}
                                        className="aia-suggestion-btn"
                                        onClick={() => sendMessage(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`aia-msg ${msg.role}${msg.blocked ? ' blocked' : ''}`}>
                                    <div className="aia-msg-avatar">
                                        {msg.role === 'user' ? '👤' : '🤖'}
                                    </div>
                                    <div className="aia-bubble">{msg.content}</div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="aia-typing">
                                <div className="aia-msg-avatar" style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', fontSize: 13, flexShrink: 0 }}>🤖</div>
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
                            ➤
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
                {open ? '✕' : '🤖'}
            </button>
        </>
    );
}

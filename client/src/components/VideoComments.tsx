import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axiosInstance';
import { Icons } from './Icons';
import './VideoComments.css';
import { sseQuery } from '../utils/sseTicket';

interface IUser { id: number; firstName: string; lastName: string; avatarUrl?: string; role: string }
interface IComment {
    id: number;
    text: string;
    createdAt: string;
    user: IUser;
    replies?: IComment[];
}

interface Props {
    videoId: number;
    currentUserId?: number;
    currentUserRole?: string;
}

const Avatar = ({ user }: { user: IUser }) =>
    user.avatarUrl
        ? <img src={user.avatarUrl} alt="" className="vc-avatar" />
        : <div className="vc-avatar vc-avatar-placeholder">{user.firstName[0]}</div>;

const timeFmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const VideoComments = ({ videoId, currentUserId, currentUserRole }: Props) => {
    const [comments, setComments] = useState<IComment[]>([]);
    const [text, setText]         = useState('');
    const [replyTo, setReplyTo]   = useState<IComment | null>(null);
    const [sending, setSending]   = useState(false);
    const [loading, setLoading]   = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/comments/video/${videoId}`);
            setComments(res.data);
        } catch { /* */ }
        finally { setLoading(false); }
    }, [videoId]);

    useEffect(() => { load(); }, [load]);

    // SSE: получаем новые комментарии в реальном времени
    const sseRef = useRef<EventSource | null>(null);
    useEffect(() => {
        let active = true;
        sseQuery().then(q => {
            if (!active || !q) return;
            const es = new EventSource(`/api/comments/video/${videoId}/stream?${q}`);
            sseRef.current = es;
            es.onmessage = (e) => {
                try {
                    const d = JSON.parse(e.data);
                    if (d.type === 'new_comment') {
                        const newComment: IComment = d.comment;
                        const parentId: number | null = d.parentId;
                        if (parentId === null) {
                            setComments(prev => prev.some(c => c.id === newComment.id) ? prev : [newComment, ...prev]);
                        } else {
                            setComments(prev => prev.map(c => {
                                if (c.id !== parentId) return c;
                                if ((c.replies || []).some(r => r.id === newComment.id)) return c;
                                return { ...c, replies: [...(c.replies || []), newComment] };
                            }));
                        }
                    } else if (d.type === 'delete_comment') {
                        const { commentId, parentId } = d;
                        if (parentId === null) {
                            setComments(prev => prev.filter(c => c.id !== commentId));
                        } else {
                            setComments(prev => prev.map(c => {
                                if (c.id !== parentId) return c;
                                return { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) };
                            }));
                        }
                    }
                } catch { /* */ }
            };
        });
        return () => { active = false; sseRef.current?.close(); sseRef.current = null; };
    }, [videoId]);

    const submit = async () => {
        if (!text.trim()) return;
        setSending(true);
        try {
            // SSE доставит комментарий в реальном времени (включая текущему пользователю)
            await api.post(`/comments/video/${videoId}`, {
                text: text.trim(),
                parentId: replyTo?.id || null,
            });
            setText('');
            setReplyTo(null);
        } catch { /* */ }
        finally { setSending(false); }
    };

    const remove = async (id: number) => {
        if (!confirm('Удалить комментарий?')) return;
        await api.delete(`/comments/${id}`);
        // SSE доставит delete_comment всем зрителям автоматически
    };

    const canDelete = (c: IComment) =>
        c.user.id === currentUserId || currentUserRole === 'teacher' || currentUserRole === 'admin';

    const CommentRow = ({ c, isReply = false }: { c: IComment; isReply?: boolean }) => (
        <div className={`vc-comment ${isReply ? 'vc-reply' : ''}`}>
            <Avatar user={c.user} />
            <div className="vc-comment-body">
                <div className="vc-comment-meta">
                    <span className="vc-author">
                        {c.user.firstName} {c.user.lastName}
                        {c.user.role !== 'student' && (
                            <span className="vc-role-badge">{c.user.role === 'admin' ? 'Админ' : 'Преподаватель'}</span>
                        )}
                    </span>
                    <span className="vc-date">{timeFmt(c.createdAt)}</span>
                </div>
                <p className="vc-text">{c.text}</p>
                <div className="vc-actions">
                    {!isReply && currentUserId && (
                        <button className="vc-action-btn" onClick={() => setReplyTo(c)}>
                            Ответить
                        </button>
                    )}
                    {canDelete(c) && (
                        <button className="vc-action-btn danger" onClick={() => remove(c.id)}>
                            <Icons.Trash size={12} /> Удалить
                        </button>
                    )}
                </div>
                {c.replies?.map(r => <CommentRow key={r.id} c={r} isReply />)}
            </div>
        </div>
    );

    return (
        <div className="vc-root">
            <h3 className="vc-heading">
                <Icons.Users size={16} /> Обсуждение
                {comments.length > 0 && <span className="vc-count">{comments.length}</span>}
            </h3>

            {/* Форма ввода */}
            {currentUserId ? (
                <div className="vc-form">
                    {replyTo && (
                        <div className="vc-reply-hint">
                            Ответ на: <em>{replyTo.user.firstName} {replyTo.user.lastName}</em>
                            <button onClick={() => setReplyTo(null)}>✕</button>
                        </div>
                    )}
                    <textarea
                        className="vc-input"
                        placeholder="Напишите вопрос или комментарий... (Enter — отправить, Shift+Enter — новая строка)"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!sending && text.trim()) submit();
                            }
                        }}
                        rows={3}
                        maxLength={2000}
                    />
                    <div className="vc-form-footer">
                        <span className="vc-char-count">{text.length}/2000</span>
                        <button
                            className="btn btn-primary vc-submit"
                            onClick={submit}
                            disabled={sending || !text.trim()}
                        >
                            {sending ? 'Отправка...' : 'Отправить'}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="vc-login-hint">Войдите, чтобы оставить комментарий</p>
            )}

            {/* Список */}
            <div className="vc-list">
                {loading && <div className="vc-loading"><Icons.Spinner size={16} /> Загрузка...</div>}
                {!loading && comments.length === 0 && (
                    <div className="vc-empty">Будьте первым, кто задаст вопрос!</div>
                )}
                {comments.map(c => <CommentRow key={c.id} c={c} />)}
            </div>
        </div>
    );
};

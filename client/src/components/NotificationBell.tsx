import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { Icons } from './Icons';
import './NotificationBell.css';

interface INotification {
    id: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

const typeIcon: Record<string, React.ReactNode> = {
    enrollment_approved: <Icons.Check   size={13} color="#00ff88" />,
    enrollment_rejected: <Icons.Fail    size={13} color="#ff4d4d" />,
    new_content:         <Icons.Video   size={13} color="#4285f4" />,
    course_completed:    <Icons.Trophy  size={13} color="#f0c040" />,
    course_request:      <Icons.Bell    size={13} color="#f09819" />,
};

export const NotificationBell = () => {
    const navigate = useNavigate();
    const [open, setOpen]                 = useState(false);
    const [items, setItems]               = useState<INotification[]>([]);
    const [unread, setUnread]             = useState(0);
    const dropRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setItems(res.data.notifications);
            setUnread(res.data.unread);
        } catch { /* тихо */ }
    }, []);

    // SSE — мгновенные уведомления
    useEffect(() => {
        load();
        const token = localStorage.getItem('lumeo_token');
        if (!token) return;
        const es = new EventSource(`/api/notifications/stream?token=${token}`);
        es.onmessage = (e) => {
            try {
                const n: INotification = JSON.parse(e.data);
                setItems(prev => [n, ...prev]);
                setUnread(u => u + 1);
            } catch { /* */ }
        };
        es.onerror = () => es.close();
        return () => es.close();
    }, []);

    // Закрываем при клике вне
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = async () => {
        await api.patch('/notifications/read-all');
        setItems(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnread(0);
    };

    const handleClick = async (n: INotification) => {
        if (!n.isRead) {
            await api.patch(`/notifications/${n.id}/read`);
            setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
            setUnread(u => Math.max(0, u - 1));
        }
        setOpen(false);
        if (n.link) navigate(n.link);
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        await api.delete(`/notifications/${id}`);
        const removed = items.find(n => n.id === id);
        setItems(prev => prev.filter(n => n.id !== id));
        if (removed && !removed.isRead) setUnread(u => Math.max(0, u - 1));
    };

    const fmt = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        if (diff < 60)    return 'только что';
        if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
        return d.toLocaleDateString('ru-RU');
    };

    return (
        <div className="nb-wrap" ref={dropRef}>
            <button className="nb-btn" onClick={() => setOpen(o => !o)} title="Уведомления">
                <Icons.Bell size={17} />
                {unread > 0 && <span className="nb-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div className="nb-dropdown">
                    <div className="nb-header">
                        <span>Уведомления</span>
                        {unread > 0 && <button className="nb-mark-all" onClick={markAllRead}>Прочитать все</button>}
                    </div>

                    <div className="nb-list">
                        {items.length === 0 && (
                            <div className="nb-empty">Уведомлений нет</div>
                        )}
                        {items.map(n => (
                            <div
                                key={n.id}
                                className={`nb-item ${n.isRead ? 'read' : 'unread'}`}
                                onClick={() => handleClick(n)}
                            >
                                <span className="nb-type-icon">{typeIcon[n.type] ?? <Icons.Bell size={13} />}</span>
                                <div className="nb-body">
                                    <div className="nb-title">{n.title}</div>
                                    <div className="nb-msg">{n.message}</div>
                                    <div className="nb-time">{fmt(n.createdAt)}</div>
                                </div>
                                <button className="nb-del" onClick={e => handleDelete(e, n.id)} title="Удалить">
                                    <Icons.Close size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

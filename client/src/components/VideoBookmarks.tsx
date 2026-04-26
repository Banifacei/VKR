import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axiosInstance';
import { Icons } from './Icons';

interface IBookmark {
    id: number;
    timestamp: number;
    note: string | null;
    createdAt: string;
}

interface Props {
    videoId: number;
    currentTime: number;   // текущая позиция плеера (секунды)
    onSeek?: (t: number) => void;
    visible: boolean;
}

const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const VideoBookmarks = ({ videoId, currentTime, onSeek, visible }: Props) => {
    const [bookmarks, setBookmarks] = useState<IBookmark[]>([]);
    const [note, setNote]           = useState('');
    const [saving, setSaving]       = useState(false);
    const [editId, setEditId]       = useState<number | null>(null);
    const [editNote, setEditNote]   = useState('');
    const containerRef              = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/bookmarks/video/${videoId}`);
            setBookmarks(res.data);
        } catch { /* */ }
    }, [videoId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (visible) containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [visible]);

    if (!visible) return null;

    const add = async () => {
        setSaving(true);
        try {
            await api.post(`/bookmarks/video/${videoId}`, {
                timestamp: Math.floor(currentTime),
                note: note.trim() || null,
            });
            setNote('');
            await load();
        } catch { /* */ }
        finally { setSaving(false); }
    };

    const remove = async (id: number) => {
        await api.delete(`/bookmarks/${id}`);
        setBookmarks(b => b.filter(x => x.id !== id));
    };

    const saveEdit = async (id: number) => {
        await api.patch(`/bookmarks/${id}`, { note: editNote.trim() || null });
        setEditId(null);
        await load();
    };

    return (
        <div ref={containerRef} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Icons.Time size={15} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>Закладки</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Текущий момент: {fmtTime(currentTime)}</span>
            </div>

            {/* Добавить закладку */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    style={{
                        flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                        borderRadius: 8, color: 'var(--text-main)', padding: '6px 10px', fontSize: 13,
                        fontFamily: 'inherit', outline: 'none',
                    }}
                    placeholder="Заметка (необязательно)..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && add()}
                    maxLength={300}
                />
                <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                    onClick={add}
                    disabled={saving}
                >
                    + {fmtTime(currentTime)}
                </button>
            </div>

            {/* Список */}
            {bookmarks.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Закладок нет. Нажмите «+» чтобы сохранить текущий момент.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bookmarks.map(bm => (
                    <div key={bm.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--bg-card)', borderRadius: 8, padding: '8px 10px',
                    }}>
                        <button
                            onClick={() => onSeek?.(bm.timestamp)}
                            style={{
                                background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)',
                                borderRadius: 6, color: 'var(--primary,#00ff88)', fontSize: 12,
                                fontFamily: 'monospace', padding: '2px 8px', cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            {fmtTime(bm.timestamp)}
                        </button>

                        {editId === bm.id ? (
                            <>
                                <input
                                    style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-main)', padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                                    value={editNote}
                                    onChange={e => setEditNote(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(bm.id); if (e.key === 'Escape') setEditId(null); }}
                                    autoFocus
                                    maxLength={300}
                                />
                                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => saveEdit(bm.id)}>Сохранить</button>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setEditId(null)}>Отмена</button>
                            </>
                        ) : (
                            <>
                                <span
                                    style={{ flex: 1, fontSize: 13, color: bm.note ? 'var(--text-main)' : 'var(--text-muted)', cursor: bm.note ? 'default' : 'pointer' }}
                                    onClick={() => { setEditId(bm.id); setEditNote(bm.note || ''); }}
                                >
                                    {bm.note || <em style={{ color: 'var(--text-muted)' }}>добавить заметку...</em>}
                                </span>
                                <button
                                    onClick={() => { setEditId(bm.id); setEditNote(bm.note || ''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                    title="Редактировать"
                                >
                                    <Icons.Edit size={12} />
                                </button>
                                <button
                                    onClick={() => remove(bm.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                    title="Удалить"
                                >
                                    <Icons.Trash size={12} />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

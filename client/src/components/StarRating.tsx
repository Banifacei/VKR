import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

interface Props {
    courseId: number;
    size?: 'sm' | 'md';
}

export const StarRating = ({ courseId, size = 'md' }: Props) => {
    const [hover, setHover]       = useState(0);
    const [saving, setSaving]     = useState(false);
    const [myRating, setMyRating] = useState<number>(0);
    const [avg, setAvg]           = useState(0);
    const [total, setTotal]       = useState(0);
    const px = size === 'sm' ? 14 : 18;

    const load = async () => {
        try {
            const r = await api.get(`/ratings/course/${courseId}`);
            setAvg(r.data.avg ?? 0);
            setTotal(r.data.total ?? 0);
            setMyRating(r.data.myRating?.rating ?? 0);
        } catch { /* */ }
    };

    useEffect(() => { load(); }, [courseId]);

    const handleRate = async (rating: number) => {
        if (saving) return;
        setSaving(true);
        try {
            await api.post(`/ratings/course/${courseId}`, { rating });
            await load();
        } catch { /* */ }
        finally { setSaving(false); }
    };

    const displayRating = hover || myRating;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ваша оценка:</span>
            <div
                style={{ display: 'flex', gap: 2, cursor: 'pointer' }}
                onMouseLeave={() => setHover(0)}
            >
                {[1,2,3,4,5].map(n => (
                    <svg
                        key={n}
                        width={px} height={px}
                        viewBox="0 0 24 24"
                        fill={n <= displayRating ? '#f0c040' : 'none'}
                        stroke={n <= displayRating ? '#f0c040' : 'var(--text-muted)'}
                        strokeWidth={2}
                        style={{ transition: 'fill 0.1s, stroke 0.1s', flexShrink: 0 }}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => handleRate(n)}
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                ))}
            </div>
            {total > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {avg.toFixed(1)} <span style={{ color: 'var(--text-muted)' }}>({total})</span>
                </span>
            )}
        </div>
    );
};

// Только для отображения (без интерактивности)
export const StarDisplay = ({ avg, total, size = 'sm' }: { avg: number; total: number; size?: 'sm' | 'md' }) => {
    const px = size === 'sm' ? 13 : 16;
    const full = Math.floor(avg);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 1 }}>
                {[1,2,3,4,5].map(n => (
                    <svg key={n} width={px} height={px} viewBox="0 0 24 24"
                        fill={n <= full ? '#f0c040' : 'none'}
                        stroke={n <= full ? '#f0c040' : 'var(--text-muted)'}
                        strokeWidth={2}
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                ))}
            </div>
            {total > 0
                ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{avg.toFixed(1)} ({total})</span>
                : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет оценок</span>
            }
        </div>
    );
};

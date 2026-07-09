import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icons } from '../Icons';
import { pluralizeRu } from '../../utils/pluralize';

// Форматирует дату на русском: "15 апреля в 12:00"
function formatReleaseDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
}

// Возвращает строку обратного отсчёта если меньше 24 часов, иначе null
function getCountdown(iso: string): string | null {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SortableCard = ({ item, idx, isEditMode, completedVideoIds, testResults, onClick, onEdit, onDelete }: any) => {
    const id = `${item.type}-${item.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });

    const isVideo    = item.type === 'video';
    const isHomework = item.type === 'homework';
    const isCode     = item.type === 'code';
    const isCompleted = isVideo ? completedVideoIds.includes(item.id) : (testResults[item.id]?.passed || false);

    // Анонс: есть unlockDate и он в будущем
    const isUpcoming = !isEditMode && item.unlockDate && new Date(item.unlockDate) > new Date();

    // Countdown — обновляем каждую секунду если <24 ч
    const [countdown, setCountdown] = useState<string | null>(() => isUpcoming ? getCountdown(item.unlockDate) : null);
    useEffect(() => {
        if (!isUpcoming) return;
        const id = setInterval(() => setCountdown(getCountdown(item.unlockDate)), 1000);
        return () => clearInterval(id);
    }, [isUpcoming, item.unlockDate]);

    const cardStyle = {
        transform: CSS.Translate.toString(transform),
        transition: transition || 'none',
        position: 'relative' as const,
        zIndex: isDragging ? 9999 : (transform ? 1 : 0),
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : isUpcoming ? 'default' : 'pointer',
        opacity: isDragging ? 0.8 : 1,
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.8)' : 'none',
        scale: isDragging ? '1.05' : '1',
        borderRadius: '16px',
        overflow: 'hidden',
        background: isUpcoming ? 'var(--bg-card)' : 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column' as const,
        touchAction: isEditMode ? 'none' : 'auto',
        WebkitUserSelect: isEditMode ? 'none' as const : 'auto' as const,
        userSelect: isEditMode ? 'none' as const : 'auto' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={cardStyle}
            {...(isEditMode ? attributes : {})}
            {...(isEditMode ? listeners : {})}
            onClick={!isEditMode && !isUpcoming ? () => onClick(item) : undefined}
            className={`content-card ${isDragging ? 'is-dragging' : ''}`}
        >
            {/* Кнопки редактирования */}
            {isEditMode && (
                <div className="edit-overlay">
                    <button className="edit-btn primary" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onEdit(item); }}>
                        <Icons.Edit /> Контент
                    </button>
                    <button className="edit-btn danger" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(item); }}>
                        <Icons.Trash /> Удалить
                    </button>
                </div>
            )}

            {/* ── ОБЛОЖКА ── */}
            {isUpcoming ? (
                // Режим анонса
                <div style={{
                    height: '140px',
                    background: 'linear-gradient(160deg, var(--bg-input) 0%, var(--bg-card) 100%)',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center',
                    position: 'relative', overflow: 'hidden',
                    color: '#fff',
                }}>
                    {/* Декоративное свечение */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: isVideo
                            ? 'radial-gradient(ellipse at 50% 120%, rgba(var(--primary-rgb),0.15) 0%, transparent 70%)'
                            : 'radial-gradient(ellipse at 50% 120%, rgba(240,152,25,0.15) 0%, transparent 70%)',
                    }} />

                    {/* Бейдж СКОРО */}
                    <div style={{
                        position: 'absolute', top: '12px', left: '12px',
                        background: isVideo
                            ? 'rgba(var(--primary-rgb),0.2)'
                            : 'rgba(240,152,25,0.2)',
                        border: `1px solid ${isVideo ? 'rgba(var(--primary-rgb),0.4)' : 'rgba(240,152,25,0.4)'}`,
                        padding: '3px 10px', borderRadius: '8px',
                        fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
                        color: isVideo ? 'var(--primary)' : '#F09819',
                    }}>
                        СКОРО
                    </div>

                    {/* Замок */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <Icons.Lock size={36} color="rgba(255,255,255,0.25)" />
                    </div>

                    {/* Обратный отсчёт */}
                    {countdown && (
                        <div style={{
                            position: 'absolute', bottom: '10px',
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(8px)',
                            padding: '4px 12px', borderRadius: '20px',
                            fontSize: '13px', fontWeight: 700,
                            color: isVideo ? 'var(--primary)' : '#F09819',
                            letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums',
                        }}>
                            {countdown}
                        </div>
                    )}
                </div>
            ) : (
                // Обычная обложка
                <div style={{
                    height: '140px',
                    background: isVideo
                        ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'
                        : isHomework
                            ? 'linear-gradient(135deg, #7c3aed 0%, #b5179e 100%)'
                            : isCode
                                ? 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)'
                                : 'linear-gradient(135deg, #F09819 0%, #EDDE5D 100%)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    position: 'relative', color: '#fff',
                }}>
                    <div style={{
                        position: 'absolute', top: '12px', left: '12px',
                        background: 'rgba(0,0,0,0.5)', padding: '4px 10px',
                        borderRadius: '8px', fontSize: '11px', fontWeight: 'bold',
                        color: '#fff', backdropFilter: 'blur(4px)',
                    }}>
                        {isVideo ? 'ВИДЕО-УРОК' : isHomework ? 'ЗАДАНИЕ' : isCode ? 'КОД-ЗАДАНИЕ' : 'ТЕСТИРОВАНИЕ'}
                    </div>
                    {(isHomework || isCode) && !item.isPublished && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: '#fbbf24', backdropFilter: 'blur(4px)' }}>
                            ЧЕРНОВИК
                        </div>
                    )}
                    {isVideo ? <Icons.Video /> : isHomework ? <Icons.Upload size={40} /> : isCode ? <Icons.Code size={40} /> : <Icons.Test />}
                </div>
            )}

            {/* ── ТЕЛО КАРТОЧКИ ── */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{
                    margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.4',
                    color: isUpcoming ? 'var(--text-muted)' : 'var(--text-main)',
                }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>{idx + 1}.</span>
                    {item.title}
                </h3>

                <div style={{
                    marginTop: 'auto',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '15px',
                }}>
                    {isUpcoming ? (
                        // Дата релиза
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            <Icons.Time size={13} />
                            <span>Откроется {formatReleaseDate(item.unlockDate)}</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {isVideo ? 'Учебный материал' : (isHomework || isCode)
                                    ? `до ${new Date(item.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
                                    : (() => { const n = item.questions?.length || 0; return `${n} ${pluralizeRu(n, 'вопрос', 'вопроса', 'вопросов')}`; })()}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isVideo ? (
                                    isCompleted
                                        ? <><Icons.Check /><span style={{ fontSize: '13px', color: '#00ff88' }}>Пройдено</span></>
                                        : <Icons.Empty />
                                ) : isHomework ? (
                                    new Date() > new Date(item.deadline)
                                        ? <span style={{ fontSize: '12px', color: '#ef4444' }}>Срок истёк</span>
                                        : <span style={{ fontSize: '12px', color: '#a78bfa' }}>Активно</span>
                                ) : isCode ? (
                                    new Date() > new Date(item.deadline)
                                        ? <span style={{ fontSize: '12px', color: '#ef4444' }}>Срок истёк</span>
                                        : <span style={{ fontSize: '12px', color: '#22d3ee' }}>Активно</span>
                                ) : (
                                    testResults[item.id] ? (
                                        testResults[item.id].passed
                                            ? <><Icons.Check /><span style={{ fontSize: '13px', color: '#00ff88' }}>{testResults[item.id].score}%</span></>
                                            : <><Icons.Fail /><span style={{ fontSize: '13px', color: '#ff4d4d' }}>{testResults[item.id].score}%</span></>
                                    ) : <Icons.Empty />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

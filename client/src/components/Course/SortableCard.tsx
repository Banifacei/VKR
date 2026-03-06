import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icons } from './Icons';

export const SortableCard = ({ item, idx, isEditMode, completedVideoIds, testResults, onClick, onEdit, onDelete }: any) => {
    const id = `${item.type}-${item.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });

    const style = {
        transform: CSS.Translate.toString(transform), 
        transition: transition || 'none', 
        position: 'relative' as const,
        zIndex: isDragging ? 9999 : (transform ? 1 : 0),
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.8 : 1, 
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.8)' : 'none',
        scale: isDragging ? '1.05' : '1',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#111',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column' as const
    };

    const isVideo = item.type === 'video';
    const isCompleted = isVideo ? completedVideoIds.includes(item.id) : (testResults[item.id]?.passed || false);

    return (
        <div ref={setNodeRef} style={style} {...(isEditMode ? attributes : {})} {...(isEditMode ? listeners : {})} 
             onClick={!isEditMode ? () => onClick(item) : undefined}
             className={`content-card ${isDragging ? 'is-dragging' : ''}`}
        >
            {isEditMode && (
                <div className="edit-overlay">
                    <button className="edit-btn primary" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                        <Icons.Edit /> Контент
                    </button>
                    <button className="edit-btn danger" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(item); }}>
                        <Icons.Trash /> Удалить
                    </button>
                </div>
            )}
            <div style={{ height: '140px', background: isVideo ? 'linear-gradient(135deg, #00aeef 0%, #0056b3 100%)' : 'linear-gradient(135deg, #F09819 0%, #EDDE5D 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    {isVideo ? 'ВИДЕО-УРОК' : 'ТЕСТИРОВАНИЕ'}
                </div>
                {isVideo ? <Icons.Video /> : <Icons.Test />}
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff', lineHeight: '1.4' }}>
                    <span style={{ color: '#888', marginRight: '8px' }}>{idx + 1}.</span>{item.title}
                </h3>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                    <span style={{ fontSize: '13px', color: '#666' }}>{isVideo ? 'Учебный материал' : `${item.questions?.length || 0} вопросов`}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isVideo ? (
                            isCompleted ? <><Icons.Check /> <span style={{fontSize: '13px', color: '#00ff88'}}>Пройдено</span></> : <Icons.Empty />
                        ) : (
                            testResults[item.id] ? (
                                testResults[item.id].passed ? <><Icons.Check /> <span style={{fontSize: '13px', color: '#00ff88'}}>{testResults[item.id].score}%</span></>
                                : <><Icons.Fail /> <span style={{fontSize: '13px', color: '#ff4d4d'}}>{testResults[item.id].score}%</span></>
                            ) : <Icons.Empty />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
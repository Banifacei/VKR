import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Icons } from './Icons';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IVideo } from '../types';

interface SortableItemProps {
    video: IVideo;
    index: number;
    isActive: boolean;
    onClick: () => void;
    onEdit: (v: IVideo, e: React.MouseEvent) => void;
    onDelete: (v: IVideo, e: React.MouseEvent) => void;
}

const SortableItem = ({ video, index, isActive, onClick, onEdit, onDelete }: SortableItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 1,
        position: 'relative' as 'relative'
    };

    return (
        <div ref={setNodeRef} style={style} className={`video-item ${isActive ? 'active' : ''}`} onClick={onClick}>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: '10px', color: '#666', display: 'flex', alignItems: 'center' }} title="Потяните, чтобы изменить порядок">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="8" x2="20" y2="8"></line><line x1="4" y1="16" x2="20" y2="16"></line>
                </svg>
            </div>
            
            <div className="video-idx">{index + 1}</div>
            
            {/* Название тянется на всю ширину */}
            <div className="video-title" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</span>
                {video.isHidden && (
                    <span title="Скрыт от студентов" style={{ fontSize: '10px', background: '#333', color: '#888', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>скрыт</span>
                )}
                {!video.isHidden && video.unlockDate && new Date(video.unlockDate) > new Date() && (
                    <span title={`Откроется ${new Date(video.unlockDate).toLocaleDateString('ru-RU')}`} style={{ fontSize: '10px', background: '#1a2a1a', color: '#4caf50', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>
                        {new Date(video.unlockDate).toLocaleDateString('ru-RU')}
                    </span>
                )}
            </div>

            {/* Иконки действий */}
            <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                    className="btn btn-ghost" 
                    style={{ padding: '4px', fontSize: '12px' }} 
                    title="Переименовать" 
                    onClick={(e) => onEdit(video, e)}
                ><Icons.Edit size={14}/></button>
                <button
                    className="btn btn-ghost"
                    style={{ padding: '4px', fontSize: '12px', color: '#ff4d4d' }}
                    title="Удалить"
                    onClick={(e) => onDelete(video, e)}
                ><Icons.Trash size={14}/></button>
            </div>
        </div>
    );
};

interface DraggableVideoListProps {
    videos: IVideo[];
    selectedVideoId?: number;
    onSelectVideo: (video: IVideo) => void;
    onReorder: (newVideos: IVideo[]) => void;
    onEdit: (video: IVideo, e: React.MouseEvent) => void;
    onDelete: (video: IVideo, e: React.MouseEvent) => void;
}

export const DraggableVideoList = ({ videos, selectedVideoId, onSelectVideo, onReorder, onEdit, onDelete }: DraggableVideoListProps) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = videos.findIndex(v => v.id === active.id);
            const newIndex = videos.findIndex(v => v.id === over.id);
            onReorder(arrayMove(videos, oldIndex, newIndex));
        }
    };

    if (videos.length === 0) return <div style={{padding: '20px', color: '#666', fontSize: '13px', textAlign: 'center'}}>Нет видео в этом курсе</div>;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
                <div className="video-list">
                    {videos.map((v, idx) => (
                        <SortableItem key={v.id} video={v} index={idx} isActive={selectedVideoId === v.id} onClick={() => onSelectVideo(v)} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
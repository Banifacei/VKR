import { useEffect, useState, useRef } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { addEvent, updateEvent, deleteEvent, generateAutoSubtitles, updateVideo, getVideosByCourse, getVideoStats } from '../api/videoApi';
import { addTestQuestion, deleteTestQuestion, getCourseTests, type ICourseTest } from '../api/testApi';
import type { IVideo } from '../types';
import * as XLSX from 'xlsx';

// Drag & Drop
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const Icons = {
    Time: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Stats: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    AI: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 10.5"/></svg>,
    Spinner: () => (<svg className="ai-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>),
    Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Drag: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
    Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
};

const SortableQuestion = ({ q, i, onEdit, onDelete }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition: transition || 'all 0.2s ease',
        zIndex: isDragging ? 999 : 1,
        opacity: isDragging ? 0.8 : 1,
        scale: isDragging ? '1.03' : '1',
        rotate: isDragging ? '1deg' : '0deg',
        boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.5)' : 'none',
    };
    return (
        <div ref={setNodeRef} style={style} className={`question-row`}>
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                background: isDragging ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.05)', padding: '12px 15px', borderRadius: '12px', 
                borderLeft: `4px solid #ffd700`, gap: '15px', transition: 'background 0.2s ease' 
            }}>
                <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#666', padding: '5px' }}>
                    <Icons.Drag />
                </div>
                <div style={{ flex: 1 }}>
                    <strong style={{ color: '#888', marginRight: '10px' }}>Вопрос {i + 1}.</strong>
                    <span style={{ color: '#fff', fontSize: '15px', fontWeight: 500 }}>{q.text}</span>
                    <span style={{ marginLeft: '10px', fontSize: '10px', color: '#aaa', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{q.type.replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(0, 174, 239, 0.1)', color: '#00aeef', borderRadius: '8px' }} onClick={() => onEdit(q)}>✏️</button>
                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', borderRadius: '8px' }} onClick={() => onDelete(q.id)}>🗑️</button>
                </div>
            </div>
        </div>
    );
};

export const ContentEditorModal = ({ item, onClose, onSuccess }: any) => {
    const isVideo = item.type === 'video';
    const accentColor = isVideo ? '#00aeef' : '#ffd700';

    const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(isVideo ? item : null);
    const [selectedTest, setSelectedTest] = useState<ICourseTest | null>(!isVideo ? item : null);
    const [rightTab, setRightTab] = useState<'settings' | 'constructor'>('constructor');
    
    // --- ⚙️ ОБЩИЕ НАСТРОЙКИ ---
    const [settingsData, setSettingsData] = useState<any>({
        title: item.title || '',
        description: item.description || '',
        maxAttempts: item.maxAttempts ?? 3,
        hideResults: item.hideResults || false,
        passingScore: item.passingScore ?? 80,
        allowExternalTest: item.allowExternalTest || false,
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const isChanged = 
        settingsData.title !== (item.title || '') ||
        settingsData.description !== (item.description || '') ||
        Number(settingsData.maxAttempts) !== (item.maxAttempts ?? 3) ||
        settingsData.hideResults !== (item.hideResults || false) ||
        Number(settingsData.passingScore) !== (item.passingScore ?? 80) ||
        settingsData.allowExternalTest !== (item.allowExternalTest || false);

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const token = localStorage.getItem('lumeo_token');
            const payload = {
                ...settingsData,
                maxAttempts: Number(settingsData.maxAttempts) || 0,
                passingScore: Number(settingsData.passingScore) || 0,
            };

            if (isVideo && selectedVideo) {
                await updateVideo(selectedVideo.id, payload);
                setSelectedVideo({...selectedVideo, ...payload});
            } else if (selectedTest) {
                await fetch(`http://localhost:5000/api/tests/${selectedTest.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                setSelectedTest({...selectedTest, ...payload});
            }
            onSuccess();
        } catch (e) { alert('❌ Ошибка при сохранении настроек'); } 
        finally { setIsSavingSettings(false); }
    };

    // --- 📝 КОНСТРУКТОР ---
    const [currentTime, setCurrentTime] = useState(0);
    const [eventType, setEventType] = useState<'single_choice' | 'multiple_choice' | 'free_text' | 'info'>('single_choice');
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    const [freeTextAnswer, setFreeTextAnswer] = useState(''); 
    
    const [isStrict, setIsStrict] = useState(false);
    const [isRequired, setIsRequired] = useState(false);
    const [weight, setWeight] = useState<number | string>(1);
    const [rewindTo, setRewindTo] = useState<number | string>('');
    const [aiThreshold, setAiThreshold] = useState<number | string>(50);
    const [explanation, setExplanation] = useState('');
    
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    
    const [generatingVideos, _setGeneratingVideos] = useState<number[]>([]);
    const generatingVideosRef = useRef<number[]>([]);
    const setGeneratingVideos = (updater: any) => {
        _setGeneratingVideos(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            generatingVideosRef.current = next;
            return next;
        });
    };
    
    const [duplicateIndices, setDuplicateIndices] = useState<number[]>([]);

    // --- СТАТИСТИКА ---
    const [showStats, setShowStats] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

    const loadStats = async () => {
        if (!selectedVideo) return;
        try {
            const data = await getVideoStats(selectedVideo.id);
            setStatsData(data);
            setExpandedStudent(null); 
            setShowStats(true);
        } catch (e) { alert('Не удалось загрузить статистику'); }
    };
    // --- ДИНАМИЧЕСКИЙ РАДАР ДЛЯ СТАТИСТИКИ ---
    useEffect(() => {
        // Запускаем таймер ТОЛЬКО если открыта вкладка статистики и выбрано видео
        if (!showStats || !selectedVideo) return;
        
        const interval = setInterval(async () => {
            try {
                const newData = await getVideoStats(selectedVideo.id);
                
                // Обновляем таблицу только если данные реально изменились (кто-то решил тест)
                setStatsData(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(newData)) {
                        return newData;
                    }
                    return prev;
                });
            } catch (e) {
                // Тихо гасим ошибку, чтобы не спамить в консоль, если сеть моргнула
            }
        }, 5000); // Проверяем каждые 5 секунд
        
        return () => clearInterval(interval);
    }, [showStats, selectedVideo]);
    const exportToExcel = () => {
        if (statsData.length === 0) return alert('Нет данных для выгрузки!');
        const wsData: any[][] = [];
        wsData.push(['ВЕДОМОСТЬ РЕЗУЛЬТАТОВ ТЕСТИРОВАНИЯ']);
        wsData.push(['Урок/Тема:', selectedVideo?.title]);
        wsData.push(['Дата формирования:', new Date().toLocaleDateString('ru-RU')]);
        wsData.push([]); 
        wsData.push(['СВОДНАЯ СТАТИСТИКА ПО СТУДЕНТАМ']);
        wsData.push(['№ п/п', 'ФИО обучающегося', 'Всего ответов', 'Правильных', 'С ошибками', 'Процент усвоения', 'Рекомендуемая оценка']);

        const groups = getGroupedStats();
        groups.forEach((student, index) => {
            const percent = student.total > 0 ? Math.round((student.correct / student.total) * 100) : 0;
            let grade = 'Неудовлетворительно (2)';
            if (percent >= 90) grade = 'Отлично (5)';
            else if (percent >= 75) grade = 'Хорошо (4)';
            else if (percent >= 50) grade = 'Удовлетворительно (3)';
            wsData.push([index + 1, student.name, student.total, student.correct, student.incorrect, `${percent}%`, grade]);
        });
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 30 }, { wch: 55 }, { wch: 45 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ведомость');
        XLSX.writeFile(wb, `Ведомость_${selectedVideo?.title}.xlsx`);
    };

    const getGroupedStats = () => {
        const groups: Record<number, { correct: number; incorrect: number; name: string; userId: number }> = {};
        statsData.forEach(stat => {
            const uId = stat.userId;
            const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${uId}`;
            if (!groups[uId]) groups[uId] = { correct: 0, incorrect: 0, name, userId: uId };
            if (stat.isCorrect) groups[uId].correct++;
            else groups[uId].incorrect++;
        });
        return Object.values(groups).map(data => ({ ...data, total: data.correct + data.incorrect }));
    };

    const expandedStudentName = expandedStudent !== null ? getGroupedStats().find(s => s.userId === expandedStudent)?.name : '';
    const studentDetails = expandedStudent !== null ? statsData.filter(s => s.userId === expandedStudent) : [];

    // --- ОБНОВЛЕНИЯ ДАННЫХ (Прямые) ---
    const reloadCurrentVideo = async () => {
        if (!item?.courseId) return;
        const data = await getVideosByCourse(Number(item.courseId));
        const updated = data.find(v => v.id === selectedVideo?.id);
        if (updated) setSelectedVideo(updated);
        onSuccess();
    };

    const reloadCurrentTest = async () => {
        if (!item?.courseId) return;
        const data = await getCourseTests(Number(item.courseId));
        const updated = data.find(t => t.id === selectedTest?.id);
        if (updated) setSelectedTest(updated);
        onSuccess();
    };

    // --- ЕДИНЫЙ ЖЕЛЕЗОБЕТОННЫЙ РАДАР (Обновление без сброса таймера) ---
    useEffect(() => {
        if (!item?.courseId) return;
        
        const interval = setInterval(async () => {
            try {
                if (isVideo && selectedVideo) {
                    const data = await getVideosByCourse(Number(item.courseId));
                    const updated = data.find(v => v.id === selectedVideo.id);
                    if (updated) {
                        setSelectedVideo(prev => {
                            if (!prev) return updated;
                            
                            const prevSubsStr = JSON.stringify(prev.subtitles || []);
                            const newSubsStr = JSON.stringify(updated.subtitles || []);
                            const prevEventsStr = JSON.stringify(prev.events || []);
                            const newEventsStr = JSON.stringify(updated.events || []);

                            // Если мы ждали ИИ и текст обновился
                            if (generatingVideosRef.current.includes(updated.id) && prevSubsStr !== newSubsStr) {
                                alert("✨ Нейросеть успешно завершила генерацию субтитров!");
                                setGeneratingVideos((g: number[]) => g.filter((id: number) => id !== updated.id));
                            }

                            if (prevEventsStr !== newEventsStr || prevSubsStr !== newSubsStr) {
                                onSuccess();
                                return { ...prev, events: updated.events, subtitles: updated.subtitles };
                            }
                            return prev;
                        });
                    }
                } else if (!isVideo && selectedTest) {
                    const data = await getCourseTests(Number(item.courseId));
                    const updated = data.find(t => t.id === selectedTest.id);
                    if (updated) {
                        setSelectedTest(prev => {
                            if (!prev) return updated;
                            if (JSON.stringify(prev.questions) !== JSON.stringify(updated.questions)) {
                                onSuccess();
                                return { ...prev, questions: updated.questions };
                            }
                            return prev;
                        });
                    }
                }
            } catch (e) {}
        }, 5000);
        
        return () => clearInterval(interval);
    }, [isVideo, item]);


    // --- ФУНКЦИИ КОНСТРУКТОРА ---
    const resetForm = () => {
        setQuestionText(''); setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
        setFreeTextAnswer(''); setExplanation(''); setRewindTo(''); setAiThreshold(50); setWeight(1);
        setIsStrict(false); setIsRequired(false); setDuplicateIndices([]);
        setEditingEventId(null);
    };

    const handleAddOption = () => setOptions([...options, { text: '', isCorrect: false }]);
    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
        setDuplicateIndices([]);
    };
    const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: any) => {
        const newOptions = [...options];
        if (eventType === 'single_choice' && field === 'isCorrect' && value === true) {
            newOptions.forEach(opt => opt.isCorrect = false);
        }
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
        setDuplicateIndices([]);
    };

    const handleSaveItem = async () => {
        if (isVideo && !selectedVideo) return;
        if (!isVideo && !selectedTest) return;

        if (!questionText.trim()) return alert('Введите текст вопроса!');
        
        // ПРОВЕРКА НА ДУБЛИКАТЫ
        if (eventType === 'single_choice' || eventType === 'multiple_choice') {
            if (!options.some(o => !!o.text.trim()) || !options.some(o => o.isCorrect)) return alert('Заполните варианты и укажите верный!');
            
            const texts = options.map(o => o.text.trim().toLowerCase());
            const duplicates: number[] = [];
            for (let i = 0; i < texts.length; i++) {
                for (let j = i + 1; j < texts.length; j++) {
                    if (texts[i] && texts[i] === texts[j]) {
                        duplicates.push(i);
                        duplicates.push(j);
                    }
                }
            }
            if (duplicates.length > 0) {
                setDuplicateIndices(duplicates);
                const humanIndices = Array.from(new Set(duplicates)).map(idx => idx + 1).join(' и ');
                return alert(`⚠️ Ошибка: Варианты ответов (${humanIndices}) абсолютно одинаковые! Пожалуйста, измените текст.`);
            }
        }
        
        if (eventType === 'free_text' && !freeTextAnswer.trim()) return alert('Введите эталонный ответ!');

        setIsAddingEvent(true);
        try {
            if (isVideo) {
                const eventPayload = {
                    time: currentTime, type: eventType, question: questionText, 
                    options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
                    correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
                    isStrict, isRequired, weight: Number(weight) || 1, rewindTo: rewindTo === '' ? undefined : Number(rewindTo),
                    explanation, aiThreshold: Number(aiThreshold) || 50
                };
                if (editingEventId) await updateEvent(editingEventId, eventPayload);
                else await addEvent(selectedVideo!.id, eventPayload);
                
                await reloadCurrentVideo();
            } else {
                const testPayload = {
                    type: eventType, text: questionText,
                    options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
                    correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
                    weight: Number(weight) || 1, aiThreshold: Number(aiThreshold) || 50
                };
                
                if (editingEventId) await deleteTestQuestion(editingEventId);
                await addTestQuestion(selectedTest!.id, testPayload);
                
                await reloadCurrentTest();
            }
            
            resetForm();
        } catch (e) { alert('❌ Ошибка при сохранении'); } 
        finally { setIsAddingEvent(false); }
    };

    const handleEditClick = (ev: any) => {
        setRightTab('constructor');
        setEditingEventId(ev.id);
        if (isVideo) setCurrentTime(ev.time || 0);
        setEventType(ev.type);
        setQuestionText(ev.question || ev.text || '');
        if (ev.type === 'free_text') setFreeTextAnswer(ev.correctAnswer || '');
        if (ev.options && ev.options.length > 0) setOptions(ev.options);
        setIsStrict(ev.isStrict || false);
        setIsRequired(ev.isRequired || false);
        setWeight(ev.weight || 1);
        setRewindTo(ev.rewindTo !== null && ev.rewindTo !== undefined ? ev.rewindTo : '');
        setExplanation(ev.explanation || '');
        setAiThreshold(ev.aiThreshold || 50);
        setDuplicateIndices([]);
    };

    const handleDeleteClick = async (id: number) => {
        if (!window.confirm('Точно удалить этот вопрос?')) return;
        try {
            if (isVideo) {
                await deleteEvent(id);
                if (editingEventId === id) resetForm();
                await reloadCurrentVideo();
            } else {
                await deleteTestQuestion(id);
                await reloadCurrentTest();
            }
        } catch (e) { alert('❌ Ошибка при удалении'); }
    };

    const handleGenerateSubs = async () => {
        if (!selectedVideo) return;
        setGeneratingVideos((prev: number[]) => [...prev, selectedVideo.id]); 
        try {
            await generateAutoSubtitles(selectedVideo.id);
            alert("⏳ Нейросеть начала обработку. Субтитры появятся на таймлайне через пару минут.");
        } catch (e) {
            alert("❌ Ошибка при старте генерации.");
            setGeneratingVideos((prev: number[]) => prev.filter((id: number) => id !== selectedVideo.id)); 
        }
    };

    // --- Drag and Drop ---
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEndTest = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && selectedTest) {
            const oldIndex = selectedTest.questions!.findIndex((q: any) => q.id === active.id);
            const newIndex = selectedTest.questions!.findIndex((q: any) => q.id === over.id);
            const newQuestions = arrayMove(selectedTest.questions!, oldIndex, newIndex);
            
            setSelectedTest({ ...selectedTest, questions: newQuestions });

            try {
                const token = localStorage.getItem('lumeo_token');
                await fetch(`http://localhost:5000/api/tests/${selectedTest.id}/questions/reorder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ orderedIds: newQuestions.map((q: any) => q.id) })
                });
            } catch (e) { console.error('Ошибка сохранения порядка вопросов'); }
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px',
        }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            
            <div style={{ 
                background: '#0f0f11', border: `1px solid rgba(${isVideo ? '0,174,239' : '255,215,0'}, 0.2)`, 
                width: '100%', maxWidth: '1400px', height: '90vh', borderRadius: '24px', 
                display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 30px 60px -12px rgba(${isVideo ? '0,174,239' : '255,215,0'}, 0.15)`
            }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div style={{ 
                            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 150%)`, 
                            padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 20px rgba(${isVideo ? '0,174,239' : '255,215,0'}, 0.3)`
                        }}>
                            <span style={{ fontSize: '28px', lineHeight: 1 }}>{isVideo ? '📺' : '📝'}</span>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                                value={settingsData.title} 
                                onChange={e => setSettingsData({...settingsData, title: e.target.value})}
                                onBlur={handleSaveSettings}
                                placeholder="Введите название..."
                                style={{ 
                                    background: 'transparent', border: 'none', 
                                    color: '#fff', fontSize: '28px', fontWeight: '800', outline: 'none', width: '100%',
                                    borderBottom: '2px dashed transparent', transition: '0.3s', paddingBottom: '4px', letterSpacing: '-0.5px'
                                }}
                                onFocus={e => e.target.style.borderBottom = `2px dashed ${accentColor}`}
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        {isVideo && (
                            <button className="btn btn-ghost" onClick={loadStats} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold' }}>
                                <Icons.Stats /> Статистика
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold' }}>✕ Закрыть</button>
                    </div>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* ЛЕВАЯ КОЛОНКА */}
                    <div style={{ flex: '6', display: 'flex', flexDirection: 'column', padding: '40px', overflowY: 'auto', background: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.03) 0%, transparent 50%)' }}>
                        
                        {showStats ? (
                            <div className="stats-container" style={{ animation: 'fadeIn 0.4s ease' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                    <div>
                                        <h3 style={{margin: 0, color: '#fff', fontSize: '24px'}}>Статистика успеваемости</h3>
                                        {expandedStudent ? (
                                            <button className="btn btn-ghost" style={{ padding: 0, color: accentColor, marginTop: '10px', fontSize: '14px' }} onClick={() => setExpandedStudent(null)}>← Назад к списку группы</button>
                                        ) : (
                                            <button className="btn btn-ghost" style={{ padding: 0, color: '#888', marginTop: '10px', fontSize: '14px' }} onClick={() => setShowStats(false)}>← Вернуться к плееру</button>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', gap: '8px', background: '#217346', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px' }}>
                                        <Icons.Download /> Выгрузить Excel
                                    </button>
                                </div>
                                
                                {statsData.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '80px', color: '#666', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '50px', marginBottom: '20px', opacity: 0.5 }}>📭</div>
                                        <p style={{ fontSize: '18px' }}>Пока никто не проходил этот материал.</p>
                                    </div>
                                ) : (
                                    <>
                                        {!expandedStudent && (
                                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                <table className="stats-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                    <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}><th style={{padding:'20px'}}>Студент</th><th style={{padding:'20px'}}>Успеваемость (Прогресс)</th><th style={{padding:'20px'}}>Ответы (В / О)</th><th></th></tr></thead>
                                                    <tbody>
                                                        {getGroupedStats().map((student) => {
                                                            const percent = student.total > 0 ? Math.round((student.correct / student.total) * 100) : 0;
                                                            return (
                                                                <tr key={student.userId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                                                    <td style={{padding:'20px', color: '#fff', fontWeight: 500}}>{student.name}</td>
                                                                    <td style={{padding:'20px', width: '40%'}}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                                                                <div style={{ width: `${percent}%`, background: '#4dff88', height: '100%' }}></div>
                                                                                <div style={{ width: `${100 - percent}%`, background: '#ff4d4d', height: '100%' }}></div>
                                                                            </div>
                                                                            <span style={{ color: percent > 50 ? '#4dff88' : '#ff4d4d', fontWeight: 'bold', fontSize: '14px', width: '40px' }}>{percent}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{padding:'20px', color: '#aaa', fontSize: '14px'}}>
                                                                        <span style={{ color: '#4dff88' }}>{student.correct}</span> / <span style={{ color: '#ff4d4d' }}>{student.incorrect}</span>
                                                                    </td>
                                                                    <td style={{padding:'20px', textAlign: 'right'}}><button className="btn btn-ghost" style={{color: accentColor, background: `rgba(${isVideo ? '0,174,239' : '255,215,0'}, 0.1)`, borderRadius: '8px', padding: '8px 16px'}} onClick={() => setExpandedStudent(student.userId)}>Детали</button></td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        {expandedStudent && (
                                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                                <h4 style={{ color: '#aaa', marginBottom: '20px', fontWeight: 'normal', fontSize: '18px' }}>
                                                    Детализация ответов: <span style={{color: '#fff', fontWeight: 'bold'}}>{expandedStudentName}</span>
                                                </h4>
                                                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                    <table className="stats-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                        <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}><th style={{padding:'20px'}}>Вопрос</th><th style={{padding:'20px'}}>Ответ студента</th><th style={{padding:'20px', textAlign:'center'}}>Оценка ИИ</th><th style={{padding:'20px', textAlign:'center'}}>Вердикт</th></tr></thead>
                                                        <tbody>
                                                            {studentDetails.map((stat: any) => (
                                                                <tr key={stat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                    <td style={{padding:'20px', color: '#ccc', width: '40%', lineHeight: '1.5'}}>{stat.event?.question || 'Удален'}</td>
                                                                    <td style={{padding:'20px', color: '#fff', fontWeight: '500'}}>{stat.answer}</td>
                                                                    <td style={{padding:'20px', textAlign:'center'}}>
                                                                        {stat.event?.type === 'free_text' && stat.similarity !== null ? (
                                                                            <span style={{ color: stat.isCorrect ? '#4dff88' : '#ff4d4d', fontSize: '13px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{stat.similarity}%</span>
                                                                        ) : (<span style={{ color: '#444' }}>—</span>)}
                                                                    </td>
                                                                    <td style={{padding:'20px', textAlign:'center'}}>
                                                                        {stat.isCorrect ? (
                                                                            <div style={{background: 'rgba(77,255,136,0.1)', color: '#4dff88', padding: '6px 12px', borderRadius: '8px', display: 'inline-block', fontWeight: 'bold'}}>✅ Верно</div>
                                                                        ) : (
                                                                            <div style={{background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', padding: '6px 12px', borderRadius: '8px', display: 'inline-block', fontWeight: 'bold'}}>❌ Ошибка</div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                                {isVideo && selectedVideo && (
                                    <div style={{ width: '100%', marginBottom: '40px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', background: accentColor, filter: 'blur(100px)', opacity: 0.1, zIndex: 0 }}></div>
                                        <div className="player-wrapper-animation" style={{ position: 'relative', zIndex: 1, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                                            <VideoPlayer 
                                                key={selectedVideo.id} sources={[{ quality: 'Auto', url: selectedVideo.url, subtitles: selectedVideo.subtitles }]} 
                                                title={selectedVideo.title} events={selectedVideo.events || []} hideResults={selectedVideo.hideResults}
                                                videoId={selectedVideo.id} onTimeUpdate={(t) => setCurrentTime(t)} maxAttempts={selectedVideo.maxAttempts}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                                            <span style={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Таймлайн интерактива:</span>
                                            <button className={`btn ${generatingVideos.includes(selectedVideo.id) ? 'btn-ghost' : 'btn-primary'}`} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }} onClick={handleGenerateSubs} disabled={generatingVideos.includes(selectedVideo.id)}>
                                                {generatingVideos.includes(selectedVideo.id) ? <><Icons.Spinner /> Генерация ИИ...</> : <><Icons.AI /> Сгенерировать ИИ Субтитры</>}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isVideo && selectedVideo?.events && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[...selectedVideo.events].sort((a, b) => a.time - b.time).map(ev => (
                                            <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '15px 20px', borderRadius: '16px', borderLeft: `4px solid ${ev.type === 'info' ? '#ffd700' : '#00aeef'}`, transition: 'all 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                                <div>
                                                    <strong style={{ color: ev.type === 'info' ? '#ffd700' : '#00aeef', marginRight: '15px', fontSize: '18px', fontFamily: 'monospace' }}>{Math.floor(ev.time / 60)}:{(Math.floor(ev.time % 60)).toString().padStart(2, '0')}</strong>
                                                    <span style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>{ev.question}</span>
                                                    <span style={{ marginLeft: '12px', fontSize: '10px', color: '#888', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px', textTransform: 'uppercase' }}>{ev.type.replace('_', ' ')}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(0, 174, 239, 0.1)', color: '#00aeef', borderRadius: '8px' }} onClick={() => handleEditClick(ev)}>✏️</button>
                                                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', borderRadius: '8px' }} onClick={() => handleDeleteClick(ev.id)}>🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isVideo && selectedTest?.questions && (
                                    <div style={{ paddingBottom: '50px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <span style={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>Порядок вопросов:</span>
                                            <span style={{ color: '#666', fontSize: '12px' }}>Перетащите ☰ для сортировки</span>
                                        </div>
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTest}>
                                            <SortableContext items={selectedTest.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {selectedTest.questions.map((q, i) => (
                                                        <SortableQuestion key={q.id} q={q} i={i} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                                                    ))}
                                                    {selectedTest.questions.length === 0 && (
                                                        <div style={{ textAlign: 'center', color: '#666', padding: '80px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                                                            <div style={{ fontSize: '40px', marginBottom: '15px' }}>👇</div>
                                                            <div style={{ fontSize: '16px' }}>В тесте пока нет вопросов. Создайте первый в панели справа!</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ПРАВАЯ КОЛОНКА */}
                    <div style={{ flex: '4', minWidth: '400px', background: '#141416', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                        <div style={{ padding: '20px 20px 0 20px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <button 
                                    onClick={() => { setRightTab('constructor'); setShowStats(false); }} 
                                    style={{ flex: 1, background: rightTab === 'constructor' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: rightTab === 'constructor' ? '#fff' : '#666', padding: '12px 0', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', boxShadow: rightTab === 'constructor' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none' }}
                                >
                                    <Icons.Plus /> {editingEventId ? 'Редактирование' : 'Конструктор'}
                                </button>
                                <button 
                                    onClick={() => { setRightTab('settings'); setShowStats(false); }} 
                                    style={{ flex: 1, background: rightTab === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: rightTab === 'settings' ? '#fff' : '#666', padding: '12px 0', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', boxShadow: rightTab === 'settings' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none' }}
                                >
                                    <Icons.Settings /> Настройки
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '25px 25px', overflowY: 'auto', flex: 1 }}>
                            
                            {/* --- ВКЛАДКА: НАСТРОЙКИ --- */}
                            {rightTab === 'settings' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px' }}>Правила прохождения</h4>
                                        <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>Попыток сдачи (0 = безлимит):</label>
                                        <input type="number" className="deck-input" min="0" value={settingsData.maxAttempts} onChange={e => setSettingsData({...settingsData, maxAttempts: e.target.value === '' ? '' : Number(e.target.value)})} style={{ background: 'rgba(0,0,0,0.3)', width: '100%', fontSize: '16px', padding: '12px' }} />
                                        
                                        {!isVideo && (
                                            <div style={{ marginTop: '20px' }}>
                                                <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>Проходной балл (%):</label>
                                                <input type="number" className="deck-input" min="1" max="100" value={settingsData.passingScore} onChange={e => setSettingsData({...settingsData, passingScore: e.target.value === '' ? '' : Number(e.target.value)})} style={{ background: 'rgba(0,0,0,0.3)', width: '100%', fontSize: '16px', padding: '12px' }} />
                                            </div>
                                        )}

                                        {isVideo && (
                                            <>
                                                <label className="toggle-wrapper" style={{ marginTop: '25px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                                                    <input type="checkbox" className="toggle-input" checked={settingsData.hideResults} onChange={e => setSettingsData({...settingsData, hideResults: e.target.checked})} />
                                                    <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                    <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px', fontWeight: 500}}>Скрыть результаты интерактива</span>
                                                </label>
                                                
                                                <label className="toggle-wrapper" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                                                    <input type="checkbox" className="toggle-input" checked={settingsData.allowExternalTest} onChange={e => setSettingsData({...settingsData, allowExternalTest: e.target.checked})} />
                                                    <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                    <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px', fontWeight: 500}}>Разрешить решать без видео</span>
                                                </label>
                                            </>
                                        )}
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%', marginTop: '20px', opacity: isChanged ? 1 : 0.5, cursor: isChanged ? 'pointer' : 'not-allowed', transition: '0.3s' }} 
                                            onClick={handleSaveSettings} 
                                            disabled={isSavingSettings || !isChanged}
                                        >
                                            {isSavingSettings ? 'Сохранение...' : (isChanged ? '💾 Сохранить настройки' : '✅ Настройки сохранены')}
                                        </button>
                                    </div>

                                    {!isVideo && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px' }}>Описание материала</h4>
                                            <textarea className="deck-input" placeholder="Напишите пару слов для студентов..." value={settingsData.description} onChange={e => setSettingsData({...settingsData, description: e.target.value})} onBlur={handleSaveSettings} style={{ background: 'rgba(0,0,0,0.3)', minHeight: '120px', resize: 'vertical', width: '100%', fontSize: '14px', lineHeight: 1.5 }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- ВКЛАДКА: КОНСТРУКТОР --- */}
                            {rightTab === 'constructor' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.2s ease', paddingBottom: '100px' }}>
                                    
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Тип элемента</label>
                                            <select className="deck-input" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', padding: '12px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)' }} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
                                                <option value="single_choice">Один из списка</option>
                                                <option value="multiple_choice">Несколько ответов</option>
                                                <option value="free_text">ИИ Проверка текста</option>
                                                {isVideo && <option value="info">Инфо-карточка (пауза)</option>}
                                            </select>
                                        </div>
                                        {isVideo && (
                                            <div style={{ width: '100px' }}>
                                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Время (сек)</label>
                                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', border: `1px solid ${accentColor}55`, color: accentColor, fontWeight: 'bold', textAlign: 'center', fontSize: '14px' }}>
                                                    {currentTime.toFixed(1)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{eventType === 'info' ? 'Текст инфо-карточки' : 'Формулировка вопроса'}</label>
                                        <textarea className="deck-input" placeholder="Напишите здесь свой вопрос..." value={questionText} onChange={e => setQuestionText(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', minHeight: '100px', resize: 'vertical', fontSize: '15px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>

                                    {(eventType === 'single_choice' || eventType === 'multiple_choice') && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Варианты ответа (отметьте верные):</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {options.map((opt, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: opt.isCorrect ? `rgba(${isVideo?'0,174,239':'255,215,0'},0.1)` : 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '12px', border: duplicateIndices.includes(idx) ? '1px solid #ff4d4d' : `1px solid ${opt.isCorrect ? accentColor : 'transparent'}`, transition: '0.2s' }}>
                                                        <input type={eventType === 'single_choice' ? 'radio' : 'checkbox'} checked={opt.isCorrect} onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: accentColor }} />
                                                        <input className="deck-input" style={{ marginBottom: 0, flex: 1, background: 'transparent', border: 'none', fontSize: '14px', padding: '5px' }} placeholder={`Вариант ${idx + 1}`} value={opt.text} onChange={e => handleOptionChange(idx, 'text', e.target.value)} />
                                                        <button className="btn btn-ghost" style={{ padding: '8px', color: '#666', borderRadius: '8px' }} onClick={() => handleRemoveOption(idx)} onMouseEnter={e => e.currentTarget.style.background='rgba(255,77,77,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="btn btn-ghost" style={{ marginTop: '15px', fontSize: '14px', color: accentColor, width: '100%', background: `rgba(${isVideo?'0,174,239':'255,215,0'},0.05)`, padding: '10px', borderRadius: '12px', fontWeight: 'bold' }} onClick={handleAddOption}>+ Добавить вариант</button>
                                        </div>
                                    )}

                                    {eventType === 'free_text' && (
                                        <div style={{ background: 'rgba(0, 174, 239, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0, 174, 239, 0.3)', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '10px', opacity: 0.2, fontSize: '40px' }}>🤖</div>
                                            <label style={{ fontSize: '12px', color: '#00aeef', display: 'block', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Эталон для нейросети:</label>
                                            <textarea className="deck-input" placeholder="Напишите идеальный ответ или ключевые слова, которые должен упомянуть студент..." value={freeTextAnswer} onChange={e => setFreeTextAnswer(e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', minHeight: '100px', resize: 'vertical', fontSize: '14px', border: '1px solid rgba(0, 174, 239, 0.2)' }} />
                                            
                                            <div style={{ marginTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '13px', color: '#00aeef', fontWeight: 500 }}>Требуемая точность ответа:</span>
                                                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', background: 'rgba(0,174,239,0.2)', padding: '2px 8px', borderRadius: '8px' }}>{aiThreshold}%</span>
                                                </div>
                                                <input type="range" min="10" max="100" value={aiThreshold} onChange={e => setAiThreshold(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', accentColor: '#00aeef', height: '6px' }} />
                                            </div>
                                        </div>
                                    )}

                                    {eventType !== 'info' && (
                                        <div style={{ padding: '20px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.01)' }}>
                                            <h4 style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>Логика и штрафы</h4>
                                            
                                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>Вес (баллов):</label>
                                                    <input type="number" className="deck-input" min="1" value={weight} onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))} style={{ background: 'rgba(0,0,0,0.3)', width: '100%', margin: 0, fontSize: '15px', padding: '10px' }} />
                                                </div>
                                                {isVideo && (
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>Откинуть назад (сек):</label>
                                                        <input type="number" className="deck-input" placeholder="Напр. 120" value={rewindTo} onChange={e => setRewindTo(e.target.value === '' ? '' : Number(e.target.value))} style={{ background: 'rgba(0,0,0,0.3)', width: '100%', margin: 0, fontSize: '15px', padding: '10px' }} />
                                                    </div>
                                                )}
                                            </div>

                                            <label className="toggle-wrapper" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '12px 15px', borderRadius: '12px' }}>
                                                <input type="checkbox" className="toggle-input" checked={isStrict} onChange={e => setIsStrict(e.target.checked)} />
                                                <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px'}}>Строгий режим (1 ошибка = 0 баллов)</span>
                                            </label>

                                            {isVideo && (
                                                <label className="toggle-wrapper" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '12px 15px', borderRadius: '12px' }}>
                                                    <input type="checkbox" className="toggle-input" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} />
                                                    <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                    <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px'}}>Обязательный вопрос (нельзя перемотать)</span>
                                                </label>
                                            )}

                                            <div>
                                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>Объяснение при ошибке (опционально):</label>
                                                <textarea className="deck-input" placeholder="Неверно, потому что..." value={explanation} onChange={e => setExplanation(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', minHeight: '60px', resize: 'vertical', fontSize: '14px' }} />
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                        </div>
                        
                        {rightTab === 'constructor' && (
                            <div style={{ padding: '20px 25px', background: '#141416', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', gap: '15px' }}>
                                {editingEventId && (
                                    <button className="btn btn-ghost" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', fontWeight: 'bold' }} onClick={resetForm}>Отменить</button>
                                )}
                                <button className="btn btn-primary" style={{ flex: 2, background: accentColor, color: '#000', fontWeight: '900', padding: '12px', fontSize: '15px', borderRadius: '12px', boxShadow: `0 4px 15px ${accentColor}66` }} onClick={handleSaveItem} disabled={isAddingEvent}>
                                    {isAddingEvent ? 'Сохранение...' : (editingEventId ? '💾 Сохранить изменения' : '➕ Создать элемент')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
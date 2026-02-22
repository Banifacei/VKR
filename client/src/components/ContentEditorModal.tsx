import { useEffect, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { addEvent, updateEvent, deleteEvent, generateAutoSubtitles, updateVideo, getVideosByCourse, getVideoStats } from '../api/videoApi';
import { addTestQuestion, deleteTestQuestion, getCourseTests, type ICourseTest } from '../api/testApi';
import type { IVideo } from '../types';
import * as XLSX from 'xlsx'; // Для статистики

// Импорты для Drag&Drop вопросов
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const Icons = {
    Time: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Stats: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    AI: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 10.5"/></svg>,
    Spinner: () => (<svg className="ai-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>),
    Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Drag: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
};

// Компонент перетаскиваемого вопроса
const SortableQuestion = ({ q, i, onDelete }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition: transition || 'none',
        zIndex: isDragging ? 999 : 1,
        opacity: isDragging ? 0.8 : 1,
        scale: isDragging ? '1.02' : '1',
    };
    return (
        <div ref={setNodeRef} style={style} className={`question-row ${isDragging ? 'is-dragging' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '10px 15px', borderRadius: '8px', borderLeft: `3px solid #ffd700`, gap: '15px' }}>
                <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#666', padding: '5px' }}>
                    <Icons.Drag />
                </div>
                <div style={{ flex: 1 }}>
                    <strong style={{ color: '#888', marginRight: '10px' }}>Вопрос {i + 1}.</strong>
                    <span style={{ color: '#eee' }}>{q.text}</span>
                    <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>{q.type}</span>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px', color: '#ff4d4d' }} onClick={() => onDelete(q.id)}>🗑️</button>
            </div>
        </div>
    );
};


export const ContentEditorModal = ({ item, onClose, onSuccess }: any) => {
    const isVideo = item.type === 'video';
    const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(isVideo ? item : null);
    const [selectedTest, setSelectedTest] = useState<ICourseTest | null>(!isVideo ? item : null);
    
    // --- ⚙️ ОБЩИЕ НАСТРОЙКИ (Inline) ---
    // Используем 'any' чтобы позволить инпутам быть пустой строкой '' при удалении
    const [settingsData, setSettingsData] = useState<any>({
        title: item.title || '',
        description: item.description || '',
        maxAttempts: item.maxAttempts ?? 3,
        hideResults: item.hideResults || false,
        passingScore: item.passingScore ?? 80,
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

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
            onSuccess(); // Обновляем сетку
        } catch (e) { alert('❌ Ошибка при сохранении настроек'); } 
        finally { setIsSavingSettings(false); }
    };

    // --- 📝 КОНСТРУКТОР КОНТЕНТА ---
    const [currentTime, setCurrentTime] = useState(0);
    const [eventType, setEventType] = useState<'single_choice' | 'multiple_choice' | 'free_text' | 'info'>('single_choice');
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    const [freeTextAnswer, setFreeTextAnswer] = useState(''); 
    const [isStrict, setIsStrict] = useState(false);
    
    // Фикс для инпутов, чтобы можно было стирать цифры
    const [weight, setWeight] = useState<number | string>(1);
    const [rewindTo, setRewindTo] = useState<number | string>('');
    const [aiThreshold, setAiThreshold] = useState<number | string>(50);
    
    const [explanation, setExplanation] = useState('');
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [generatingVideos, setGeneratingVideos] = useState<number[]>([]);

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

    // Обновления после сохранения
    const reloadCurrentVideo = async () => {
        if (!selectedVideo || !selectedVideo.courseId) return;
        const data = await getVideosByCourse(Number(selectedVideo.courseId));
        const updated = data.find(v => v.id === selectedVideo.id);
        if (updated) setSelectedVideo(updated);
        onSuccess();
    };

    const reloadCurrentTest = async () => {
        if (!selectedTest || !selectedTest.courseId) return;
        const data = await getCourseTests(Number(selectedTest.courseId));
        const updated = data.find(t => t.id === selectedTest.id);
        if (updated) setSelectedTest(updated);
        onSuccess();
    };

    // Базовые функции контента
    const handleAddOption = () => setOptions([...options, { text: '', isCorrect: false }]);
    const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
    const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: any) => {
        const newOptions = [...options];
        if (eventType === 'single_choice' && field === 'isCorrect' && value === true) {
            newOptions.forEach(opt => opt.isCorrect = false);
        }
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    const handleAddEvent = async () => {
        if (!selectedVideo) return;
        if (!questionText.trim()) return alert('Введите текст вопроса или информации!');
        if ((eventType === 'single_choice' || eventType === 'multiple_choice') && (!options.some(o => !!o.text.trim()) || !options.some(o => o.isCorrect))) return alert('Проверьте варианты ответов!');
        if (eventType === 'free_text' && !freeTextAnswer.trim()) return alert('Введите эталонный ответ!');

        setIsAddingEvent(true);
        try {
            const eventPayload = {
                time: currentTime, type: eventType, question: questionText, 
                options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
                correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
                isStrict, weight: Number(weight) || 1, rewindTo: rewindTo === '' ? undefined : Number(rewindTo),
                explanation, aiThreshold: Number(aiThreshold) || 50
            };

            if (editingEventId) {
                await updateEvent(editingEventId, eventPayload);
                alert('✅ Метка обновлена!');
            } else {
                await addEvent(selectedVideo.id, eventPayload);
                alert('✅ Метка добавлена!');
            }
            
            setQuestionText(''); setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
            setFreeTextAnswer(''); setExplanation(''); setRewindTo(''); setAiThreshold(50); setWeight(1);
            setEditingEventId(null); 
            await reloadCurrentVideo();
        } catch (e) { alert('❌ Ошибка при сохранении метки'); } 
        finally { setIsAddingEvent(false); }
    };

    const handleEditClick = (ev: any) => {
        setEditingEventId(ev.id); setCurrentTime(ev.time); setEventType(ev.type); setQuestionText(ev.question);
        if (ev.type === 'free_text') setFreeTextAnswer(ev.correctAnswer || '');
        if (ev.options && ev.options.length > 0) setOptions(ev.options);
        setIsStrict(ev.isStrict || false); setWeight(ev.weight || 1);
        setRewindTo(ev.rewindTo !== null && ev.rewindTo !== undefined ? ev.rewindTo : '');
        setExplanation(ev.explanation || ''); setAiThreshold(ev.aiThreshold || 50);
    };

    const handleDeleteClick = async (eventId: number) => {
        if (!window.confirm('Точно удалить этот вопрос?')) return;
        try {
            await deleteEvent(eventId);
            if (editingEventId === eventId) setEditingEventId(null);
            await reloadCurrentVideo();
        } catch (e) { alert('❌ Ошибка при удалении'); }
    };

    const handleAddTestQuestion = async () => {
        if (!selectedTest) return;
        if (!questionText.trim()) return alert('Введите текст вопроса!');
        if ((eventType === 'single_choice' || eventType === 'multiple_choice') && !options.some(o => o.isCorrect)) return alert('Выберите хотя бы один правильный ответ!');

        setIsAddingEvent(true);
        try {
            await addTestQuestion(selectedTest.id, {
                type: eventType, text: questionText,
                options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
                correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
                weight: Number(weight) || 1, aiThreshold: Number(aiThreshold) || 50
            });
            alert('✅ Вопрос добавлен в тест!');
            setQuestionText(''); setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
            setFreeTextAnswer(''); setWeight(1);
            await reloadCurrentTest();
        } catch (e) { alert('❌ Ошибка при добавлении вопроса'); } 
        finally { setIsAddingEvent(false); }
    };

    const handleDeleteTestQuestion = async (qId: number) => {
        if (!window.confirm('Точно удалить этот вопрос?')) return;
        try {
            await deleteTestQuestion(qId);
            await reloadCurrentTest();
        } catch (e) { alert('❌ Ошибка удаления'); }
    };

    // --- Drag and Drop для тестов ---
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEndTest = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && selectedTest) {
            const oldIndex = selectedTest.questions!.findIndex((q: any) => q.id === active.id);
            const newIndex = selectedTest.questions!.findIndex((q: any) => q.id === over.id);
            const newQuestions = arrayMove(selectedTest.questions!, oldIndex, newIndex);
            
            // Мгновенное обновление UI
            setSelectedTest({ ...selectedTest, questions: newQuestions });

            // Отправка на бэкенд
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


    const groupedStats = getGroupedStats();
    const studentDetails = expandedStudent !== null ? statsData.filter(s => s.userId === expandedStudent) : [];
    const expandedStudentName = expandedStudent !== null ? groupedStats.find(s => s.userId === expandedStudent)?.name : '';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 9999, overflowY: 'auto', padding: '40px 20px'
        }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            
            {/* ГЛАВНЫЙ КОНТЕЙНЕР РЕДАКТОРА */}
            <div 
                style={{ background: '#000', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '100%', maxWidth: '1000px', animation: 'fadeIn 0.2s ease', position: 'relative' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                    {/* КРАСИВОЕ РЕДАКТИРОВАНИЕ НАЗВАНИЯ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, marginRight: '20px' }}>
                        <span style={{ fontSize: '32px' }}>📝</span>
                        <input 
                            value={settingsData.title} 
                            onChange={e => setSettingsData({...settingsData, title: e.target.value})}
                            onBlur={handleSaveSettings} // Автосохранение при клике вне поля
                            placeholder="Название..."
                            style={{ 
                                background: 'transparent', border: 'none', borderBottom: '1px dashed #555', 
                                color: '#fff', fontSize: '28px', fontWeight: 'bold', outline: 'none', width: '100%', padding: '5px 0'
                            }} 
                        />
                    </div>
                    <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 16px', fontSize: '14px' }}>✕ Закрыть</button>
                </div>

                {/* ⚙️ БЛОК КОМПАКТНЫХ НАСТРОЕК */}
                <div style={{ display: 'flex', gap: '20px', background: '#111', padding: '15px 20px', borderRadius: '12px', border: '1px solid #222', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '13px', color: '#888' }}>Попыток (0 = ∞):</label>
                        <input type="number" className="deck-input" min="0" value={settingsData.maxAttempts} onChange={e => setSettingsData({...settingsData, maxAttempts: e.target.value === '' ? '' : Number(e.target.value)})} onBlur={handleSaveSettings} style={{ width: '80px', margin: 0, padding: '6px 10px' }} />
                    </div>
                    
                    {!isVideo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '13px', color: '#888' }}>Проходной балл (%):</label>
                            <input type="number" className="deck-input" min="1" max="100" value={settingsData.passingScore} onChange={e => setSettingsData({...settingsData, passingScore: e.target.value === '' ? '' : Number(e.target.value)})} onBlur={handleSaveSettings} style={{ width: '80px', margin: 0, padding: '6px 10px' }} />
                        </div>
                    )}

                    {isVideo && (
                        <label className="toggle-wrapper" style={{ marginLeft: 'auto' }}>
                            <input type="checkbox" className="toggle-input" checked={settingsData.hideResults} onChange={e => { setSettingsData({...settingsData, hideResults: e.target.checked}); setTimeout(handleSaveSettings, 100); }} />
                            <div className="toggle-track"><div className="toggle-thumb"></div></div>
                            <span className="toggle-label" style={{color: '#ccc'}}>Скрыть результаты интерактива</span>
                        </label>
                    )}
                    
                    {/* Кнопка ручного сохранения (если автосохранение не сработало) */}
                    {isSavingSettings && <span style={{ color: '#00aeef', fontSize: '13px', marginLeft: 'auto' }}>Сохранение...</span>}
                </div>

                {!isVideo && (
                    <div style={{ marginBottom: '30px' }}>
                        <textarea className="deck-input" placeholder="Добавьте описание теста..." value={settingsData.description} onChange={e => setSettingsData({...settingsData, description: e.target.value})} onBlur={handleSaveSettings} style={{ minHeight: '60px', resize: 'vertical', background: '#111', border: '1px solid #222' }} />
                    </div>
                )}

                {/* --- СЕКЦИЯ 2: РЕДАКТОР ВИДЕО --- */}
                {isVideo && selectedVideo && (
                    <>
                        <div className="player-wrapper-animation" style={{width: '100%', marginBottom: '20px'}}>
                            <VideoPlayer 
                                key={selectedVideo.id}
                                sources={[{ quality: 'Auto', url: selectedVideo.url, subtitles: selectedVideo.subtitles }]} 
                                title={selectedVideo.title} 
                                events={selectedVideo.events || []}
                                hideResults={selectedVideo.hideResults}
                                videoId={selectedVideo.id}
                                onTimeUpdate={(t) => setCurrentTime(t)}
                            />
                        </div>
                        
                        <div className="control-deck">
                            <div className="deck-header">
                                <div className="deck-title"><div className="deck-icon">⚡</div><h3>Интерактив на таймлайне</h3></div>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <button className="btn btn-ghost" onClick={loadStats}><Icons.Stats /> Статистика</button>
                                    <button className={`btn btn-ai ${generatingVideos.includes(selectedVideo.id) ? 'generating' : ''}`} onClick={() => {
                                        setGeneratingVideos(prev => [...prev, selectedVideo.id]);
                                        generateAutoSubtitles(selectedVideo.id)
                                            .then(() => alert("🚀 ИИ начал работу!"))
                                            .catch(() => { alert("❌ Ошибка"); setGeneratingVideos(prev => prev.filter(id => id !== selectedVideo.id)); });
                                    }} disabled={generatingVideos.includes(selectedVideo.id)}>
                                        {generatingVideos.includes(selectedVideo.id) ? <><Icons.Spinner /> Обработка ИИ...</> : <><Icons.AI /> AI Субтитры</>}
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 2, minWidth: '300px' }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                        <select className="deck-input" style={{ width: 'auto', marginBottom: 0, padding: '8px 12px', fontSize: '13px' }} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
                                            <option value="single_choice">Один из списка (Radio)</option>
                                            <option value="multiple_choice">Несколько ответов (Checkbox)</option>
                                            <option value="free_text">Открытый вопрос (ИИ Проверка)</option>
                                            <option value="info">Инфо-пауза (без ответа)</option>
                                        </select>
                                        <div style={{color: '#666', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Time /> {currentTime.toFixed(1)}s</div>
                                    </div>
                                    
                                    {eventType === 'free_text' && (
                                        <div style={{ marginBottom: '15px', background: 'rgba(0, 174, 239, 0.05)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #00aeef' }}>
                                            <label style={{ fontSize: '13px', color: '#00aeef', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' }}><span>Точность (ИИ):</span><span>{aiThreshold}%</span></label>
                                            <input type="range" min="10" max="100" value={aiThreshold} onChange={e => setAiThreshold(Number(e.target.value))} style={{ width: '100%', accentColor: '#00aeef' }} />
                                        </div>
                                    )}
                                    
                                    <input className="deck-input" placeholder={eventType === 'info' ? "Текст карточки..." : "Текст вопроса..."} value={questionText} onChange={e => setQuestionText(e.target.value)} />
                                    
                                    {(eventType === 'single_choice' || eventType === 'multiple_choice') && (
                                        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: '#888' }}>Варианты ответа:</h5>
                                            {options.map((opt, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <input type={eventType === 'single_choice' ? 'radio' : 'checkbox'} checked={opt.isCorrect} onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                    <input className="deck-input" style={{ marginBottom: 0, flex: 1 }} placeholder={`Вариант ${idx + 1}`} value={opt.text} onChange={e => handleOptionChange(idx, 'text', e.target.value)} />
                                                    {options.length > 2 && <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleRemoveOption(idx)}>✕</button>}
                                                </div>
                                            ))}
                                            <button className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }} onClick={handleAddOption}>+ Добавить вариант</button>
                                        </div>
                                    )}
                                    {eventType === 'free_text' && <textarea className="deck-input" placeholder="Эталонный ответ для ИИ..." value={freeTextAnswer} onChange={e => setFreeTextAnswer(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} />}
                                    
                                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddEvent} disabled={isAddingEvent}>{isAddingEvent ? 'Сохранение...' : (editingEventId ? 'Сохранить изменения' : 'Добавить метку')}</button>
                                        {editingEventId && <button className="btn btn-ghost" onClick={() => { setEditingEventId(null); setQuestionText(''); setExplanation(''); }}>Отмена</button>}
                                    </div>
                                </div>

                                <div style={{ flex: 1, minWidth: '250px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                                    <h4 style={{marginTop: 0, marginBottom: '20px', color: '#888'}}>Логика при ошибке</h4>
                                    {eventType !== 'info' && (
                                        <>
                                            <label className="toggle-wrapper" style={{ marginBottom: '15px' }}><input type="checkbox" className="toggle-input" checked={isStrict} onChange={e => setIsStrict(e.target.checked)} /><div className="toggle-track"><div className="toggle-thumb"></div></div><span className="toggle-label">Строгий режим</span></label>
                                            <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Вес в баллах:</label><input type="number" className="deck-input" min="1" max="100" value={weight} onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))} style={{ marginBottom: 0 }} /></div>
                                            <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Откинуть при ошибке (сек):</label><input type="number" className="deck-input" placeholder="Напр. 120" value={rewindTo} onChange={e => setRewindTo(e.target.value === '' ? '' : Number(e.target.value))} style={{ marginBottom: 0 }} /></div>
                                            <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Объяснение при ошибке:</label><textarea className="deck-input" placeholder="Неверно, потому что..." value={explanation} onChange={e => setExplanation(e.target.value)} style={{ minHeight: '60px', marginBottom: 0, resize: 'vertical' }} /></div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {selectedVideo.events && selectedVideo.events.length > 0 && (
                            <div style={{ marginTop: '20px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
                                <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>Таймлайн интерактива ({selectedVideo.events.length})</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[...selectedVideo.events].sort((a, b) => a.time - b.time).map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${ev.type === 'info' ? '#ffd700' : '#00aeef'}` }}>
                                            <div>
                                                <strong style={{ color: ev.type === 'info' ? '#ffd700' : '#00aeef', marginRight: '10px' }}>{Math.floor(ev.time / 60)}:{(Math.floor(ev.time % 60)).toString().padStart(2, '0')}</strong>
                                                <span style={{ color: '#eee' }}>{ev.question}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleEditClick(ev)}>✏️</button>
                                                <button className="btn btn-ghost" style={{ padding: '6px', color: '#ff4d4d' }} onClick={() => handleDeleteClick(ev.id)}>🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* --- СЕКЦИЯ 3: РЕДАКТОР ТЕСТА --- */}
                {!isVideo && selectedTest && (
                    <>
                        <div className="control-deck">
                            <div className="deck-header">
                                <div className="deck-title"><div className="deck-icon" style={{background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700'}}>📝</div><h3>Конструктор вопросов</h3></div>
                            </div>
                            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 2, minWidth: '300px' }}>
                                    <div style={{marginBottom: '15px'}}>
                                        <select className="deck-input" style={{ width: '100%', marginBottom: 0, padding: '12px 16px' }} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
                                            <option value="single_choice">Один из списка (Radio)</option>
                                            <option value="multiple_choice">Несколько ответов (Checkbox)</option>
                                            <option value="free_text">Открытый вопрос (ИИ Проверка)</option>
                                        </select>
                                    </div>
                                    
                                    {eventType === 'free_text' && (
                                        <div style={{ marginBottom: '15px', background: 'rgba(0, 174, 239, 0.05)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #00aeef' }}>
                                            <label style={{ fontSize: '13px', color: '#00aeef', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' }}><span>Точность (ИИ):</span><span>{aiThreshold}%</span></label>
                                            <input type="range" min="10" max="100" value={aiThreshold} onChange={e => setAiThreshold(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', accentColor: '#00aeef' }} />
                                        </div>
                                    )}
                                    <input className="deck-input" placeholder="Текст вопроса..." value={questionText} onChange={e => setQuestionText(e.target.value)} />
                                    
                                    {(eventType === 'single_choice' || eventType === 'multiple_choice') && (
                                        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: '#888' }}>Варианты ответа:</h5>
                                            {options.map((opt, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <input type={eventType === 'single_choice' ? 'radio' : 'checkbox'} checked={opt.isCorrect} onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                    <input className="deck-input" style={{ marginBottom: 0, flex: 1 }} placeholder={`Вариант ${idx + 1}`} value={opt.text} onChange={e => handleOptionChange(idx, 'text', e.target.value)} />
                                                    {options.length > 2 && <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleRemoveOption(idx)}>✕</button>}
                                                </div>
                                            ))}
                                            <button className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }} onClick={handleAddOption}>+ Добавить вариант</button>
                                        </div>
                                    )}
                                    {eventType === 'free_text' && <textarea className="deck-input" placeholder="Эталонный ответ для ИИ..." value={freeTextAnswer} onChange={e => setFreeTextAnswer(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: '250px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                                    <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Вес вопроса в баллах:</label><input type="number" className="deck-input" min="1" max="100" value={weight} onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))} style={{ marginBottom: 0 }} /></div>
                                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={handleAddTestQuestion} disabled={isAddingEvent}>{isAddingEvent ? 'Сохранение...' : 'Сохранить вопрос'}</button>
                                </div>
                            </div>
                        </div>

                        {selectedTest.questions && selectedTest.questions.length > 0 && (
                            <div style={{ marginTop: '20px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
                                <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>Список вопросов ({selectedTest.questions.length})</h3>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTest}>
                                    <SortableContext items={selectedTest.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {selectedTest.questions.map((q, i) => (
                                                <SortableQuestion key={q.id} q={q} i={i} onDelete={handleDeleteTestQuestion} />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- ВСПЛЫВАЮЩЕЕ ОКНО СТАТИСТИКИ (Как в PrepodPage) --- */}
            {showStats && (
                <div className="stats-modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="stats-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="stats-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{margin: 0}}>Статистика: {selectedVideo?.title}</h3>
                                {expandedStudent && (<button className="back-link" onClick={() => setExpandedStudent(null)}>← К списку группы</button>)}
                            </div>
                            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                                <button className="btn btn-primary" onClick={exportToExcel} style={{padding: '6px 12px', fontSize: '13px', display: 'flex', gap: '6px'}}>
                                    <Icons.Download /> Выгрузить в Excel
                                </button>
                                <button className="close-btn" onClick={() => setShowStats(false)}>✕</button>
                            </div>
                        </div>
                        
                        <div className="stats-modal-body">
                            {statsData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '20px' }}>📭</div>
                                    <p>Пока никто не проходил этот урок.</p>
                                </div>
                            ) : (
                                <>
                                    {!expandedStudent && (
                                        <table className="stats-table">
                                            <thead><tr><th>Студент</th><th>Статус</th><th style={{ textAlign: 'center' }}>Верно</th><th style={{ textAlign: 'center' }}>Ошибок</th><th></th></tr></thead>
                                            <tbody>
                                                {groupedStats.map((student) => (
                                                    <tr key={student.userId} className="stats-row">
                                                        <td className="student-name-cell">{student.name}</td>
                                                        <td><span className="status-badge solved">Решён</span></td>
                                                        <td style={{ textAlign: 'center' }}><div className="count-badge correct">{student.correct}</div></td>
                                                        <td style={{ textAlign: 'center' }}><div className={`count-badge incorrect ${student.incorrect === 0 ? 'zero' : ''}`}>{student.incorrect}</div></td>
                                                        <td style={{ textAlign: 'right' }}><button className="details-btn" onClick={() => setExpandedStudent(student.userId)}>Подробнее</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                    {expandedStudent && (
                                        <div>
                                            <h4 style={{ color: '#00aeef', marginTop: 0, marginBottom: '25px', fontSize: '1.2rem' }}>
                                                Ответы студента: <span style={{color: 'white'}}>{expandedStudentName}</span>
                                            </h4>
                                            <table className="stats-table">
                                                <thead><tr><th>Вопрос</th><th>Ответ</th><th style={{ textAlign: 'center' }}>Точность (ИИ)</th><th style={{ textAlign: 'right' }}>Результат</th></tr></thead>
                                                <tbody>
                                                    {studentDetails.map((stat) => (
                                                        <tr key={stat.id} className="stats-row">
                                                            <td style={{ color: '#ccc' }}>{stat.event?.question || 'Вопрос удален'}</td>
                                                            <td style={{ color: '#fff', fontWeight: '500' }}>{stat.answer}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {stat.event?.type === 'free_text' && stat.similarity !== null ? (
                                                                    <span style={{ 
                                                                        color: stat.isCorrect ? '#4dff88' : '#ff4d4d', 
                                                                        fontSize: '13px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px'
                                                                    }}>{stat.similarity}%</span>
                                                                ) : (<span style={{ color: '#444' }}>—</span>)}
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {stat.isCorrect ? (<span style={{ color: '#4dff88', fontWeight: 'bold' }}>✅ Верно</span>) : (<span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>❌ Ошибка</span>)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
import { useEffect, useState, useRef } from 'react';
import './ContentEditorModal.css';
import { VideoPlayer } from './VideoPlayer';
import { addEvent, updateEvent, deleteEvent, generateAutoSubtitles, updateVideo, getVideosByCourse, getVideoStats, transcodeVideo } from '../api/videoApi';
import { addTestQuestion, deleteTestQuestion, getCourseTests, getTestStats, type ICourseTest } from '../api/testApi';
import type { IVideo } from '../types';
import * as XLSX from 'xlsx';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { Icons } from './Icons';
import { DateTimePicker } from './DateTimePicker';

// Drag & Drop
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '8px' }} onClick={() => onEdit(q)}><Icons.Edit size={14}/></button>
                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', borderRadius: '8px' }} onClick={() => onDelete(q.id)}><Icons.Trash size={14}/></button>
                </div>
            </div>
        </div>
    );
};

const SortableOption = ({ opt, idx, isCorrect, isDuplicate, accentColor, onChangeText, onToggleCorrect, onRemove }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `opt-${idx}` });
    
    const style = {
        // Используем Translate вместо Transform (убирает дерганье)
        transform: CSS.Translate.toString(transform),
        // 🛑 Жестко отключаем анимацию, пока элемент летит!
        transition: isDragging ? 'none' : (transition || 'all 0.2s ease'), 
        zIndex: isDragging ? 9999 : 1, // Z-index повыше
        opacity: isDragging ? 0.9 : 1,
        scale: isDragging ? '1.02' : '1',
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        background: isCorrect ? (accentColor === 'var(--primary)' ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,215,0,0.1)') : 'rgba(0,0,0,0.3)', 
        padding: '8px 12px', 
        borderRadius: '12px', 
        border: isDuplicate ? '1px solid #ff4d4d' : `1px solid ${isCorrect ? accentColor : 'transparent'}`,
        boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.5)' : 'none',
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Ручка для перетаскивания */}
            <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '5px', color: '#666' }}>
                <Icons.Drag />
            </div>
            
            <input type="checkbox" checked={isCorrect} onChange={onToggleCorrect} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: accentColor }} />
            
            <input 
                className="deck-input" 
                value={opt.text} 
                onChange={e => onChangeText(e.target.value)} 
                placeholder={`Вариант ${idx + 1}`} 
                style={{ marginBottom: 0, flex: 1, background: 'transparent', border: 'none', fontSize: '14px', padding: '5px', color: '#fff' }}
            />
            
            <button className="btn btn-ghost" onClick={onRemove} style={{ padding: '8px', color: '#666', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,77,77,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>✕</button>
        </div>
    );
};

export const ContentEditorModal = ({ item, userData, onClose, onSuccess }: any) => {
    const { showToast } = useToast();
    const isDraggingQuestionRef = useRef(false);
    const isVideo = item.type === 'video';
    const accentColor = isVideo ? 'var(--primary)' : '#ffd700';
    const accentRgb = isVideo ? 'var(--primary-rgb)' : '255,215,0';

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
        isHidden: item.isHidden || false,
        unlockDate: item.unlockDate || null,
        shuffleQuestions: (item as any).shuffleQuestions || false,
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const isChanged =
        settingsData.title !== (item.title || '') ||
        settingsData.description !== (item.description || '') ||
        Number(settingsData.maxAttempts) !== (item.maxAttempts ?? 3) ||
        settingsData.hideResults !== (item.hideResults || false) ||
        Number(settingsData.passingScore) !== (item.passingScore ?? 80) ||
        settingsData.allowExternalTest !== (item.allowExternalTest || false) ||
        settingsData.isHidden !== (item.isHidden || false) ||
        settingsData.unlockDate !== (item.unlockDate || null) ||
        settingsData.shuffleQuestions !== ((item as any).shuffleQuestions || false);

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const payload = {
                ...settingsData,
                maxAttempts: Number(settingsData.maxAttempts) || 0,
                passingScore: Number(settingsData.passingScore) || 0,
            };

            if (isVideo && selectedVideo) {
                await updateVideo(selectedVideo.id, payload);
                setSelectedVideo({...selectedVideo, ...payload});
            } else if (selectedTest) {
                // 🔥 Используем api (порт и токен подставятся сами)
                await api.put(`/tests/${selectedTest.id}`, payload);
                setSelectedTest({...selectedTest, ...payload});
            }
            onSuccess();
        } catch (e) { showToast('Настройки сохранены', 'success'); } 
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
    const [transcodingVideos, setTranscodingVideos] = useState<number[]>([]);
    
    const [duplicateIndices, setDuplicateIndices] = useState<number[]>([]);

    // --- СТАТИСТИКА ---
    const [showStats, setShowStats] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

    const loadStats = async () => {
        try {
            let data = [];
            if (isVideo && selectedVideo) {
                data = await getVideoStats(selectedVideo.id);
            } else if (!isVideo && selectedTest) {
                const response = await getTestStats(selectedTest.id);
                data = response.results || []; // 👈 Достаем именно массив results!
            }
            
            // Защита от краша: убеждаемся, что передаем массив
            setStatsData(Array.isArray(data) ? data : []); 
            setExpandedStudent(null); 
            setShowStats(true);
        } catch (e) { showToast('Не удалось загрузить статистику', 'error');}
    };
    // --- ДИНАМИЧЕСКИЙ РАДАР ДЛЯ СТАТИСТИКИ ---
    useEffect(() => {
        // Запускаем таймер ТОЛЬКО если открыта вкладка статистики и выбрано видео
        if (!showStats || !selectedVideo) return;
        
        const interval = setInterval(async () => {
            if (isDraggingQuestionRef.current) return;
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
        if (statsData.length === 0) return showToast('Нет данных для выгрузки!', 'error');
        
        const wb = XLSX.utils.book_new();
        const currentTitle = isVideo ? selectedVideo?.title : selectedTest?.title;
        const dateStr = new Date().toLocaleDateString('ru-RU');
        const teacherName = userData?.firstName ? `${userData.firstName} ${userData.lastName}` : '_______________________';

        // ==========================================
        // ЛИСТ 1: ВЕДОМОСТЬ ПО ГОСТУ (ДЛЯ ПЕЧАТИ)
        // ==========================================
        const vedomostData: any[][] = [];
        vedomostData.push(['МИНИСТЕРСТВО / НАЗВАНИЕ УЧЕБНОГО ЗАВЕДЕНИЯ']); 
        vedomostData.push([]);
        vedomostData.push(['', 'ЭКЗАМЕНАЦИОННАЯ / ЗАЧЕТНАЯ ВЕДОМОСТЬ']); 
        vedomostData.push([]);
        vedomostData.push(['Наименование материала:', currentTitle || 'Без названия']);
        vedomostData.push(['Дата проведения:', dateStr]);
        vedomostData.push(['Преподаватель:', teacherName]);
        vedomostData.push([]);
        
        // Шапка таблицы ГОСТ
        vedomostData.push(['№ п/п', 'ФИО обучающегося', 'Результат (%)', 'Оценка (прописью)', 'Подпись преподавателя']);

        const groups = getGroupedStats();
        let count5 = 0, count4 = 0, count3 = 0, count2 = 0;

        groups.forEach((student, index) => {
            const percent = isVideo 
                ? (student.total > 0 ? Math.round((student.correct / student.total) * 100) : 0)
                : (student.testScore || 0);

            let gradeStr = 'Неудовлетворительно';
            if (percent >= 90) { gradeStr = 'Отлично'; count5++; }
            else if (percent >= 75) { gradeStr = 'Хорошо'; count4++; }
            else if (percent >= 50) { gradeStr = 'Удовлетворительно'; count3++; }
            else { count2++; }

            vedomostData.push([index + 1, student.name, `${percent}%`, gradeStr, '']);
        });

        vedomostData.push([]);
        vedomostData.push(['ИТОГИ ТЕСТИРОВАНИЯ:']);
        vedomostData.push(['Отлично (5):', count5]);
        vedomostData.push(['Хорошо (4):', count4]);
        vedomostData.push(['Удовлетворительно (3):', count3]);
        vedomostData.push(['Неудовлетворительно (2):', count2]);

        const ws1 = XLSX.utils.aoa_to_sheet(vedomostData);
        ws1['!cols'] = [
            { wch: 25 }, // Колонка А (широкая для "Наименование материала:")
            { wch: 45 }, // Колонка B (широкая для ФИО)
            { wch: 15 }, // Колонка C (Результат)
            { wch: 25 }, // Колонка D (Оценка)
            { wch: 25 }  // Колонка E (Подпись)
        ];
        XLSX.utils.book_append_sheet(wb, ws1, 'Ведомость (ГОСТ)');

        // ==========================================
        // ЛИСТ 2: ДЕТАЛИЗАЦИЯ И ИИ (ИДЕАЛЬНЫЕ КОЛОНКИ)
        // ==========================================
        const detailsData: any[][] = [];

        if (isVideo) {
            detailsData.push(['ФИО обучающегося', 'Текст вопроса', 'Ответ студента', 'Оценка ИИ', 'Вердикт']);
            statsData.forEach(stat => {
                const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${stat.userId}`;
                const question = stat.event?.question || 'Вопрос удален';
                const answer = stat.answer || '—';
                const aiScore = stat.similarity !== null && stat.similarity !== undefined ? `${stat.similarity}%` : '—';
                const result = stat.isCorrect ? 'Верно' : 'Ошибка';
                detailsData.push([name, question, answer, aiScore, result]);
            });
        } else {
            // 👇 ТЕПЕРЬ РАЗБИВАЕМ КАЖДЫЙ ВОПРОС НА ОТДЕЛЬНУЮ СТРОКУ!
            detailsData.push(['ФИО обучающегося', 'Балл за попытку', 'Вопрос', 'Ответ студента', 'Статус / ИИ']);
            
            statsData.forEach(stat => {
                const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${stat.userId}`;
                const answersObj = typeof stat.answers === 'string' ? JSON.parse(stat.answers) : (stat.answers || {});
                
                let isFirstRow = true; // Чтобы ФИО и Балл писались только один раз напротив первого вопроса

                selectedTest?.questions?.forEach((q: any) => {
                    const resData = answersObj[q.id] || {};
                    const userAns = Array.isArray(resData.answer) ? resData.answer.join(', ') : (resData.answer || 'Нет ответа');
                    
                    let statusText = resData.isCorrect ? 'Верно' : 'Ошибка';
                    
                    // Жесткая проверка и вывод процента ИИ в колонку статуса
                    if (q.type === 'free_text') {
                        statusText = (resData.similarity !== undefined && resData.similarity !== null) 
                            ? `Точность ИИ: ${resData.similarity}%` 
                            : `ИИ: нет данных`;
                    }
                    
                    if (isFirstRow) {
                        detailsData.push([name, `${stat.score}%`, q.text, userAns, statusText]);
                        isFirstRow = false;
                    } else {
                        // Оставляем пустые ячейки для ФИО и Балла, чтобы визуально сгруппировать попытку
                        detailsData.push(['', '', q.text, userAns, statusText]);
                    }
                });
                
                // Пустая строка между попытками студентов для красоты
                detailsData.push([]); 
            });
        }

        const ws2 = XLSX.utils.aoa_to_sheet(detailsData);
        // Задаем ширину столбцов
        ws2['!cols'] = isVideo 
            ? [{ wch: 35 }, { wch: 50 }, { wch: 50 }, { wch: 15 }, { wch: 15 }]
            : [{ wch: 35 }, { wch: 15 }, { wch: 60 }, { wch: 40 }, { wch: 25 }]; // Идеальные пропорции

        XLSX.utils.book_append_sheet(wb, ws2, 'Детализация и ИИ');

        // Сохранение файла
        const safeFileName = (currentTitle || 'Экспорт').replace(/[^a-zа-яё0-9]/gi, '_');
        XLSX.writeFile(wb, `Зачетная_ведомость_${safeFileName}.xlsx`);
    };

    const getGroupedStats = () => {
        const groups: Record<number, { correct: number; incorrect: number; name: string; userId: number; testScore?: number; total: number }> = {};
        
        if (!Array.isArray(statsData)) return []; // 🛡️ Защита от ошибки

        statsData.forEach(stat => {
            const uId = stat.userId;
            const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${uId}`;
            
            if (!groups[uId]) {
                groups[uId] = { correct: 0, incorrect: 0, name, userId: uId, total: 0, testScore: 0 };
            }
            
            if (stat.score !== undefined) {
                // 📝 ЭТО ОБЫЧНЫЙ ТЕСТ: сохраняем ЛУЧШИЙ результат среди попыток
                groups[uId].testScore = Math.max(groups[uId].testScore || 0, stat.score);
                groups[uId].total++; // Считаем количество попыток
            } else {
                // 📺 ЭТО ВИДЕО-ИНТЕРАКТИВ: считаем правильные и неправильные
                if (stat.isCorrect) groups[uId].correct++;
                else groups[uId].incorrect++;
            }
        });

        return Object.values(groups).map(data => ({ 
            ...data, 
            total: isVideo ? data.correct + data.incorrect : data.total 
        }));
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
    const handleDragEndOption = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = parseInt((active.id as string).split('-')[1]);
            const newIndex = parseInt((over.id as string).split('-')[1]);
            setOptions(arrayMove(options, oldIndex, newIndex));
        }
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
                                showToast("✨ Нейросеть успешно завершила генерацию субтитров!", 'info');
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

        if (!questionText.trim()) return showToast('Введите текст вопроса!', 'error');
        
        // ПРОВЕРКА НА ДУБЛИКАТЫ
        if (eventType === 'single_choice' || eventType === 'multiple_choice') {
            if (!options.some(o => !!o.text.trim()) || !options.some(o => o.isCorrect)) return showToast('Заполните варианты и укажите верный!', 'error');
            
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
                return showToast(`Варианты ответов (${humanIndices}) абсолютно одинаковые!`, 'error');
            }
        }
        
        if (eventType === 'free_text' && !freeTextAnswer.trim()) return showToast('Введите эталонный ответ!', 'error');

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
            showToast('Успешно сохранено!', 'success');
        } catch (e) { showToast('Ошибка при сохранении', 'error'); } 
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
        } catch (e) { showToast('Ошибка при удалении', 'error'); }
    };

    const [chapterName, setChapterName] = useState('');
    const [isAddingChapter, setIsAddingChapter] = useState(false);

    const handleAddChapter = async () => {
        if (!selectedVideo || !chapterName.trim()) return;
        setIsAddingChapter(true);
        try {
            await addEvent(selectedVideo.id, {
                time: currentTime, type: 'chapter', question: chapterName.trim(),
                options: [], correctAnswer: '', weight: 1,
            });
            setChapterName('');
            await reloadCurrentVideo();
            showToast('Глава добавлена', 'success');
        } catch { showToast('Ошибка при добавлении главы', 'error'); }
        finally { setIsAddingChapter(false); }
    };

    const handleGenerateSubs = async () => {
        if (!selectedVideo) return;
        setGeneratingVideos((prev: number[]) => [...prev, selectedVideo.id]);
        try {
            await generateAutoSubtitles(selectedVideo.id);
            showToast("ИИ начал обработку. Субтитры появятся через пару минут.", 'info');
        } catch (e) {
            showToast("Ошибка при старте генерации.", "error");
            setGeneratingVideos((prev: number[]) => prev.filter((id: number) => id !== selectedVideo.id));
        }
    };

    const handleTranscode = async () => {
        if (!selectedVideo) return;
        if (!selectedVideo.url.startsWith('/uploads/')) {
            showToast('Транскодирование доступно только для загруженных файлов', 'error');
            return;
        }
        setTranscodingVideos(prev => [...prev, selectedVideo.id]);
        try {
            await transcodeVideo(selectedVideo.id);
            showToast('Транскодирование запущено. Версии 360p и 720p создаются...', 'info');
        } catch (e) {
            showToast('Ошибка при запуске транскодирования', 'error');
            setTranscodingVideos(prev => prev.filter(id => id !== selectedVideo.id));
        }
    };

    // SSE: обновление когда транскодирование завершилось
    useEffect(() => {
        if (!selectedVideo?.courseId) return;
        const token = localStorage.getItem('lumeo_token');
        if (!token) return;
        const es = new EventSource(`/api/videos/courses/${selectedVideo.courseId}/processing/stream?token=${token}`);
        es.onmessage = async ({ data }) => {
            try {
                const d = JSON.parse(data);
                if (d.type === 'subtitle_done' && d.videoId === selectedVideo.id) {
                    setGeneratingVideos((prev: number[]) => prev.filter((id: number) => id !== selectedVideo.id));
                    const fresh = await getVideosByCourse(selectedVideo.courseId!);
                    const updated = fresh.find((v: IVideo) => v.id === selectedVideo.id);
                    if (updated) setSelectedVideo(updated);
                    onSuccess();
                } else if (d.type === 'quality_ready' && d.videoId === selectedVideo.id) {
                    setTranscodingVideos(prev => prev.filter(id => id !== selectedVideo.id));
                    showToast(`Версии качества готовы!`, 'success');
                    const fresh = await getVideosByCourse(selectedVideo.courseId!);
                    const updated = fresh.find((v: IVideo) => v.id === selectedVideo.id);
                    if (updated) setSelectedVideo(updated);
                    onSuccess();
                }
            } catch { /* игнорируем */ }
        };
        es.onerror = () => es.close();
        return () => es.close();
    }, [selectedVideo?.id, selectedVideo?.courseId]);

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
                // 🔥 Тоже используем api (код стал в 3 раза короче)
                await api.post(`/tests/${selectedTest.id}/questions/reorder`, { 
                    orderedIds: newQuestions.map((q: any) => q.id) 
                });
                onSuccess();
            } catch (e) { console.error(e); showToast('Ошибка сохранения порядка', 'error'); }
            finally {
            // 👇 РАЗБЛОКИРУЕМ РАДАР ТОЛЬКО ТУТ
            isDraggingQuestionRef.current = false; 
        }
        }
    };

    return (
        <div className="cem-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px',
        }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            
            <div className="cem-container" style={{
                background: '#0f0f11', border: `1px solid rgba(${accentRgb}, 0.2)`,
                width: '100%', maxWidth: '1400px', height: '90vh', borderRadius: '24px',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 30px 60px -12px rgba(${accentRgb}, 0.15)`
            }}>
                
                <div className="cem-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="cem-header-left" style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                        <div className="cem-header-icon" style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 150%)`,
                            padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)`
                        }}>
                            {isVideo ? <Icons.Monitor size={28}/> : <Icons.FileText size={28}/>}
                        </div>
                        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                            <input
                                className="cem-title-input"
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

                    <div className="cem-header-actions" style={{ display: 'flex', gap: '15px', flexShrink: 0 }}>
                        <button className="btn btn-ghost" onClick={loadStats} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold' }}>
                            <Icons.Stats /> <span className="cem-btn-text">Статистика</span>
                        </button>
                        <button className="btn btn-primary" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold' }}>✕ <span className="cem-close-text">Закрыть</span></button>
                    </div>
                </div>

                <div className="cem-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* ЛЕВАЯ КОЛОНКА */}
                    <div className="cem-left" style={{ flex: '6', display: 'flex', flexDirection: 'column', padding: '40px', overflowY: 'auto', background: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.03) 0%, transparent 50%)' }}>
                        
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
                                            <div className="cem-stats-table-wrap" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                <table className="stats-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                    <thead><tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}><th style={{padding:'20px'}}>Студент</th><th style={{padding:'20px'}}>Успеваемость (Прогресс)</th><th style={{padding:'20px'}}>Ответы (В / О)</th><th></th></tr></thead>
                                                    <tbody>
                                                        {getGroupedStats().map((student) => {
                                                            // Умный расчет процента: для видео считаем долю верных, для тестов берем готовый балл
                                                            const percent = isVideo 
                                                                ? (student.total > 0 ? Math.round((student.correct / student.total) * 100) : 0)
                                                                : (student.testScore || 0);

                                                            return (
                                                                <tr key={student.userId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                                                    <td style={{padding:'20px', color: '#fff', fontWeight: 500}}>{student.name}</td>
                                                                    <td style={{padding:'20px', width: '40%'}}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                                                                <div style={{ width: `${percent}%`, background: '#4dff88', height: '100%' }}></div>
                                                                                <div style={{ width: `${100 - percent}%`, background: '#ff4d4d', height: '100%' }}></div>
                                                                            </div>
                                                                            <span style={{ color: percent >= 50 ? '#4dff88' : '#ff4d4d', fontWeight: 'bold', fontSize: '14px', width: '40px' }}>{percent}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{padding:'20px', color: '#aaa', fontSize: '14px'}}>
                                                                        {isVideo ? (
                                                                            <><span style={{ color: '#4dff88' }}>{student.correct}</span> / <span style={{ color: '#ff4d4d' }}>{student.incorrect}</span></>
                                                                        ) : (
                                                                            <span>Попыток: {student.total}</span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{padding:'20px', textAlign: 'right'}}>
                                                                            <button className="btn btn-ghost" style={{color: accentColor, background: `rgba(${accentRgb}, 0.1)`, borderRadius: '8px', padding: '8px 16px'}} onClick={() => setExpandedStudent(student.userId)}>Детали</button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        {expandedStudent && (
                                            <div style={{ animation: 'fadeIn 0.3s ease', marginTop: '20px' }}>
                                                <h4 style={{ color: '#aaa', marginBottom: '20px', fontWeight: 'normal', fontSize: '18px' }}>
                                                    {isVideo ? 'Детализация ответов:' : 'История попыток:'} <span style={{color: '#fff', fontWeight: 'bold'}}>{expandedStudentName}</span>
                                                </h4>
                                                
                                                {isVideo ? (
                                                    /* --- СТАРАЯ ТАБЛИЦА ДЛЯ ВИДЕО --- */
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
                                                                                <div style={{background: 'rgba(77,255,136,0.1)', color: '#4dff88', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'}}><Icons.LogSuccess size={13}/> Верно</div>
                                                                            ) : (
                                                                                <div style={{background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'}}><Icons.Fail size={13}/> Ошибка</div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    /* --- НОВАЯ КАРТОЧКА ПОПЫТОК ДЛЯ ОБЫЧНЫХ ТЕСТОВ --- */
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                        {studentDetails.map((attempt: any, idx: number) => {
                                                            const answersObj = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : (attempt.answers || {});
                                                            
                                                            return (
                                                                <div key={attempt.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                                                                        <strong style={{ color: '#fff', fontSize: '16px' }}>Попытка {studentDetails.length - idx}</strong>
                                                                        <span style={{ color: attempt.score >= (selectedTest?.passingScore || 0) ? '#4dff88' : '#ff4d4d', fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '8px', fontSize: '14px' }}>
                                                                            Результат: {attempt.score}%
                                                                        </span>
                                                                    </div>
                                                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                                        <thead><tr style={{ color: '#888', fontSize: '13px' }}><th style={{padding:'8px 0'}}>Вопрос</th><th style={{padding:'8px 0'}}>Ответ студента</th><th style={{padding:'8px 0', textAlign: 'right'}}>Статус</th></tr></thead>
                                                                        <tbody>
                                                                            {selectedTest?.questions?.map((q: any) => {
                                                                                // 👇 ДОСТАЕМ НОВУЮ СТРУКТУРУ ДАННЫХ
                                                                                const resData = answersObj[q.id] || {};
                                                                                const userAns = Array.isArray(resData.answer) ? resData.answer.join(', ') : (resData.answer || null);
                                                                                const isCorrect = resData.isCorrect || false;

                                                                                return (
                                                                                    <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                                        <td style={{padding:'12px 0', color: '#ccc', fontSize: '14px', width: '45%'}}>{q.text}</td>
                                                                                        <td style={{padding:'12px 0', color: '#fff', fontSize: '14px', fontWeight: 500}}>
                                                                                            {userAns || <i style={{color:'#666'}}>Нет ответа</i>}
                                                                                            {/* Если есть оценка ИИ, покажем преподу! */}
                                                                                            {resData.similarity !== undefined && resData.similarity !== null && (
                                                                                                <span style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '12px', background: 'rgba(var(--primary-rgb),0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                                                    ИИ: {resData.similarity}%
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td style={{padding:'12px 0', textAlign: 'right', fontSize: '13px'}}>
                                                                                            {isCorrect ? <span style={{color: '#4dff88', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Icons.LogSuccess size={13}/> Верно</span> : <span style={{color: '#ff4d4d', display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Icons.Fail size={13}/> Ошибка</span>}
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                                {isVideo && selectedVideo && (
                                    <div style={{ width: '100%', marginBottom: '40px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', background: accentColor, filter: 'blur(100px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }}></div>
                                        <div className="player-wrapper-animation" style={{ position: 'relative', zIndex: 1, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                                            <VideoPlayer
                                                key={selectedVideo.id}
                                                sources={[
                                                    { quality: 'Оригинал', url: selectedVideo.url, subtitles: selectedVideo.subtitles },
                                                    ...[...(selectedVideo.qualityUrls || [])]
                                                        .sort((a: any, b: any) => parseInt(b.quality) - parseInt(a.quality))
                                                        .map((q: any) => ({ quality: q.quality, url: q.url, subtitles: selectedVideo.subtitles }))
                                                ]}
                                                title={selectedVideo.title} events={selectedVideo.events || []} hideResults={selectedVideo.hideResults}
                                                userId={userData?.id} userRole={userData?.role}
                                                videoId={selectedVideo.id} onTimeUpdate={(t) => setCurrentTime(t)} maxAttempts={selectedVideo.maxAttempts}
                                            />
                                        </div>
                                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {/* Строка 1: заголовок + кнопка субтитров */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Таймлайн интерактива:</span>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button className={`btn ${generatingVideos.includes(selectedVideo.id) ? 'btn-ghost' : 'btn-primary'}`} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }} onClick={handleGenerateSubs} disabled={generatingVideos.includes(selectedVideo.id)}>
                                                        {generatingVideos.includes(selectedVideo.id) ? <><Icons.Spinner /> Генерация ИИ...</> : <><Icons.AI /> ИИ Субтитры</>}
                                                    </button>
                                                    {selectedVideo.url.startsWith('/uploads/') && (
                                                        <button className={`btn btn-ghost`} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }} onClick={handleTranscode} disabled={transcodingVideos.includes(selectedVideo.id)} title="Создать версии 360p и 720p">
                                                            {transcodingVideos.includes(selectedVideo.id) ? <><Icons.Spinner /> Транскодирование...</> : <><Icons.Settings /> Версии качества</>}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Строка 2: быстрое добавление главы */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(var(--primary-rgb),0.04)', border: '1px solid rgba(var(--primary-rgb),0.15)', borderRadius: '12px', padding: '8px 12px' }}>
                                                <span style={{ flexShrink: 0 }}><Icons.FileText size={16}/></span>
                                                <input
                                                    className="deck-input"
                                                    placeholder="Название главы..."
                                                    value={chapterName}
                                                    onChange={e => setChapterName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddChapter()}
                                                    style={{ flex: 1, margin: 0, padding: '6px 10px', fontSize: '13px', background: 'transparent', border: 'none', outline: 'none' }}
                                                />
                                                <span style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 'bold', flexShrink: 0 }}>
                                                    @ {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                                                </span>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 'bold', flexShrink: 0, opacity: chapterName.trim() ? 1 : 0.4 }}
                                                    onClick={handleAddChapter}
                                                    disabled={!chapterName.trim() || isAddingChapter}
                                                >
                                                    {isAddingChapter ? '...' : '+ Глава'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isVideo && selectedVideo?.events && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[...selectedVideo.events].sort((a, b) => a.time - b.time).map(ev => (
                                            <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '15px 20px', borderRadius: '16px', borderLeft: `4px solid ${ev.type === 'chapter' ? 'var(--primary)' : ev.type === 'info' ? '#ffd700' : 'var(--primary)'}`, transition: 'all 0.2s ease', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                                <div>
                                                    <strong style={{ color: ev.type === 'chapter' ? 'var(--primary)' : ev.type === 'info' ? '#ffd700' : 'var(--primary)', marginRight: '15px', fontSize: '18px', fontFamily: 'monospace' }}>{Math.floor(ev.time / 60)}:{(Math.floor(ev.time % 60)).toString().padStart(2, '0')}</strong>
                                                    <span style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>{ev.question}</span>
                                                    <span style={{ marginLeft: '12px', fontSize: '10px', color: '#888', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px', textTransform: 'uppercase' }}>{ev.type.replace('_', ' ')}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '8px' }} onClick={() => handleEditClick(ev)}><Icons.Edit size={14}/></button>
                                                    <button className="btn btn-ghost" style={{ padding: '8px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', borderRadius: '8px' }} onClick={() => handleDeleteClick(ev.id)}><Icons.Trash size={14}/></button>
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
                                        <DndContext 
                                            sensors={sensors} 
                                            collisionDetection={closestCenter} 
                                            onDragStart={() => { isDraggingQuestionRef.current = true; }} // Блокируем радар
                                            onDragCancel={() => { isDraggingQuestionRef.current = false; }} // Разблокируем радар
                                            onDragEnd={async (event) => {
                                                await handleDragEndTest(event);
                                                isDraggingQuestionRef.current = false; // Разблокируем после сохранения
                                            }}
                                        >
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
                    <div className="cem-right" style={{ flex: '4', minWidth: '400px', background: '#141416', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
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
                            {/* --- ВКЛАДКА: НАСТРОЙКИ --- */}
                            {rightTab === 'settings' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px' }}>Правила прохождения</h4>
                                        <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>Попыток сдачи (0 = безлимит):</label>
                                        <input type="number" className="deck-input" min="0" value={settingsData.maxAttempts} onChange={e => setSettingsData({...settingsData, maxAttempts: e.target.value === '' ? '' : Number(e.target.value)})} style={{ background: 'rgba(0,0,0,0.3)', width: '100%', fontSize: '16px', padding: '12px' }} />
                                        
                                        {!isVideo && (
                                            <div style={{ marginTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '13px', color: '#aaa', fontWeight: 500 }}>Проходной балл:</span>
                                                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '8px' }}>
                                                        {settingsData.passingScore}%
                                                    </span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="1" 
                                                    max="100" 
                                                    value={settingsData.passingScore} 
                                                    onChange={e => setSettingsData({...settingsData, passingScore: Number(e.target.value)})} 
                                                    style={{ width: '100%', accentColor: accentColor, height: '6px', cursor: 'pointer' }} 
                                                />
                                            </div>
                                        )}

                                        {/* 👇 ЕДИНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ДЛЯ ВСЕХ (и для видео, и для тестов) */}
                                        <label className="toggle-wrapper" style={{ marginTop: '25px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', cursor: 'pointer' }}>
                                            <input type="checkbox" className="toggle-input" checked={settingsData.hideResults} onChange={e => setSettingsData({...settingsData, hideResults: e.target.checked})} />
                                            <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                            <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px', fontWeight: 500}}>Скрыть работу над ошибками</span>
                                        </label>
                                        
                                        {/* Только для видео */}
                                        {isVideo && (
                                            <label className="toggle-wrapper" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', cursor: 'pointer' }}>
                                                <input type="checkbox" className="toggle-input" checked={settingsData.allowExternalTest} onChange={e => setSettingsData({...settingsData, allowExternalTest: e.target.checked})} />
                                                <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px', fontWeight: 500}}>Разрешить решать без видео</span>
                                            </label>
                                        )}

                                        {/* Для видео и тестов */}
                                        <label className="toggle-wrapper" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', cursor: 'pointer' }}>
                                            <input type="checkbox" className="toggle-input" checked={settingsData.isHidden} onChange={e => setSettingsData({...settingsData, isHidden: e.target.checked})} />
                                            <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                            <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px', fontWeight: 500}}>Скрыть от студентов</span>
                                        </label>

                                        {/* Только для тестов */}
                                        {!isVideo && (
                                            <label className="toggle-wrapper" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', cursor: 'pointer' }}>
                                                <input type="checkbox" className="toggle-input" checked={settingsData.shuffleQuestions} onChange={e => setSettingsData({...settingsData, shuffleQuestions: e.target.checked})} />
                                                <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                <span className="toggle-label" style={{color: '#fff', marginLeft: '12px', fontSize: '14px', fontWeight: 500}}>Перемешивать вопросы случайно</span>
                                            </label>
                                        )}
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Открыть с даты (пусто — доступно сразу):</label>
                                            <DateTimePicker
                                                value={settingsData.unlockDate}
                                                onChange={val => setSettingsData({...settingsData, unlockDate: val})}
                                            />
                                        </div>

                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%', marginTop: '20px', opacity: isChanged ? 1 : 0.5, cursor: isChanged ? 'pointer' : 'not-allowed', transition: '0.3s' }} 
                                            onClick={handleSaveSettings} 
                                            disabled={isSavingSettings || !isChanged}
                                        >
                                            {isSavingSettings ? 'Сохранение...' : (isChanged ? <><Icons.Save size={14}/> Сохранить настройки</> : <><Icons.Check size={14}/> Настройки сохранены</>)}
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
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndOption}>
                                                <SortableContext items={options.map((_, idx) => `opt-${idx}`)} strategy={verticalListSortingStrategy}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {options.map((opt, idx) => (
                                                            <SortableOption 
                                                                key={`opt-${idx}`} 
                                                                opt={opt} 
                                                                idx={idx} 
                                                                isCorrect={opt.isCorrect}
                                                                isDuplicate={duplicateIndices.includes(idx)}
                                                                accentColor={accentColor}
                                                                onChangeText={(val: string) => handleOptionChange(idx, 'text', val)}
                                                                onToggleCorrect={(e: any) => handleOptionChange(idx, 'isCorrect', e.target.checked)}
                                                                onRemove={() => handleRemoveOption(idx)}
                                                            />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                            <button className="btn btn-ghost" style={{ marginTop: '15px', fontSize: '14px', color: accentColor, width: '100%', background: `rgba(${accentRgb},0.05)`, padding: '10px', borderRadius: '12px', fontWeight: 'bold' }} onClick={handleAddOption}>+ Добавить вариант</button>
                                        </div>
                                    )}

                                    {eventType === 'free_text' && (
                                        <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(var(--primary-rgb), 0.3)', position: 'relative', overflow: 'hidden' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Эталон для нейросети:</label>
                                            <textarea className="deck-input" placeholder="Напишите идеальный ответ или ключевые слова, которые должен упомянуть студент..." value={freeTextAnswer} onChange={e => setFreeTextAnswer(e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', minHeight: '100px', resize: 'vertical', fontSize: '14px', border: '1px solid rgba(var(--primary-rgb), 0.2)' }} />
                                            
                                            <div style={{ marginTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500 }}>Требуемая точность ответа:</span>
                                                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', background: 'rgba(var(--primary-rgb),0.2)', padding: '2px 8px', borderRadius: '8px' }}>{aiThreshold}%</span>
                                                </div>
                                                <input type="range" min="10" max="100" value={aiThreshold} onChange={e => setAiThreshold(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', height: '6px' }} />
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
                                    {isAddingEvent ? 'Сохранение...' : (editingEventId ? <><Icons.Save size={14}/> Сохранить изменения</> : <><Icons.Plus size={14}/> Создать элемент</>)}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
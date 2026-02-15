import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    getVideosByCourse,
    addEvent,
    updateEvent,
    deleteEvent, // <--- Добавили две новые
    getVideoStats,
    updateVideo,
    getCourses,
    createCourse,
    generateAutoSubtitles
} from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';
import { AddVideoForm } from '../components/AddVideoForm';
import type { IVideo, ICourse } from '../types';
import './PrepodPage.css';
import './UserPage.css'; // На случай если нужны общие стили
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';

// Иконки SVG для интерфейса
const Icons = {
    Time: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Back: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>,
    Stats: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    AI: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 10.5"/></svg>
};

export const PrepodPage = () => {
  // --- СОСТОЯНИЕ: КУРСЫ ---
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const { user, logout, updateUser } = useAuth();

  // Функция для обновления аватара в состоянии админки
  const handleAvatarUpdate = (newUrl: string) => {
        updateUser({ avatarUrl: newUrl });
    };
  // Форма создания нового курса
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseInstructor, setNewCourseInstructor] = useState('');

  // --- СОСТОЯНИЕ: ВИДЕО И РЕДАКТОР ---
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
  // Конструктор событий (меток)
  const [currentTime, setCurrentTime] = useState(0);
  const [eventType, setEventType] = useState<'single_choice' | 'multiple_choice' | 'free_text' | 'info'>('single_choice');
  
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
  const [freeTextAnswer, setFreeTextAnswer] = useState(''); // Эталонный ответ для ИИ
  const [isStrict, setIsStrict] = useState(false);
  const [weight, setWeight] = useState(1);
  const [rewindTo, setRewindTo] = useState<number | ''>('');
  const [explanation, setExplanation] = useState('');
  const [aiThreshold, setAiThreshold] = useState(50);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);

  // Статистика
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const handleAddOption = () => setOptions([...options, { text: '', isCorrect: false }]);
  
  const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  
  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: any) => {
      const newOptions = [...options];
      // Если это выбор одного ответа, сбрасываем остальные галочки
      if (eventType === 'single_choice' && field === 'isCorrect' && value === true) {
          newOptions.forEach(opt => opt.isCorrect = false);
      }
      newOptions[index] = { ...newOptions[index], [field]: value };
      setOptions(newOptions);
  };
  // --- ЭФФЕКТЫ И ЛОГИКА ---

  // 1. ПРИ ЗАГРУЗКЕ СТРАНИЦЫ - ГРУЗИМ СПИСОК КУРСОВ
  useEffect(() => {
    loadCourses();
  }, []);

  // Следим за сменой курса
  useEffect(() => {
      if (selectedCourseId) {
          loadVideos();
          setSelectedVideo(null);
      }
  }, [selectedCourseId]);

  const loadCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (e) {
        console.error("Ошибка загрузки курсов", e);
      }
  };

  const handleCreateCourse = async () => {
      if (!newCourseTitle.trim() || !newCourseInstructor.trim()) {
          return alert('Заполните название и ФИО преподавателя!');
      }
      try {
          await createCourse({
              title: newCourseTitle,
              description: newCourseDesc,
              instructor: newCourseInstructor
          });
          setNewCourseTitle(''); setNewCourseDesc(''); setNewCourseInstructor('');
          loadCourses(); 
          alert('Курс успешно создан!');
      } catch (e) {
          alert('Ошибка при создании курса');
      }
  };

  const loadVideos = async () => {
    if (!selectedCourseId) return;
    try {
        const data = await getVideosByCourse(selectedCourseId);
        setVideos(data);
        
        if (selectedVideo) {
            const updated = data.find(v => v.id === selectedVideo.id);
            if (updated) setSelectedVideo(updated);
        }
    } catch (e) {
        console.error("Ошибка загрузки видео", e);
    }
  };

  const toggleHideResults = async () => {
      if (!selectedVideo) return;
      try {
          const newState = !selectedVideo.hideResults;
          await updateVideo(selectedVideo.id, { hideResults: newState });
          
          setSelectedVideo({ ...selectedVideo, hideResults: newState });
          setVideos(prev => prev.map(v => v.id === selectedVideo.id ? { ...v, hideResults: newState } : v));
      } catch (e) {
          alert("Ошибка при обновлении настроек");
      }
  };

  const handleAddEvent = async () => {
      if (!selectedVideo) return;
      
      if (!questionText.trim()) return alert('Введите текст вопроса или информации!');
      
      if (eventType === 'single_choice' || eventType === 'multiple_choice') {
          if (options.some(o => !o.text.trim())) return alert('Заполните все варианты ответов!');
          if (!options.some(o => o.isCorrect)) return alert('Выберите хотя бы один правильный ответ!');
      }

      if (eventType === 'free_text' && !freeTextAnswer.trim()) {
          return alert('Введите эталонный ответ (ключевые слова) для проверки!');
      }

      setIsAddingEvent(true);
      try {
          const eventPayload = {
              time: currentTime,
              type: eventType,
              question: questionText, 
              options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
              correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
              isStrict, weight: Number(weight),
              rewindTo: rewindTo === '' ? undefined : Number(rewindTo),
              explanation, aiThreshold
          };

          if (editingEventId) {
              await updateEvent(editingEventId, eventPayload);
              alert('Метка успешно обновлена!');
          } else {
              await addEvent(selectedVideo.id, eventPayload);
              alert('Метка успешно добавлена на таймлайн!');
          }
          
          // Сбрасываем форму
          setQuestionText(''); 
          setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
          setFreeTextAnswer(''); setExplanation(''); setRewindTo(''); setAiThreshold(50);
          setEditingEventId(null); // Выходим из режима редактирования
          
          await loadVideos();
      } catch (e) {
          alert('Ошибка при добавлении метки');
      } finally {
          setIsAddingEvent(false);
      }
  };
  const handleEditClick = (ev: any) => {
      setEditingEventId(ev.id);
      setCurrentTime(ev.time);
      setEventType(ev.type);
      setQuestionText(ev.question);
      if (ev.type === 'free_text') setFreeTextAnswer(ev.correctAnswer || '');
      if (ev.options && ev.options.length > 0) setOptions(ev.options);
      setIsStrict(ev.isStrict || false);
      setWeight(ev.weight || 1);
      setRewindTo(ev.rewindTo !== null && ev.rewindTo !== undefined ? ev.rewindTo : '');
      setExplanation(ev.explanation || '');
      setAiThreshold(ev.aiThreshold || 50);
      
      // Скроллим наверх к плееру, чтобы было удобно
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (eventId: number) => {
      if (!window.confirm('Точно удалить этот вопрос?')) return;
      try {
          await deleteEvent(eventId);
          if (editingEventId === eventId) setEditingEventId(null); // Если удалили то, что редактировали
          await loadVideos();
      } catch (e) {
          alert('Ошибка при удалении');
      }
  };
  const handleGenerateSubs = async () => {
      if (!selectedVideo) return;
      const confirm = window.confirm("Генерация займет время. Продолжить?");
      if (!confirm) return;

      setIsGeneratingSubs(true);
      try {
          await generateAutoSubtitles(selectedVideo.id);
          alert("Готово! Субтитры успешно созданы.");
          await loadVideos(); 
      } catch (e) {
          console.error(e);
          alert("Ошибка при генерации.");
      } finally {
          setIsGeneratingSubs(false);
      }
  };

  // Статистика
  const loadStats = async () => {
      if (!selectedVideo) return;
      try {
          const data = await getVideoStats(selectedVideo.id);
          setStatsData(data);
          setExpandedStudent(null); 
          setShowStats(true);
      } catch (e) {
          alert('Не удалось загрузить статистику');
      }
  };

  const getGroupedStats = () => {
      // Группируем по ID, чтобы избежать багов с однофамильцами
      const groups: Record<number, { correct: number; incorrect: number; name: string; userId: number }> = {};
      
      statsData.forEach(stat => {
          const uId = stat.userId;
          // Собираем имя из пришедших данных или пишем ID, если данных вдруг нет
          const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${uId}`;
          
          if (!groups[uId]) groups[uId] = { correct: 0, incorrect: 0, name, userId: uId };
          
          if (stat.isCorrect) groups[uId].correct++;
          else groups[uId].incorrect++;
      });
      
      return Object.values(groups).map(data => ({
          ...data,
          total: data.correct + data.incorrect
      }));
  };

  const groupedStats = getGroupedStats();
  const studentDetails = expandedStudent !== null ? statsData.filter(s => s.userId === expandedStudent) : [];
  const expandedStudentName = expandedStudent !== null ? groupedStats.find(s => s.userId === expandedStudent)?.name : '';

  // === RENDER ===

  // === RENDER ===

  // СЦЕНАРИЙ 1: ВЫБОР КУРСА
  if (!selectedCourseId) {
    return (
        <div className="prepod-layout">
            <header className="lumeo-header">
                <div className="logo">Lumeo<span className="dot">.</span></div>
                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                <span style={{fontSize: '14px', color: '#888', fontWeight: 600, marginRight: '10px'}}>Панель преподавателя</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              
              {user && (
                    <UserProfile 
                        user={user} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={logout} 
                    />
                )}
            </div>
            </header>

            <div className="courses-container">
                <div className="courses-header">
                    <h1>Ваши курсы</h1>
                    <p>Выберите курс для редактирования или создайте новый</p>
                </div>

                <div className="courses-grid">
                    {courses.map(c => (
                        <div key={c.id} className="course-card" onClick={() => setSelectedCourseId(c.id)}>
                            <h3 className="course-title">{c.title}</h3>
                            <div className="course-instructor">👨‍🏫 {c.instructor}</div>
                            <div className="course-desc">{c.description || 'Нет описания'}</div>
                            <div className="course-meta">{c.videos?.length || 0} УРОКОВ</div>
                        </div>
                    ))}
                </div>

                <div className="create-course-panel">
                    <h3>+ Создать новый курс</h3>
                    <div style={{display: 'flex', gap: '12px', marginBottom: '12px'}}>
                        <input className="deck-input" style={{marginBottom: 0}} placeholder="Название курса (DevOps)" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} />
                        <input className="deck-input" style={{marginBottom: 0}} placeholder="ФИО Преподавателя" value={newCourseInstructor} onChange={e => setNewCourseInstructor(e.target.value)} />
                    </div>
                    <textarea className="deck-input" placeholder="Краткое описание курса..." value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} style={{minHeight: '80px', resize: 'vertical'}} />
                    <button className="btn btn-primary" onClick={handleCreateCourse}>Создать курс</button>
                </div>
            </div>
        </div>
    )
  }

  // СЦЕНАРИЙ 2: РЕДАКТОР КУРСА
  return (
    <div className="prepod-layout">
        {/* MODAL STATS */}
        {showStats && (
            <div className="stats-modal-overlay">
                <div className="stats-modal-content">
                    <div className="stats-modal-header">
                        <div>
                            <h3 style={{margin: 0}}>Статистика: {selectedVideo?.title}</h3>
                            {expandedStudent && (<button className="back-link" onClick={() => setExpandedStudent(null)}>← К списку группы</button>)}
                        </div>
                        <button className="close-btn" onClick={() => setShowStats(false)}>✕</button>
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
                                                        
                                                        {/* НОВАЯ ЯЧЕЙКА: */}
                                                        <td style={{ textAlign: 'center' }}>
                                                            {stat.event?.type === 'free_text' && stat.similarity !== null ? (
                                                                <span style={{ 
                                                                    color: stat.isCorrect ? '#4dff88' : '#ff4d4d', 
                                                                    fontSize: '13px', 
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px'
                                                                }}>
                                                                    {stat.similarity}%
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#444' }}>—</span>
                                                            )}
                                                        </td>

                                                        <td style={{ textAlign: 'right' }}>
                                                            {stat.isCorrect ? (
                                                                <span style={{ color: '#4dff88', fontWeight: 'bold' }}>✅ Верно</span>
                                                            ) : (
                                                                <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>❌ Ошибка</span>
                                                            )}
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

        {/* HEADER */}
        <header className="lumeo-header">
             <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                 <button className="btn btn-ghost" onClick={() => setSelectedCourseId(null)} style={{padding: '6px 12px'}}>
                    <Icons.Back /> Назад
                 </button>
                 <div style={{height: '24px', width: '1px', background: '#333'}}></div>
                 <div className="logo" style={{fontSize: '18px'}}>
                    {courses.find(c => c.id === selectedCourseId)?.title}
                    <span style={{color: '#666', fontWeight: 400, marginLeft: '8px'}}>| Редактор</span>
                 </div>
             </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              
              {/* Вставляем профиль */}
              {user && (
                    <UserProfile 
                        user={user} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={logout} 
                    />
                )}
            </div>
        </header>

        <div className="editor-container">
            {/* SIDEBAR */}
            <aside className="editor-sidebar">
                <div style={{ padding: '20px' }}>
                     <AddVideoForm onVideoAdded={loadVideos} courseId={selectedCourseId} />
                </div>
                <div className="sidebar-header"><h3>Список уроков</h3></div>
                <div className="video-list">
                    {videos.map((v, idx) => (
                        <div key={v.id} className={`video-item ${selectedVideo?.id === v.id ? 'active' : ''}`} onClick={() => { if (selectedVideo?.id !== v.id) setSelectedVideo(v); }}>
                            <div className="video-idx">{idx + 1}</div>
                            <div className="video-title">{v.title}</div>
                        </div>
                    ))}
                    {videos.length === 0 && <div style={{padding: '20px', color: '#666', fontSize: '13px', textAlign: 'center'}}>Нет видео в этом курсе</div>}
                </div>
            </aside>

            {/* MAIN STAGE */}
            <main className="editor-stage">
                {selectedVideo ? (
                    <>
                        <div className="player-wrapper-animation" style={{width: '100%', maxWidth: '1000px'}}>
                            <VideoPlayer 
                                key={selectedVideo.id}
                                sources={[{ quality: 'Auto', url: selectedVideo.url, subtitles: selectedVideo.subtitles }]} 
                                title={selectedVideo.title} 
                                events={selectedVideo.events || []}
                                hideResults={selectedVideo.hideResults} 
                                onTimeUpdate={(t) => setCurrentTime(t)}
                            />
                        </div>

                        {/* ПАНЕЛЬ УПРАВЛЕНИЯ (CONTROL DECK) */}
                        <div className="control-deck">
                            <div className="deck-header">
                                <div className="deck-title">
                                    <div className="deck-icon">⚡</div>
                                    <h3>Панель управления</h3>
                                </div>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <button className="btn btn-ghost" onClick={loadStats}>
                                        <Icons.Stats /> Статистика
                                    </button>
                                    <button className="btn btn-ai" onClick={handleGenerateSubs} disabled={isGeneratingSubs}>
                                        <Icons.AI /> {isGeneratingSubs ? 'Создаю...' : 'AI Субтитры'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                {/* ЛЕВАЯ КОЛОНКА: ИНПУТЫ */}
                                <div style={{ flex: 2, minWidth: '300px' }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                        <select 
                                            className="deck-input" 
                                            style={{ width: 'auto', marginBottom: 0, padding: '5px 10px', fontSize: '13px' }}
                                            value={eventType}
                                            onChange={(e) => setEventType(e.target.value as any)}
                                        >
                                            <option value="single_choice">Один из списка (Radio)</option>
                                            <option value="multiple_choice">Несколько ответов (Checkbox)</option>
                                            <option value="free_text">Открытый вопрос (ИИ Проверка)</option>
                                            <option value="info">Инфо-пауза (без ответа)</option>
                                        </select>
                                        <div style={{color: '#666', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                            <Icons.Time /> {currentTime.toFixed(1)}s
                                        </div>
                                    </div>
                                    {eventType === 'free_text' && (
                                            <div style={{ marginBottom: '15px', background: 'rgba(0, 174, 239, 0.05)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #00aeef' }}>
                                                <label style={{ fontSize: '13px', color: '#00aeef', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' }}>
                                                    <span>Точность совпадения (ИИ):</span>
                                                    <span>{aiThreshold}%</span>
                                                </label>
                                                <input 
                                                    type="range" 
                                                    min="10" 
                                                    max="100" 
                                                    value={aiThreshold} 
                                                    onChange={e => setAiThreshold(Number(e.target.value))} 
                                                    style={{ width: '100%', accentColor: '#00aeef' }} 
                                                />
                                                <p style={{fontSize: '11px', color: '#888', marginTop: '8px', lineHeight: '1.4'}}>
                                                    Установите <strong>30-40%</strong>, если достаточно передать общий смысл своими словами. <strong>80-90%</strong> — для строгой терминологии.
                                                </p>
                                            </div>
                                        )}
                                    <input 
                                        className="deck-input" 
                                        placeholder={eventType === 'info' ? "Текст карточки (напр. 'Запомните эту формулу')..." : "Текст вопроса..."} 
                                        value={questionText} 
                                        onChange={e => setQuestionText(e.target.value)} 
                                    />
                                    
                                    {/* ДИНАМИЧЕСКИЕ ВАРИАНТЫ ОТВЕТОВ */}
                                    {(eventType === 'single_choice' || eventType === 'multiple_choice') && (
                                        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: '#888' }}>Варианты ответа (отметьте верные):</h5>
                                            {options.map((opt, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <input 
                                                        type={eventType === 'single_choice' ? 'radio' : 'checkbox'}
                                                        checked={opt.isCorrect}
                                                        onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <input 
                                                        className="deck-input" 
                                                        style={{ marginBottom: 0, flex: 1 }} 
                                                        placeholder={`Вариант ${idx + 1}`} 
                                                        value={opt.text} 
                                                        onChange={e => handleOptionChange(idx, 'text', e.target.value)} 
                                                    />
                                                    {options.length > 2 && (
                                                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleRemoveOption(idx)}>
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }} onClick={handleAddOption}>
                                                + Добавить вариант
                                            </button>
                                        </div>
                                    )}

                                    {/* ОТКРЫТЫЙ ВОПРОС */}
                                    {eventType === 'free_text' && (
                                        <textarea 
                                            className="deck-input" 
                                            placeholder="Введите эталонный ответ, ключевые слова или факты. ИИ будет сверять ответ студента с этим текстом..." 
                                            value={freeTextAnswer} 
                                            onChange={e => setFreeTextAnswer(e.target.value)} 
                                            style={{ minHeight: '80px', resize: 'vertical' }}
                                        />
                                    )}
                                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddEvent} disabled={isAddingEvent}>
                                            {isAddingEvent ? 'Сохранение...' : (editingEventId ? 'Сохранить изменения' : 'Добавить метку')}
                                        </button>
                                        {editingEventId && (
                                            <button className="btn btn-ghost" onClick={() => {
                                                setEditingEventId(null);
                                                setQuestionText(''); 
                                                setExplanation('');
                                            }}>Отмена</button>
                                        )}
                                    </div>
                                </div>

                                {/* ПРАВАЯ КОЛОНКА: НАСТРОЙКИ */}
                                <div style={{ flex: 1, minWidth: '250px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                                    <h4 style={{marginTop: 0, marginBottom: '20px', color: '#888'}}>Настройки логики</h4>
                                    
                                    {eventType !== 'info' && (
                                        <>
                                            <label className="toggle-wrapper" style={{ marginBottom: '15px' }}>
                                                <input type="checkbox" className="toggle-input" checked={isStrict} onChange={e => setIsStrict(e.target.checked)} />
                                                <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                                <span className="toggle-label">Строгий режим (нельзя пропустить)</span>
                                            </label>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Вес в баллах:</label>
                                                <input type="number" className="deck-input" min="1" max="100" value={weight} onChange={e => setWeight(Number(e.target.value))} style={{ marginBottom: 0 }} />
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Откинуть при ошибке на (секунду):</label>
                                                <input type="number" className="deck-input" placeholder="Например: 120 (оставить пустым для отключения)" value={rewindTo} onChange={e => setRewindTo(e.target.value ? Number(e.target.value) : '')} style={{ marginBottom: 0 }} />
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Объяснение при ошибке:</label>
                                                <textarea className="deck-input" placeholder="Неверно, потому что..." value={explanation} onChange={e => setExplanation(e.target.value)} style={{ minHeight: '60px', marginBottom: 0, resize: 'vertical' }} />
                                            </div>
                                            
                                            <div style={{ borderTop: '1px solid #333', margin: '20px 0' }}></div>
                                        </>
                                    )}
                                    
                                    <h4 style={{marginTop: 0, marginBottom: '20px', color: '#888'}}>Настройки видео</h4>
                                    <label className="toggle-wrapper">
                                        <input 
                                            type="checkbox" 
                                            className="toggle-input"
                                            checked={selectedVideo.hideResults || false}
                                            onChange={toggleHideResults}
                                        />
                                        <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                        <span className="toggle-label">Скрыть результаты теста сразу</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        {/* СПИСОК СОЗДАННЫХ МЕТОК */}
                        {selectedVideo.events && selectedVideo.events.length > 0 && (
                            <div style={{ marginTop: '30px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333', maxWidth: '1000px' }}>
                                <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>Метки и вопросы ({selectedVideo.events.length})</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[...selectedVideo.events].sort((a, b) => a.time - b.time).map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${ev.type === 'info' ? '#ffd700' : '#00aeef'}` }}>
                                            <div>
                                                <strong style={{ color: ev.type === 'info' ? '#ffd700' : '#00aeef', marginRight: '10px' }}>
                                                    {Math.floor(ev.time / 60)}:{(Math.floor(ev.time % 60)).toString().padStart(2, '0')}
                                                </strong>
                                                <span style={{ color: '#eee' }}>{ev.question}</span>
                                                <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {ev.type}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleEditClick(ev)} title="Редактировать">✏️</button>
                                                <button className="btn btn-ghost" style={{ padding: '6px', color: '#ff4d4d' }} onClick={() => handleDeleteClick(ev.id)} title="Удалить">🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <h2>Выберите урок</h2>
                        <p>Нажмите на видео в списке слева, чтобы начать редактирование.</p>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
};
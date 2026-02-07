import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    getVideosByCourse, 
    addEvent, 
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
  const [username, setUsername] = useState(localStorage.getItem('lumeo_user') || 'Преподаватель');
  const handleLogout = () => {
    localStorage.removeItem('lumeo_user');
    window.location.href = '/auth';
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
  const [eventType, setEventType] = useState<'question' | 'chapter'>('question');
  
  const [questionText, setQuestionText] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // Авто Субтитры
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  
  // Статистика
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

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
      
      if (eventType === 'question' && (!questionText || !option1 || !option2 || !correctAnswer)) {
          alert('Заполните все поля вопроса!');
          return;
      }
      if (eventType === 'chapter' && !questionText) {
          alert('Введите название главы!');
          return;
      }

      setIsAddingEvent(true);
      try {
          await addEvent(selectedVideo.id, {
              time: currentTime,
              type: eventType,
              question: questionText, 
              options: eventType === 'question' ? [option1, option2] : [],
              correctAnswer: eventType === 'question' ? correctAnswer : ''
          });
          
          alert(eventType === 'question' ? 'Вопрос добавлен!' : 'Глава добавлена!');
          setQuestionText(''); setOption1(''); setOption2(''); setCorrectAnswer('');
          await loadVideos();
      } catch (e) {
          alert('Ошибка при добавлении');
      } finally {
          setIsAddingEvent(false);
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
      const groups: Record<string, { correct: number; incorrect: number }> = {};
      statsData.forEach(stat => {
          const name = stat.userId;
          if (!groups[name]) groups[name] = { correct: 0, incorrect: 0 };
          if (stat.isCorrect) groups[name].correct++;
          else groups[name].incorrect++;
      });
      return Object.entries(groups).map(([name, data]) => ({
          name,
          ...data,
          total: data.correct + data.incorrect
      }));
  };

  const groupedStats = getGroupedStats();
  const studentDetails = expandedStudent ? statsData.filter(s => s.userId === expandedStudent) : [];

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
              
              {/* Вставляем профиль */}
              <UserProfile username={username} onLogout={handleLogout} />
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
                                                <tr key={student.name} className="stats-row">
                                                    <td className="student-name-cell">{student.name}</td>
                                                    <td><span className="status-badge solved">Решён</span></td>
                                                    <td style={{ textAlign: 'center' }}><div className="count-badge correct">{student.correct}</div></td>
                                                    <td style={{ textAlign: 'center' }}><div className={`count-badge incorrect ${student.incorrect === 0 ? 'zero' : ''}`}>{student.incorrect}</div></td>
                                                    <td style={{ textAlign: 'right' }}><button className="details-btn" onClick={() => setExpandedStudent(student.name)}>Подробнее</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {expandedStudent && (
                                    <div>
                                        <h4 style={{ color: '#00aeef', marginTop: 0, marginBottom: '25px', fontSize: '1.2rem' }}>Ответы студента: <span style={{color: 'white'}}>{expandedStudent}</span></h4>
                                        <table className="stats-table">
                                            <thead><tr><th>Вопрос</th><th>Ответ</th><th style={{ textAlign: 'right' }}>Результат</th></tr></thead>
                                            <tbody>
                                                {studentDetails.map((stat) => (
                                                    <tr key={stat.id} className="stats-row">
                                                        <td style={{ color: '#ccc' }}>{stat.event?.question || 'Вопрос удален'}</td>
                                                        <td style={{ color: '#fff', fontWeight: '500' }}>{stat.answer}</td>
                                                        <td style={{ textAlign: 'right' }}>{stat.isCorrect ? (<span style={{ color: '#4dff88', fontWeight: 'bold' }}>✅ Верно</span>) : (<span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>❌ Ошибка</span>)}</td>
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
              <UserProfile username={username} onLogout={handleLogout} />
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
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                                        <div className="type-switch">
                                            <button className={`type-btn ${eventType === 'question' ? 'active' : ''}`} onClick={() => setEventType('question')}>Вопрос</button>
                                            <button className={`type-btn ${eventType === 'chapter' ? 'active' : ''}`} onClick={() => setEventType('chapter')}>Глава</button>
                                        </div>
                                        <div style={{color: '#666', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                            <Icons.Time /> {currentTime.toFixed(1)}s
                                        </div>
                                    </div>

                                    <input 
                                        className="deck-input" 
                                        placeholder={eventType === 'question' ? "Текст вопроса..." : "Название главы"} 
                                        value={questionText} 
                                        onChange={e => setQuestionText(e.target.value)} 
                                    />
                                    
                                    {eventType === 'question' && (
                                        <>
                                            <div className="deck-row">
                                                <input className="deck-input" style={{marginBottom: 0}} placeholder="Вариант A" value={option1} onChange={e => setOption1(e.target.value)} />
                                                <input className="deck-input" style={{marginBottom: 0}} placeholder="Вариант B" value={option2} onChange={e => setOption2(e.target.value)} />
                                            </div>
                                            <input className="deck-input" placeholder="Правильный ответ (скопируйте текст варианта)" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} />
                                        </>
                                    )}
                                    
                                    <button className="btn btn-primary" onClick={handleAddEvent} disabled={isAddingEvent}>
                                        {isAddingEvent ? 'Сохранение...' : 'Добавить метку на таймлайн'}
                                    </button>
                                </div>

                                {/* ПРАВАЯ КОЛОНКА: НАСТРОЙКИ */}
                                <div style={{ flex: 1, minWidth: '200px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                                    <h4 style={{marginTop: 0, marginBottom: '20px', color: '#888'}}>Настройки урока</h4>
                                    
                                    <label className="toggle-wrapper">
                                        <input 
                                            type="checkbox" 
                                            className="toggle-input"
                                            checked={selectedVideo.hideResults || false}
                                            onChange={toggleHideResults}
                                        />
                                        <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                        <span className="toggle-label">Скрыть результаты теста</span>
                                    </label>
                                    
                                    <p style={{fontSize: '12px', color: '#555', marginTop: '10px', lineHeight: '1.4'}}>
                                        Если включено, студент не увидит правильные ответы сразу после выбора.
                                    </p>
                                </div>
                            </div>
                        </div>
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
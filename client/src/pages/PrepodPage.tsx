import { useEffect, useState } from 'react';
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
import './PrepodPage.css'
import './UserPage.css';

export const PrepodPage = () => {
  // --- СОСТОЯНИЕ: КУРСЫ ---
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  
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

  //Авто Субтитры
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  // Статистика
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // 1. ПРИ ЗАГРУЗКЕ СТРАНИЦЫ - ГРУЗИМ СПИСОК КУРСОВ
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (e) {
        console.error("Ошибка загрузки курсов", e);
      }
  };

  // 2. СОЗДАНИЕ КУРСА
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

  // 3. ЗАГРУЗКА ВИДЕО (Только для выбранного курса)
  const loadVideos = async () => {
    if (!selectedCourseId) return;
    try {
        const data = await getVideosByCourse(selectedCourseId);
        setVideos(data);
        
        // Если видео было открыто, обновляем его данные (чтобы появились новые вопросы)
        if (selectedVideo) {
            const updated = data.find(v => v.id === selectedVideo.id);
            if (updated) setSelectedVideo(updated);
        }
    } catch (e) {
        console.error("Ошибка загрузки видео", e);
    }
  };

  // Следим за сменой курса: если выбрали курс, грузим его видео
  useEffect(() => {
      if (selectedCourseId) {
          loadVideos();
          setSelectedVideo(null); // Сбрасываем открытое видео
      }
  }, [selectedCourseId]);


  // 4. ЛОГИКА РЕДАКТОРА (HIDE RESULTS)
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

  // 5. ДОБАВЛЕНИЕ СОБЫТИЯ (ВОПРОС ИЛИ ГЛАВА)
  const handleAddEvent = async () => {
      if (!selectedVideo) return;
      
      // Валидация
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
          // Очистка формы
          setQuestionText(''); setOption1(''); setOption2(''); setCorrectAnswer('');
          // Обновляем данные видео, чтобы метка появилась на таймлайне
          await loadVideos();
      } catch (e) {
          alert('Ошибка при добавлении');
      } finally {
          setIsAddingEvent(false);
      }
  };

  // 6. СТАТИСТИКА
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
  const handleGenerateSubs = async () => {
      if (!selectedVideo) return;
      
      const confirm = window.confirm(
          "Сейчас нейросеть начнет слушать видео и писать текст.\n" +
          "Это займет время (примерно 20-30% от длительности видео).\n\n" +
          "Продолжить?"
      );
      if (!confirm) return;

      setIsGeneratingSubs(true);
      try {
          await generateAutoSubtitles(selectedVideo.id);
          alert("Готово! Субтитры успешно созданы и добавлены.");
          
          // Перезагружаем видео, чтобы плеер увидел новые сабы
          await loadVideos(); 
          
          // Если видео было выбрано, обновляем и его (чтобы кнопка CC появилась сразу)
          if (selectedVideo) {
              // Небольшой хак: сбросим и выберем снова, или найдем в новом списке
              // (loadVideos уже обновит список videos, нам нужно обновить selectedVideo)
              // Но loadVideos в твоем коде уже делает это сам, так что всё ок.
          }
      } catch (e) {
          console.error(e);
          alert("Ошибка при генерации. Убедитесь, что сервер запущен и FFmpeg работает.");
      } finally {
          setIsGeneratingSubs(false);
      }
  };
  const groupedStats = getGroupedStats();
  const studentDetails = expandedStudent ? statsData.filter(s => s.userId === expandedStudent) : [];


  // === RENDER: SCENARIO 1 (КУРС НЕ ВЫБРАН) ===
  if (!selectedCourseId) {
    return (
        <div className="lumeo-layout" style={{ display: 'block', padding: '40px', overflowY: 'auto' }}>
            <header className="lumeo-header" style={{marginBottom: '40px', background: 'transparent', border: 'none'}}>
                <div className="logo" style={{fontSize: '2rem'}}>Lumeo <span style={{fontSize: '1rem', color: '#666'}}>| Панель курсов</span></div>
            </header>

            <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                <h2 style={{marginBottom: '20px', color: 'white'}}>Ваши курсы</h2>
                
                {/* Сетка курсов */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '50px'}}>
                    {courses.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setSelectedCourseId(c.id)}
                          className="course-card"
                          style={{ 
                              padding: '25px', 
                              background: '#1a1a1a', 
                              border: '1px solid #333', 
                              borderRadius: '12px', 
                              cursor: 'pointer',
                              transition: 'transform 0.2s, border-color 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00aeef'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <h3 style={{color: '#00aeef', marginTop: 0}}>{c.title}</h3>
                            <p style={{color: '#888', fontSize: '14px', marginBottom: '15px'}}>👨‍🏫 {c.instructor}</p>
                            <p style={{color: '#ccc', fontSize: '14px', lineHeight: '1.5'}}>{c.description || 'Нет описания'}</p>
                            <div style={{marginTop: '20px', fontSize: '12px', color: '#555', fontWeight: 'bold'}}>
                                {c.videos?.length || 0} УРОКОВ
                            </div>
                        </div>
                    ))}
                </div>

                {/* Форма создания */}
                <div style={{background: '#151515', padding: '30px', borderRadius: '16px', border: '1px solid #333', maxWidth: '600px'}}>
                    <h3 style={{color: '#fff', marginTop: 0}}>+ Создать новый курс</h3>
                    <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                        <input className="admin-input" placeholder="Название курса (DevOps)" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} style={{flex: 1, padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: 'white', borderRadius: '6px'}} />
                        <input className="admin-input" placeholder="ФИО Преподавателя" value={newCourseInstructor} onChange={e => setNewCourseInstructor(e.target.value)} style={{flex: 1, padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: 'white', borderRadius: '6px'}} />
                    </div>
                    <textarea className="admin-input" placeholder="Краткое описание курса..." value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} style={{marginBottom: '15px', width: '100%', padding: '12px', minHeight: '80px', background: '#0a0a0a', border: '1px solid #333', color: 'white', borderRadius: '6px', resize: 'vertical'}} />
                    <button className="primary-btn" onClick={handleCreateCourse} style={{width: '100%', padding: '12px', background: '#00aeef', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Создать курс</button>
                </div>
            </div>
        </div>
    )
  }

  // === RENDER: SCENARIO 2 (КУРС ВЫБРАН -> РЕДАКТОР) ===
  return (
    <div className="lumeo-layout">
        {/* MODAL STATS */}
        {showStats && (
            <div className="stats-modal-overlay">
                <div className="stats-modal-content">
                    <div className="stats-modal-header">
                        <div>
                            <h3>Статистика: {selectedVideo?.title}</h3>
                            {expandedStudent && (<button className="back-link" onClick={() => setExpandedStudent(null)}>← К списку группы</button>)}
                        </div>
                        <button className="close-btn" onClick={() => setShowStats(false)}>✕</button>
                    </div>
                    
                    <div className="stats-modal-body">
                        {statsData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                                <div style={{ fontSize: '40px', marginBottom: '20px' }}>📭</div>
                                <p style={{ fontSize: '1.1rem' }}>Пока никто не проходил этот урок.</p>
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

        <header className="lumeo-header" style={{ borderBottom: '1px solid #333', background: '#1a1a1a' }}>
             <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                 <button 
                    onClick={() => setSelectedCourseId(null)} 
                    style={{background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'}}
                 >
                    ← Курсы
                 </button>
                 <div className="logo" style={{ color: '#00aeef' }}>
                    {courses.find(c => c.id === selectedCourseId)?.title} 
                    <span style={{color: 'white', fontSize: '14px', fontWeight: 'normal', marginLeft: '10px'}}>| Редактор</span>
                 </div>
             </div>
        </header>

        <div className="lumeo-container">
            <aside className="playlist-sidebar" style={{ borderRight: '1px solid #333', borderLeft: 'none' }}>
                <div style={{ padding: '20px' }}>
                     {/* ВАЖНО: Передаем selectedCourseId */}
                     <AddVideoForm onVideoAdded={loadVideos} courseId={selectedCourseId} />
                </div>
                <div className="playlist-header"><h3>Уроки курса</h3></div>
                <div className="playlist-scroll">
                    {videos.map((v, idx) => (
                        <div key={v.id} className={`playlist-item ${selectedVideo?.id === v.id ? 'active' : ''}`} onClick={() => { if (selectedVideo?.id !== v.id) setSelectedVideo(v); }}>
                            <div className="item-index" style={{fontSize: '10px', color: '#555', marginRight: '10px'}}>{idx + 1}</div>
                            <div className="item-info"><span className="item-title">{v.title}</span></div>
                        </div>
                    ))}
                    {videos.length === 0 && <div style={{padding: '20px', color: '#666', fontSize: '13px', textAlign: 'center'}}>Нет видео в этом курсе</div>}
                </div>
            </aside>

            <main className="video-stage">
                {selectedVideo ? (
                    <>
                        <div className="player-wrapper-animation">
                            <VideoPlayer 
                                key={selectedVideo.id}
                                sources={[{ 
                                    quality: 'Auto', 
                                    url: selectedVideo.url,
                                    subtitles: selectedVideo.subtitles 
                                }]} 
                                title={selectedVideo.title} 
                                events={selectedVideo.events || []}
                                hideResults={selectedVideo.hideResults} 
                                onTimeUpdate={(t) => setCurrentTime(t)}
                            />
                        </div>

                        <div className="event-creator-panel" style={{ marginTop: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                                    <h3 style={{ margin: 0, color: '#00aeef' }}>⚡ Добавить метку</h3>
                                    <button 
                                            onClick={handleGenerateSubs} 
                                            disabled={isGeneratingSubs}
                                            style={{
                                                background: 'linear-gradient(90deg, #7b2cbf, #b5179e)', // Фиолетовый градиент AI
                                                border: 'none',
                                                color: 'white',
                                                padding: '6px 16px',
                                                borderRadius: '20px',
                                                cursor: isGeneratingSubs ? 'wait' : 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                opacity: isGeneratingSubs ? 0.7 : 1,
                                                boxShadow: '0 4px 15px rgba(181, 23, 158, 0.4)'
                                            }}
                                        >
                                            {isGeneratingSubs ? (
                                                <>⏳ Думаю...</>
                                            ) : (
                                                <>✨ AI Субтитры</>
                                            )}
                                    </button>
                                    {/* ПЕРЕКЛЮЧАТЕЛЬ: ВОПРОС / ГЛАВА */}
                                    <div style={{ display: 'flex', background: '#252525', borderRadius: '8px', padding: '4px' }}>
                                        <button 
                                            onClick={() => setEventType('question')}
                                            style={{ background: eventType === 'question' ? '#00aeef' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            ❓ Вопрос
                                        </button>
                                        <button 
                                            onClick={() => setEventType('chapter')}
                                            style={{ background: eventType === 'chapter' ? '#00aeef' : 'transparent', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            🔖 Глава
                                        </button>
                                    </div>

                                    {/* ГАЛОЧКА: СКРЫТЬ РЕЗУЛЬТАТЫ */}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#252525', padding: '6px 12px', borderRadius: '20px', border: '1px solid #444' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedVideo.hideResults || false}
                                            onChange={toggleHideResults}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '13px', color: '#ddd' }}>Скрывать результаты</span>
                                    </label>
                                </div>

                                <button onClick={loadStats} style={{ background: '#252525', border: '1px solid #444', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📊 Статистика
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <div style={{ marginBottom: '10px', color: '#888', fontSize: '12px' }}>ВРЕМЯ: <strong style={{ color: 'white', fontSize: '16px' }}>{currentTime.toFixed(1)} сек</strong></div>
                                    
                                    <input 
                                        className="admin-input" 
                                        placeholder={eventType === 'question' ? "Текст вопроса" : "Название главы (например: Введение)"}
                                        value={questionText} 
                                        onChange={e => setQuestionText(e.target.value)} 
                                        style={{ width: '100%', marginBottom: '10px', padding: '10px', background: '#0f0f0f', border: '1px solid #444', color: 'white', borderRadius: '4px' }} 
                                    />
                                    
                                    {eventType === 'question' && (
                                        <>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                <input placeholder="Вариант А" value={option1} onChange={e => setOption1(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0f0f0f', border: '1px solid #444', color: 'white', borderRadius: '4px' }} />
                                                <input placeholder="Вариант Б" value={option2} onChange={e => setOption2(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0f0f0f', border: '1px solid #444', color: 'white', borderRadius: '4px' }} />
                                            </div>
                                            <input placeholder="Правильный ответ (копия текста)" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1a2a3a', border: '1px solid #2b4b6b', color: '#add8e6', borderRadius: '4px' }} />
                                        </>
                                    )}
                                </div>
                                <button onClick={handleAddEvent} disabled={isAddingEvent} style={{ height: 'auto', padding: '15px 30px', background: '#00aeef', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: 'auto' }}>
                                    {isAddingEvent ? '...' : 'СОХРАНИТЬ'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <h2>Редактор курса</h2>
                        <p>Добавьте первое видео через меню слева.</p>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
};
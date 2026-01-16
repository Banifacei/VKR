import { useEffect, useState } from 'react';
import { getVideos, addEvent, getVideoStats, updateVideo } from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';
import { AddVideoForm } from '../components/AddVideoForm';
import type { IVideo } from '../types';
import './PrepodPage.css'
import './UserPage.css';

export const PrepodPage = () => {
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  
  // Конструктор тестов
  const [currentTime, setCurrentTime] = useState(0);
  
  // NEW: Тип создаваемого события (вопрос или глава)
  const [eventType, setEventType] = useState<'question' | 'chapter'>('question');
  
  const [questionText, setQuestionText] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // СТАТИСТИКА
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const loadVideos = async () => {
    const data = await getVideos();
    setVideos(data);
    if (selectedVideo) {
        const updated = data.find(v => v.id === selectedVideo.id);
        if (updated) setSelectedVideo(updated);
    }
  };

  useEffect(() => { loadVideos(); }, []);

  // NEW: Переключение галочки "Скрывать результаты"
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
              question: questionText, // Для главы это будет название
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

  // Логика группировки статистики
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
             <div className="logo" style={{ color: '#00aeef' }}>Lumeo <span style={{color: 'white', fontSize: '14px', fontWeight: 'normal'}}>| Преподаватель</span></div>
        </header>

        <div className="lumeo-container">
            <aside className="playlist-sidebar" style={{ borderRight: '1px solid #333', borderLeft: 'none' }}>
                <div style={{ padding: '20px' }}>
                     <AddVideoForm onVideoAdded={loadVideos} />
                </div>
                <div className="playlist-header"><h3>Ваши курсы</h3></div>
                <div className="playlist-scroll">
                    {videos.map(v => (
                        <div key={v.id} className={`playlist-item ${selectedVideo?.id === v.id ? 'active' : ''}`} onClick={() => { if (selectedVideo?.id !== v.id) setSelectedVideo(v); }}>
                            <div className="item-info"><span className="item-title">{v.title}</span></div>
                        </div>
                    ))}
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
                                hideResults={selectedVideo.hideResults} // ПЕРЕДАЕМ НАСТРОЙКУ В ПЛЕЕР
                                onTimeUpdate={(t) => setCurrentTime(t)}
                            />
                        </div>

                        <div className="event-creator-panel" style={{ marginTop: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                                    <h3 style={{ margin: 0, color: '#00aeef' }}>⚡ Добавить метку</h3>
                                    
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
                                    
                                    {/* СКРЫВАЕМ ВАРИАНТЫ, ЕСЛИ ЭТО ГЛАВА */}
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
                        <h2>Панель преподавателя</h2>
                        <p>Выберите урок для редактирования или создайте новый.</p>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
};
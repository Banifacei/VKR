import { useState, useRef, useEffect, useMemo } from 'react';
import { sendAnswer } from '../api/videoApi'; 
import './VideoPlayer.css';
import type { IInteractiveEvent, ISubtitle } from '../types';

const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" /></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" fill="currentColor" /><rect x="14" y="4" width="4" height="16" fill="currentColor" /></svg>,
  VolumeHigh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>,
  VolumeMuted: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>,
  Settings: () => <svg className="icon-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  Pip: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /><rect x="13" y="11" width="7" height="5" /></svg>,
  Fullscreen: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Captions: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /><line x1="8" y1="15" x2="8" y2="15" /><line x1="16" y1="15" x2="16" y2="15" /></svg>,
  Chapters: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
};

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface VideoPlayerProps {
  sources: { quality: string; url: string; subtitles?: ISubtitle[] }[];
  title?: string;
  events?: IInteractiveEvent[];
  videoId?: number;
  userId?: string;
  hideResults?: boolean;
  onResetTest?: () => void;
  onOpenTest?: () => void;
  onTimeUpdate?: (time: number) => void;
}

export const VideoPlayer = ({ sources, title, events = [], videoId, userId = 'guest', hideResults = false, onResetTest, onOpenTest, onTimeUpdate }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const safeSource = (sources && sources.length > 0) ? sources[0] : { quality: 'Error', url: '', subtitles: [] };
  const [currentSource, setCurrentSource] = useState(safeSource);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomFill, setIsZoomFill] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<'main' | 'speed' | 'quality' | 'captions' | 'chapters'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');

  // Logic States
  const [activeEvent, setActiveEvent] = useState<IInteractiveEvent | null>(null);
  const [processedEventIds, setProcessedEventIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);

  // --- HOVER STATE (Для тултипа и подсветки блоков) ---
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoverChapter, setHoverChapter] = useState<IInteractiveEvent | null>(null);

  // Разделяем события
  const questions = events.filter(e => e.type !== 'chapter');
  const chapters = events.filter(e => e.type === 'chapter').sort((a, b) => a.time - b.time);

  // --- NEW: Активная глава (для текста внизу) ---
  const activeChapter = chapters.slice().reverse().find(chap => chap.time <= currentTime);

  useEffect(() => {
    if (sources && sources.length > 0) setCurrentSource(sources[0]);
  }, [sources]);

  useEffect(() => {
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'hidden';
      }
      if (activeSubtitle !== 'off') {
          const track = Array.from(tracks).find(t => t.language === activeSubtitle);
          if (track) track.mode = 'showing';
      }
    }
  }, [activeSubtitle]);

  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume; }, [volume]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!safeSource.url) return <div className="yt-player-container"><p>Ошибка видео</p></div>;
  
  const handleAnswer = async (answer: string) => {
      // Отправляем ответ всегда
      try {
          if (videoId) {
              const res = await sendAnswer(videoId, activeEvent!.id, answer, userId);
              // Если скрыты результаты, не используем isCorrect из ответа
              if (hideResults) {
                  // Просто идем дальше без показа "Верно/Неверно"
                  setTimeout(() => handleContinue(false), 500); 
                  return;
              }
              
              const isCorrect = res.data.isCorrect;
              setFeedback(isCorrect ? 'correct' : 'incorrect');
              setTimeout(() => handleContinue(isCorrect), 1500);
          } else {
              // Режим превью (без videoId)
              const isCorrect = activeEvent?.correctAnswer === answer;
              setFeedback(isCorrect ? 'correct' : 'incorrect');
              setTimeout(() => handleContinue(isCorrect), 1500);
          }
      } catch (e) {
          handleContinue(false);
      }
  };

  const handleContinue = (wasCorrect: boolean) => {
      if (wasCorrect) setScore(s => s + 1);
      setFeedback(null);
      setActiveEvent(null);
      videoRef.current?.play();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);

    // ВАЖНО: Останавливаем только на вопросах!
    if (questions.length > 0 && !activeEvent && !showEndScreen) {
        const eventToTrigger = questions.find(ev => Math.abs(ev.time - time) < 0.5 && !processedEventIds.includes(ev.id));
        if (eventToTrigger) {
            videoRef.current.pause();
            setIsPlaying(false);
            setActiveEvent(eventToTrigger);
            setShowControls(false);
            setProcessedEventIds(prev => [...prev, eventToTrigger.id]);
        }
    }
  };

  const jumpToChapter = (time: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.play();
          setIsPlaying(true);
          setShowSettings(false);
      }
  };

  const handleVideoEnd = () => { 
      setIsPlaying(false); 
      setShowEndScreen(true); 
      setShowControls(false); 
  };
  
  const replayVideo = () => {
      setShowEndScreen(false); setProcessedEventIds([]); setScore(0);
      if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
  };

  const showControlsTemporarily = () => {
    if (activeEvent || showEndScreen) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setShowControls(true);
    timeoutRef.current = window.setTimeout(() => { if (!showSettings) setShowControls(false); }, 3000);
  };

  const togglePlay = () => { if (!videoRef.current || activeEvent || showEndScreen) return; videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); showControlsTemporarily(); };
  
  const skipTime = (amount: number) => {
    if (videoRef.current && !activeEvent) {
        videoRef.current.currentTime += amount;
        showControlsTemporarily();
    }
  };
  
  const toggleFullscreen = () => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); };
  
  // 1. Вычисляем сегменты (Главы)
  const timelineSegments = useMemo(() => {
    if (!duration) return [];
    
    // Собираем точки времени: 0, начала глав, конец видео
    const sortedChapters = [...chapters].sort((a, b) => a.time - b.time);
    const points = [0, ...sortedChapters.map(c => c.time), duration];
    // Убираем дубликаты и сортируем
    const uniquePoints = Array.from(new Set(points)).sort((a, b) => a - b);

    const segs: { index: number; start: number; end: number; duration: number; title: string }[] = [];
    for (let i = 0; i < uniquePoints.length - 1; i++) {
      const start = uniquePoints[i];
      const end = uniquePoints[i + 1];
      const segDuration = end - start;
      
      // Находим название главы для этого куска
      const relatedChapter = sortedChapters.slice().reverse().find(c => c.time <= start);

      segs.push({
        index: i,
        start,
        end,
        duration: segDuration, // Используем duration для flex-grow
        title: relatedChapter ? relatedChapter.question : (i === 0 ? 'Вступление' : `Часть ${i + 1}`)
      });
    }
    return segs;
  }, [chapters, duration]);

  // 2. Хелпер для расчета заливки ВНУТРИ конкретного куска
  const getSegmentProgress = (segStart: number, segEnd: number) => {
    if (currentTime >= segEnd) return 100; // Кусок пройден
    if (currentTime <= segStart) return 0; // Кусок не начался
    // Кусок в процессе
    return ((currentTime - segStart) / (segEnd - segStart)) * 100;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => { if (activeEvent || showEndScreen) return; const rect = e.currentTarget.getBoundingClientRect(); const pos = (e.clientX - rect.left) / rect.width; if (videoRef.current && duration) videoRef.current.currentTime = pos * duration; };

  // --- NEW: Обработка движения мыши по прогресс-бару (для тултипа и подсветки) ---
  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = e.clientX - rect.left;
      const width = rect.width;
      const time = (pos / width) * duration;
      
      setHoverX(pos);
      setHoverTime(time);

      // Ищем главу под курсором
      const chap = chapters.slice().reverse().find(c => c.time <= time);
      setHoverChapter(chap || null);
  };

  const handleProgressMouseLeave = () => {
      setHoverTime(null);
      setHoverChapter(null);
  };


  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      if (activeEvent) return;

      const code = e.code;
      if (code === 'Space' || code === 'KeyK') { e.preventDefault(); togglePlay(); }
      if (code === 'KeyJ') skipTime(-10);
      if (code === 'KeyL') skipTime(10);
      if (code === 'ArrowLeft') skipTime(-5);
      if (code === 'ArrowRight') skipTime(5);
      if (code === 'ArrowUp') { e.preventDefault(); setVolume(v => Math.min(1, v + 0.05)); setIsMuted(false); showControlsTemporarily(); }
      if (code === 'ArrowDown') { e.preventDefault(); setVolume(v => Math.max(0, v - 0.05)); showControlsTemporarily(); }
      if (code === 'KeyM') { setIsMuted(prev => !prev); showControlsTemporarily(); }
      if (code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEvent]);

  
  const hasSubtitles = currentSource.subtitles && currentSource.subtitles.length > 0;
  const hasChapters = chapters.length > 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderMainMenu = () => (
    <div className="menu-list">
      <div className="menu-item" onClick={() => setCurrentMenu('speed')}>
        <span className="menu-label">Скорость</span>
        <span className="menu-value">{playbackRate}x ›</span>
      </div>
      
      {hasSubtitles && (
          <div className="menu-item" onClick={() => setCurrentMenu('captions')}>
            <span className="menu-label">Субтитры</span>
            <span className="menu-value">{activeSubtitle === 'off' ? 'Выкл.' : activeSubtitle.toUpperCase()} ›</span>
          </div>
      )}

      {hasChapters && (
          <div className="menu-item" onClick={() => setCurrentMenu('chapters')}>
            <span className="menu-label">Главы</span>
            <span className="menu-value">{chapters.length} шт ›</span>
          </div>
      )}

      <div className="menu-item" onClick={() => setIsZoomFill(!isZoomFill)}>
        <span className="menu-label">Заполнить экран</span>
        <span className={`menu-status ${isZoomFill ? 'active' : ''}`}>{isZoomFill ? 'Вкл.' : 'Выкл.'}</span>
      </div>

      {onOpenTest && (
         <div className="menu-item" onClick={() => { onOpenTest(); setShowSettings(false); }}>
           <span className="menu-label">Решить тест</span>
           <span className="menu-value">›</span>
         </div>
      )}

      <div className="menu-divider" />
      {onResetTest && (
          <div className="menu-item reset-item" onClick={() => { onResetTest(); setShowSettings(false); }}>
            <span className="menu-label">Сбросить прогресс</span>
          </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`yt-player-container ${isZoomFill ? 'zoom-active' : ''} ${isFullscreen ? 'is-fullscreen' : ''}`} onMouseMove={showControlsTemporarily} onMouseLeave={() => !showSettings && setShowControls(false)}>
      {activeEvent && (
        <div className="interaction-overlay">
            <div className={`interaction-card ${feedback ? feedback : ''}`}>
                {!hideResults && feedback === 'correct' && <div className="feedback-icon">✅ Верно!</div>}
                {!hideResults && feedback === 'incorrect' && <div className="feedback-icon">❌ Ошибка</div>}
                
                {!feedback && (
                    <>
                        <h3>Вопрос</h3>
                        <p className="question-text">{activeEvent.question}</p>
                        <div className="options-list">
                            {activeEvent.options?.map((opt, idx) => (<button key={idx} className="option-btn" onClick={() => handleAnswer(opt)}>{opt}</button>))}
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      {showEndScreen && (
          <div className="interaction-overlay">
              <div className="interaction-card end-screen">
                  <h3>Урок завершен!</h3>
                  
                  {!hideResults ? (
                      <div className="score-circle"><span>{score}</span><small>из {questions.length}</small></div>
                  ) : (
                      <p style={{marginTop: '10px', color: '#aaa'}}>Ответы сохранены и отправлены преподавателю.</p>
                  )}
                  
                  <button className="primary-btn" onClick={replayVideo} style={{marginTop: '20px', gap: '10px'}}><Icons.Refresh /> Заново</button>
              </div>
          </div>
      )}

      <div className={`video-title-overlay ${showControls ? 'show' : ''}`}>
        <div className="video-title-text">{title || 'Лекция'}</div>
      </div>

      <video
        ref={videoRef}
        src={currentSource.url}
        className={`yt-video ${showControls ? 'controls-visible' : ''}`}
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleVideoEnd}
        muted={isMuted}
      >
          {currentSource.subtitles?.map((sub, idx) => (
              <track key={idx} kind="subtitles" src={sub.src} srcLang={sub.lang} label={sub.label} default={idx === 0} />
          ))}
      </video>
      
      {!isPlaying && showControls && !activeEvent && !showEndScreen && (<div className="center-play-overlay-static" onClick={togglePlay}><Icons.Play /></div>)}

      <div className={`yt-controls ${showControls && !activeEvent && !showEndScreen ? 'show' : ''}`}>
        
        {/* --- НАЗВАНИЕ АКТИВНОЙ ГЛАВЫ (ВНИЗУ) - ОСТАВЛЯЕМ КАК ЕСТЬ --- */}
        {activeChapter && (
            <div className="active-chapter-display">
                <span className="chapter-title">{activeChapter.question}</span>
                <span className="chapter-arrow"> › </span>
            </div>
        )}

        {/* --- ПРОГРЕСС БАР --- */}
        <div 
            className="yt-progress-container" 
            onClick={handleSeek} 
            onMouseMove={handleProgressMouseMove} 
            onMouseLeave={handleProgressMouseLeave}
        >
            {/* ТУЛТИП (ВСПЛЫВАШКА) - ОБНОВЛЯЕМ ЭТОТ КУСОК */}
            {hoverTime !== null && (
                <div className="yt-hover-tooltip" style={{ left: hoverX }}>
                    {/* Если навели на главу - показываем её название жирным */}
                    {hoverChapter && <div className="tooltip-chapter-title">{hoverChapter.question}</div>}
                    
                    {/* Время */}
                    <span className="tooltip-time">{formatTime(hoverTime)}</span>
                </div>
            )}

              {/* Трек с сегментами */}
              <div className="yt-progress-track">
                {timelineSegments.map((seg) => (
                  <div 
                    key={seg.index} 
                    className="yt-chapter-segment" 
                    // flexGrow распределяет ширину идеально пропорционально времени
                    style={{ flexGrow: seg.duration }} 
                  >
                    {/* Прогресс (Синяя полоска внутри сегмента) */}
                    <div 
                        className="yt-segment-filled" 
                        style={{ width: `${getSegmentProgress(seg.start, seg.end)}%` }} 
                    />
                  </div>
                ))}
              </div>

              {/* Ползунок (Кружок) - висит поверх всего */}
              <div className="yt-progress-handle" style={{ left: `${(currentTime / duration) * 100}%` }} />
              
              {/* Желтые точки вопросов - висят поверх всего */}
              {questions.map(ev => (
                <div key={ev.id} className="yt-event-marker" style={{ left: `${(ev.time / duration) * 100}%` }} />
              ))}
          </div>
        

        <div className="yt-controls-row">
          <div className="yt-left">
            <button className="yt-btn" onClick={togglePlay}>{isPlaying ? <Icons.Pause /> : <Icons.Play />}</button>
            <button className="yt-btn" onClick={() => setIsMuted(!isMuted)}>{isMuted ? <Icons.VolumeMuted /> : <Icons.VolumeHigh />}</button>
            <div className="yt-time-display">
              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="yt-right">
            {hasSubtitles && (
                <button className={`yt-btn ${activeSubtitle !== 'off' ? 'btn-active' : ''}`} onClick={() => setActiveSubtitle(prev => prev === 'off' ? currentSource.subtitles![0].lang : 'off')}>
                    <Icons.Captions />
                </button>
            )}
            
            <button className="yt-btn" onClick={() => videoRef.current?.requestPictureInPicture()}><Icons.Pip /></button>
            
            <div className="settings-wrapper">
              <button className={`yt-btn ${showSettings ? 'rotate' : ''}`} onClick={() => { setShowSettings(!showSettings); setCurrentMenu('main'); }}>
                <Icons.Settings />
              </button>
              
              {showSettings && (
                <div className="yt-settings-menu">
                  {currentMenu === 'main' && renderMainMenu()}
                  {currentMenu === 'speed' && (
                      <div className="menu-list">
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Скорость</div>
                        {playbackRates.map(rate => (
                            <div key={rate} className="menu-item" onClick={() => { setPlaybackRate(rate); if(videoRef.current) videoRef.current.playbackRate = rate; setShowSettings(false); }}>
                                <span>{rate}x</span>
                            </div>
                        ))}
                      </div>
                  )}
                  {currentMenu === 'captions' && (
                      <div className="menu-list">
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Субтитры</div>
                        <div className="menu-item" onClick={() => setActiveSubtitle('off')}>
                            <span>Выкл.</span>
                            {activeSubtitle === 'off' && <span className="check-mark">●</span>}
                        </div>
                        {currentSource.subtitles?.map(sub => (
                           <div key={sub.lang} className="menu-item" onClick={() => setActiveSubtitle(sub.lang)}>
                               <span>{sub.label}</span>
                               {activeSubtitle === sub.lang && <span className="check-mark">●</span>}
                           </div>
                        ))}
                      </div>
                  )}
                  {currentMenu === 'chapters' && (
                      <div className="menu-list" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Главы</div>
                        {chapters.map((chap) => (
                           <div key={chap.id} className="menu-item" onClick={() => jumpToChapter(chap.time)}>
                               <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                                   <span style={{color: '#00aeef', fontWeight: 'bold', minWidth: '40px'}}>{formatTime(chap.time)}</span>
                                   <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px'}}>{chap.question}</span>
                               </div>
                           </div>
                        ))}
                      </div>
                  )}
                </div>
              )}
            </div>
            <button className="yt-btn" onClick={toggleFullscreen}><Icons.Fullscreen /></button>
          </div>
        </div>
      </div>
  </div>
  );
};
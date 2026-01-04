import { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

// === Все твои иконки без изменений ===
const Icons = {
  Play: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  VolumeHigh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  VolumeLow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  VolumeMuted: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ),
  Settings: () => (
    <svg className="icon-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Fullscreen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  FullscreenExit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  ),
};

const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const VideoPlayer = ({ url, title }: { url: string; title?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Универсальная функция показа контроллов с автоскрытием
  const showControlsTemporarily = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setShowControls(true);

    timeoutRef.current = setTimeout(() => {
      if (!showSettings) {
        setShowControls(false);
      }
    }, 3000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    }
    showControlsTemporarily();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = prevVolume;
        setVolume(prevVolume);
        setIsMuted(false);
      } else {
        setPrevVolume(volume);
        videoRef.current.volume = 0;
        setVolume(0);
        setIsMuted(true);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) videoRef.current.volume = vol;
    if (vol > 0) setPrevVolume(vol);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current && duration) {
      videoRef.current.currentTime = pos * duration;
    }
    showControlsTemporarily();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Отслеживание fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      if (!fullscreen) showControlsTemporarily();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Основные события видео
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.addEventListener('timeupdate', () => setCurrentTime(v.currentTime));
    v.addEventListener('loadedmetadata', () => setDuration(v.duration || 0));
    v.addEventListener('play', () => setIsPlaying(true));
    v.addEventListener('pause', () => setIsPlaying(false));

    v.volume = volume;
    v.playbackRate = playbackRate;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [volume, playbackRate]);

  // Реакция на активность пользователя (мышь + тач)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleActivity = () => showControlsTemporarily();

    container.addEventListener('mousemove', handleActivity);
    container.addEventListener('touchstart', handleActivity, { passive: true });
    container.addEventListener('touchmove', handleActivity, { passive: true });
    container.addEventListener('click', handleActivity);

    // Показываем контролы при загрузке
    showControlsTemporarily();

    return () => {
      container.removeEventListener('mousemove', handleActivity);
      container.removeEventListener('touchstart', handleActivity);
      container.removeEventListener('touchmove', handleActivity);
      container.removeEventListener('click', handleActivity);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showSettings]);

  // Скрытие курсора в fullscreen при неактивности
  useEffect(() => {
    if (isFullscreen && !showControls) {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.cursor = 'default';
    }
  }, [isFullscreen, showControls]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="yt-player-container">
      {/* Новый заголовок сверху */}
      <div className={`video-title-overlay ${showControls ? 'show' : ''}`}>
        <div className="video-title-text">
          {title || 'Без названия'}
        </div>
    </div>

      <video
        ref={videoRef}
        src={url}
        className="yt-video"
        controls={false}
        disablePictureInPicture
        playsInline
        preload="metadata"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Центральная кнопка Play */}
      {!isPlaying && showControls && (
        <div className="center-play-overlay" onClick={togglePlay}>
          <Icons.Play />
        </div>
      )}

      {/* Контроллы */}
      <div className={`yt-controls ${showControls ? 'show' : ''}`}>
        <div className="yt-progress-container" onClick={handleSeek}>
          <div className="yt-progress-bg">
            {(() => {
              const progressPercent = duration ? (currentTime / duration) * 100 : 0;
              return (
                <>
                  <div className="yt-progress-filled" style={{ width: `${progressPercent}%` }} />
                  <div className="yt-progress-handle" style={{ left: `${progressPercent}%` }} />
                </>
              );
            })()}
          </div>
        </div>

        <div className="yt-controls-row" onClick={(e) => e.stopPropagation()}>
          <div className="yt-left">
            <button className="yt-btn" onClick={togglePlay}>
              {isPlaying ? <Icons.Pause /> : <Icons.Play />}
            </button>

            <button className="yt-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? <Icons.VolumeMuted /> :
               volume < 0.5 ? <Icons.VolumeLow /> : <Icons.VolumeHigh />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />

            <div className="yt-time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="yt-right">
            <div className="settings-wrapper">
              <button className="yt-btn" onClick={() => setShowSettings(!showSettings)}>
                <Icons.Settings />
              </button>

              {showSettings && (
                <div className="yt-settings-menu">
                  <div className="menu-item" style={{ fontWeight: 500, color: '#aaa', paddingBottom: '8px' }}>
                    Скорость воспроизведения
                  </div>
                  {playbackRates.map(rate => (
                    <div
                      key={rate}
                      className="menu-item"
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                        setShowSettings(false);
                        showControlsTemporarily();
                      }}
                    >
                      <span>{rate === 1 ? 'Обычная' : `${rate}x`}</span>
                      {playbackRate === rate && <span className="check">✔</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="yt-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <Icons.FullscreenExit /> : <Icons.Fullscreen />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
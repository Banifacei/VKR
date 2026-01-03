import { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

// Используем viewBox="0 0 36 36" для четкости
const Icons = {
  Play: () => <svg viewBox="0 0 36 36"><path d="M 12,26 18.5,22 18.5,14 12,10 Z M 18.5,22 25,18 18.5,14 Z" /></svg>,
  Pause: () => <svg viewBox="0 0 36 36"><path d="M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z" /></svg>,
  Settings: () => <svg viewBox="0 0 36 36"><path d="m 23.94,18.78 c .03,-0.25 .05,-0.51 .05,-0.78 0,-0.27 -0.02,-0.52 -0.05,-0.78 l 1.68,-1.32 c .15,-0.12 .19,-0.33 .09,-0.51 l -1.6,-2.76 c -0.09,-0.17 -0.31,-0.24 -0.48,-0.17 l -1.99,0.8 c -0.41,-0.32 -0.86,-0.58 -1.35,-0.78 l -0.3,-2.12 c -0.02,-0.19 -0.19,-0.33 -0.39,-0.33 h -3.2 c -0.2,0 -0.37,0.14 -0.39,0.33 l -0.3,2.12 c -0.48,0.2 -0.93,0.47 -1.35,0.78 l -1.99,-0.8 c -0.18,-0.07 -0.39,0 -0.48,0.17 l -1.6,2.76 c -0.1,0.17 -0.05,0.39 .09,0.51 l 1.68,1.32 c -0.03,0.25 -0.05,0.52 -0.05,0.78 0,0.26 .02,0.52 .05,0.78 l -1.68,1.32 c -0.15,0.12 -0.19,0.33 -0.09,0.51 l 1.6,2.76 c .09,0.17 .31,0.24 .48,0.17 l 1.99,-0.8 c .41,0.32 .86,0.58 1.35,0.78 l .3,2.12 c .02,0.19 .19,0.33 .39,0.33 h 3.2 c .2,0 .37,-0.14 .39,-0.33 l .3,-2.12 c .48,-0.2 .93,-0.47 1.35,-0.78 l 1.99,0.8 c .18,0.07 .39,0 .48,-0.17 l 1.6,-2.76 c .1,-0.17 .05,-0.39 -0.09,-0.51 l -1.68,-1.32 z m -5.94,2.01 c -1.54,0 -2.8,-1.25 -2.8,-2.8 0,-1.54 1.25,-2.8 2.8,-2.8 1.54,0 2.8,1.25 2.8,2.8 0,1.55 -1.26,2.8 -2.8,2.8 z" /></svg>,
  Fullscreen: () => <svg viewBox="0 0 36 36"><path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 z m 0,4 0,6 6,0 0,-2 -4,0 0,-4 -2,0 z m 14,4 -4,0 0,2 6,0 0,-6 -2,0 0,4 z m -4,-14 0,2 4,0 0,4 2,0 0,-6 -6,0 z" /></svg>
};

export const VideoPlayer = ({ url, events = [] }: { url: string; events?: any[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [lastAction, setLastAction] = useState<'play' | 'pause' | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setLastAction('play');
      } else {
        videoRef.current.pause();
        setLastAction('pause');
      }
      setTimeout(() => setLastAction(null), 500);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const up = () => setCurrentTime(v.currentTime);
    v.addEventListener('timeupdate', up);
    v.addEventListener('loadedmetadata', () => setDuration(v.duration));
    v.addEventListener('play', () => setIsPlaying(true));
    v.addEventListener('pause', () => setIsPlaying(false));
    return () => v.removeEventListener('timeupdate', up);
  }, []);

  return (
    <div className="yt-player-container">
      <video ref={videoRef} src={url} className="yt-video" onClick={togglePlay} />
      
      {lastAction && <div className="center-action-icon">{lastAction === 'play' ? <Icons.Play /> : <Icons.Pause />}</div>}

      {showSettings && (
        <div className="yt-settings-menu">
          <div className="menu-item" onClick={() => {
            const next = playbackRate >= 2 ? 0.5 : playbackRate + 0.5;
            setPlaybackRate(next);
            if(videoRef.current) videoRef.current.playbackRate = next;
          }}>
            <span className="menu-label">Скорость воспроизведения</span>
            <span className="menu-value">{playbackRate === 1 ? 'Обычная' : `${playbackRate}x`}</span>
          </div>
          <div className="menu-item">
            <span className="menu-label">Качество</span>
            <span className="menu-value">Авто (720p)</span>
          </div>
        </div>
      )}

      <div className="yt-controls">
        <div className="yt-progress-container" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          if (videoRef.current) videoRef.current.currentTime = pos * duration;
        }}>
          <div className="yt-progress-bg">
            <div className="yt-progress-filled" style={{ width: `${(currentTime/duration)*100}%` }}>
              <div className="yt-progress-handle" />
            </div>
          </div>
        </div>

        <div className="yt-controls-row">
          <div className="yt-left">
            <button className="yt-btn" onClick={togglePlay}>{isPlaying ? <Icons.Pause /> : <Icons.Play />}</button>
            <div className="yt-time-display">
              {Math.floor(currentTime/60)}:{Math.floor(currentTime%60).toString().padStart(2,'0')} / 
              {Math.floor(duration/60)}:{Math.floor(duration%60).toString().padStart(2,'0')}
            </div>
          </div>
          <div className="yt-right">
            <button className="yt-btn" onClick={() => setShowSettings(!showSettings)}><Icons.Settings /></button>
            <button className="yt-btn" onClick={() => videoRef.current?.requestFullscreen()}><Icons.Fullscreen /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
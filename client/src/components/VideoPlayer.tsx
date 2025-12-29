import { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css'; // Импортируем наш новый CSS

export const VideoPlayer = ({ url, events }: { url: string, events: any[] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeEventText, setActiveEventText] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = Math.floor(video.currentTime);
      // Ищем событие для текущей секунды
      const activeEvent = events.find(e => Math.floor(e.time) === currentTime);

      if (activeEvent && !activeEventText) {
        video.pause();
        setActiveEventText(activeEvent.text); // Показываем текст в интерфейсе
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [events, activeEventText]);

  const handleResume = () => {
    setActiveEventText(null);
    videoRef.current?.play();
  };

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        src={url}
        controls
        className="video-element"
        crossOrigin="anonymous"
      />

      {activeEventText && (
        <div className="interactive-overlay">
          <div className="interactive-text">
             💡 {activeEventText}
          </div>
          <button className="resume-button" onClick={handleResume}>
            Продолжить обучение
          </button>
        </div>
      )}

      <div className="debug-info">
        Источник: {url}
      </div>
    </div>
  );
};
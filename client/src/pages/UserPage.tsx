// src/pages/UserPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getVideosByCourse } from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';
import { AuthModal } from '../components/AuthModal';
import { VideoPlaylist } from '../components/VideoPlaylist';
import type { IVideo } from '../types';
import './UserPage.css';
import {UserProfile} from '../components/UserProfile';

export const UserPage = () => {
  const { courseId } = useParams();
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState(localStorage.getItem('lumeo_user') || '');
  const [showAuthModal, setShowAuthModal] = useState(!username);

  useEffect(() => {
    const fetchVideos = async () => {
        if (!courseId) return;
        try {
            const data = await getVideosByCourse(Number(courseId)); 
            setVideos(data);
            if (data.length > 0) setSelectedVideo(data[0]);
        } finally {
            setLoading(false);
        }
    };
    fetchVideos();
  }, [courseId]);

  const handleLogin = (name: string) => {
      localStorage.setItem('lumeo_user', name);
      setUsername(name);
      setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('lumeo_user');
    window.location.href = '/auth'; // Просто сбрасываем всё и на вход
};

  return (
    <div className="lumeo-layout">
      {showAuthModal && <AuthModal onLogin={handleLogin} />}
        <header className="lumeo-header">
            <div className="logo">Lumeo<span className="dot">.</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Link to="/" style={{color: '#fff', textDecoration: 'none'}}>← Курсы</Link>
                
                {/* НОВЫЙ КОМПОНЕНТ */}
                {username && (
                <UserProfile username={username} onLogout={handleLogout} />
                )}
            </div>
        </header>
      
      <div className="lumeo-container">
        <main className="video-stage">
            {loading ? (
                <div className="loader">Загрузка платформы...</div>
            ) : selectedVideo ? (
              <div className="player-wrapper-animation">
                  <VideoPlayer 
                        key={selectedVideo.id}
                        sources={[{ quality: 'Auto', url: selectedVideo.url, subtitles: selectedVideo.subtitles }]}
                        title={selectedVideo.title}
                        events={selectedVideo.events || []}
                        videoId={selectedVideo.id} 
                        userId={username}
                        hideResults={selectedVideo.hideResults} 
                        onOpenTest={() => alert('Тест доступен')}
                        onResetTest={() => alert('Прогресс сброшен')}
                    />
                  <div className="video-info">
                      <h1>{selectedVideo.title}</h1>
                      <p className="video-meta">Опубликовано: {new Date(selectedVideo.createdAt || Date.now()).toLocaleDateString()}</p>
                  </div>
              </div>
            ) : (
              <div className="empty-state">
                  <h2>Нет доступных уроков</h2>
                  <p>Попросите преподавателя добавить материал.</p>
              </div>
            )}
        </main>
        
        <VideoPlaylist 
          videos={videos} 
          selectedVideoId={selectedVideo?.id} 
          onSelect={setSelectedVideo} 
        />
      </div>
    </div>
  );
};
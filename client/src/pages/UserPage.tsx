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
  const [userData, setUserData] = useState<any>(() => {
      const saved = localStorage.getItem('lumeo_user');
      try {
          return saved && saved.startsWith('{') ? JSON.parse(saved) : null;
      } catch (e) {
          return null;
      }
  });
  const [showAuthModal, setShowAuthModal] = useState(!userData || !userData.id);

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

  const handleLoginSuccess = (data: any) => {
      localStorage.setItem('lumeo_user', JSON.stringify(data));
      setUserData(data);
      setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('lumeo_user');
    localStorage.removeItem('lumeo_token');
    setUserData(null);
    window.location.reload(); 
  };
  
  const handleAvatarUpdate = (newUrl: string) => {
    const updatedUser = { ...userData, avatarUrl: newUrl };
    setUserData(updatedUser);
    localStorage.setItem('lumeo_user', JSON.stringify(updatedUser));
  };

  return (
    <div className="lumeo-layout">
      {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} />}
      
        <header className="lumeo-header">
            <div className="logo">Lumeo<span className="dot">.</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Link to="/" style={{color: '#fff', textDecoration: 'none'}}>← Курсы</Link>
                
                {/* КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавлена проверка userData */}
                {userData && userData.id && (
                    <UserProfile 
                        user={userData} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={handleLogout} 
                    />
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
                        userId={userData?.id} // Опциональная цепочка защищает, если userData еще null
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
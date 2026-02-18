// src/pages/UserPage.tsx
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { getVideosByCourse } from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';
import { AuthModal } from '../components/AuthModal';
import { VideoPlaylist } from '../components/VideoPlaylist';
import type { IVideo } from '../types';
import './UserPage.css';
import {UserProfile} from '../components/UserProfile';
import { TestCards } from '../components/TestCards';

export const UserPage = () => {
  // 👇 1. Достаем и courseId, и videoId из адресной строки
  const { courseId, videoId } = useParams();
  const navigate = useNavigate(); // <-- Хук для смены URL

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
  const [testModeState, setTestModeState] = useState<Record<number, boolean>>(() => {
      try {
          const saved = localStorage.getItem('lumeo_test_modes');
          return saved ? JSON.parse(saved) : {};
      } catch (e) {
          return {};
      }
  });
  const isExternalTest = selectedVideo ? !!testModeState[selectedVideo.id] : false;
  const testCardsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
      localStorage.setItem('lumeo_test_modes', JSON.stringify(testModeState));
  }, [testModeState]);
  // Умный переключатель
  const handleToggleTestMode = () => {
      if (!selectedVideo) return;
      setTestModeState(prev => {
          const isNowExternal = !prev[selectedVideo.id];
          
          // Если мы только что включили внешний режим — скроллим вниз
          if (isNowExternal) {
              setTimeout(() => {
                  testCardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
          }
          
          return { ...prev, [selectedVideo.id]: isNowExternal };
      });
  };
  // 1. ЗАГРУЗКА ДАННЫХ КУРСА
  useEffect(() => {
      if (!courseId) return;

      const fetchInitial = async () => {
          try {
              const data = await getVideosByCourse(Number(courseId));
              setVideos(data);
              
              // Если загрузили курс, но в URL нет ID конкретного видео (зашли просто по /course/1)
              // -> Автоматически перенаправляем на первое видео в списке
              if (!videoId && data.length > 0) {
                  navigate(`/course/${courseId}/lesson/${data[0].id}`, { replace: true });
              }
          } finally {
              setLoading(false);
          }
      };
      fetchInitial();

      const interval = setInterval(async () => {
          try {
              const newData = await getVideosByCourse(Number(courseId));
              setVideos(prevVideos => {
                  const currentHash = JSON.stringify(prevVideos);
                  const newHash = JSON.stringify(newData);
                  if (currentHash !== newHash) return newData;
                  return prevVideos;
              });
          } catch (e) {}
      }, 15000); 

      return () => clearInterval(interval);
  }, [courseId, navigate, videoId]); // Зависимости обновлены

  // 👇 2. СИНХРОНИЗАЦИЯ URL И ПЛЕЕРА (Магия роутинга)
  useEffect(() => {
      if (videos.length > 0 && videoId) {
          const targetVideo = videos.find(v => v.id === Number(videoId));
          if (targetVideo) {
              setSelectedVideo(targetVideo);
          } else {
              // Если кто-то ввел кривой URL руками -> кидаем на первое видео
              navigate(`/course/${courseId}/lesson/${videos[0].id}`, { replace: true });
          }
      }
  }, [videoId, videos, courseId, navigate]);

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
                        userId={userData?.id} 
                        userRole={userData?.role}
                        hideResults={selectedVideo.hideResults} 
                        onResetTest={() => alert('Прогресс сброшен')}
                        onRefreshEvents={async () => {
                          if (!courseId || !selectedVideo) return []; 
                          const data = await getVideosByCourse(Number(courseId)); 
                          const updatedVideo = data.find(v => v.id === selectedVideo.id);
                          return updatedVideo?.events || [];
                      }}
                      maxAttempts={selectedVideo.maxAttempts}
                      isExternalTestMode={isExternalTest}
                      onToggleTestMode={handleToggleTestMode}
                    />
                  <div className="video-info">
                      <h1>{selectedVideo.title}</h1>
                      <p className="video-meta">Опубликовано: {new Date(selectedVideo.createdAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                  {/* 👇 ИНЛАЙН БЛОК С ТЕСТАМИ 👇 */}
                  {isExternalTest && selectedVideo.events && selectedVideo.events.length > 0 && userData?.role === 'student' && (
                      <div ref={testCardsRef} style={{ marginTop: '30px', animation: 'fadeIn 0.4s ease' }}>
                          <TestCards 
                              events={selectedVideo.events} 
                              videoId={selectedVideo.id} 
                              userId={userData.id}
                              onAllSolved={() => {
                                  // Автоматически выключаем режим после решения
                                  setTimeout(() => handleToggleTestMode(), 3000);
                              }}
                          />
                          
                          <div style={{ textAlign: 'center', marginTop: '15px' }}>
                              <button 
                                  onClick={handleToggleTestMode}
                                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                              >
                                  Скрыть вопросы (решать в видео)
                              </button>
                          </div>
                      </div>
                  )}
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
          // 👇 3. ПРИ КЛИКЕ В ПЛЕЙЛИСТЕ МЕНЯЕМ URL, А НЕ СТЕЙТ
          onSelect={(video) => navigate(`/course/${courseId}/lesson/${video.id}`)} 
        />
      </div>
    </div>
  );
};
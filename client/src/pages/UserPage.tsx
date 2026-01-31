import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getVideosByCourse } from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';
import type { IVideo } from '../types';
import './UserPage.css';

export const UserPage = () => {
  const { courseId } = useParams();
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  const [loading, setLoading] = useState(true);

  // AUTH STATE
  const [username, setUsername] = useState(localStorage.getItem('lumeo_user') || '');
  const [showAuthModal, setShowAuthModal] = useState(!username);
  const [tempName, setTempName] = useState('');

  // Загружаем видео при старте
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

  const handleLogin = () => {
      if (!tempName.trim()) return alert('Введите имя!');
      localStorage.setItem('lumeo_user', tempName);
      setUsername(tempName);
      setShowAuthModal(false);
  };

  const handleLogout = () => {
      localStorage.removeItem('lumeo_user');
      setUsername('');
      setShowAuthModal(true);
  };

  return (
    <div className="lumeo-layout">
      {/* AUTH MODAL */}
      {showAuthModal && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.9)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
              <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '12px', textAlign: 'center', width: '350px', border: '1px solid #333' }}>
                  <h2 style={{ color: '#00aeef', marginBottom: '20px' }}>Добро пожаловать</h2>
                  <p style={{ color: '#aaa', marginBottom: '20px' }}>Введите ваше Фамилию и Имя для начала обучения</p>
                  <input 
                    className="admin-input" 
                    placeholder="Иванов Иван" 
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    style={{ width: '100%', padding: '12px', marginBottom: '20px', background: '#0f0f0f', border: '1px solid #444', color: 'white' }}
                  />
                  <button className="primary-btn" onClick={handleLogin} style={{ width: '100%', padding: '12px', background: '#00aeef', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                      НАЧАТЬ
                  </button>
              </div>
          </div>
      )}

      <header className="lumeo-header">
          <div className="logo">Lumeo<span className="dot">.</span></div>
          <Link to="/" style={{color: '#fff', textDecoration: 'none', marginRight: '20px'}}>← Курсы</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="user-profile">{username || 'Гость'}</div>
              {username && <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #333', color: '#666', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Выйти</button>}
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
                        
                        // NEW: Передаем настройку
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
        
        <aside className="playlist-sidebar">
          <div className="playlist-header">
              <h3>Программа курса</h3>
              <span className="count">{videos.length} уроков</span>
          </div>
          <div className="playlist-scroll">
              {videos.map((v, index) => (
                <div 
                    key={v.id} 
                    className={`playlist-item ${selectedVideo?.id === v.id ? 'active' : ''}`} 
                    onClick={() => { if (selectedVideo?.id !== v.id) setSelectedVideo(v); }}
                >
                  <div className="item-index">{index + 1}</div>
                  <div className="item-info">
                      <span className="item-title">{v.title}</span>
                      <span className="item-duration">Видео урок</span>
                  </div>
                  {selectedVideo?.id === v.id && <div className="playing-icon">▶</div>}
                </div>
              ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
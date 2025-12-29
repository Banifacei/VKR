import { useEffect, useState } from 'react';
import { getVideos } from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';

export const UserPage = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  useEffect(() => {
    getVideos().then(setVideos);
  }, []);

  return (
    <div className="user-layout" style={{ padding: '20px', background: '#0f0f0f', minHeight: '100vh', color: 'white' }}>
      <h1>Обучающая платформа</h1>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div className="video-grid" style={{ flex: 1 }}>
          {selectedVideo ? (
            <VideoPlayer url={selectedVideo.url} events={selectedVideo.events || []} />
          ) : (
            <p>Выберите урок для начала обучения</p>
          )}
        </div>
        <aside style={{ width: '250px' }}>
          <h3>Список уроков</h3>
          {videos.map(v => (
            <div key={v.id} className="video-item" onClick={() => setSelectedVideo(v)}>
              {v.title}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
};
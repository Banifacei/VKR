import { useEffect, useState } from 'react';
import { getVideos } from '../api/videoApi';
import { VideoPlayer } from '../components/VideoPlayer';
import { AddVideoForm } from '../components/AddVideoForm';

export const AdminPage = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const loadVideos = async () => {
    const data = await getVideos();
    setVideos(data);
  };

  useEffect(() => { loadVideos(); }, []);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <AddVideoForm onVideoAdded={loadVideos} />
        <div className="video-list">
          {videos.map(v => (
            <div key={v.id} className={`video-item ${selectedVideo?.id === v.id ? 'active' : ''}`} onClick={() => setSelectedVideo(v)}>
              {v.title}
            </div>
          ))}
        </div>
      </aside>
      <main className="main-content">
        {selectedVideo && <VideoPlayer url={selectedVideo.url} events={selectedVideo.events || []} />}
      </main>
    </div>
  );
};
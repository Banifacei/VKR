// client/src/App.tsx
import { useEffect, useState } from 'react';
import { getVideos, createVideo, uploadVideoFile } from './api/videoApi';
import { VideoPlayer } from './components/VideoPlayer';
import './App.css';

function App() {
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    const data = await getVideos();
    setVideos(data);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewUrl('');
    setSelectedFile(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSaveVideo = async () => {
    if (!newTitle.trim()) return alert("Введите название урока!");
    if (!newUrl.trim() && !selectedFile) {
      return alert("Ошибка: вставьте ссылку на видео ИЛИ выберите файл (MP4, MKV, AVI и др.)!");
    }

    setUploading(true);
    try {
      let finalUrl = newUrl;

      if (selectedFile) {
        const { url } = await uploadVideoFile(selectedFile);
        finalUrl = url;
      }

      await createVideo({
        title: newTitle,
        url: finalUrl,
        events: []
      });

      alert("Урок успешно сохранен!");
      resetForm();
      loadVideos();
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении видео. Проверьте размер файла и соединение.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="admin-title">InterX Admin</div>
        
        <div className="upload-section">
          <h4 style={{marginBottom: '10px', color: '#646cff'}}>+ Создать новый урок</h4>
          
          <input 
            className="admin-input"
            placeholder="Название видео-урока" 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />

          <div style={{
            border: '1px dashed #444', 
            padding: '10px', 
            borderRadius: '8px', 
            marginTop: '10px',
            background: '#1a1a1a'
          }}>
            <p style={{fontSize: '11px', color: '#888', marginBottom: '5px'}}>ВАРИАНТ 1: Ссылка</p>
            <input 
              className="admin-input"
              placeholder="http://example.com/video.mp4" 
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              disabled={!!selectedFile}
            />

            <p style={{fontSize: '11px', color: '#888', margin: '10px 0 5px'}}>ВАРИАНТ 2: Любой видеофайл</p>
            <input 
              id="file-input"
              type="file" 
              accept="video/*" // ПОДДЕРЖКА ВСЕХ ТИПОВ ВИДЕО
              disabled={!!newUrl.trim()}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          <button 
            className="resume-button" 
            style={{width: '100%', marginTop: '15px', opacity: uploading ? 0.6 : 1}}
            onClick={handleSaveVideo}
            disabled={uploading}
          >
            {uploading ? "Загрузка..." : "Опубликовать урок"}
          </button>
        </div>

        <hr style={{margin: '20px 0', borderColor: '#333'}} />

        <div className="video-list">
          <h4 style={{marginBottom: '10px'}}>Библиотека уроков</h4>
          {videos.map(v => (
            <div 
              key={v.id} 
              className={`video-item ${selectedVideo?.id === v.id ? 'active' : ''}`}
              onClick={() => setSelectedVideo(v)}
            >
              {v.title}
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        {selectedVideo ? (
          <div style={{width: '100%', maxWidth: '1000px'}}>
            <h1 style={{marginBottom: '20px', textAlign: 'left'}}>{selectedVideo.title}</h1>
            <VideoPlayer 
              url={selectedVideo.url} 
              events={selectedVideo.events || []} 
            />
          </div>
        ) : (
          <div style={{textAlign: 'center', marginTop: '20%'}}>
            <h2 style={{color: '#444'}}>Выберите урок из списка</h2>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
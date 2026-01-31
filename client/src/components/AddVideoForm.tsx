import { useState } from 'react';
import { uploadVideoFile, createVideo } from '../api/videoApi';

interface AddVideoFormProps {
  onVideoAdded: () => void;
  // ДОБАВЛЕНО: Принимаем ID курса
  courseId: number | null;
}

export const AddVideoForm = ({ onVideoAdded, courseId }: AddVideoFormProps) => {
  // States
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSaveVideo = async () => {
    // ВАЖНО: Проверяем, передан ли ID курса
    if (!courseId) {
        return alert("Ошибка: Курс не выбран!");
    }

    if (!newTitle.trim()) return alert("Введите название урока!");
    if (!newUrl.trim() && !selectedVideoFile) {
      return alert("Добавьте ссылку или выберите видео-файл!");
    }

    setUploading(true);
    try {
      // 1. Загружаем видео (если файл)
      let finalUrl = newUrl;
      if (selectedVideoFile) {
        const { url } = await uploadVideoFile(selectedVideoFile);
        finalUrl = url;
      }

      // 2. Загружаем субтитры (если файл)
      let subtitlesData = [];
      if (selectedSubFile) {
          const { url: subUrl } = await uploadVideoFile(selectedSubFile);
          subtitlesData.push({
              lang: 'ru',
              label: 'Русский',
              src: subUrl
          });
      }

      // 3. Создаем запись в БД
      await createVideo({ 
          title: newTitle, 
          url: finalUrl, 
          subtitles: subtitlesData,
          events: [],
          courseId: courseId 
      });
      
      alert("Урок успешно опубликован!");
      
      // Сброс формы
      setNewTitle('');
      setNewUrl('');
      setSelectedVideoFile(null);
      setSelectedSubFile(null);
      
      // Очистка инпутов (безопасный вариант)
      const videoInput = document.getElementById('video-input') as HTMLInputElement;
      if (videoInput) videoInput.value = '';
      
      const subInput = document.getElementById('sub-input') as HTMLInputElement;
      if (subInput) subInput.value = '';
      
      onVideoAdded();
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <h4 className="section-title">+ Создать новый урок</h4>
      
      <input 
        className="admin-input"
        placeholder="Название урока" 
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />

      <div className="upload-options">
        {/* БЛОК ВИДЕО */}
        <div className="option-group">
          <p className="option-label">Видео (Ссылка или Файл)</p>
          <input 
            className="admin-input"
            placeholder="http://..." 
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            disabled={!!selectedVideoFile}
          />
          <div className="file-input-wrapper" style={{ marginTop: '5px' }}>
             <input 
              id="video-input"
              type="file" 
              accept="video/*"
              disabled={!!newUrl.trim()}
              onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
            />
            {selectedVideoFile && (
                <button className="clear-btn" onClick={() => {
                    setSelectedVideoFile(null);
                    const el = document.getElementById('video-input') as HTMLInputElement;
                    if (el) el.value = '';
                }}>✕</button>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: '#333', margin: '15px 0' }}></div>

        {/* БЛОК СУБТИТРОВ */}
        <div className="option-group">
          <p className="option-label">Субтитры (.vtt)</p>
          <div className="file-input-wrapper">
             <input 
              id="sub-input"
              type="file" 
              accept=".vtt"
              onChange={(e) => setSelectedSubFile(e.target.files?.[0] || null)}
            />
            {selectedSubFile && (
                <button className="clear-btn" onClick={() => {
                    setSelectedSubFile(null);
                    const el = document.getElementById('sub-input') as HTMLInputElement;
                    if (el) el.value = '';
                }}>✕</button>
            )}
          </div>
        </div>
      </div>

      <button className="primary-button" onClick={handleSaveVideo} disabled={uploading}>
        {uploading ? "Загрузка медиа..." : "Опубликовать урок"}
      </button>
    </div>
  );
};
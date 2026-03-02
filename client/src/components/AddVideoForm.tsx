import { useState } from 'react';
import { uploadVideoFile, createVideo } from '../api/videoApi';
import { useToast } from '../context/ToastContext'; // 🔥 ИМПОРТ
import './AddVideoForm.css';

interface AddVideoFormProps {
  onVideoAdded: () => void;
  courseId: number | null;
}

export const AddVideoForm = ({ onVideoAdded, courseId }: AddVideoFormProps) => {
  const { showToast } = useToast(); // 🔥 ХУК
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSaveVideo = async () => {
    if (!courseId) return showToast("Ошибка: Курс не выбран!", "error");
    if (!newTitle.trim()) return showToast("Введите название урока!", "error");
    if (!newUrl.trim() && !selectedVideoFile) {
      return showToast("Добавьте ссылку или выберите видео-файл!", "error");
    }

    setUploading(true);
    try {
      let finalUrl = newUrl;
      if (selectedVideoFile) {
        const { url } = await uploadVideoFile(selectedVideoFile);
        finalUrl = url;
      }

      let subtitlesData = [];
      if (selectedSubFile) {
          const { url: subUrl } = await uploadVideoFile(selectedSubFile);
          subtitlesData.push({ lang: 'ru', label: 'Русский', src: subUrl });
      }

      await createVideo({
        title: newTitle,
        url: finalUrl,
        courseId,
        subtitles: subtitlesData.length > 0 ? subtitlesData : undefined
      });

      setNewTitle('');
      setNewUrl('');
      setSelectedVideoFile(null);
      setSelectedSubFile(null);
      showToast("Урок успешно опубликован!", "success"); // 🔥 ТОСТ
      onVideoAdded();
    } catch (e) {
      console.error(e);
      showToast("Ошибка при сохранении урока", "error"); // 🔥 ТОСТ
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="add-video-form">
      <div className="form-group">
        <label className="form-label">Название урока</label>
        <input 
          type="text" className="modern-input" placeholder="Напр. Введение в Docker"
          value={newTitle} onChange={e => setNewTitle(e.target.value)} 
        />
      </div>

      <div className="upload-grid">
        <div className="option-group">
          <p className="option-label">Видео-файл (.mp4, .webm)</p>
          <div className="file-input-wrapper">
             <input 
              id="video-input" type="file" accept="video/mp4,video/webm"
              onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
            />
            {selectedVideoFile && (
                <button 
                    className="clear-btn" title="Удалить файл"
                    onClick={() => {
                        setSelectedVideoFile(null);
                        const el = document.getElementById('video-input') as HTMLInputElement;
                        if (el) el.value = '';
                    }}
                >✕</button>
            )}
          </div>
        </div>

        <div className="divider"></div>

        <div className="option-group">
          <p className="option-label">Субтитры (.vtt)</p>
          <div className="file-input-wrapper">
             <input 
              id="sub-input" type="file" accept=".vtt"
              onChange={(e) => setSelectedSubFile(e.target.files?.[0] || null)}
            />
            {selectedSubFile && (
                <button 
                    className="clear-btn" title="Удалить файл"
                    onClick={() => {
                        setSelectedSubFile(null);
                        const el = document.getElementById('sub-input') as HTMLInputElement;
                        if (el) el.value = '';
                    }}
                >✕</button>
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
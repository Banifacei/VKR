import { useState } from 'react';
import { uploadVideoFile, createVideo } from '../api/videoApi';
import { useToast } from '../context/ToastContext';

interface AddVideoFormProps {
  onVideoAdded: () => void;
  courseId: number | null;
}

type InputMode = 'file' | 'url';

const detectLinkType = (url: string): string => {
    if (/youtube\.com\/watch|youtu\.be\//.test(url)) return 'YouTube';
    if (/rutube\.ru\/video\//.test(url)) return 'Rutube';
    if (/vk\.com\/video/.test(url)) return 'VK Видео';
    if (/\.(mp4|webm|ogg|mov)$/i.test(url)) return 'Прямая ссылка на видео';
    if (url.startsWith('http')) return 'Внешняя ссылка';
    return '';
};

export const AddVideoForm = ({ onVideoAdded, courseId }: AddVideoFormProps) => {
  const { showToast } = useToast();
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const linkType = newUrl.trim() ? detectLinkType(newUrl.trim()) : '';

  const handleSaveVideo = async () => {
    if (!courseId) return showToast('Ошибка: Курс не выбран!', 'error');
    if (!newTitle.trim()) return showToast('Введите название урока!', 'error');

    if (inputMode === 'file' && !selectedVideoFile) {
      return showToast('Выберите видео-файл!', 'error');
    }
    if (inputMode === 'url' && !newUrl.trim()) {
      return showToast('Введите ссылку на видео!', 'error');
    }

    setUploading(true);
    try {
      let finalUrl = newUrl.trim();

      if (inputMode === 'file' && selectedVideoFile) {
        const { url } = await uploadVideoFile(selectedVideoFile);
        finalUrl = url;
      }

      let subtitlesData: { lang: string; label: string; src: string }[] = [];
      if (inputMode === 'file' && selectedSubFile) {
        const { url: subUrl } = await uploadVideoFile(selectedSubFile);
        subtitlesData.push({ lang: 'ru', label: 'Русский', src: subUrl });
      }

      await createVideo({
        title: newTitle,
        url: finalUrl,
        courseId,
        subtitles: subtitlesData.length > 0 ? subtitlesData : undefined,
      });

      setNewTitle('');
      setNewUrl('');
      setSelectedVideoFile(null);
      setSelectedSubFile(null);
      showToast('Урок успешно опубликован!', 'success');
      onVideoAdded();
    } catch (e) {
      console.error(e);
      showToast('Ошибка при сохранении урока', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="add-video-form">
      <div className="form-group">
        <label className="form-label">Название урока</label>
        <input
          type="text"
          className="modern-input"
          placeholder="Напр. Введение в Docker"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
      </div>

      {/* Переключатель вкладок */}
      <div className="input-mode-tabs">
        <button
          className={`mode-tab ${inputMode === 'file' ? 'active' : ''}`}
          onClick={() => setInputMode('file')}
          type="button"
        >
          Загрузить файл
        </button>
        <button
          className={`mode-tab ${inputMode === 'url' ? 'active' : ''}`}
          onClick={() => setInputMode('url')}
          type="button"
        >
          Вставить ссылку
        </button>
      </div>

      {inputMode === 'file' ? (
        <div className="upload-grid">
          <div className="option-group">
            <p className="option-label">Видео-файл (.mp4, .webm)</p>
            <div className="file-input-wrapper">
              <input
                id="video-input"
                type="file"
                accept="video/mp4,video/webm"
                onChange={e => setSelectedVideoFile(e.target.files?.[0] || null)}
              />
              {selectedVideoFile && (
                <button
                  className="clear-btn"
                  title="Удалить файл"
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
                id="sub-input"
                type="file"
                accept=".vtt"
                onChange={e => setSelectedSubFile(e.target.files?.[0] || null)}
              />
              {selectedSubFile && (
                <button
                  className="clear-btn"
                  title="Удалить файл"
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
      ) : (
        <div className="url-input-group">
          <input
            type="url"
            className="modern-input"
            placeholder="https://youtube.com/watch?v=... или https://rutube.ru/video/..."
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
          {linkType && (
            <div className="link-type-badge">
              {linkType}
            </div>
          )}
          <p className="option-label" style={{ marginTop: '6px' }}>
            Поддерживаются: YouTube, Rutube, VK Видео и прямые ссылки на .mp4/.webm
          </p>
        </div>
      )}

      <button className="primary-button" onClick={handleSaveVideo} disabled={uploading}>
        {uploading ? 'Загрузка...' : 'Опубликовать урок'}
      </button>
    </div>
  );
};

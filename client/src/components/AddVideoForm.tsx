import React, { useState } from 'react';
import { uploadVideoFile, createVideo } from '../api/videoApi';

interface AddVideoFormProps {
  onVideoAdded: () => void;
}

export const AddVideoForm = ({ onVideoAdded }: AddVideoFormProps) => {
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSaveVideo = async () => {
    if (!newTitle.trim()) return alert("Введите название урока!");
    if (!newUrl.trim() && !selectedFile) {
      return alert("Добавьте ссылку или выберите файл!");
    }

    setUploading(true);
    try {
      let finalUrl = newUrl;
      if (selectedFile) {
        const { url } = await uploadVideoFile(selectedFile);
        finalUrl = url;
      }

      await createVideo({ title: newTitle, url: finalUrl, events: [] });
      
      alert("Урок успешно сохранен!");
      setNewTitle('');
      setNewUrl('');
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      onVideoAdded(); // Сообщаем App.tsx, что список пора обновить
    } catch (e) {
      alert("Ошибка при сохранении");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <h4 style={{marginBottom: '10px', color: '#646cff'}}>+ Создать новый урок</h4>
      <input 
        className="admin-input"
        placeholder="Название урока" 
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />
      <div style={{ border: '1px dashed #444', padding: '10px', borderRadius: '8px', marginTop: '10px', background: '#1a1a1a' }}>
        <p style={{fontSize: '11px', color: '#888', marginBottom: '5px'}}>ВАРИАНТ 1: Ссылка</p>
        <input 
          className="admin-input"
          placeholder="http://..." 
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          disabled={!!selectedFile}
        />
        <p style={{fontSize: '11px', color: '#888', margin: '10px 0 5px'}}>ВАРИАНТ 2: Файл</p>
        <input 
          id="file-input"
          type="file" 
          accept="video/*"
          disabled={!!newUrl.trim()}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
      </div>
      <button className="resume-button" style={{width: '100%', marginTop: '15px'}} onClick={handleSaveVideo} disabled={uploading}>
        {uploading ? "Загрузка..." : "Опубликовать урок"}
      </button>
    </div>
  );
};
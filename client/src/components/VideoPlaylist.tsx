// src/components/VideoPlaylist.tsx

import type { IVideo } from '../types';
import { pluralizeRu } from '../utils/pluralize';

interface VideoPlaylistProps {
  videos: IVideo[];
  selectedVideoId?: number;
  onSelect: (video: IVideo) => void;
}

export const VideoPlaylist = ({ videos, selectedVideoId, onSelect }: VideoPlaylistProps) => {
  return (
    <aside className="playlist-sidebar">
      <div className="playlist-header">
          <h3>Программа курса</h3>
          <span className="count">{videos.length} {pluralizeRu(videos.length, 'урок', 'урока', 'уроков')}</span>
      </div>
      <div className="playlist-scroll">
          {videos.map((v, index) => (
            <div 
                key={v.id} 
                className={`playlist-item ${selectedVideoId === v.id ? 'active' : ''}`} 
                onClick={() => { if (selectedVideoId !== v.id) onSelect(v); }}
            >
              <div className="item-index">{index + 1}</div>
              <div className="item-info">
                  <span className="item-title">{v.title}</span>
                  <span className="item-duration">Видео урок</span>
              </div>
              {selectedVideoId === v.id && <div className="playing-icon">▶</div>}
            </div>
          ))}
      </div>
    </aside>
  );
};
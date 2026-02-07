// src/components/UserProfile.tsx
import { useState, useRef, useEffect } from 'react';

interface UserProfileProps {
  username: string;
  onLogout: () => void;
}

export const UserProfile = ({ username, onLogout }: UserProfileProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-profile-wrapper" ref={menuRef}>
      {/* Только имя, которое открывает меню */}
      <div className="user-name-badge" onClick={() => setIsOpen(!isOpen)}>
        {username}
        
      </div>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="profile-dropdown">
          <div className="dropdown-header">Настройки аккаунта</div>
          <div className="dropdown-item nominal">Аккаунт</div>
          <div className="dropdown-item nominal">Настройки</div>
          <div className="dropdown-divider" />
          <button className="dropdown-item logout" onClick={onLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
};
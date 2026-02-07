import React, { useState, useRef, useEffect } from 'react';
import './UserProfile.css';

interface UserProfileProps {
    username: string;
    onLogout: () => void;
}

export const UserProfile = ({ username, onLogout }: UserProfileProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Получаем инициалы (первая буква)
    const initial = username.charAt(0).toUpperCase();

    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="user-profile-container" ref={dropdownRef}>
            <button className="user-profile-btn" onClick={() => setIsOpen(!isOpen)}>
                <div className="user-avatar">{initial}</div>
                <span className="user-name">{username}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s'}}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {isOpen && (
                <div className="profile-dropdown">
                    <button className="dropdown-item" onClick={() => alert('Профиль в разработке')}>
                        👤 Мой профиль
                    </button>
                    <button className="dropdown-item" onClick={() => alert('Настройки в разработке')}>
                        ⚙️ Настройки
                    </button>
                    <button className="dropdown-item danger" onClick={onLogout}>
                        🚪 Выйти
                    </button>
                </div>
            )}
        </div>
    );
};
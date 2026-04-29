import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
interface UserProfileProps {
    user: {
        id: number;
        firstName: string;
        lastName: string;
        middleName?: string;
        avatarUrl?: string;
        role?: string;
    };
    onUpdate: (newAvatarUrl: string) => void;
    onLogout: () => void;
}

export const UserProfile = ({ user, onLogout }: UserProfileProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : '?';
    const fullNameDisplay = `${user.lastName} ${user.firstName}`;

    // Закрытие при клике вне
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
            {/* Главная кнопка профиля */}
            <button className="user-profile-btn" onClick={() => setIsOpen(!isOpen)}>
                            <div className="user-avatar">
                {user.avatarUrl ? (
                    <img 
                        src={user.avatarUrl} 
                        alt="avatar" 
                        className="avatar-img" 
                        // 🔥 ФИКС: Если картинка не прогрузилась (403/404), показываем инициал
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerText = initial;
                        }}
                    />
                ) : (
                    initial
                )}
            </div>
                <span className="user-name">{fullNameDisplay}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s'}}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {/* Выпадающее меню */}
            {isOpen && (
                <div className="profile-dropdown">
                    <button 
                        className="dropdown-item" 
                        onClick={() => { 
                            setIsOpen(false);
                            navigate('/profile'); // <-- ПРОСТО ПЕРЕХОДИМ НА СТРАНИЦУ
                        }}
                    >
                        <Icons.Settings size={14}/> Настройки
                    </button>
                    {user.role === 'student' && (
                        <button 
                            className="dropdown-item" 
                            onClick={() => { 
                                setIsOpen(false);
                                navigate('/history'); // ПРОСТО ПРЯМОЙ ПУТЬ
                            }}
                        >
                            <Icons.BarChart2 size={14}/> Моя статистика
                        </button>
                    )}
                    {user.role === 'teacher' && (
                        <button className="dropdown-item"
                        onClick={() => { 
                            setIsOpen(false); 
                            navigate('/analytics'); 
                        }}>
                            <Icons.TrendingUp size={14}/> Центр аналитики
                        </button>
                    )}
                    {user.role === 'admin' && (
                        <button 
                            className="dropdown-item" 
                            onClick={() => { 
                                setIsOpen(false);
                                navigate('/adminpanel');
                            }}
                        >
                            Админ.панель
                        </button>
                    )}
                    <button className="dropdown-item danger" onClick={onLogout}>
                        <Icons.LogOut size={14}/> Выйти
                    </button>
                </div>
            )}
        </div>
    );
};
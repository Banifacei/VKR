import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import { UserProfile } from './UserProfile';
import { NotificationBell } from './NotificationBell';
import { Icons } from './Icons';
import './NotificationBell.css';

interface AppHeaderProps {
    /** Бейдж рядом с логотипом (напр. "ROOT ACCESS") */
    badge?: string;
    /** Мелкая подпись после названия (напр. "Аналитика") */
    subtitle?: string;
    /** Цвет бейджа: 'danger' (default) | 'primary' | 'warning' */
    badgeColor?: 'danger' | 'primary' | 'warning';
    /** Куда ведёт клик на логотип (default: "/") */
    logoTo?: string;
    /** Показывать кнопку поиска (default: true) */
    showSearch?: boolean;
    /** Показывать колокольчик уведомлений (default: true) */
    showNotifications?: boolean;
    /** Показывать кнопку "← Назад" (default: false) */
    backButton?: boolean;
    /** Дополнительные элементы справа (между поиском и профилем) */
    children?: ReactNode;
}

export const AppHeader = ({
    badge,
    subtitle,
    badgeColor = 'danger',
    logoTo = '/',
    showSearch = true,
    showNotifications = true,
    backButton = false,
    children,
}: AppHeaderProps) => {
    const { user, logout, updateUser } = useAuth();
    const { globalTheme } = useTheme();
    const { openSearch } = useSearch();
    const navigate = useNavigate();

    const handleLogout = () => logout();
    const handleAvatarUpdate = (newUrl: string) => updateUser({ avatarUrl: newUrl });

    const badgeStyle: Record<string, React.CSSProperties> = {
        danger:  { background: 'rgba(var(--danger-rgb),0.15)',  color: 'var(--danger)',   border: '1px solid rgba(var(--danger-rgb),0.2)' },
        primary: { background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary)',  border: '1px solid rgba(var(--primary-rgb),0.2)' },
        warning: { background: 'rgba(var(--warning-rgb),0.15)', color: 'var(--warning)',  border: '1px solid rgba(var(--warning-rgb),0.2)' },
    };

    return (
        <header className="lumeo-header">
            {/* Левая часть: логотип + бейдж/подпись */}
            <div className="logo-group" style={{ flex: 1 }}>
                <Link to={logoTo} className="logo" style={{ textDecoration: 'none' }}>
                    {globalTheme.platform_logo && (
                        <img
                            src={globalTheme.platform_logo}
                            alt="logo"
                            style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }}
                        />
                    )}
                    {globalTheme.platform_name}<span className="dot">.</span>
                </Link>

                {badge && (
                    <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '4px 8px', borderRadius: 4,
                        letterSpacing: 1,
                        ...badgeStyle[badgeColor],
                    }}>
                        {badge}
                    </span>
                )}

                {subtitle && (
                    <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                        {subtitle}
                    </span>
                )}
            </div>

            {/* Центр: поиск */}
            {showSearch && (
                <div className="header-search-center">
                    <button className="gs-trigger" onClick={openSearch}>
                        <Icons.Search size={14} /><span>Поиск...</span><kbd>Ctrl+/</kbd>
                    </button>
                </div>
            )}

            {/* Правая часть: действия */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                {backButton && (
                    <button
                        onClick={() => navigate(-1)}
                        className="nav-link"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        ← Назад
                    </button>
                )}

                {children}

                {showNotifications && <NotificationBell />}

                {user && (
                    <UserProfile
                        user={user}
                        onUpdate={handleAvatarUpdate}
                        onLogout={handleLogout}
                    />
                )}
            </div>
        </header>
    );
};

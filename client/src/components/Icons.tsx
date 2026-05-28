// src/components/Icons.tsx

interface IconProps {
    size?:        number;
    color?:       string;
    className?:   string;
    strokeWidth?: number;
}

// ─── Общие иконки ─────────────────────────────────────────────────────────────

export const Icons = {

    Video: ({ size = 40, color, className, strokeWidth = 1.5 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
    ),

    Test: ({ size = 40, color, className, strokeWidth = 1.5 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
        </svg>
    ),

    // Семантические — по умолчанию используют CSS-переменные темы
    Fail: ({ size = 18, color, className, strokeWidth = 2.5 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'var(--danger)'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
    ),

    Empty: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
        </svg>
    ),

    Search: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
    ),

    Edit: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
    ),

    Trash: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    ),

    Time: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    ),

    Stats: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    ),

    AI: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 12L2.1 10.5"/>
        </svg>
    ),

    Spinner: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg className={`ai-spinner${className ? ` ${className}` : ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
    ),

    Drag: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
    ),

    Settings: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    ),

    Plus: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    ),

    Refresh: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
    ),

    Close: ({ size = 24, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    ),

    Server: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
    ),

    Users: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),

    Shield: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    ),

    Activity: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
    ),

    Code: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
        </svg>
    ),

    Database: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
    ),

    Terminal: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
    ),

    Zap: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
    ),

    // Семантические лог-иконки — дефолтный цвет из CSS-переменных темы
    LogInfo: ({ size = 14, color, className, strokeWidth = 3 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'var(--primary)'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
    ),

    LogSuccess: ({ size = 14, color, className, strokeWidth = 3 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'var(--success)'} strokeWidth={strokeWidth} className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    ),

    LogWarning: ({ size = 14, color, className, strokeWidth = 3 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'var(--warning)'} strokeWidth={strokeWidth} className={className}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
    ),

    LogError: ({ size = 14, color, className, strokeWidth = 3 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'var(--danger)'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
    ),

    Upload: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
    ),

    Download: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
    ),

    Bell: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
    ),

    Check: ({ size = 16, color, className, strokeWidth = 3 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    ),

    LinkIcon: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
    ),

    Globe: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
    ),

    User: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),

    Mail: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
        </svg>
    ),

    Phone: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
    ),

    Lock: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    ),

    Building: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
            <path d="M12 10h.01"/><path d="M12 14h.01"/>
            <path d="M16 10h.01"/><path d="M16 14h.01"/>
            <path d="M8 10h.01"/><path d="M8 14h.01"/>
        </svg>
    ),

    Teacher: ({ size = 14, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),

    Play: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
    ),

    Brain: ({ size = 24, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 12L2.1 10.5"/>
        </svg>
    ),

    Target: ({ size = 24, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
        </svg>
    ),

    SettingsIcon: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    ),

    StatsIcon: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    ),

    Back: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
        </svg>
    ),

    Camera: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
        </svg>
    ),

    Eye: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    ),

    Monitor: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
    ),

    FileText: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
        </svg>
    ),

    TrendingUp: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
        </svg>
    ),

    BarChart2: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    ),

    Trophy: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="8 21 12 17 16 21"/>
            <path d="M16 8V5H8v3c0 3.3 1.8 6 4 8 2.2-2 4-4.7 4-8z"/>
            <path d="M4 5v3c0 2 1 4 2.4 5.4"/>
            <path d="M20 5v3c0 2-1 4-2.4 5.4"/>
            <line x1="6" y1="5" x2="18" y2="5"/>
        </svg>
    ),

    Star: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    ),

    Printer: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
        </svg>
    ),

    HelpCircle: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
    ),

    Lightbulb: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="9" y1="18" x2="15" y2="18"/>
            <line x1="10" y1="22" x2="14" y2="22"/>
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
    ),

    AlertTriangle: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'var(--warning)'} strokeWidth={strokeWidth} className={className}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
    ),

    Rocket: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>
    ),

    RotateCcw: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.14"/>
        </svg>
    ),

    LogOut: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
    ),

    Image: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
        </svg>
    ),

    Layers: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
        </svg>
    ),

    Cpu: ({ size = 20, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
            <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
            <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
            <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
            <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
        </svg>
    ),

    Save: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
        </svg>
    ),

    EyeOff: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
    ),

    CheckCircle: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    ),

    Send: ({ size = 16, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
    ),

    Palette: ({ size = 18, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <circle cx="13.5" cy="6.5" r=".5" fill={color ?? 'currentColor'}/>
            <circle cx="17.5" cy="10.5" r=".5" fill={color ?? 'currentColor'}/>
            <circle cx="8.5" cy="7.5" r=".5" fill={color ?? 'currentColor'}/>
            <circle cx="6.5" cy="12.5" r=".5" fill={color ?? 'currentColor'}/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
    ),
};

// ─── Иконки плеера ─────────────────────────────────────────────────────────────
// Размер управляется через CSS (нет атрибутов width/height)

interface PlayerIconProps {
    color?:       string;
    className?:   string;
    strokeWidth?: number;
}

export const VideoPlayeIcons = {

    Play: ({ color, className, strokeWidth = 2.5 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="6 3 20 12 6 21 6 3" fill={color ?? 'currentColor'}/>
        </svg>
    ),

    Pause: ({ color, className, strokeWidth = 2.5 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="6" y="4" width="4" height="16" fill={color ?? 'currentColor'}/>
            <rect x="14" y="4" width="4" height="16" fill={color ?? 'currentColor'}/>
        </svg>
    ),

    VolumeHigh: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
    ),

    VolumeMuted: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
    ),

    Settings: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg className={`icon-settings${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    ),

    Pip: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
            <rect x="13" y="11" width="7" height="5"/>
        </svg>
    ),

    Fullscreen: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
    ),

    FullscreenExit: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
    ),

    Refresh: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
    ),

    Captions: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
            <line x1="8" y1="15" x2="8" y2="15"/>
            <line x1="16" y1="15" x2="16" y2="15"/>
        </svg>
    ),

    Chapters: ({ color, className, strokeWidth = 2 }: PlayerIconProps = {}) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
    ),
};

// ─── Иконки курсов ─────────────────────────────────────────────────────────────

export const CorsesIcons = {

    Teacher: ({ size = 14, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),

    Video: ({ size = 14, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
            <line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
        </svg>
    ),

    Plus: ({ size = 32, color, className, strokeWidth = 2 }: IconProps = {}) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={strokeWidth} className={className}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    ),
};

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axiosInstance';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type ThemePreset     = 'lumeo' | 'royal' | 'emerald' | 'crimson' | 'gold' | 'ocean' | 'sunset' | 'rose' | 'slate' | 'mint';
export type BgPattern       = 'none' | 'off' | 'grid' | 'dots' | 'particles' | 'cross' | 'diagonal';
export type ColorScheme     = 'dark' | 'light' | 'system' | 'time';
export type Density         = 'normal' | 'compact';

export interface GlobalTheme {
    theme_preset:        ThemePreset;
    platform_name:       string;
    platform_logo:       string;
    platform_bg_pattern: BgPattern;
}

export interface UserTheme {
    scheme:    ColorScheme;
    bgPattern: BgPattern;
    density:   Density;
    bgScale:   number;   // 0.5–3, масштаб паттерна (default 1)
    bgSpeed:   number;   // 5–60, скорость анимации в секундах (default 30)
}

interface ThemeContextType {
    globalTheme: GlobalTheme;
    userTheme:   UserTheme;
    saveGlobalTheme: (data: Partial<GlobalTheme> & { logoFile?: File | null }) => Promise<void>;
    saveUserTheme:   (data: Partial<UserTheme>) => Promise<void>;
    isSaving: boolean;
}

// ─── Пресеты цветов ───────────────────────────────────────────────────────────

export const THEME_PRESETS: Record<ThemePreset, { primary: string; primaryHover: string; label: string; emoji: string }> = {
    lumeo:   { primary: '#00aeef', primaryHover: '#0093ca', label: 'Lumeo',   emoji: '🔵' },
    royal:   { primary: '#7928ca', primaryHover: '#6020a0', label: 'Royal',   emoji: '🟣' },
    emerald: { primary: '#00c853', primaryHover: '#00a844', label: 'Emerald', emoji: '🟢' },
    crimson: { primary: '#e63946', primaryHover: '#cc2936', label: 'Crimson', emoji: '🔴' },
    gold:    { primary: '#ffd700', primaryHover: '#e6c200', label: 'Gold',    emoji: '🟡' },
    ocean:   { primary: '#00bcd4', primaryHover: '#0097a7', label: 'Ocean',   emoji: '🩵' },
    sunset:  { primary: '#ff6b35', primaryHover: '#e55a28', label: 'Sunset',  emoji: '🟠' },
    rose:    { primary: '#e91e8c', primaryHover: '#c41878', label: 'Rose',    emoji: '🩷' },
    slate:   { primary: '#607d8b', primaryHover: '#546e7a', label: 'Slate',   emoji: '🩶' },
    mint:    { primary: '#26a69a', primaryHover: '#1e8b80', label: 'Mint',    emoji: '🌿' },
};

const DEFAULT_GLOBAL: GlobalTheme = {
    theme_preset:        'lumeo',
    platform_name:       'Lumeo',
    platform_logo:       '',
    platform_bg_pattern: 'grid',
};

const DEFAULT_USER: UserTheme = {
    scheme:    'dark',
    bgPattern: 'none',
    density:   'normal',
    bgScale:   1,
    bgSpeed:   30,
};

// ─── Применение темы к DOM ────────────────────────────────────────────────────

function applyPreset(preset: ThemePreset) {
    const { primary, primaryHover } = THEME_PRESETS[preset];
    const root = document.documentElement;
    root.style.setProperty('--primary',       primary);
    root.style.setProperty('--primary-hover', primaryHover);
}

function isTimeDark(): boolean {
    const h = new Date().getHours();
    return h < 7 || h >= 20; // тёмная: 20:00 – 7:00
}

function applyScheme(scheme: ColorScheme) {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark =
        scheme === 'dark'   ? true :
        scheme === 'light'  ? false :
        scheme === 'system' ? prefersDark :
        /* time */            isTimeDark();

    if (isDark) {
        root.classList.remove('theme-light');
        root.classList.add('theme-dark');
    } else {
        root.classList.remove('theme-dark');
        root.classList.add('theme-light');
    }
}

// Текущие значения — нужны чтобы пересчитать при изменении одного из них
let _globalBg: BgPattern = 'grid';
let _userBg:   BgPattern = 'none';

function applyEffectiveBg() {
    // user='none' → следовать глобальному; любое другое → переопределяет
    const effective: BgPattern = _userBg !== 'none' ? _userBg : _globalBg;
    document.documentElement.setAttribute('data-bg', effective);
}

function applyBgPattern(pattern: BgPattern, target: 'global' | 'user') {
    if (target === 'global') _globalBg = pattern;
    else                      _userBg   = pattern;
    applyEffectiveBg();
}

// Экспортируем для live-preview в компонентах
export const previewGlobalBg = (pattern: BgPattern) => applyBgPattern(pattern, 'global');
export const previewUserBg   = (pattern: BgPattern) => applyBgPattern(pattern, 'user');
export const previewPreset   = (preset: ThemePreset) => applyPreset(preset);

function applyDensity(density: Density) {
    document.documentElement.setAttribute('data-density', density);
}

function applyBgExtras(bgScale: number, bgSpeed: number) {
    const root = document.documentElement;
    root.style.setProperty('--bg-scale', String(bgScale));
    root.style.setProperty('--bg-anim-duration', `${bgSpeed}s`);
}

// Экспортируем для live-preview слайдеров
export const previewBgExtras = applyBgExtras;

// ─── Контекст ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function loadStoredUserTheme(): Partial<UserTheme> {
    try {
        const raw = localStorage.getItem('lumeo_user_theme');
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
}

export const ThemeProvider = ({ children, initialUserTheme }: { children: ReactNode; initialUserTheme?: Partial<UserTheme> }) => {
    const [globalTheme, setGlobalTheme] = useState<GlobalTheme>(DEFAULT_GLOBAL);
    const [userTheme,   setUserTheme]   = useState<UserTheme>({ ...DEFAULT_USER, ...loadStoredUserTheme(), ...initialUserTheme });
    const [isSaving,    setIsSaving]    = useState(false);

    // Загружаем глобальную тему и тему пользователя при старте
    useEffect(() => {
        // Глобальная тема (публичный эндпоинт)
        api.get('/theme').then(({ data }) => {
            const theme: GlobalTheme = {
                theme_preset:        data.theme_preset        || 'lumeo',
                platform_name:       data.platform_name       || 'Lumeo',
                platform_logo:       data.platform_logo       || '',
                platform_bg_pattern: data.platform_bg_pattern || 'grid',
            };
            setGlobalTheme(theme);
            applyPreset(theme.theme_preset);
            applyBgPattern(theme.platform_bg_pattern, 'global');
        }).catch(() => {
            applyPreset('lumeo');
        });

        // Тема пользователя из БД (только для авторизованных, тихий фейл)
        if (localStorage.getItem('lumeo_token')) {
            api.get('/auth/me').then(({ data }) => {
                const tc = data?.themeConfig as Partial<UserTheme> | undefined;
                if (tc && Object.keys(tc).length > 0) {
                    setUserTheme(prev => {
                        const merged = { ...prev, ...tc };
                        localStorage.setItem('lumeo_user_theme', JSON.stringify(merged));
                        return merged;
                    });
                }
            }).catch(() => { /* тихий фейл */ });
        }
    }, []);

    // Применяем пользовательскую тему при монтировании и изменении
    useEffect(() => {
        applyScheme(userTheme.scheme);
        applyBgPattern(userTheme.bgPattern, 'user');
        applyDensity(userTheme.density);
        applyBgExtras(userTheme.bgScale ?? 1, userTheme.bgSpeed ?? 30);
    }, [userTheme]);

    // Следим за системной темой
    useEffect(() => {
        if (userTheme.scheme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyScheme('system');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [userTheme.scheme]);

    // Следим за временем — каждую минуту пересчитываем тему
    useEffect(() => {
        if (userTheme.scheme !== 'time') return;
        const id = setInterval(() => applyScheme('time'), 60_000);
        return () => clearInterval(id);
    }, [userTheme.scheme]);

    const saveGlobalTheme = useCallback(async (data: Partial<GlobalTheme> & { logoFile?: File | null }) => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            if (data.theme_preset)        formData.append('theme_preset',        data.theme_preset);
            if (data.platform_name !== undefined) formData.append('platform_name', data.platform_name);
            if (data.platform_bg_pattern) formData.append('platform_bg_pattern', data.platform_bg_pattern);
            if (data.logoFile)            formData.append('logo', data.logoFile);

            const { data: result } = await api.put('/theme', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const updated: GlobalTheme = {
                ...globalTheme,
                theme_preset:        result.theme_preset        || globalTheme.theme_preset,
                platform_name:       result.platform_name       ?? globalTheme.platform_name,
                platform_logo:       result.platform_logo       ?? globalTheme.platform_logo,
                platform_bg_pattern: result.platform_bg_pattern || globalTheme.platform_bg_pattern,
            };
            setGlobalTheme(updated);
            applyPreset(updated.theme_preset);
            applyBgPattern(updated.platform_bg_pattern, 'global');
        } finally {
            setIsSaving(false);
        }
    }, [globalTheme]);

    const saveUserTheme = useCallback(async (data: Partial<UserTheme>) => {
        setIsSaving(true);
        try {
            await api.put('/theme/user', data);
            const updated: UserTheme = {
                ...userTheme,
                ...data,
                bgScale: data.bgScale ?? userTheme.bgScale ?? 1,
                bgSpeed: data.bgSpeed ?? userTheme.bgSpeed ?? 30,
            };
            setUserTheme(updated);
            localStorage.setItem('lumeo_user_theme', JSON.stringify(updated));
        } finally {
            setIsSaving(false);
        }
    }, [userTheme]);

    return (
        <ThemeContext.Provider value={{ globalTheme, userTheme, saveGlobalTheme, saveUserTheme, isSaving }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};

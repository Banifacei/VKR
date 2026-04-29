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
    default_scheme:      ColorScheme;
    default_density:     Density;
}

export interface UserTheme {
    scheme:          ColorScheme;
    bgPattern:       BgPattern;
    density:         Density;
    bgScale:         number;   // 0.5–3, масштаб паттерна (default 1)
    bgSpeed:         number;   // 5–60, скорость анимации в секундах (default 30)
    followPlatform:  boolean;  // true = следовать настройкам платформы (scheme+density+bg)
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
    default_scheme:      'dark',
    default_density:     'normal',
};

const DEFAULT_USER: UserTheme = {
    scheme:         'dark',
    bgPattern:      'none',
    density:        'normal',
    bgScale:        1,
    bgSpeed:        30,
    followPlatform: true,   // новые пользователи следуют настройкам платформы
};

// ─── Применение темы к DOM ────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

function applyPreset(preset: ThemePreset) {
    const { primary, primaryHover } = THEME_PRESETS[preset];
    const root = document.documentElement;
    root.style.setProperty('--primary',       primary);
    root.style.setProperty('--primary-hover', primaryHover);
    root.style.setProperty('--primary-rgb',   hexToRgb(primary));
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
export const previewScheme   = (scheme: ColorScheme) => applyScheme(scheme);
export const previewDensity  = (density: Density)    => applyDensity(density);

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
        api.get('/theme').then(({ data }) => {
            const theme: GlobalTheme = {
                theme_preset:        data.theme_preset        || 'lumeo',
                platform_name:       data.platform_name       || 'Lumeo',
                platform_logo:       data.platform_logo       || '',
                platform_bg_pattern: data.platform_bg_pattern || 'grid',
                default_scheme:     (data.default_scheme  || 'dark')   as ColorScheme,
                default_density:    (data.default_density || 'normal') as Density,
            };
            setGlobalTheme(theme);
            applyPreset(theme.theme_preset);
            applyBgPattern(theme.platform_bg_pattern, 'global');

            // Для пользователей без сохранённых настроек применяем платформенные дефолты
            const stored = loadStoredUserTheme();
            const fp = stored.followPlatform !== undefined ? stored.followPlatform : true;
            if (fp) {
                applyScheme(theme.default_scheme);
                applyDensity(theme.default_density);
            }
        }).catch(() => applyPreset('lumeo'));

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

    // SSE: мгновенное live-обновление при изменении брендинга администратором.
    // Цветовой пресет и фон платформы применяются всегда.
    // Схема и плотность — только если пользователь следует платформе (followPlatform).
    useEffect(() => {
        const es = new EventSource('/api/theme/events');

        es.onmessage = ({ data }) => {
            try {
                const d = JSON.parse(data) as Record<string, string>;
                const preset  = (d.theme_preset        || 'lumeo') as ThemePreset;
                const bgPat   = (d.platform_bg_pattern || 'grid')  as BgPattern;
                const name    =  d.platform_name       || 'Lumeo';
                const logo    =  d.platform_logo       || '';
                const scheme  = (d.default_scheme      || 'dark')   as ColorScheme;
                const density = (d.default_density     || 'normal') as Density;

                setGlobalTheme(prev => {
                    // Цвет пресета и фон платформы — всегда для всех
                    if (prev.theme_preset !== preset)       applyPreset(preset);
                    if (prev.platform_bg_pattern !== bgPat) applyBgPattern(bgPat, 'global');

                    return { theme_preset: preset, platform_name: name, platform_logo: logo,
                             platform_bg_pattern: bgPat, default_scheme: scheme, default_density: density };
                });
                // Scheme/density через globalTheme → useEffect ниже применит их,
                // но только если followPlatform=true (см. условие там)
            } catch { /* некорректный JSON */ }
        };

        es.onerror = () => es.close();
        return () => es.close();
    }, []);

    // Применяем пользовательскую тему.
    // followPlatform=true → используем платформенные дефолты для scheme/density/bgPattern.
    // followPlatform=false → пользователь управляет сам; SSE-изменения scheme/density игнорируются.
    useEffect(() => {
        if (userTheme.followPlatform) {
            applyScheme(globalTheme.default_scheme);
            applyDensity(globalTheme.default_density);
            applyBgPattern('none', 'user'); // bgPattern='none' → наследует платформенный фон
        } else {
            applyScheme(userTheme.scheme);
            applyDensity(userTheme.density);
            applyBgPattern(userTheme.bgPattern, 'user');
        }
        applyBgExtras(userTheme.bgScale ?? 1, userTheme.bgSpeed ?? 30);
    }, [userTheme, globalTheme.default_scheme, globalTheme.default_density]);

    // Следим за системной темой
    useEffect(() => {
        const effective = userTheme.followPlatform ? globalTheme.default_scheme : userTheme.scheme;
        if (effective !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyScheme('system');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [userTheme.scheme, userTheme.followPlatform, globalTheme.default_scheme]);

    // Следим за временем — каждую минуту пересчитываем тему
    useEffect(() => {
        const effective = userTheme.followPlatform ? globalTheme.default_scheme : userTheme.scheme;
        if (effective !== 'time') return;
        const id = setInterval(() => applyScheme('time'), 60_000);
        return () => clearInterval(id);
    }, [userTheme.scheme, userTheme.followPlatform, globalTheme.default_scheme]);

    const saveGlobalTheme = useCallback(async (data: Partial<GlobalTheme> & { logoFile?: File | null }) => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            if (data.theme_preset)                formData.append('theme_preset',        data.theme_preset);
            if (data.platform_name !== undefined) formData.append('platform_name',        data.platform_name);
            if (data.platform_bg_pattern)         formData.append('platform_bg_pattern', data.platform_bg_pattern);
            if (data.default_scheme)              formData.append('default_scheme',       data.default_scheme);
            if (data.default_density)             formData.append('default_density',      data.default_density);
            if (data.logoFile)                    formData.append('logo',                 data.logoFile);

            const { data: result } = await api.put('/theme', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const updated: GlobalTheme = {
                ...globalTheme,
                theme_preset:        result.theme_preset        || globalTheme.theme_preset,
                platform_name:       result.platform_name       ?? globalTheme.platform_name,
                platform_logo:       result.platform_logo       ?? globalTheme.platform_logo,
                platform_bg_pattern: result.platform_bg_pattern || globalTheme.platform_bg_pattern,
                default_scheme:      (result.default_scheme     || globalTheme.default_scheme)  as ColorScheme,
                default_density:     (result.default_density    || globalTheme.default_density) as Density,
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

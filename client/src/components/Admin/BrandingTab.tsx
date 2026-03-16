import { useState, useRef } from 'react';
import { useTheme, THEME_PRESETS, previewGlobalBg, previewPreset, type ThemePreset, type BgPattern } from '../../context/ThemeContext';

const BG_PATTERNS: { value: BgPattern; label: string; icon: string }[] = [
    { value: 'none',      label: 'Без паттерна', icon: '⬛' },
    { value: 'grid',      label: 'Сетка',        icon: '🔲' },
    { value: 'dots',      label: 'Точки',        icon: '⠿' },
    { value: 'particles', label: 'Частицы',      icon: '✨' },
];

export const BrandingTab = () => {
    const { globalTheme, saveGlobalTheme, isSaving } = useTheme();

    const [preset,    setPreset]    = useState<ThemePreset>(globalTheme.theme_preset);
    const [name,      setName]      = useState(globalTheme.platform_name);
    const [bgPattern, setBgPattern] = useState<BgPattern>(globalTheme.platform_bg_pattern);
    const [logoFile,  setLogoFile]  = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState(globalTheme.platform_logo);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        await saveGlobalTheme({
            theme_preset:        preset,
            platform_name:       name,
            platform_bg_pattern: bgPattern,
            logoFile,
        });
        setLogoFile(null);
    };

    return (
        <div className="branding-tab">
            {/* Название платформы */}
            <div className="admin-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Название платформы</h2>
                </div>
                <div className="section-body">
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>
                        Отображается в заголовке и на странице входа. Бейдж «Powered by Lumeo» сохранится.
                    </p>
                    <input
                        className="modern-input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Lumeo"
                        maxLength={40}
                    />
                </div>
            </div>

            {/* Логотип */}
            <div className="admin-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Логотип</h2>
                </div>
                <div className="section-body">
                    <div className="branding-logo-row">
                        <div className="branding-logo-preview" onClick={() => fileRef.current?.click()}>
                            {logoPreview
                                ? <img src={logoPreview} alt="logo" />
                                : <span style={{ fontSize: 32 }}>🏫</span>
                            }
                            <div className="branding-logo-overlay">Изменить</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px' }}>
                                PNG, SVG, JPG — до 2 МБ. Рекомендуется квадратный формат.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                                    Загрузить логотип
                                </button>
                                {logoPreview && (
                                    <button className="btn btn-ghost" onClick={() => { setLogoPreview(''); setLogoFile(null); }}>
                                        Удалить
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
                </div>
            </div>

            {/* Цветовой пресет */}
            <div className="admin-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Цветовая схема</h2>
                </div>
                <div className="section-body">
                    <div className="branding-presets-grid">
                        {(Object.entries(THEME_PRESETS) as [ThemePreset, typeof THEME_PRESETS[ThemePreset]][]).map(([key, p]) => (
                            <button
                                key={key}
                                className={`branding-preset-card ${preset === key ? 'active' : ''}`}
                                onClick={() => { setPreset(key); previewPreset(key); }}
                                style={{ '--preset-color': p.primary } as React.CSSProperties}
                            >
                                <span className="preset-dot" style={{ background: p.primary }} />
                                <span className="preset-label">{p.label}</span>
                                {preset === key && <span className="preset-check">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Фоновый паттерн */}
            <div className="admin-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Фон для всех пользователей</h2>
                </div>
                <div className="section-body">
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>
                        Пользователи могут переопределить в настройках профиля.
                    </p>
                    <div className="branding-bg-grid">
                        {BG_PATTERNS.map(p => (
                            <button
                                key={p.value}
                                className={`branding-bg-card ${bgPattern === p.value ? 'active' : ''}`}
                                onClick={() => { setBgPattern(p.value); previewGlobalBg(p.value); }}
                            >
                                <span className="bg-card-icon">{p.icon}</span>
                                <span>{p.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Сохранить */}
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ minWidth: 160 }}>
                {isSaving ? 'Сохранение...' : 'Сохранить брендинг'}
            </button>
        </div>
    );
};

import { useState } from 'react';
import { useTheme, previewUserBg, type ColorScheme, type BgPattern, type Density } from '../../context/ThemeContext';

const SCHEMES: { value: ColorScheme; label: string; icon: string; desc: string }[] = [
    { value: 'dark',   label: 'Тёмная',   icon: '🌑', desc: 'Комфортна в ночное время' },
    { value: 'light',  label: 'Светлая',  icon: '☀️',  desc: 'Классический светлый вид' },
    { value: 'system', label: 'Системная', icon: '💻', desc: 'Следует настройкам ОС' },
];

const BG_PATTERNS: { value: BgPattern; label: string; icon: string; warn?: boolean }[] = [
    { value: 'none',      label: 'Без фона',  icon: '⬛' },
    { value: 'grid',      label: 'Сетка',     icon: '🔲' },
    { value: 'dots',      label: 'Точки',     icon: '⠿' },
    { value: 'particles', label: 'Частицы',   icon: '✨', warn: true },
];

const DENSITIES: { value: Density; label: string; icon: string; desc: string }[] = [
    { value: 'normal',  label: 'Обычный',    icon: '▣', desc: 'Стандартные отступы' },
    { value: 'compact', label: 'Компактный', icon: '▪', desc: 'Больше контента на экране' },
];

export const AppearanceTab = () => {
    const { userTheme, saveUserTheme, isSaving } = useTheme();
    const [scheme,    setScheme]    = useState<ColorScheme>(userTheme.scheme);
    const [bgPattern, setBgPattern] = useState<BgPattern>(userTheme.bgPattern);
    const [density,   setDensity]   = useState<Density>(userTheme.density);
    const [showParticlesWarn, setShowParticlesWarn] = useState(false);

    const handleBgPattern = (val: BgPattern) => {
        if (val === 'particles' && bgPattern !== 'particles') {
            setShowParticlesWarn(true);
        } else {
            setShowParticlesWarn(false);
            setBgPattern(val);
            previewUserBg(val);
        }
    };

    const confirmParticles = () => {
        setShowParticlesWarn(false);
        setBgPattern('particles');
        previewUserBg('particles');
    };

    const handleSave = () => {
        saveUserTheme({ scheme, bgPattern, density });
    };

    return (
        <div className="profile-glass-card fade-in">
            <div className="form-header">
                <h1>Внешний вид</h1>
                <p>Персональные настройки — применяются только для вас</p>
            </div>

            {/* Цветовая схема */}
            <div style={{ marginBottom: 32 }}>
                <div className="section-title">🎨 Цветовая схема</div>
                <div className="appearance-options-grid">
                    {SCHEMES.map(s => (
                        <button
                            key={s.value}
                            className={`appearance-option-card ${scheme === s.value ? 'active' : ''}`}
                            onClick={() => setScheme(s.value)}
                        >
                            <span className="appearance-option-icon">{s.icon}</span>
                            <strong>{s.label}</strong>
                            <span className="appearance-option-desc">{s.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Фон */}
            <div style={{ marginBottom: 32 }}>
                <div className="section-title">🖼️ Фон рабочей области</div>
                <div className="appearance-options-grid">
                    {BG_PATTERNS.map(p => (
                        <button
                            key={p.value}
                            className={`appearance-option-card ${bgPattern === p.value ? 'active' : ''}`}
                            onClick={() => handleBgPattern(p.value)}
                        >
                            <span className="appearance-option-icon">{p.icon}</span>
                            <strong>{p.label}</strong>
                            {p.warn && <span style={{ fontSize: 10, color: 'var(--warning)', marginTop: 2 }}>⚠ Нагрузка на CPU</span>}
                        </button>
                    ))}
                </div>

                {/* Предупреждение о частицах */}
                {showParticlesWarn && (
                    <div className="particles-warning">
                        <span>⚠️</span>
                        <div>
                            <strong>Анимированные частицы</strong> могут увеличить нагрузку на CPU и батарею на слабых устройствах.
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button className="btn btn-primary" style={{ padding: '6px 14px' }} onClick={confirmParticles}>Включить</button>
                            <button className="btn btn-ghost"   style={{ padding: '6px 14px' }} onClick={() => setShowParticlesWarn(false)}>Отмена</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Плотность */}
            <div style={{ marginBottom: 32 }}>
                <div className="section-title">📐 Плотность интерфейса</div>
                <div className="appearance-options-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {DENSITIES.map(d => (
                        <button
                            key={d.value}
                            className={`appearance-option-card ${density === d.value ? 'active' : ''}`}
                            onClick={() => setDensity(d.value)}
                        >
                            <span className="appearance-option-icon" style={{ fontSize: 24 }}>{d.icon}</span>
                            <strong>{d.label}</strong>
                            <span className="appearance-option-desc">{d.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-footer">
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ padding: '14px 32px' }}>
                    {isSaving ? 'Сохранение...' : 'Применить'}
                </button>
            </div>
        </div>
    );
};

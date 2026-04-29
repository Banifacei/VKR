import { useState } from 'react';
import { useTheme, previewUserBg, previewBgExtras, previewScheme, previewDensity, type ColorScheme, type BgPattern, type Density } from '../../context/ThemeContext';
import { Icons } from '../Icons';

const SCHEMES: { value: ColorScheme; label: string; icon: string; desc: string }[] = [
    { value: 'dark',   label: 'Тёмная',     icon: '🌑', desc: 'Комфортна в ночное время' },
    { value: 'light',  label: 'Светлая',    icon: '☀️',  desc: 'Классический светлый вид' },
    { value: 'system', label: 'Системная',  icon: '💻', desc: 'Следует настройкам ОС' },
    { value: 'time',   label: 'По времени', icon: '🕐', desc: '7:00–20:00 светлая, ночью тёмная' },
];

const BG_PATTERNS: { value: BgPattern; label: string; icon: string; warn?: boolean }[] = [
    { value: 'off',       label: 'Без фона',   icon: '⬛' },
    { value: 'grid',      label: 'Сетка',       icon: '🔲' },
    { value: 'dots',      label: 'Точки',       icon: '⠿' },
    { value: 'cross',     label: 'Решётка+',    icon: '✛' },
    { value: 'diagonal',  label: 'Диагональ',   icon: '╱' },
    { value: 'particles', label: 'Частицы',     icon: '✨', warn: true },
];

const DENSITIES: { value: Density; label: string; icon: string; desc: string }[] = [
    { value: 'normal',  label: 'Обычный',    icon: '▣', desc: 'Стандартные отступы' },
    { value: 'compact', label: 'Компактный', icon: '▪', desc: 'Больше контента на экране' },
];

const SCHEME_LABELS:  Record<ColorScheme, string> = { dark: '🌑 Тёмная', light: '☀️ Светлая', system: '💻 Системная', time: '🕐 По времени' };
const DENSITY_LABELS: Record<Density, string>     = { normal: '▣ Обычный', compact: '▪ Компактный' };
const BG_LABELS:      Record<string, string>      = { off: '⬛ Без фона', grid: '🔲 Сетка', dots: '⠿ Точки', cross: '✛ Решётка+', diagonal: '╱ Диагональ', particles: '✨ Частицы', none: '🔄 Как у платформы' };

const HAS_SIZE  = new Set<BgPattern>(['grid', 'dots', 'cross', 'diagonal', 'particles']);
const HAS_SPEED = new Set<BgPattern>(['particles']);

export const AppearanceTab = () => {
    const { userTheme, globalTheme, saveUserTheme, isSaving } = useTheme();

    const [followPlatform, setFollowPlatform] = useState<boolean>(userTheme.followPlatform ?? true);
    const [scheme,    setScheme]    = useState<ColorScheme>(userTheme.scheme);
    const [bgPattern, setBgPattern] = useState<BgPattern>(
        // если был 'none' и пользователь открыл кастом — дефолтим на 'off'
        userTheme.bgPattern === 'none' ? 'off' : userTheme.bgPattern
    );
    const [density,   setDensity]   = useState<Density>(userTheme.density);
    const [bgScale,   setBgScale]   = useState<number>(userTheme.bgScale ?? 1);
    const [bgSpeed,   setBgSpeed]   = useState<number>(userTheme.bgSpeed ?? 30);
    const [showParticlesWarn, setShowParticlesWarn] = useState(false);

    const handleFollowToggle = (on: boolean) => {
        setFollowPlatform(on);
        if (on) {
            // Немедленно показываем платформенные настройки
            previewScheme(globalTheme.default_scheme);
            previewDensity(globalTheme.default_density);
            previewUserBg('none');
        } else {
            // Показываем персональные
            previewScheme(scheme);
            previewDensity(density);
            previewUserBg(bgPattern);
        }
    };

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

    const handleScaleChange = (v: number) => { setBgScale(v); previewBgExtras(v, bgSpeed); };
    const handleSpeedChange = (v: number) => { setBgSpeed(v); previewBgExtras(bgScale, v); };

    const handleSave = () => {
        saveUserTheme({
            followPlatform,
            scheme,
            bgPattern: followPlatform ? 'none' : bgPattern,
            density,
            bgScale,
            bgSpeed,
        });
    };

    return (
        <div className="profile-glass-card fade-in">
            <div className="form-header">
                <h1>Внешний вид</h1>
                <p>Персональные настройки — применяются только для вас</p>
            </div>

            {/* Единый тумблер "Следовать платформе" */}
            <div className="follow-platform-banner">
                <div className="follow-platform-info">
                    <span className="follow-platform-icon"><Icons.LinkIcon size={22}/></span>
                    <div>
                        <div className="follow-platform-title">Следовать настройкам платформы</div>
                        <div className="follow-platform-desc">
                            Тема, плотность и фон меняются автоматически, когда администратор обновляет брендинг
                        </div>
                    </div>
                </div>
                <button
                    className={`platform-toggle ${followPlatform ? 'on' : ''}`}
                    onClick={() => handleFollowToggle(!followPlatform)}
                >
                    <span className="platform-toggle-track">
                        <span className="platform-toggle-thumb" />
                    </span>
                </button>
            </div>

            {/* Если followPlatform — показываем текущие значения платформы */}
            {followPlatform ? (
                <div className="follow-platform-summary">
                    <div className="follow-platform-row">
                        <span className="fpr-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Palette size={14}/> Цветовая схема</span>
                        <span className="fpr-value">{SCHEME_LABELS[globalTheme.default_scheme]}</span>
                    </div>
                    <div className="follow-platform-row">
                        <span className="fpr-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Image size={14}/> Фон</span>
                        <span className="fpr-value">{BG_LABELS[globalTheme.platform_bg_pattern] ?? globalTheme.platform_bg_pattern}</span>
                    </div>
                    <div className="follow-platform-row">
                        <span className="fpr-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Layers size={14}/> Плотность</span>
                        <span className="fpr-value">{DENSITY_LABELS[globalTheme.default_density]}</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Цветовая схема */}
                    <div style={{ marginBottom: 32 }}>
                        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Palette size={16}/> Цветовая схема</div>
                        <div className="appearance-options-grid">
                            {SCHEMES.map(s => (
                                <button
                                    key={s.value}
                                    className={`appearance-option-card ${scheme === s.value ? 'active' : ''}`}
                                    onClick={() => { setScheme(s.value); previewScheme(s.value); }}
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
                        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Image size={16}/> Фон рабочей области</div>
                        <div className="appearance-options-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            {BG_PATTERNS.map(p => (
                                <button
                                    key={p.value}
                                    className={`appearance-option-card ${bgPattern === p.value ? 'active' : ''}`}
                                    onClick={() => handleBgPattern(p.value)}
                                >
                                    <span className="appearance-option-icon">{p.icon}</span>
                                    <strong>{p.label}</strong>
                                    {p.warn && <span style={{ fontSize: 10, color: 'var(--warning)', marginTop: 2 }}>⚠ CPU</span>}
                                </button>
                            ))}
                        </div>

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

                        {HAS_SIZE.has(bgPattern) && (
                            <div style={{ marginTop: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                    <span>Размер / плотность</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{bgScale.toFixed(1)}×</span>
                                </div>
                                <input
                                    type="range" min="0.4" max="3" step="0.1" value={bgScale}
                                    onChange={e => handleScaleChange(parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    <span>Мелкий</span><span>Крупный</span>
                                </div>
                            </div>
                        )}

                        {HAS_SPEED.has(bgPattern) && (
                            <div style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                    <span>Скорость анимации</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                        {bgSpeed < 15 ? '⚡ Быстро' : bgSpeed > 45 ? '🐌 Медленно' : '✨ Плавно'} ({bgSpeed}s)
                                    </span>
                                </div>
                                <input
                                    type="range" min="5" max="60" step="1" value={bgSpeed}
                                    onChange={e => handleSpeedChange(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    <span>Быстро (5s)</span><span>Медленно (60s)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Плотность */}
                    <div style={{ marginBottom: 32 }}>
                        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Layers size={16}/> Плотность интерфейса</div>
                        <div className="appearance-options-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            {DENSITIES.map(d => (
                                <button
                                    key={d.value}
                                    className={`appearance-option-card ${density === d.value ? 'active' : ''}`}
                                    onClick={() => { setDensity(d.value); previewDensity(d.value); }}
                                >
                                    <span className="appearance-option-icon" style={{ fontSize: 24 }}>{d.icon}</span>
                                    <strong>{d.label}</strong>
                                    <span className="appearance-option-desc">{d.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="form-footer">
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ padding: '14px 32px' }}>
                    {isSaving ? 'Сохранение...' : 'Применить'}
                </button>
            </div>
        </div>
    );
};

import { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';

interface DateTimePickerProps {
    value: string | null;
    onChange: (val: string | null) => void;
}

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function getCalendarDays(year: number, month: number): (Date | null)[] {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    let startDow = first.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0
    const days: (Date | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
}

function formatDisplay(iso: string | null): string {
    if (!iso) return 'Не задано';
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const DateTimePicker = ({ value, onChange }: DateTimePickerProps) => {
    const now     = value ? new Date(value) : new Date();
    const [open, setOpen]         = useState(false);
    const [viewYear,  setViewYear]  = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selDate,   setSelDate]   = useState<Date | null>(value ? new Date(value) : null);
    const [hour,   setHour]   = useState(value ? new Date(value).getHours()   : 12);
    const [minute, setMinute] = useState(value ? new Date(value).getMinutes() : 0);
    const wrapRef = useRef<HTMLDivElement>(null);

    // sync external value → local state
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            setSelDate(d);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
            setHour(d.getHours());
            setMinute(d.getMinutes());
        } else {
            setSelDate(null);
        }
    }, [value]);

    // close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const isSameDay = (a: Date, b: Date) =>
        a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

    const isToday = (d: Date) => isSameDay(d, new Date());
    const isPast  = (d: Date) => {
        const today = new Date(); today.setHours(0,0,0,0);
        return d < today;
    };

    const handleConfirm = () => {
        if (!selDate) return;
        const result = new Date(selDate);
        result.setHours(hour, minute, 0, 0);
        onChange(result.toISOString());
        setOpen(false);
    };

    const handleClear = () => {
        setSelDate(null);
        onChange(null);
        setOpen(false);
    };

    const clampHour   = (v: number) => Math.min(23, Math.max(0, v));
    const clampMinute = (v: number) => Math.min(59, Math.max(0, v));

    const days = getCalendarDays(viewYear, viewMonth);

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            {/* ── Trigger ── */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 14px', borderRadius: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${open ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer', transition: 'border-color 0.2s',
                    color: value ? '#fff' : '#555', fontSize: '14px', userSelect: 'none',
                }}
            >
                <Icons.Time size={15} color={value ? 'var(--primary)' : '#555'} />
                <span style={{ flex: 1 }}>{formatDisplay(value)}</span>
                {value && (
                    <span
                        onClick={e => { e.stopPropagation(); handleClear(); }}
                        style={{ color: '#555', fontSize: '16px', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}
                        title="Очистить"
                    >×</span>
                )}
            </div>

            {/* ── Dropdown calendar ── */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
                    background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '18px', padding: '20px', width: '290px',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
                    animation: 'fadeIn 0.15s ease',
                }}>
                    {/* Month nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>
                            {MONTHS[viewMonth]} {viewYear}
                        </span>
                        <button onClick={nextMonth} style={navBtnStyle}>›</button>
                    </div>

                    {/* Day-of-week headers */}
                    <div style={gridStyle}>
                        {DAYS.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#555', padding: '3px 0', fontWeight: 600 }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div style={gridStyle}>
                        {days.map((day, i) => {
                            if (!day) return <div key={i} />;
                            const selected = selDate && isSameDay(day, selDate);
                            const today    = isToday(day);
                            const past     = isPast(day);
                            return (
                                <div
                                    key={i}
                                    onClick={() => !past && setSelDate(day)}
                                    style={{
                                        textAlign: 'center', padding: '7px 2px', borderRadius: '9px',
                                        fontSize: '13px', fontWeight: today ? 700 : 400,
                                        cursor: past ? 'default' : 'pointer',
                                        color: selected ? '#fff'
                                             : past    ? '#333'
                                             : today   ? 'var(--primary)'
                                             : '#ccc',
                                        background: selected ? 'var(--primary)' : 'transparent',
                                        boxShadow: selected ? '0 4px 12px rgba(var(--primary-rgb),0.4)' : 'none',
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!selected && !past) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; }}
                                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                >
                                    {day.getDate()}
                                </div>
                            );
                        })}
                    </div>

                    {/* Time picker */}
                    <div style={{ marginTop: '18px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '12px', color: '#666', marginRight: '4px' }}>Время</label>
                        <input
                            type="number" min={0} max={23} value={hour}
                            onChange={e => setHour(clampHour(Number(e.target.value)))}
                            style={timeInputStyle}
                        />
                        <span style={{ color: '#fff', fontSize: '20px', fontWeight: 700, lineHeight: 1 }}>:</span>
                        <input
                            type="number" min={0} max={59} value={String(minute).padStart(2, '0')}
                            onChange={e => setMinute(clampMinute(Number(e.target.value)))}
                            style={timeInputStyle}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <button onClick={handleClear} style={clearBtnStyle}>
                            Очистить
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selDate}
                            style={{
                                ...confirmBtnStyle,
                                background: selDate ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: selDate ? '#fff' : '#444',
                                cursor: selDate ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Подтвердить
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Shared styles ──────────────────────────────────────────────────────────────
const gridStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px',
};

const navBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '18px',
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
};

const timeInputStyle: React.CSSProperties = {
    width: '52px', textAlign: 'center', padding: '8px 4px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff', fontSize: '18px', fontWeight: 600,
    MozAppearance: 'textfield',
};

const clearBtnStyle: React.CSSProperties = {
    flex: 1, padding: '10px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#888', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
};

const confirmBtnStyle: React.CSSProperties = {
    flex: 2, padding: '10px', borderRadius: '10px',
    border: 'none', fontSize: '13px', fontWeight: 600, transition: 'background 0.2s',
};

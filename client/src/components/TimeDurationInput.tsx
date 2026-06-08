import './TimeDurationInput.css';

interface Props {
    value: number | null;          // total seconds (null = no limit)
    onChange: (seconds: number | null) => void;
    label?: string;
    showSeconds?: boolean;         // false = HH:MM mode (for tests in minutes)
}

function toHMS(totalSeconds: number): [number, number, number] {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s];
}

export function TimeDurationInput({ value, onChange, label, showSeconds = true }: Props) {
    const total = value ?? 0;
    const [h, m, s] = toHMS(total);

    const emit = (newH: number, newM: number, newS: number) => {
        const t = Math.max(0, newH) * 3600 + Math.max(0, newM) * 60 + (showSeconds ? Math.max(0, newS) : 0);
        onChange(t === 0 ? null : t);
    };

    const unitInput = (val: number, max: number, unit: string, cb: (v: number) => void) => (
        <div className="tdi-unit">
            <button className="tdi-arrow" tabIndex={-1} onClick={() => cb(Math.min(val + 1, max))}>▲</button>
            <input
                className="tdi-num"
                type="number"
                min={0}
                max={max}
                value={String(val).padStart(2, '0')}
                onChange={e => {
                    const v = Math.min(Math.max(0, parseInt(e.target.value) || 0), max);
                    cb(v);
                }}
            />
            <button className="tdi-arrow" tabIndex={-1} onClick={() => cb(Math.max(val - 1, 0))}>▼</button>
            <span className="tdi-label">{unit}</span>
        </div>
    );

    return (
        <div className="tdi-wrap">
            {label && <div className="tdi-heading">{label}</div>}
            <div className="tdi-row">
                {unitInput(h, 23, 'ч', v => emit(v, m, s))}
                <span className="tdi-sep">:</span>
                {unitInput(m, 59, 'мин', v => emit(h, v, s))}
                {showSeconds && <>
                    <span className="tdi-sep">:</span>
                    {unitInput(s, 59, 'сек', v => emit(h, m, v))}
                </>}
                {value !== null && value > 0 && (
                    <button className="tdi-clear" onClick={() => onChange(null)} title="Снять лимит">✕</button>
                )}
            </div>
            {value !== null && value > 0 && (
                <div className="tdi-preview">
                    {h > 0 && `${h} ч `}{m > 0 && `${m} мин `}{showSeconds && s > 0 && `${s} сек`}
                    {!showSeconds && ` = ${Math.round(value / 60)} мин`}
                </div>
            )}
        </div>
    );
}

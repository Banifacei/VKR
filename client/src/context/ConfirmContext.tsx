import { createContext, useContext, useRef, useState } from 'react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
    resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<ConfirmState | null>(null);
    const resolveRef = useRef<((v: boolean) => void) | null>(null);

    const confirm = (opts: ConfirmOptions): Promise<boolean> =>
        new Promise(resolve => {
            resolveRef.current = resolve;
            setState({ ...opts, resolve });
        });

    const handle = (value: boolean) => {
        resolveRef.current?.(value);
        setState(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '16px', animation: 'fadeIn 0.15s ease',
                    }}
                    onClick={() => handle(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '20px',
                            padding: '32px 28px',
                            maxWidth: '420px', width: '100%',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                            animation: 'slideUp 0.2s ease',
                        }}
                    >
                        {/* Иконка */}
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '14px', marginBottom: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                            background: state.danger
                                ? 'rgba(255,77,77,0.15)'
                                : 'rgba(var(--primary-rgb),0.15)',
                            border: state.danger
                                ? '1px solid rgba(255,77,77,0.3)'
                                : '1px solid rgba(var(--primary-rgb),0.3)',
                        }}>
                            {state.danger ? '🗑' : '❓'}
                        </div>

                        {state.title && (
                            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>
                                {state.title}
                            </h3>
                        )}

                        <p style={{ margin: '0 0 28px', fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            {state.message}
                        </p>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => handle(false)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)', color: 'var(--text-muted)',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                            >
                                {state.cancelText ?? 'Отмена'}
                            </button>
                            <button
                                onClick={() => handle(true)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                    background: state.danger
                                        ? 'linear-gradient(135deg,#ff4d4d,#cc0000)'
                                        : 'linear-gradient(135deg,var(--primary),var(--primary-hover))',
                                    color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: state.danger
                                        ? '0 4px 15px rgba(255,77,77,0.35)'
                                        : '0 4px 15px rgba(var(--primary-rgb),0.35)',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                {state.confirmText ?? 'Подтвердить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

import { useEffect } from 'react';
import { Icons } from './Icons';

export const PreviewBar = () => {
    const handleClose = () => {
        window.location.href = '/adminpanel';
    };

    // Предотвращаем скролл body при наличии бара (чуть сдвигаем контент)
    useEffect(() => {
        document.documentElement.style.setProperty('--preview-bar-height', '44px');
        return () => { document.documentElement.style.removeProperty('--preview-bar-height'); };
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            height: 44,
            background: 'linear-gradient(90deg, var(--primary-hover), var(--primary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <span>
                <Icons.Eye size={14}/> Режим предпросмотра — вид студента
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ opacity: 0.8, fontWeight: 400, fontSize: 12 }}>
                    Отображает страницу глазами студента (без инструментов преподавателя)
                </span>
                <button
                    onClick={handleClose}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: 8,
                        color: '#fff',
                        padding: '4px 14px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 12,
                    }}
                >
                    Закрыть предпросмотр ✕
                </button>
            </span>
        </div>
    );
};

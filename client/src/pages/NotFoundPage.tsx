import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const NotFoundPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-main)', color: 'var(--text-main)',
            padding: '24px', textAlign: 'center',
        }}>
            {/* Глитч-число */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{
                    fontSize: 'clamp(100px, 20vw, 180px)', fontWeight: '900', lineHeight: 1,
                    background: 'linear-gradient(135deg, #7c3aed, #b5179e)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    userSelect: 'none',
                }}>404</div>
                <div style={{
                    position: 'absolute', inset: 0,
                    fontSize: 'clamp(100px, 20vw, 180px)', fontWeight: '900', lineHeight: 1,
                    color: 'rgba(181,23,158,0.08)', transform: 'translate(4px, 4px)',
                    userSelect: 'none',
                }}>404</div>
            </div>

            <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '700', margin: '0 0 12px' }}>
                Страница не найдена
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '380px', lineHeight: 1.6, margin: '0 0 36px' }}>
                Возможно, ссылка устарела или была удалена. Проверьте адрес или вернитесь назад.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '12px 28px', borderRadius: '14px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                        background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                    ← Назад
                </button>
                <button
                    onClick={() => navigate(isAuthenticated ? '/' : '/auth')}
                    style={{
                        padding: '12px 28px', borderRadius: '14px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #7c3aed, #b5179e)', border: 'none', color: '#fff',
                        boxShadow: '0 4px 20px rgba(124,58,237,0.35)', transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    {isAuthenticated ? 'На главную' : 'Войти'}
                </button>
            </div>

            {/* Декоративные шарики */}
            <div style={{ position: 'fixed', top: '15%', left: '8%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '20%', right: '10%', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,23,158,0.1), transparent 70%)', pointerEvents: 'none' }} />
        </div>
    );
};

import { Icons } from './Icons';

interface Props {
    reason: string | null;
    onClose: () => void; // выход из аккаунта
}

export const BannedModal = ({ reason, onClose }: Props) => (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
    }}>
        <div style={{
            background: 'var(--bg-panel)', border: '1px solid #ff4444',
            borderRadius: 16, padding: '32px 28px', maxWidth: 440, width: '100%',
            textAlign: 'center',
        }}>
            <div style={{ marginBottom: 12, color: '#ff4444', display: 'flex', justifyContent: 'center' }}><Icons.Shield size={44}/></div>
            <h2 style={{ color: '#ff4444', margin: '0 0 8px', fontSize: 20 }}>
                Аккаунт заблокирован
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>
                Ваш аккаунт был заблокирован администратором платформы.
            </p>

            {reason && (
                <div style={{
                    background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 24, textAlign: 'left',
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Причина
                    </p>
                    <p style={{ color: 'var(--text-main)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                        {reason}
                    </p>
                </div>
            )}

            {!reason && (
                <div style={{ marginBottom: 24 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Причина не указана.</p>
                </div>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
                Если вы считаете, что это ошибка — обратитесь к администратору.
            </p>

            <button
                className="btn btn-primary"
                style={{ width: '100%', background: '#ff4444', borderColor: '#ff4444' }}
                onClick={onClose}
            >
                Выйти из аккаунта
            </button>
        </div>
    </div>
);

import { useEffect, useState } from 'react';
import { Icons } from './Icons';

export const DemoRestrictedModal = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = () => setVisible(true);
        window.addEventListener('demo-restricted', handler);
        return () => window.removeEventListener('demo-restricted', handler);
    }, []);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}>
            <div style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '32px 28px', maxWidth: 420, width: '100%',
                textAlign: 'center',
            }}>
                <div style={{ marginBottom: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'center' }}>
                    <Icons.Star size={44} />
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Демо-режим</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
                    В демо-режиме это действие недоступно.<br />
                    Хотите получить полный доступ к Lumeo?
                </p>
                <a
                    href="mailto:support@lumeo.su"
                    className="btn btn-primary"
                    style={{ display: 'block', width: '100%', marginBottom: 10 }}
                >
                    Написать нам — support@lumeo.su
                </a>
                <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => setVisible(false)}
                >
                    Закрыть
                </button>
            </div>
        </div>
    );
};

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[Lumeo] Неожиданная ошибка:', error, info.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: '#0a0a0a',
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif',
                    padding: '40px',
                    textAlign: 'center',
                }}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                        Что-то пошло не так
                    </h1>
                    <p style={{ color: '#888', maxWidth: '420px', lineHeight: 1.6, marginBottom: '32px', fontSize: '14px' }}>
                        Произошла непредвиденная ошибка. Попробуйте вернуться на главную страницу.
                        Если проблема повторяется — обратитесь к администратору.
                    </p>
                    <button
                        onClick={this.handleReload}
                        style={{
                            background: 'var(--primary, #00aeef)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '12px 28px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Вернуться на главную
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

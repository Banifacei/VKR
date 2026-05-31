import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

interface HomeworkStatus {
    hasCourse: boolean;
    hasVideo: boolean;
    hasTest: boolean;
}

export const HomeworkCard = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<HomeworkStatus>({ hasCourse: false, hasVideo: false, hasTest: false });
    const [loading, setLoading] = useState(true);
    const [showCongrats, setShowCongrats] = useState(false);

    const isTeacherOrAdmin = user && ['teacher', 'admin'].includes(user.role);

    useEffect(() => {
        if (!isTeacherOrAdmin || user?.homeworkDismissed) return;
        api.get('/homework/status').then(r => {
            setStatus(r.data);
            setLoading(false);
            if (r.data.hasCourse && r.data.hasVideo && r.data.hasTest) {
                setShowCongrats(true);
            }
        }).catch(() => setLoading(false));
    }, []);

    const dismiss = async () => {
        await api.patch('/auth/homework/dismiss').catch(() => {});
        updateUser({ homeworkDismissed: true });
    };

    const deleteDemoCourse = async () => {
        await api.delete('/homework/demo-course').catch(() => {});
        await api.patch('/auth/homework/dismiss').catch(() => {});
        updateUser({ homeworkDismissed: true });
    };

    if (!isTeacherOrAdmin || user?.homeworkDismissed || loading) return null;

    const steps = [
        { key: 'hasCourse', label: 'Создать курс', done: status.hasCourse, action: () => {} },
        { key: 'hasVideo',  label: 'Добавить видео-урок', done: status.hasVideo, action: () => {} },
        { key: 'hasTest',   label: 'Добавить тест к уроку', done: status.hasTest, action: () => {} },
    ];
    const doneCount = steps.filter(s => s.done).length;
    const progress = Math.round((doneCount / steps.length) * 100);

    if (showCongrats) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(34,197,94,0.08))',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}>
                <div style={{ fontSize: '32px', textAlign: 'center' }}>🎉</div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '17px', color: 'var(--text-main)' }}>
                    Отлично! Вы создали первый курс
                </div>
                <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Хотите удалить учебный курс или оставить его как пример для студентов?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '4px' }}>
                    <button
                        onClick={deleteDemoCourse}
                        style={{
                            padding: '9px 20px', borderRadius: '10px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Удалить
                    </button>
                    <button
                        onClick={dismiss}
                        style={{
                            padding: '9px 20px', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                            color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(108,99,255,0.3)',
                        }}
                    >
                        Оставить как пример
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid rgba(108,99,255,0.25)',
            borderRadius: '16px',
            padding: '20px 22px',
            marginBottom: '24px',
            position: 'relative',
        }}>
            {/* Закрыть */}
            <button
                onClick={dismiss}
                style={{
                    position: 'absolute', top: '14px', right: '14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1,
                    padding: '2px 6px', borderRadius: '6px',
                }}
                title="Пропустить"
            >
                ×
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>
                    📚
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>
                        Домашнее задание
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                        Создайте свой первый курс — добавьте видео-урок и тест к нему.
                        Это поможет разобраться с платформой.
                    </div>

                    {/* Прогресс-бар */}
                    <div style={{
                        height: '4px', background: 'var(--border-color)', borderRadius: '2px',
                        marginBottom: '14px', overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', width: `${progress}%`,
                            background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                            borderRadius: '2px', transition: 'width 0.4s ease',
                        }} />
                    </div>

                    {/* Шаги */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {steps.map(s => (
                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: s.done ? 'rgba(34,197,94,0.15)' : 'var(--bg-card)',
                                    border: `1px solid ${s.done ? 'rgba(34,197,94,0.4)' : 'var(--border-color)'}`,
                                    fontSize: '11px',
                                    color: s.done ? '#22c55e' : 'var(--text-muted)',
                                    transition: 'all 0.3s',
                                }}>
                                    {s.done ? '✓' : ''}
                                </div>
                                <span style={{
                                    fontSize: '13px',
                                    color: s.done ? 'var(--text-muted)' : 'var(--text-main)',
                                    textDecoration: s.done ? 'line-through' : 'none',
                                    transition: 'all 0.3s',
                                }}>
                                    {s.label}
                                </span>
                                {!s.done && s.key === 'hasCourse' && (
                                    <button
                                        onClick={() => navigate('/')}
                                        style={{
                                            marginLeft: 'auto', padding: '3px 10px', borderRadius: '6px',
                                            border: '1px solid rgba(108,99,255,0.3)',
                                            background: 'rgba(108,99,255,0.1)',
                                            color: 'var(--primary)', fontSize: '11px',
                                            fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >
                                        Создать →
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

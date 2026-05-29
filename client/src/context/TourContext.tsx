import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from './AuthContext';

export interface TourStep {
    target: string;       // CSS-селектор или data-tour атрибут
    title: string;
    content: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextType {
    startTour: (steps: TourStep[]) => void;
    endTour: () => void;
    isActive: boolean;
}

const TourContext = createContext<TourContextType>({
    startTour: () => {},
    endTour: () => {},
    isActive: false,
});

export const useTour = () => useContext(TourContext);

const STUDENT_STEPS: TourStep[] = [
    {
        target: '[data-tour="courses-list"]',
        title: 'Ваши курсы',
        content: 'Здесь отображаются все доступные вам курсы. Нажмите на карточку чтобы начать обучение.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="video-player"]',
        title: 'Видео-урок',
        content: 'Смотрите лекции в удобном плеере. Можно ставить закладки в любой момент видео.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="test-block"]',
        title: 'Тесты',
        content: 'После просмотра урока пройдите тест для закрепления знаний.',
        placement: 'top',
    },
];

const TEACHER_STEPS: TourStep[] = [
    {
        target: '[data-tour="courses-list"]',
        title: 'Ваши курсы',
        content: 'Здесь ваши курсы. Нажмите «Создать курс» чтобы добавить первый.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="create-course-btn"]',
        title: 'Создание курса',
        content: 'Нажмите эту кнопку чтобы создать новый курс — добавьте название, описание и обложку.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="add-video-btn"]',
        title: 'Добавление уроков',
        content: 'Загружайте видео-уроки в курс. Поддерживаются файлы до 5 ГБ — мы сами перекодируем.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="add-test-btn"]',
        title: 'Тесты к уроку',
        content: 'К каждому видео можно прикрепить тест с вопросами и вариантами ответов.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="analytics-link"]',
        title: 'Аналитика',
        content: 'Отслеживайте прогресс студентов, результаты тестов и активность в разделе Аналитика.',
        placement: 'right',
    },
];

const ADMIN_STEPS: TourStep[] = [
    ...TEACHER_STEPS,
    {
        target: '[data-tour="admin-link"]',
        title: 'Панель администратора',
        content: 'Управляйте пользователями, настройками платформы, темой и интеграциями.',
        placement: 'right',
    },
    {
        target: '[data-tour="notification-bell"]',
        title: 'Уведомления',
        content: 'Здесь вы будете получать системные события и напоминания.',
        placement: 'bottom',
    },
];

export const getTourStepsByRole = (role: string): TourStep[] => {
    if (role === 'admin') return ADMIN_STEPS;
    if (role === 'teacher') return TEACHER_STEPS;
    return STUDENT_STEPS;
};

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
    const { updateUser } = useAuth();
    const [steps, setSteps] = useState<TourStep[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [highlight, setHighlight] = useState<DOMRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
    const [, setPlacement] = useState<TourStep['placement']>('bottom');
    const rafRef = useRef<number>(0);

    const getElement = useCallback((target: string): Element | null => {
        if (target.startsWith('[data-tour')) {
            const attr = target.match(/data-tour="([^"]+)"/)?.[1];
            return attr ? document.querySelector(`[data-tour="${attr}"]`) : null;
        }
        return document.querySelector(target);
    }, []);

    const computePosition = useCallback((el: Element, p: TourStep['placement'] = 'bottom') => {
        const rect = el.getBoundingClientRect();
        const TOOLTIP_W = 320;
        const TOOLTIP_H = 160;
        const GAP = 16;
        const ARROW = 10;

        setHighlight(rect);

        let top = 0, left = 0;
        let arrowTop: string | undefined, arrowLeft: string | undefined;
        let arrowTransform = '';
        let resolvedPlacement = p;

        if (p === 'bottom') {
            top = rect.bottom + GAP;
            left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
            arrowTop = `-${ARROW}px`;
            arrowLeft = '50%';
            arrowTransform = 'translateX(-50%) rotate(180deg)';
            if (top + TOOLTIP_H > window.innerHeight - 20) {
                resolvedPlacement = 'top';
            }
        }
        if (p === 'top' || resolvedPlacement === 'top') {
            top = rect.top - TOOLTIP_H - GAP - ARROW;
            left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
            arrowTop = `${TOOLTIP_H}px`;
            arrowLeft = '50%';
            arrowTransform = 'translateX(-50%)';
        }
        if (p === 'right') {
            top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
            left = rect.right + GAP;
            arrowTop = '50%';
            arrowLeft = `-${ARROW}px`;
            arrowTransform = 'translateY(-50%) rotate(90deg)';
        }
        if (p === 'left') {
            top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
            left = rect.left - TOOLTIP_W - GAP - ARROW;
            arrowTop = '50%';
            arrowLeft = `${TOOLTIP_W}px`;
            arrowTransform = 'translateY(-50%) rotate(-90deg)';
        }

        left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_W - 12));
        top  = Math.max(12, Math.min(top,  window.innerHeight - TOOLTIP_H - 12));

        setTooltipStyle({ top, left, width: TOOLTIP_W });
        setArrowStyle({ top: arrowTop, left: arrowLeft, transform: arrowTransform });
        setPlacement(resolvedPlacement);
    }, []);

    const goTo = useCallback((index: number, stepList: TourStep[]) => {
        const step = stepList[index];
        if (!step) return;
        const el = getElement(step.target);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => computePosition(el, step.placement), 120);
        } else {
            setHighlight(null);
        }
        setCurrentIndex(index);
    }, [getElement, computePosition]);

    const startTour = useCallback((tourSteps: TourStep[]) => {
        const available = tourSteps.filter(s => !!getElement(s.target));
        if (!available.length) return;
        setSteps(available);
        setIsActive(true);
        setCurrentIndex(0);
        goTo(0, available);
    }, [getElement, goTo]);

    const endTour = useCallback(() => {
        setIsActive(false);
        setSteps([]);
        setHighlight(null);
        cancelAnimationFrame(rafRef.current);
        api.patch('/auth/onboarding').catch(() => {});
        updateUser({ onboardingCompleted: true });
    }, [updateUser]);

    // Следим за позицией элемента при скролле/ресайзе
    useEffect(() => {
        if (!isActive) return;
        const update = () => {
            const step = steps[currentIndex];
            if (!step) return;
            const el = getElement(step.target);
            if (el) computePosition(el, step.placement);
        };
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [isActive, currentIndex, steps, getElement, computePosition]);

    const next = () => {
        if (currentIndex < steps.length - 1) goTo(currentIndex + 1, steps);
        else endTour();
    };
    const prev = () => {
        if (currentIndex > 0) goTo(currentIndex - 1, steps);
    };

    const step = steps[currentIndex];

    return (
        <TourContext.Provider value={{ startTour, endTour, isActive }}>
            {children}

            {isActive && step && (
                <>
                    {/* Затемнение с вырезом под элемент */}
                    <div
                        className="tour-overlay-wrap"
                        style={{
                            position: 'fixed', inset: 0, zIndex: 10000,
                            pointerEvents: 'none',
                        }}
                    >
                        {highlight ? (
                            <svg className="tour-overlay-svg" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                                <defs>
                                    <mask id="tour-mask">
                                        <rect width="100%" height="100%" fill="white" />
                                        <rect
                                            x={highlight.left - 6}
                                            y={highlight.top - 6}
                                            width={highlight.width + 12}
                                            height={highlight.height + 12}
                                            rx="8"
                                            fill="black"
                                        />
                                    </mask>
                                </defs>
                                <rect
                                    className="tour-overlay-fill"
                                    width="100%"
                                    height="100%"
                                    fill="var(--tour-overlay-color, rgba(0,0,0,0.65))"
                                    mask="url(#tour-mask)"
                                />
                                {/* Обводка вокруг элемента */}
                                <rect
                                    x={highlight.left - 6}
                                    y={highlight.top - 6}
                                    width={highlight.width + 12}
                                    height={highlight.height + 12}
                                    rx="8"
                                    fill="none"
                                    stroke="var(--primary, #6c63ff)"
                                    strokeWidth="2"
                                />
                            </svg>
                        ) : (
                            <div className="tour-overlay-dim" style={{ position: 'absolute', inset: 0, background: 'var(--tour-overlay-color, rgba(0,0,0,0.65))' }} />
                        )}
                    </div>

                    {/* Клик на оверлей — закрыть */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 10001, cursor: 'default' }}
                        onClick={endTour}
                    />

                    {/* Тултип */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            zIndex: 10002,
                            ...tooltipStyle,
                            background: 'var(--bg-panel, #1a1a2e)',
                            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                            borderRadius: '16px',
                            padding: '20px 22px 18px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                            animation: 'tourFadeIn 0.2s ease',
                        }}
                    >
                        {/* Стрелка */}
                        <div style={{
                            position: 'absolute',
                            ...arrowStyle,
                            width: 0, height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '10px solid var(--bg-panel, #1a1a2e)',
                            filter: 'drop-shadow(0 -1px 0 var(--border-color, rgba(255,255,255,0.1)))',
                        }} />

                        {/* Прогресс */}
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '14px' }}>
                            {steps.map((_, i) => (
                                <div key={i} style={{
                                    height: '3px', flex: 1, borderRadius: '2px',
                                    background: i <= currentIndex
                                        ? 'var(--primary, #6c63ff)'
                                        : 'var(--border-color, rgba(255,255,255,0.15))',
                                    transition: 'background 0.3s',
                                }} />
                            ))}
                        </div>

                        {/* Заголовок */}
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #fff)', marginBottom: '8px' }}>
                            {step.title}
                        </div>

                        {/* Текст */}
                        <div style={{ fontSize: '13px', color: 'var(--text-muted, rgba(255,255,255,0.6))', lineHeight: 1.6, marginBottom: '18px' }}>
                            {step.content}
                        </div>

                        {/* Кнопки */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <button
                                onClick={endTour}
                                style={{
                                    background: 'none', border: 'none', padding: '6px 0',
                                    color: 'var(--text-muted, rgba(255,255,255,0.4))',
                                    fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                                }}
                            >
                                Пропустить
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {currentIndex > 0 && (
                                    <button onClick={prev} style={{
                                        padding: '8px 16px', borderRadius: '10px',
                                        border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                                        background: 'var(--bg-card, rgba(255,255,255,0.05))',
                                        color: 'var(--text-main, #fff)', fontSize: '13px',
                                        fontWeight: 600, cursor: 'pointer',
                                    }}>
                                        ← Назад
                                    </button>
                                )}
                                <button onClick={next} style={{
                                    padding: '8px 20px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, var(--primary, #6c63ff), var(--primary-hover, #8b85ff))',
                                    color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(108,99,255,0.35)',
                                }}>
                                    {currentIndex === steps.length - 1 ? '🎉 Готово' : 'Далее →'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes tourFadeIn {
                            from { opacity: 0; transform: translateY(6px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </>
            )}
        </TourContext.Provider>
    );
};

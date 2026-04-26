import { useState, useMemo } from 'react';
import { submitTestResult, type ICourseTest } from '../api/testApi';
import { Icons } from './Icons';
import { normalizeUploadUrl } from '../utils/uploadUrl';

interface TestRunnerProps {
    test: ICourseTest;
    onExit: () => void;
    onSuccess?: () => void;
}

export const TestRunner = ({ test, onExit, onSuccess }: TestRunnerProps) => {
    const [step, setStep] = useState<'start' | 'quiz' | 'result'>('start');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [score, setScore] = useState(0);
    // НОВОЕ: Стейт для хранения детальной проверки с сервера (включая ИИ)
    const [detailedResults, setDetailedResults] = useState<Record<number, any>>({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const rawQuestions = test.questions || [];

    // Перемешиваем вопросы и/или варианты ответов один раз при монтировании
    const questions = useMemo(() => {
        let qs = [...rawQuestions];
        if (test.shuffleQuestions) {
            for (let i = qs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qs[i], qs[j]] = [qs[j], qs[i]];
            }
        }
        if (test.shuffleAnswers) {
            qs = qs.map(q => {
                if (!q.options || q.options.length === 0) return q;
                const opts = [...q.options];
                for (let i = opts.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [opts[i], opts[j]] = [opts[j], opts[i]];
                }
                return { ...q, options: opts };
            });
        }
        return qs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentQ = questions[currentQIndex];

    const handleAnswer = (val: any) => {
        setAnswers({ ...answers, [currentQ.id]: val });
    };

    // НОВОЕ: Хендлер для множественного выбора (multiple_choice)
    const handleMultipleChoice = (optText: string) => {
        const currentArr = answers[currentQ.id] || [];
        if (currentArr.includes(optText)) {
            setAnswers({ ...answers, [currentQ.id]: currentArr.filter((t: string) => t !== optText) });
        } else {
            setAnswers({ ...answers, [currentQ.id]: [...currentArr, optText] });
        }
    };

    const handleNext = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
        } else {
            const unanswered = questions.filter(q => {
                const a = answers[q.id];
                if (q.type === 'multiple_choice') return !a || (Array.isArray(a) && a.length === 0);
                return a === undefined || a === null || a === '';
            });
            if (unanswered.length > 0) {
                const n = unanswered.length;
                const word = n === 1 ? 'вопрос' : n < 5 ? 'вопроса' : 'вопросов';
                if (!confirm(`Вы не ответили на ${n} ${word}. Завершить тест?`)) return;
            }
            finishTest();
        }
    };

    const finishTest = async () => {
        setIsSubmitting(true);
        
        try {
            // Теперь фронтенд не считает баллы сам! Отправляем просто ответы.
            // Бэкенд сам всё проверит и вернет правильный score и detailedAnswers.
            const res = await submitTestResult(test.id, 0, answers);
            
            setScore(res.score); // Берем балл с сервера
            if (res.detailedAnswers) {
                setDetailedResults(res.detailedAnswers); // Берем ИИ-разбор с сервера
            }

            if (onSuccess) {
                onSuccess();
            }
        } catch (e) {
            console.error('Ошибка сохранения результата', e);
        } finally {
            setIsSubmitting(false);
            setStep('result');
        }
    };

    const attemptsUsed = test.attemptsUsed || 0;
    const isExhausted = test.maxAttempts > 0 && attemptsUsed >= test.maxAttempts;

    if (step === 'start') {
        return (
            <div className="runner-container">
                <div className="runner-card center">
                    <div className="runner-icon-big"><Icons.FileText size={40}/></div>
                    <h1>{test.title}</h1>
                    {test.description && <p className="runner-desc">{test.description}</p>}
                    
                    <div className="test-meta-info">
                        <div className="meta-item">
                            <span>Вопросов: </span>
                            <strong>{test.questions?.length || 0}</strong>
                        </div>
                        <div className="meta-item">
                            <span>Проходной балл: </span>
                            <strong>{test.passingScore}%</strong>
                        </div>
                        <div className="meta-item">
                            <span>Попытки: </span>
                            <strong style={{ color: isExhausted ? '#ff4d4d' : 'var(--primary)' }}>
                                {attemptsUsed} / {test.maxAttempts === 0 ? '∞' : test.maxAttempts}
                            </strong>
                        </div>
                    </div>

                    <div className="runner-actions">
                        {isExhausted ? (
                            <div className="exhausted-message" style={{ color: '#ff4d4d', marginBottom: '15px', fontWeight: 'bold' }}>
                                ⚠️ Вы использовали все доступные попытки для этого теста.
                            </div>
                        ) : (
                            <button className="btn btn-primary" onClick={() => setStep('quiz')}>
                                {attemptsUsed > 0 ? 'Попробовать снова' : 'Начать тестирование'}
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={onExit}>Назад к курсу</button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'result') {
        const isPassed = score >= test.passingScore;
        return (
            <div className="runner-container" style={{ padding: '20px 0' }}> 
                <div className="runner-card center" style={{ maxWidth: '600px' }}> 
                    <div style={{fontSize: '60px', marginBottom: '20px'}}>{isPassed ? '🎉' : '😕'}</div>
                    <h2>{isPassed ? 'Тест сдан!' : 'Попробуйте еще раз'}</h2>
                    <div className="score-circle" style={{ borderColor: isPassed ? '#4dff88' : '#ff4d4d' }}>
                        {score}%
                    </div>
                    <p style={{color: 'var(--text-muted)', margin: '20px 0'}}>
                        Необходимый минимум: {test.passingScore}%
                    </p>

                    {/* ВСТАВЛЯЕМ БЛОК РАБОТЫ НАД ОШИБКАМИ ВНУТРЬ RETURN */}
                    {!test.hideResults && Object.keys(detailedResults).length > 0 && (
                        <div className="test-review-section" style={{ marginTop: '30px', textAlign: 'left', width: '100%' }}>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
                                Ваши ответы:
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                {questions.map((q, idx) => {
                                    // НОВОЕ: Берем результаты проверки с бэкенда!
                                    const resData = detailedResults[q.id] || {};
                                    const userAns = resData.answer;
                                    const isCorrect = resData.isCorrect || false;
                                    const displayAns = Array.isArray(userAns) ? userAns.join(', ') : userAns;

                                    return (
                                        <div key={q.id} style={{
                                            background: 'var(--bg-card)',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            borderLeft: `4px solid ${isCorrect ? '#4dff88' : '#ff4d4d'}`,
                                        }}>
                                            <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)' }}>
                                                {idx + 1}. {q.text}
                                                {q.imageUrl && (
                                                    <img src={normalizeUploadUrl(q.imageUrl)} alt="" style={{ display: 'block', marginTop: 6, maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'contain' }} />
                                                )}
                                            </div>
                                            
                                            <div style={{ fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Ваш ответ: </span> 
                                                    {displayAns ? (
                                                        <span style={{ color: isCorrect ? '#4dff88' : '#ff4d4d' }}>{displayAns}</span>
                                                    ) : (
                                                        <i style={{ color: 'var(--text-muted)' }}>Нет ответа</i>
                                                    )}
                                                </div>

                                                {/* НОВОЕ: Показываем оценку ИИ, если она пришла с сервера */}
                                                {resData.similarity !== null && resData.similarity !== undefined && (
                                                    <span style={{ background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                                        ИИ: {resData.similarity}%
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Можно даже показывать правильный ответ, если студент ошибся */}
                                            {!isCorrect && (q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Правильный ответ: </span>
                                                    <span style={{ color: '#4dff88' }}>
                                                        {q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text).join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button className="btn btn-primary" onClick={onExit} style={{ marginTop: '25px' }}>
                        Вернуться к курсу
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="runner-container">
            <div className="runner-card">
                <div className="runner-header">
                    <span>Вопрос {currentQIndex + 1} из {questions.length}</span>
                    <button className="close-btn" onClick={onExit}>✕</button>
                </div>
                
                <div className="progress-bar-mini">
                    <div className="progress-fill" style={{width: `${((currentQIndex + 1) / questions.length) * 100}%`}}></div>
                </div>

                <h3 className="question-text">{currentQ.text}</h3>

                {currentQ.imageUrl && (
                    <div style={{ margin: '10px 0 16px', textAlign: 'center' }}>
                        <img
                            src={normalizeUploadUrl(currentQ.imageUrl)}
                            alt="Иллюстрация к вопросу"
                            style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 10, objectFit: 'contain', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>
                )}

                <div className="options-list">
                    {currentQ.type === 'single_choice' && currentQ.options?.map((opt: any, idx: number) => (
                        <label key={idx} className={`option-label ${answers[currentQ.id] === opt.text ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name={`q-${currentQ.id}`}
                                checked={answers[currentQ.id] === opt.text}
                                onChange={() => handleAnswer(opt.text)}
                            />
                            <span style={{ flex: 1 }}>
                                {opt.text}
                                {opt.imageUrl && (
                                    <img src={normalizeUploadUrl(opt.imageUrl)} alt="" style={{ display: 'block', marginTop: 6, maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'contain' }} />
                                )}
                            </span>
                        </label>
                    ))}

                    {/* ИСПРАВЛЕНО: Чекбоксы теперь работают с массивами */}
                    {currentQ.type === 'multiple_choice' && currentQ.options?.map((opt: any, idx: number) => {
                        const isChecked = (answers[currentQ.id] || []).includes(opt.text);
                        return (
                            <label key={idx} className={`option-label ${isChecked ? 'selected' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleMultipleChoice(opt.text)}
                                />
                                <span style={{ flex: 1 }}>
                                    {opt.text}
                                    {opt.imageUrl && (
                                        <img src={normalizeUploadUrl(opt.imageUrl)} alt="" style={{ display: 'block', marginTop: 6, maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'contain' }} />
                                    )}
                                </span>
                            </label>
                        );
                    })}

                    {currentQ.type === 'free_text' && (
                        <textarea 
                            className="modern-input" 
                            placeholder="Введите ваш ответ (проверяет ИИ)..." 
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => handleAnswer(e.target.value)}
                            style={{minHeight: '120px'}}
                        />
                    )}
                </div>

                <div className="runner-footer">
                    <button 
                        className="btn btn-primary" 
                        style={{width: '100%'}} 
                        onClick={handleNext}
                        disabled={isSubmitting}
                    >
                        {isSubmitting 
                            ? 'Проверка...' 
                            : (currentQIndex === questions.length - 1 ? 'Завершить тест' : 'Следующий вопрос →')}
                    </button>
                </div>
            </div>
        </div>
    );
};
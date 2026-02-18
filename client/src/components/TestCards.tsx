import { useState, useEffect } from 'react';
import './TestCards.css';

interface TestCardsProps {
    events: any[];
    videoId: number;
    userId: number;
    onAllSolved?: () => void;
}

export const TestCards = ({ events, videoId, userId, onAllSolved }: TestCardsProps) => {
    // Оставляем только вопросы (убираем инфо-паузы)
    const questions = events.filter(ev => ev.type !== 'info').sort((a, b) => a.time - b.time);

    // Храним ответы пользователя, которые он вводит прямо сейчас
    const [inputs, setInputs] = useState<Record<number, any>>({});
    
    // Храним результаты проверки (полученные с сервера или посчитанные локально)
    const [results, setResults] = useState<Record<number, { isCorrect: boolean; similarity?: number; answerText?: string }>>({});
    const [loadingId, setLoadingId] = useState<number | null>(null);

    // 1. При загрузке получаем уже решенные вопросы с бэкенда
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const token = localStorage.getItem('lumeo_token');
                const res = await fetch(`http://localhost:5000/api/video/progress/${videoId}/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.sessionResults) {
                        const historyMap: Record<number, any> = {};
                        data.sessionResults.forEach((r: any) => {
                            historyMap[r.eventId] = {
                                isCorrect: r.isCorrect,
                                similarity: r.similarity,
                                answerText: r.answer
                            };
                        });
                        setResults(historyMap);
                    }
                }
            } catch (e) {
                console.error("Ошибка загрузки прогресса тестов", e);
            }
        };
        fetchProgress();
    }, [videoId, userId]);
    useEffect(() => {
        if (questions.length > 0 && Object.keys(results).length === questions.length) {
            const allCorrect = Object.values(results).every(r => r.isCorrect);
            if (allCorrect && onAllSolved) {
                onAllSolved();
            }
        }
    }, [results, questions, onAllSolved]);
    useEffect(() => {
    if (questions.length > 0 && Object.keys(results).length === questions.length) {
        const allCorrect = Object.values(results).every(r => r.isCorrect);
        if (allCorrect) {
            // Если всё решено, можно либо не показывать кнопку в плеере,
            // либо внутри компонента вывести "Все тесты пройдены!"
        }
    }
}, [results, questions]);
    // Обработчик выбора вариантов (Radio и Checkbox)
    const handleOptionChange = (eventId: number, optText: string, isMultiple: boolean) => {
        setInputs(prev => {
            if (!isMultiple) return { ...prev, [eventId]: optText }; // Single Choice
            
            // Multiple Choice
            const current = prev[eventId] || [];
            if (current.includes(optText)) {
                return { ...prev, [eventId]: current.filter((t: string) => t !== optText) };
            } else {
                return { ...prev, [eventId]: [...current, optText] };
            }
        });
    };

    // Обработчик отправки ответа на проверку
    const handleSubmit = async (event: any) => {
        const answer = inputs[event.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) return alert("Введите или выберите ответ!");

        setLoadingId(event.id);
        
        let isCorrect = false;
        let stringAnswer = '';

        // Предварительная локальная проверка для тестов
        if (event.type === 'single_choice') {
            const correctOpt = event.options.find((o: any) => o.isCorrect);
            isCorrect = correctOpt?.text === answer;
            stringAnswer = answer;
        } else if (event.type === 'multiple_choice') {
            const correctOpts = event.options.filter((o: any) => o.isCorrect).map((o: any) => o.text);
            isCorrect = correctOpts.length === answer.length && correctOpts.every((o: string) => answer.includes(o));
            stringAnswer = answer.join(', ');
        } else if (event.type === 'free_text') {
            stringAnswer = answer;
            isCorrect = false; // Бэкенд (ИИ) сам решит, верно или нет
        }

        try {
            const token = localStorage.getItem('lumeo_token');
            const payload = {
                videoId,
                userId,
                results: [{ eventId: event.id, isCorrect, answer: stringAnswer }]
            };

            const res = await fetch(`http://localhost:5000/api/video/progress`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                // Находим обновленный результат в ответе сервера
                const updatedResult = data.sessionResults?.find((r: any) => r.eventId === event.id);
                if (updatedResult) {
                    setResults(prev => ({
                        ...prev,
                        [event.id]: {
                            isCorrect: updatedResult.isCorrect,
                            similarity: updatedResult.similarity,
                            answerText: updatedResult.answer
                        }
                    }));
                }
            }
        } catch (e) {
            console.error("Ошибка отправки ответа", e);
            alert("Ошибка сети");
        } finally {
            setLoadingId(null);
        }
    };

    if (questions.length === 0) return null; // Если вопросов нет — прячем компонент

    return (
        <div className="test-cards-container">
            <h3 className="test-cards-title">Вопросы к уроку ({questions.length})</h3>
            
            <div className="test-cards-list">
                {questions.map((q, idx) => {
                    const result = results[q.id];
                    const isSolved = !!result;

                    return (
                        <div key={q.id} className={`test-card ${isSolved ? (result.isCorrect ? 'success' : 'error') : ''}`}>
                            <div className="test-card-header">
                                <span className="test-card-badge">Вопрос {idx + 1}</span>
                                <span className="test-card-time">Таймкод: {Math.floor(q.time / 60)}:{(Math.floor(q.time % 60)).toString().padStart(2, '0')}</span>
                            </div>
                            
                            <h4 className="test-card-question">{q.question}</h4>

                            {/* ЕСЛИ УЖЕ РЕШЕНО */}
                            {isSolved ? (
                                <div className="test-card-solved-state">
                                    <div className="solved-answer">
                                        <strong>Ваш ответ:</strong> {result.answerText}
                                    </div>
                                    <div className={`solved-status ${result.isCorrect ? 'text-success' : 'text-error'}`}>
                                        {result.isCorrect ? '✅ Верно' : '❌ Неверно'} 
                                        {q.type === 'free_text' && result.similarity !== undefined && (
                                            <span className="similarity-badge">Точность: {result.similarity}%</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* ЕСЛИ ЕЩЕ НЕ РЕШЕНО */
                                <div className="test-card-input-area">
                                    {q.type === 'single_choice' && q.options.map((opt: any, i: number) => (
                                        <label key={i} className="test-option-label radio">
                                            <input 
                                                type="radio" 
                                                name={`q-${q.id}`} 
                                                checked={inputs[q.id] === opt.text}
                                                onChange={() => handleOptionChange(q.id, opt.text, false)}
                                            />
                                            <span>{opt.text}</span>
                                        </label>
                                    ))}

                                    {q.type === 'multiple_choice' && q.options.map((opt: any, i: number) => (
                                        <label key={i} className="test-option-label checkbox">
                                            <input 
                                                type="checkbox" 
                                                checked={inputs[q.id]?.includes(opt.text) || false}
                                                onChange={() => handleOptionChange(q.id, opt.text, true)}
                                            />
                                            <span>{opt.text}</span>
                                        </label>
                                    ))}

                                    {q.type === 'free_text' && (
                                        <textarea 
                                            className="test-textarea" 
                                            placeholder="Введите ваш ответ (проверяет ИИ)..."
                                            value={inputs[q.id] || ''}
                                            onChange={(e) => setInputs(prev => ({...prev, [q.id]: e.target.value}))}
                                        />
                                    )}

                                    <button 
                                        className="btn-submit-test" 
                                        disabled={loadingId === q.id}
                                        onClick={() => handleSubmit(q)}
                                    >
                                        {loadingId === q.id ? 'Проверка...' : 'Ответить'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
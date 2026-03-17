import { useState, useEffect } from 'react';
import { sendAnswer } from '../api/videoApi';
import { Icons } from './Icons';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
interface TestCardsProps {
    events: any[];
    videoId: number;
    userId: number;
    onAllSolved?: () => void;
}

export const TestCards = ({ events, videoId, userId, onAllSolved }: TestCardsProps) => {
    const { showToast } = useToast();
    // Оставляем только вопросы
    const questions = events.filter(ev => ev.type !== 'info').sort((a, b) => a.time - b.time);

    const [inputs, setInputs] = useState<Record<number, any>>({});
    const [results, setResults] = useState<Record<number, { isCorrect: boolean; similarity?: number; answerText?: string }>>({});
    const [loadingId, setLoadingId] = useState<number | null>(null);

    // 1. Загрузка прогресса с бэкенда
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                // api сам подставит порт из .env и токен
                const res = await api.get(`/videos/progress/${videoId}/${userId}`);
                const data = res.data;
                
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
            } catch (error) {
                console.error('Ошибка загрузки прогресса:', error);
            }
        };
        fetchProgress();
    }, [videoId, userId]);

    // 2. ЕДИНСТВЕННЫЙ хук для проверки "Всё ли решено верно?"
    useEffect(() => {
        if (questions.length > 0 && Object.keys(results).length === questions.length) {
            const allCorrect = Object.values(results).every(r => r.isCorrect);
            if (allCorrect && onAllSolved) {
                // Даем задержку в 1.5 секунды, чтобы юзер успел увидеть зеленую галочку на последнем вопросе, 
                // прежде чем карточки свернутся и включится видео
                const timer = setTimeout(() => {
                    onAllSolved();
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [results, questions, onAllSolved]);

    const handleOptionChange = (eventId: number, optText: string, isMultiple: boolean) => {
        setInputs(prev => {
            if (!isMultiple) return { ...prev, [eventId]: optText }; 
            
            const current = prev[eventId] || [];
            if (current.includes(optText)) {
                return { ...prev, [eventId]: current.filter((t: string) => t !== optText) };
            } else {
                return { ...prev, [eventId]: [...current, optText] };
            }
        });
    };

    const handleSubmit = async (q: any) => {
        let answerStr = inputs[q.id] || '';
        if (Array.isArray(answerStr)) {
            answerStr = answerStr.join(', ');
        }
        
        if (!answerStr.trim()) return showToast("Введите или выберите ответ!", "error");

        setLoadingId(q.id);

        try {
            // Вся магия проверки теперь на сервере! 
            const res = await sendAnswer(videoId, q.id, answerStr);
            
            setResults(prev => ({
                ...prev,
                [q.id]: {
                    isCorrect: res.data.isCorrect,
                    similarity: res.data.similarity,
                    answerText: answerStr
                }
            }));
            // Логика onAllSolved отсюда удалена, за ней теперь четко следит useEffect!

        } catch (error) {
            console.error('Ошибка проверки ответа:', error);
            showToast('Не удалось отправить ответ. Попробуйте еще раз.', 'error');
        } finally {
            setLoadingId(null);
        }
    };

    if (questions.length === 0) return null;

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

                            {isSolved ? (
                                <div className="test-card-solved-state">
                                    <div className="solved-answer">
                                        <strong>Ваш ответ:</strong> {result.answerText}
                                    </div>
                                    <div className={`solved-status ${result.isCorrect ? 'text-success' : 'text-error'}`}>
                                        {result.isCorrect ? <><Icons.LogSuccess size={13}/> Верно</> : <><Icons.Fail size={13}/> Неверно</>}
                                        {q.type === 'free_text' && result.similarity !== undefined && result.similarity !== null && (
                                            <span className="similarity-badge">Точность: {result.similarity}%</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
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
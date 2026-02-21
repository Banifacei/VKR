import { useState } from 'react';
import { submitTestResult, type ICourseTest } from '../api/testApi';

interface TestRunnerProps {
    test: ICourseTest;
    onExit: () => void;
}

export const TestRunner = ({ test, onExit }: TestRunnerProps) => {
    const [step, setStep] = useState<'start' | 'quiz' | 'result'>('start');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [score, setScore] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const questions = test.questions || [];
    const currentQ = questions[currentQIndex];

    const handleAnswer = (val: any) => {
        setAnswers({ ...answers, [currentQ.id]: val });
    };

    const handleNext = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
        } else {
            finishTest();
        }
    };

    const finishTest = async () => {
        setIsSubmitting(true);
        
        // 1. Локальный подсчет (для мгновенного отображения)
        let correctCount = 0;
        questions.forEach(q => {
            const userAns = answers[q.id];
            if (!userAns) return;

            if (q.type === 'single_choice' || q.type === 'multiple_choice') {
                const correctOpt = q.options.find((o: any) => o.isCorrect);
                if (userAns === correctOpt?.text) correctCount++;
            } else if (q.type === 'free_text') {
                // В идеале тут должна быть проверка на сервере, но пока так
                if (userAns.trim().length > 0) correctCount++; 
            }
        });

        const calculatedScore = Math.round((correctCount / questions.length) * 100);
        setScore(calculatedScore);

        // 2. Отправка на сервер
        try {
            await submitTestResult(test.id, calculatedScore, answers);
            console.log('Результат сохранен!');
        } catch (e) {
            console.error('Ошибка сохранения результата', e);
            // Можно добавить alert, но лучше просто показать результат локально
        } finally {
            setIsSubmitting(false);
            setStep('result');
        }
    };

    if (step === 'start') {
        return (
            <div className="runner-container">
                <div className="runner-card center">
                    <h1>📝 {test.title}</h1>
                    <p style={{color: '#888', marginBottom: '30px', lineHeight: '1.6'}}>
                        Вопросов: <b>{questions.length}</b><br/>
                        Проходной балл: <b>{test.passingScore}%</b><br/>
                        Попыток: <b>{test.maxAttempts === 0 ? 'Безлимит' : test.maxAttempts}</b>
                    </p>
                    <button className="btn btn-primary" style={{padding: '12px 30px', fontSize: '16px'}} onClick={() => setStep('quiz')}>
                        Начать тестирование
                    </button>
                    <button className="btn btn-ghost" style={{marginTop: '20px'}} onClick={onExit}>Вернуться назад</button>
                </div>
            </div>
        );
    }

    if (step === 'result') {
        const isPassed = score >= test.passingScore;
        return (
            <div className="runner-container">
                <div className="runner-card center">
                    <div style={{fontSize: '60px', marginBottom: '20px'}}>{isPassed ? '🎉' : '😕'}</div>
                    <h2>{isPassed ? 'Тест сдан!' : 'Попробуйте еще раз'}</h2>
                    <div className="score-circle" style={{ borderColor: isPassed ? '#4dff88' : '#ff4d4d' }}>
                        {score}%
                    </div>
                    <p style={{color: '#888', margin: '20px 0'}}>
                        Необходимый минимум: {test.passingScore}%
                    </p>
                    <button className="btn btn-primary" onClick={onExit}>Вернуться к курсу</button>
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

                <div className="options-list">
                    {currentQ.type === 'single_choice' && currentQ.options?.map((opt: any, idx: number) => (
                        <label key={idx} className={`option-label ${answers[currentQ.id] === opt.text ? 'selected' : ''}`}>
                            <input 
                                type="radio" 
                                name={`q-${currentQ.id}`} 
                                checked={answers[currentQ.id] === opt.text} 
                                onChange={() => handleAnswer(opt.text)}
                            />
                            {opt.text}
                        </label>
                    ))}

                    {currentQ.type === 'multiple_choice' && currentQ.options?.map((opt: any, idx: number) => (
                        <label key={idx} className="option-label">
                            <input type="checkbox" /> {opt.text} 
                            <span style={{fontSize: '10px', color: '#666', marginLeft: 'auto'}}>(WIP)</span>
                        </label>
                    ))}

                    {currentQ.type === 'free_text' && (
                        <textarea 
                            className="modern-input" 
                            placeholder="Введите ваш ответ..." 
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
                            ? 'Сохранение...' 
                            : (currentQIndex === questions.length - 1 ? 'Завершить тест' : 'Следующий вопрос →')}
                    </button>
                </div>
            </div>
        </div>
    );
};
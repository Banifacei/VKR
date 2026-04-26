import { useState } from 'react';

export const ItemDetailView = ({ data }: { data: any }) => {
    // Внутренний стейт для "глубокого" погружения в конкретного студента
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

    if (!data || !data.item) return null;
    const { item, type, questionAnalytics, results, responses } = data;

    // --- УРОВЕНЬ 2: ДЕТАЛИЗАЦИЯ ПО КОНКРЕТНОМУ СТУДЕНТУ ---
    if (selectedStudentId) {
        if (type === 'test') {
            // Берем ПОСЛЕДНИЙ результат этого студента (если он сдавал несколько раз)
            const studentResults = results.filter((r: any) => r.userId === selectedStudentId);
            const studentResult = studentResults[studentResults.length - 1]; 
            const studentAnswers = studentResult?.answers || {};
            
            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedStudentId(null)} style={{ padding: 0, color: 'var(--text-muted)', marginBottom: '20px' }}>
                        ← Назад к списку студентов
                    </button>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Ответы: {studentResult?.user?.firstName} {studentResult?.user?.lastName}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {item.questions.map((q: any, idx: number) => {
                            const isCorrect = String(studentAnswers[q.id]) === String(q.correctAnswer);
                            return (
                                <div key={`q-${q.id || idx}-${idx}`} style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', borderLeft: `3px solid ${isCorrect ? '#4dff88' : '#ff4d4d'}` }}>
                                    <div style={{ color: 'var(--text-main)', fontWeight: '500', marginBottom: '10px' }}>{idx + 1}. {q.text}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--text-main)' }}>Ответ студента: <strong style={{ color: isCorrect ? '#4dff88' : '#ff4d4d' }}>{studentAnswers[q.id] || 'Нет ответа'}</strong></span>
                                        <span style={{ color: 'var(--text-muted)' }}>Верный: {q.correctAnswer}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (type === 'video') {
            const studentResponses = responses.filter((r: any) => r.userId === selectedStudentId && r.event?.type !== 'info' && r.event?.type !== 'chapter');
            const studentInfo = studentResponses[0]?.user;

            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedStudentId(null)} style={{ padding: 0, color: 'var(--text-muted)', marginBottom: '20px' }}>
                        ← Назад к списку студентов
                    </button>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Ответы: {studentInfo?.firstName} {studentInfo?.lastName}</h3>
                    
                    {studentResponses.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Нет ответов</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {studentResponses.map((ans: any, idx: number) => {
                                const isFreeText = ans.event.type === 'free_text';
                                const passed = isFreeText ? (ans.similarity >= ans.event.aiThreshold) : ans.isCorrect;
                                
                                return (
                                    <div key={`ans-${idx}`} style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', borderLeft: `3px solid ${passed ? '#4dff88' : '#ff4d4d'}` }}>
                                        <div style={{ color: 'var(--text-main)', fontWeight: '500', marginBottom: '10px', fontSize: '14px' }}>{ans.event?.question}</div>
                                        <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', color: 'var(--text-main)', fontStyle: 'italic', border: '1px dashed var(--border-color)', marginBottom: '10px' }}>
                                            «{ans.answer}»
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isFreeText ? `Порог ИИ: ${ans.event.aiThreshold}%` : ''}</span>
                                            <span style={{ background: passed ? 'rgba(77, 255, 136, 0.1)' : 'rgba(255, 77, 77, 0.1)', color: passed ? '#4dff88' : '#ff4d4d', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                                {isFreeText ? `Сходство: ${ans.similarity}%` : (passed ? 'Верно' : 'Ошибка')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }
    }

    // --- УРОВЕНЬ 1: СПИСОК СТУДЕНТОВ И СТАТИСТИКА ---
    
    const uniqueVideoStudents = Array.from(new Set(responses?.map((r: any) => r.userId))).map(id => responses.find((r: any) => r.userId === id)?.user).filter(Boolean);

    return (
        <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.3s' }}>
            
            {/* --- ВЕТКА ТЕСТА --- */}
            {type === 'test' && (
                <>
                    {/* Красная зона */}
                    {questionAnalytics && questionAnalytics.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '14px', color: '#ff4d4d', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>🚨 Красная зона (Сложные вопросы)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {questionAnalytics.slice(0, 3).map((q: any, idx: number) => (
                                    <div key={`red-${q.id || idx}-${idx}`} style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '10px', borderLeft: `3px solid ${q.correctRate < 50 ? '#ff4d4d' : '#ffd700'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div style={{ color: 'var(--text-main)', fontSize: '14px' }}>{q.question}</div>
                                            <div style={{ fontWeight: 'bold', color: q.correctRate < 50 ? '#ff4d4d' : '#ffd700' }}>{q.correctRate}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 style={{ fontSize: '14px', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>👥 Студенты, сдавшие тест</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {results?.map((res: any, idx: number) => (
                                <div 
                                    key={`result-${res.userId}-${idx}`} 
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                    onClick={() => setSelectedStudentId(res.userId)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 'bold' }}>{res.user?.firstName?.charAt(0)}</div>
                                        <div style={{ color: 'var(--text-main)' }}>{res.user?.lastName} {res.user?.firstName}</div>
                                    </div>
                                    <div style={{ color: res.score >= item.passingScore ? '#4dff88' : '#ff4d4d', fontWeight: 'bold' }}>{res.score}%</div>
                                </div>
                            ))}
                            {(!results || results.length === 0) && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Нет данных</div>}
                        </div>
                    </div>
                </>
            )}
            
            {/* --- ВЕТКА ВИДЕОУРОКА --- */}
            {type === 'video' && (
                <>
                    <div>
                        <h3 style={{ fontSize: '14px', color: '#b5179e', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>👥 Студенты, отвечавшие в видео</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {uniqueVideoStudents.map((u: any, idx: number) => (
                                <div 
                                    key={`vid-user-${u.id}-${idx}`} 
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                    onClick={() => setSelectedStudentId(u.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'linear-gradient(135deg, #7b2cbf, #b5179e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold' }}>{u.firstName?.charAt(0)}</div>
                                        <div style={{ color: 'var(--text-main)' }}>{u.lastName} {u.firstName}</div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Смотреть ответы →</div>
                                </div>
                            ))}
                            {uniqueVideoStudents.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Нет данных</div>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
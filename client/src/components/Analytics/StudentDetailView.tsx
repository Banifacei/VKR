import { useState } from 'react';
import { Icons } from '../Icons';

export const StudentDetailView = ({ data }: { data: any }) => {
    // Внутренний стейт для погружения в конкретный материал
    const [selectedItem, setSelectedItem] = useState<{ id: number, type: 'video' | 'test', title: string } | null>(null);

    if (!data || !data.student) return null;

    const interactiveAnswers = data.interactiveAnswers || [];
    const watchedVideos = data.videoProgress?.filter((v: any) => v.isWatched) || [];
    const testResults = data.testResults || [];

    // --- УРОВЕНЬ 2: ДЕТАЛИЗАЦИЯ ПО КОНКРЕТНОМУ МАТЕРИАЛУ ---
    if (selectedItem) {
        if (selectedItem.type === 'video') {
            const itemAnswers = interactiveAnswers.filter((a: any) => a.videoId === selectedItem.id && a.event?.type !== 'info' && a.event?.type !== 'chapter');
            
            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedItem(null)} style={{ padding: 0, color: '#888', marginBottom: '20px' }}>
                        ← Назад к профилю
                    </button>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Урок: {selectedItem.title}</h3>
                    
                    {itemAnswers.length === 0 ? (
                        <div style={{ color: '#666', textAlign: 'center' }}>Студент не отвечал на вопросы в этом видео</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {itemAnswers.map((ans: any, idx: number) => {
                                const isFreeText = ans.event.type === 'free_text';
                                const passed = isFreeText ? (ans.similarity >= ans.event.aiThreshold) : ans.isCorrect;
                                
                                return (
                                    <div key={idx} style={{ background: '#111', padding: '15px', borderRadius: '12px', borderLeft: `3px solid ${passed ? '#4dff88' : '#ff4d4d'}` }}>
                                        <div style={{ color: '#fff', fontWeight: '500', marginBottom: '10px', fontSize: '14px' }}>{ans.event?.question}</div>
                                        <div style={{ background: '#080808', padding: '10px', borderRadius: '8px', color: '#ccc', fontStyle: 'italic', border: '1px dashed #222', marginBottom: '10px' }}>
                                            «{ans.answer}»
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#666' }}>{isFreeText ? `Порог ИИ: ${ans.event.aiThreshold}%` : ''}</span>
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

        if (selectedItem.type === 'test') {
            const result = testResults.find((t: any) => t.testId === selectedItem.id);
            const studentAnswers = result?.answers || {};
            // Sequelize может вернуть массив вопросов как .questions или .TestQuestions в зависимости от алиасов
            const questions = result?.test?.questions || result?.test?.TestQuestions || [];

            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedItem(null)} style={{ padding: 0, color: '#888', marginBottom: '20px' }}>
                        ← Назад к профилю
                    </button>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Тест: {selectedItem.title}</h3>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: result?.score >= result?.test?.passingScore ? '#4dff88' : '#ff4d4d', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '10px', border: `1px solid ${result?.score >= result?.test?.passingScore ? 'rgba(77,255,136,0.2)' : 'rgba(255,77,77,0.2)'}` }}>
                            Итог: {result?.score}%
                        </div>
                    </div>

                    {questions.length === 0 ? (
                        <div style={{ color: '#666', textAlign: 'center', padding: '30px', border: '1px dashed #333', borderRadius: '12px' }}>Нет данных о вопросах</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {questions.map((q: any, idx: number) => {
                                const ans = studentAnswers[q.id];
                                // Обработка массивов (если вопрос с множественным выбором)
                                const ansString = Array.isArray(ans) ? ans.join(', ') : String(ans || 'Нет ответа');
                                const isCorrect = String(ans) === String(q.correctAnswer);

                                return (
                                    <div key={q.id} style={{ background: '#111', padding: '15px', borderRadius: '12px', borderLeft: `3px solid ${isCorrect ? '#4dff88' : '#ff4d4d'}` }}>
                                        <div style={{ color: '#fff', fontWeight: '500', marginBottom: '12px', fontSize: '14px', lineHeight: '1.4' }}>
                                            <span style={{ color: '#888', marginRight: '8px' }}>{idx + 1}.</span>{q.text}
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div style={{ background: '#080808', padding: '12px', borderRadius: '8px', border: '1px dashed #222' }}>
                                                <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Ответ студента</div>
                                                <div style={{ color: isCorrect ? '#4dff88' : '#ff4d4d', fontWeight: 'bold', fontSize: '13px' }}>{ansString}</div>
                                            </div>
                                            <div style={{ background: '#080808', padding: '12px', borderRadius: '8px', border: '1px solid #222' }}>
                                                <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Правильный ответ</div>
                                                <div style={{ color: '#aaa', fontWeight: '500', fontSize: '13px' }}>{q.correctAnswer || 'Не задан'}</div>
                                            </div>
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

    // --- УРОВЕНЬ 1: СПИСОК ПРОЙДЕННЫХ МАТЕРИАЛОВ ---
    return (
        <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.3s' }}>
            
            <div>
                <h3 style={{ fontSize: '14px', color: '#b5179e', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.TrendingUp size={14}/> Активность студента</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Список тестов */}
                    {testResults.map((t: any) => (
                        <div 
                            key={`t-${t.id}`} 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161616', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                            onClick={() => setSelectedItem({ id: t.testId, type: 'test', title: t.test?.title })}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div><Icons.FileText size={20}/></div>
                                <div style={{ color: '#fff' }}>{t.test?.title}</div>
                            </div>
                            <div style={{ color: t.score >= t.test?.passingScore ? '#4dff88' : '#ff4d4d', fontWeight: 'bold' }}>{t.score}%</div>
                        </div>
                    ))}

                    {/* Список видео */}
                    {watchedVideos.map((v: any) => {
                        // Проверяем, есть ли у студента РЕАЛЬНЫЕ ответы в этом видео
                        const videoAnswers = interactiveAnswers.filter((a: any) => a.videoId === v.videoId && a.event?.type !== 'info' && a.event?.type !== 'chapter');
                        const hasAnswers = videoAnswers.length > 0;

                        return (
                            <div 
                                key={`v-${v.id}`} 
                                style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161616', padding: '15px 20px', borderRadius: '12px', 
                                    cursor: hasAnswers ? 'pointer' : 'default', // Меняем курсор
                                    transition: '0.2s', border: '1px solid transparent' 
                                }}
                                onMouseEnter={e => { if (hasAnswers) e.currentTarget.style.borderColor = '#333' }}
                                onMouseLeave={e => { if (hasAnswers) e.currentTarget.style.borderColor = 'transparent' }}
                                onClick={() => hasAnswers && setSelectedItem({ id: v.videoId, type: 'video', title: v.video?.title })}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div><Icons.Monitor size={20}/></div>
                                    <div style={{ color: '#fff' }}>{v.video?.title || 'Видеоурок'}</div>
                                </div>
                                {/* Меняем текст, если ответов нет */}
                                {hasAnswers ? (
                                    <div style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 'bold' }}>Смотреть ответы →</div>
                                ) : (
                                    <div style={{ color: '#555', fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>Просмотрено</div>
                                )}
                            </div>
                        );
                    })}
                    

                    {testResults.length === 0 && watchedVideos.length === 0 && (
                        <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Студент еще не приступал к курсу</div>
                    )}
                </div>
            </div>
        </div>
    );
};
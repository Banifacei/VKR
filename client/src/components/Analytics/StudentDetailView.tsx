import { useState } from 'react';
import { Icons } from '../Icons';

export const StudentDetailView = ({ data }: { data: any }) => {
    // Внутренний стейт для погружения в конкретный материал
    const [selectedItem, setSelectedItem] = useState<{ id: number, type: 'video' | 'test' | 'homework', title: string } | null>(null);

    if (!data || !data.student) return null;

    const interactiveAnswers = data.interactiveAnswers || [];
    const watchedVideos = data.videoProgress?.filter((v: any) => v.isWatched) || [];
    const testResults = data.testResults || [];
    const homeworkSubmissions = data.homeworkSubmissions || [];

    // --- УРОВЕНЬ 2: ДЕТАЛИЗАЦИЯ ПО КОНКРЕТНОМУ МАТЕРИАЛУ ---
    if (selectedItem) {
        if (selectedItem.type === 'video') {
            const itemAnswers = interactiveAnswers.filter((a: any) => a.videoId === selectedItem.id && a.event?.type !== 'info' && a.event?.type !== 'chapter');
            
            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedItem(null)} style={{ padding: 0, color: 'var(--text-muted)', marginBottom: '20px' }}>
                        ← Назад к профилю
                    </button>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Урок: {selectedItem.title}</h3>
                    
                    {itemAnswers.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Студент не отвечал на вопросы в этом видео</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {itemAnswers.map((ans: any, idx: number) => {
                                const isFreeText = ans.event.type === 'free_text';
                                const passed = isFreeText ? (ans.similarity >= ans.event.aiThreshold) : ans.isCorrect;
                                
                                return (
                                    <div key={idx} style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', borderLeft: `3px solid ${passed ? '#4dff88' : '#ff4d4d'}` }}>
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

        if (selectedItem.type === 'test') {
            const result = testResults.find((t: any) => t.testId === selectedItem.id);
            const studentAnswers = result?.answers || {};
            // Sequelize может вернуть массив вопросов как .questions или .TestQuestions в зависимости от алиасов
            const questions = result?.test?.questions || result?.test?.TestQuestions || [];

            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedItem(null)} style={{ padding: 0, color: 'var(--text-muted)', marginBottom: '20px' }}>
                        ← Назад к профилю
                    </button>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Тест: {selectedItem.title}</h3>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: result?.score >= result?.test?.passingScore ? '#4dff88' : '#ff4d4d', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '10px', border: `1px solid ${result?.score >= result?.test?.passingScore ? 'rgba(77,255,136,0.2)' : 'rgba(255,77,77,0.2)'}` }}>
                            Итог: {result?.score}%
                        </div>
                    </div>

                    {questions.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>Нет данных о вопросах</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {questions.map((q: any, idx: number) => {
                                const ansData = studentAnswers[q.id];
                                // Сервер сохраняет { answer, isCorrect, similarity }, старые записи — plain value
                                const ans = (ansData && typeof ansData === 'object' && 'answer' in ansData) ? ansData.answer : ansData;
                                const isCorrect = (ansData && typeof ansData === 'object' && 'isCorrect' in ansData)
                                    ? ansData.isCorrect
                                    : String(ans) === String(q.correctAnswer);
                                const ansString = Array.isArray(ans) ? ans.join(', ') : String(ans ?? 'Нет ответа');

                                return (
                                    <div key={q.id} style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', borderLeft: `3px solid ${isCorrect ? '#4dff88' : '#ff4d4d'}` }}>
                                        <div style={{ color: 'var(--text-main)', fontWeight: '500', marginBottom: '12px', fontSize: '14px', lineHeight: '1.4' }}>
                                            <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>{idx + 1}.</span>{q.text}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Ответ студента</div>
                                                <div style={{ color: isCorrect ? '#4dff88' : '#ff4d4d', fontWeight: 'bold', fontSize: '13px' }}>{ansString}</div>
                                            </div>
                                            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Правильный ответ</div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: '500', fontSize: '13px' }}>{q.correctAnswer || 'Не задан'}</div>
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

        if (selectedItem.type === 'homework') {
            const sub = homeworkSubmissions.find((h: any) => h.id === selectedItem.id);
            if (!sub) return null;

            return (
                <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedItem(null)} style={{ padding: 0, color: 'var(--text-muted)', marginBottom: '20px' }}>
                        ← Назад к профилю
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Задание: {selectedItem.title}</h3>
                        {sub.status === 'graded' && (
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4dff88', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '10px', border: '1px solid rgba(77,255,136,0.2)' }}>
                                {sub.grade}/{sub.assignment?.maxScore ?? 100}
                            </div>
                        )}
                    </div>

                    {sub.codeContent && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Код студента:</span>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                                    {sub.codeLanguage}
                                </span>
                            </div>
                            <pre style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-main)', overflowX: 'auto', maxHeight: '320px', margin: 0, fontFamily: 'monospace', lineHeight: 1.5 }}>
                                {sub.codeContent}
                            </pre>
                            {sub.codeLastOutput && (
                                <div style={{ marginTop: '8px', padding: '10px 12px', background: '#0d0d0d', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', color: '#e5e7eb', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
                                    {sub.codeLastOutput}
                                </div>
                            )}
                        </div>
                    )}

                    {sub.textAnswer && (
                        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {sub.textAnswer}
                        </div>
                    )}

                    {sub.files?.length > 0 && (
                        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {sub.files.map((f: any, i: number) => (
                                <a key={i} href={f.path} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--primary)' }}>
                                    <Icons.FileText size={13} /> {f.name}
                                </a>
                            ))}
                        </div>
                    )}

                    {sub.testResults?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-card)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Автопроверка тест-кейсами:</div>
                            {sub.testResults.map((r: any, i: number) => (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                                    <span style={{ color: r.passed ? '#4dff88' : '#ff4d4d', fontWeight: 700, flexShrink: 0 }}>{r.passed ? '✓' : '✗'}</span>
                                    <span style={{ color: 'var(--text-main)' }}>
                                        Тест {i + 1}
                                        {r.isHidden ? ' [скрытый]' : null}
                                        {!r.isHidden && r.error ? <span style={{ color: '#ff4d4d' }}> — {r.error}</span> : null}
                                        {!r.isHidden && !r.passed && r.actualOutput ? <span style={{ color: 'var(--text-muted)' }}> — получено: {r.actualOutput}</span> : null}
                                    </span>
                                </div>
                            ))}
                            {sub.autoGrade !== null && sub.autoGrade !== undefined && (
                                <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                                    Автооценка: {sub.autoGrade} из {sub.assignment?.maxScore ?? 100}
                                </div>
                            )}
                        </div>
                    )}

                    {sub.teacherComment && (
                        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                            <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Комментарий препода:</span>
                            {sub.teacherComment}
                        </div>
                    )}

                    {!sub.codeContent && !sub.textAnswer && !sub.files?.length && (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>Нет данных о содержимом сдачи</div>
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
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                            onClick={() => setSelectedItem({ id: t.testId, type: 'test', title: t.test?.title })}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div><Icons.FileText size={20}/></div>
                                <div style={{ color: 'var(--text-main)' }}>{t.test?.title}</div>
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
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '12px',
                                    cursor: hasAnswers ? 'pointer' : 'default',
                                    transition: '0.2s', border: '1px solid transparent'
                                }}
                                onMouseEnter={e => { if (hasAnswers) e.currentTarget.style.borderColor = 'var(--border-color)' }}
                                onMouseLeave={e => { if (hasAnswers) e.currentTarget.style.borderColor = 'transparent' }}
                                onClick={() => hasAnswers && setSelectedItem({ id: v.videoId, type: 'video', title: v.video?.title })}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div><Icons.Monitor size={20}/></div>
                                    <div style={{ color: 'var(--text-main)' }}>{v.video?.title || 'Видеоурок'}</div>
                                </div>
                                {/* Меняем текст, если ответов нет */}
                                {hasAnswers ? (
                                    <div style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 'bold' }}>Смотреть ответы →</div>
                                ) : (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: '6px' }}>Просмотрено</div>
                                )}
                            </div>
                        );
                    })}
                    

                    {/* Список сдач по заданиям */}
                    {homeworkSubmissions.map((s: any) => {
                        const statusLabel = s.status === 'graded' ? 'Проверено' : s.isLate ? 'Сдано с опозданием' : 'На проверке';
                        const statusColor = s.status === 'graded' ? '#4dff88' : s.isLate ? '#ffd700' : 'var(--text-muted)';
                        return (
                            <div
                                key={`hw-${s.id}`}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                onClick={() => setSelectedItem({ id: s.id, type: 'homework', title: s.assignment?.title || 'Задание' })}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div><Icons.Upload size={20}/></div>
                                    <div style={{ color: 'var(--text-main)' }}>{s.assignment?.title || 'Задание'}</div>
                                </div>
                                {s.status === 'graded' ? (
                                    <div style={{ color: statusColor, fontWeight: 'bold' }}>{s.grade}/{s.assignment?.maxScore ?? 100}</div>
                                ) : (
                                    <div style={{ color: statusColor, fontSize: '12px', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: '6px' }}>{statusLabel}</div>
                                )}
                            </div>
                        );
                    })}

                    {testResults.length === 0 && watchedVideos.length === 0 && homeworkSubmissions.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Студент еще не приступал к курсу</div>
                    )}
                </div>
            </div>
        </div>
    );
};
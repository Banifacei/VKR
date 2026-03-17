import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';

interface AnalyticsDetailsModalProps {
    studentId: number | null;
    courseId: number;
    onClose: () => void;
}

export const AnalyticsDetailsModal = ({ studentId, courseId, onClose }: AnalyticsDetailsModalProps) => {
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'ai_answers'>('timeline');

    useEffect(() => {
        if (!studentId) return;
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/videos/courses/${courseId}/analytics/student/${studentId}`);
                setData(res.data);
            } catch (e) {
                showToast('Ошибка загрузки деталей', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [studentId, courseId]);

    if (!studentId) return null;

    return (
        <>
            {/* Затемнение фона */}
            <div 
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 99998, backdropFilter: 'blur(2px)' }} 
                onClick={onClose}
            ></div>

            {/* Выезжающая шторка */}
            <div style={{
                position: 'fixed', top: 0, right: 0, width: '450px', maxWidth: '100%', height: '100vh',
                background: '#111', zIndex: 99999, borderLeft: '1px solid #333',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', overflowY: 'auto',
                transition: 'transform 0.3s ease-out',
                display: 'flex', flexDirection: 'column'
            }}>
                {loading || !data ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Загрузка профиля...</div>
                ) : (
                    <>
                        {/* Шапка профиля */}
                        <div style={{ padding: '30px', borderBottom: '1px solid #222', background: '#161616', position: 'sticky', top: 0, zIndex: 10 }}>
                            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '24px', position: 'absolute', right: '20px', top: '20px', cursor: 'pointer' }}>×</button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                                    {data.student.firstName.charAt(0)}
                                </div>
                                <div>
                                    <h2 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>{data.student.lastName} {data.student.firstName}</h2>
                                    <div style={{ color: '#888', fontSize: '13px' }}>{data.student.email}</div>
                                </div>
                            </div>
                            
                            {/* Вкладки */}
                            <div style={{ display: 'flex', gap: '20px', marginTop: '25px', borderBottom: '1px solid #333' }}>
                                <div onClick={() => setActiveTab('timeline')} style={{ paddingBottom: '10px', cursor: 'pointer', color: activeTab === 'timeline' ? 'var(--primary)' : '#888', borderBottom: activeTab === 'timeline' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: 'bold', fontSize: '14px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.TrendingUp size={14}/> Прогресс</span>
                                </div>
                                <div onClick={() => setActiveTab('ai_answers')} style={{ paddingBottom: '10px', cursor: 'pointer', color: activeTab === 'ai_answers' ? '#b5179e' : '#888', borderBottom: activeTab === 'ai_answers' ? '2px solid #b5179e' : '2px solid transparent', fontWeight: 'bold', fontSize: '14px' }}>
                                    🤖 AI Ответы
                                </div>
                            </div>
                        </div>

                        {/* Контент вкладок */}
                        <div style={{ padding: '20px 30px', flex: 1 }}>
                            {activeTab === 'timeline' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h3 style={{ fontSize: '14px', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Завершенные материалы</h3>
                                    
                                    {data.videoProgress.filter((v: any) => v.isWatched).map((v: any) => (
                                        <div key={`v-${v.id}`} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid #222' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}><Icons.Monitor size={12}/> Видео посмотрено</div>
                                            <div style={{ color: '#eee' }}>{v.video?.title || 'Неизвестное видео'}</div>
                                        </div>
                                    ))}

                                    {data.testResults.map((t: any) => (
                                        <div key={`t-${t.id}`} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid #222' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <div style={{ fontSize: '12px', color: '#b5179e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><Icons.FileText size={12}/> Тест сдан</div>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: t.score >= t.test.passingScore ? '#4dff88' : '#ff4d4d' }}>{t.score}%</div>
                                            </div>
                                            <div style={{ color: '#eee' }}>{t.test?.title}</div>
                                        </div>
                                    ))}

                                    {data.videoProgress.length === 0 && data.testResults.length === 0 && (
                                        <div style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>Студент еще не проходил материалы</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'ai_answers' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {data.interactiveAnswers.filter((a: any) => a.event.type === 'free_text').length === 0 ? (
                                        <div style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>Нет развернутых ответов</div>
                                    ) : (
                                        data.interactiveAnswers.filter((a: any) => a.event.type === 'free_text').map((ans: any, idx: number) => (
                                            <div key={idx} style={{ background: '#161616', padding: '15px', borderRadius: '12px', borderLeft: ans.similarity >= ans.event.aiThreshold ? '3px solid #4dff88' : '3px solid #ff4d4d' }}>
                                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Вопрос из лекции: {ans.video.title}</div>
                                                <div style={{ color: '#fff', fontWeight: '500', marginBottom: '15px' }}>{ans.event.question}</div>
                                                
                                                <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px dashed #333', marginBottom: '10px' }}>
                                                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Ответ студента:</div>
                                                    <div style={{ color: '#ccc', fontStyle: 'italic' }}>«{ans.answer}»</div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px', color: '#888' }}>Порог ИИ: {ans.event.aiThreshold}%</span>
                                                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: ans.similarity >= ans.event.aiThreshold ? '#4dff88' : '#ff4d4d' }}>
                                                        Сходство: {ans.similarity}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};
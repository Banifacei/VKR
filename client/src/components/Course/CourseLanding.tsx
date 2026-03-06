import type { ICourse } from '../../types';
import { Icons } from './Icons';

interface CourseLandingProps {
    course: ICourse | null;
    enrollStatus: string | null | 'loading';
    isEnrolling: boolean;
    onEnroll: () => void;
}

export const CourseLanding = ({ course, enrollStatus, isEnrolling, onEnroll }: CourseLandingProps) => {
    return (
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', background: '#111', padding: '50px', borderRadius: '24px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.4s ease' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #00aeef, #0077a3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 20px rgba(0, 174, 239, 0.3)' }}>
                    <Icons.Test />
                </div>
                
                <h1 style={{ fontSize: '32px', marginBottom: '15px', color: '#fff' }}>{course?.title || 'Загрузка...'}</h1>
                <p style={{ color: '#888', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
                    {course?.description || 'Описание курса скоро появится. Здесь вы узнаете много нового и интересного.'}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '40px', color: '#aaa', fontSize: '14px' }}>
                    <span>👨‍🏫 Преподаватель: <strong style={{color: '#fff'}}>{course?.instructor}</strong></span>
                </div>

                {enrollStatus === 'pending' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                        ⏳ Ваша заявка на рассмотрении...
                    </button>
                ) : enrollStatus === 'rejected' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                        ❌ В доступе отказано
                    </button>
                ) : course?.enrollmentType === 'closed' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }}>
                        🔒 Запись на курс закрыта
                    </button>
                ) : (
                    <button 
                        className="btn btn-primary" 
                        onClick={onEnroll}
                        disabled={isEnrolling}
                        style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #00aeef 0%, #0077a3 100%)', boxShadow: '0 10px 20px rgba(0, 174, 239, 0.3)', fontWeight: 'bold' }}
                    >
                        {isEnrolling ? 'Запись...' : (course?.enrollmentType === 'open' ? '🚀 Записаться бесплатно' : '📝 Подать заявку на участие')}
                    </button>
                )}
            </div>
        </main>
    );
};
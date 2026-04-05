import type { ICourse } from '../../types';
import { Icons } from '../Icons';

interface CourseLandingProps {
    course: ICourse | null;
    enrollStatus: string | null | 'loading';
    isEnrolling: boolean;
    onEnroll: () => void;
    userData: any; 
}

export const CourseLanding = ({ course, enrollStatus, isEnrolling, onEnroll }: CourseLandingProps) => {
    return (
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 60px)', padding: '20px 16px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', background: '#111', padding: 'clamp(20px, 5vw, 50px)', borderRadius: 'clamp(16px, 3vw, 24px)', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.4s ease' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)', color: '#fff' }}>
                    <Icons.Test />
                </div>

                <h1 style={{ fontSize: 'clamp(22px, 6vw, 32px)', marginBottom: '15px', color: '#fff' }}>{course?.title || 'Загрузка...'}</h1>
                <p style={{ color: '#888', fontSize: 'clamp(14px, 3.5vw, 16px)', lineHeight: '1.6', marginBottom: '30px' }}>
                    {course?.description || 'Описание курса скоро появится. Здесь вы узнаете много нового и интересного.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: 'clamp(20px, 4vw, 40px)', color: '#aaa', fontSize: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Teacher size={14}/> Преподаватель: <strong style={{color: '#fff'}}>{course?.instructor}</strong></span>
                </div>

                {enrollStatus === 'pending' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                        <Icons.Time size={16}/> Ваша заявка на рассмотрении...
                    </button>
                ) : enrollStatus === 'rejected' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                        <Icons.Fail size={16}/> В доступе отказано
                    </button>
                ) : course?.enrollmentType === 'closed' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }}>
                        <Icons.Lock size={16}/> Запись на курс закрыта
                    </button>
                ) : (
                    <button 
                        className="btn btn-primary" 
                        onClick={onEnroll}
                        disabled={isEnrolling}
                        style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)', fontWeight: 'bold' }}
                    >
                        {isEnrolling ? 'Запись...' : (course?.enrollmentType === 'open' ? <><Icons.Rocket size={16}/> Записаться бесплатно</> : <><Icons.FileText size={16}/> Подать заявку на участие</>)}
                    </button>
                )}
            </div>
        </main>
    );
};
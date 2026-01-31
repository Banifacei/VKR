import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses } from '../api/videoApi';
import type { ICourse } from '../types';
import './UserPage.css'; // Используем те же стили пока

export const CoursesPage = () => {
    const [courses, setCourses] = useState<ICourse[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        getCourses().then(setCourses);
    }, []);

    return (
        <div className="lumeo-layout">
            <header className="lumeo-header">
                <div className="logo">Lumeo<span className="dot">.</span></div>
            </header>

            <div className="lumeo-container" style={{display: 'block', padding: '40px'}}>
                <h1 style={{marginBottom: '30px'}}>Доступные курсы</h1>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {courses.map(course => (
                        <div 
                            key={course.id} 
                            onClick={() => navigate(`/course/${course.id}`)}
                            style={{
                                background: '#1a1a1a', 
                                border: '1px solid #333', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                            className="course-card"
                        >
                            <h2 style={{color: '#00aeef', fontSize: '1.4rem'}}>{course.title}</h2>
                            <p style={{color: '#888', fontSize: '0.9rem', marginBottom: '15px'}}>{course.instructor}</p>
                            <p style={{color: '#ccc', lineHeight: '1.4'}}>{course.description}</p>
                            <div style={{marginTop: '20px', color: '#666', fontSize: '0.8rem'}}>
                                {course.videos?.length || 0} уроков
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { updateCourseApi, deleteCourseApi } from '../../api/videoApi';
import { useToast } from '../../context/ToastContext';
import type { ICourse } from '../../types';

interface CourseSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: ICourse;
    userData: any;
    enrollmentsList: any[];
    pendingCount: number;
    onEnrollmentAction: (id: number, status: 'approved' | 'rejected') => void;
    onCourseUpdated: () => void;
    fetchEnrollments: () => void;
}

export const CourseSettingsModal = ({ 
    isOpen, onClose, course, userData, enrollmentsList, pendingCount, onEnrollmentAction, onCourseUpdated, fetchEnrollments 
}: CourseSettingsModalProps) => {
    
    const { showToast } = useToast();
    const navigate = useNavigate();
    // Стейты самой модалки
    const [settingsTab, setSettingsTab] = useState<'info' | 'team' | 'enrollments'>('info');
    const [editCourseData, setEditCourseData] = useState({ title: '', description: '', instructor: '', enrollmentType: 'open', allowTeachersFreeAccess: false });
    
    // Стейты команды
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // Стейты передачи прав
    const [transferUserId, setTransferUserId] = useState<number | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const isOwner = course.ownerId === userData?.id || userData?.role === 'admin';
    const isChanged = course.title !== editCourseData.title || 
                      (course.description || '') !== editCourseData.description || 
                      (course.instructor || '') !== editCourseData.instructor ||
                      (course.enrollmentType || 'open') !== editCourseData.enrollmentType;

    useEffect(() => {
        if (course) {
            setEditCourseData({
                title: course.title,
                description: course.description || '',
                instructor: course.instructor || '',
                enrollmentType: (course.enrollmentType as any) || 'open',
                allowTeachersFreeAccess: course.allowTeachersFreeAccess || false
            });
        }
    }, [course]); // Реагируем только на обновление курса

    // 🔥 Создаем кастомную функцию закрытия, чтобы сбрасывать вкладку
    const handleCloseModal = () => {
        setSettingsTab('info');
        onClose();
    };
    // --- ЛОГИКА КОМАНДЫ ---
    const fetchCollaborators = async () => {
        try {
            const res = await api.get(`/videos/courses/${course.id}/collaborators`);
            setCollaborators(res.data);
        } catch (e) { console.error('Ошибка загрузки команды'); }
    };

    const loadAllUsers = async () => {
        setIsSearching(true);
        try {
            const res = await api.get('/users/available');
            setSearchResults(res.data);
        } catch(e) { }
        finally { setIsSearching(false); }
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const res = await api.get(`/users/search?q=${searchQuery}`);
                    setSearchResults(res.data);
                } catch(e) { }
                finally { setIsSearching(false); }
            } else if (searchQuery.trim().length === 0 && showDropdown) {
                loadAllUsers();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, showDropdown]);

    const handleInviteUser = async (userEmail: string) => {
        try {
            await api.post(`/videos/courses/${course.id}/collaborators`, { email: userEmail });
            showToast('Пользователь добавлен в команду!', 'success');
            setSearchQuery(''); 
            setShowDropdown(false); 
            fetchCollaborators();
            onCourseUpdated();
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка приглашения', 'error');
        }
    };

    const handleRemoveCollaborator = async (userId: number) => {
        if (!window.confirm('Удалить пользователя из команды?')) return;
        try {
            await api.delete(`/videos/courses/${course.id}/collaborators/${userId}`);
            showToast('Пользователь удален', 'info');
            fetchCollaborators();
            onCourseUpdated();
        } catch (e) { showToast('Ошибка удаления', 'error'); }
    };

    const handleTransferOwnership = async () => {
        if (!transferUserId) return;
        setIsTransferring(true);
        try {
            await api.put(`/videos/courses/${course.id}/transfer`, { newOwnerId: transferUserId });
            showToast('Права успешно переданы!', 'success');
            onClose(); 
            setTransferUserId(null); 
            onCourseUpdated(); 
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Ошибка передачи прав', 'error');
        } finally {
            setIsTransferring(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div style={{ background: '#111', borderRadius: '24px', border: '1px solid #333', width: '100%', maxWidth: '700px', height: '600px', margin: '0 20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column'}}>
                
                <div style={{ padding: '20px 25px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{margin: 0, color: '#fff'}}>Настройки курса</h3>
                    <button style={{background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:'20px'}} onClick={handleCloseModal}>✕</button>                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#0a0a0a' }}>
                    <button onClick={() => setSettingsTab('info')} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'info' ? '2px solid #00aeef' : '2px solid transparent', color: settingsTab === 'info' ? '#00aeef' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>Основное</button>
                    <button onClick={() => { setSettingsTab('enrollments'); fetchEnrollments(); }} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'enrollments' ? '2px solid #00aeef' : '2px solid transparent', color: settingsTab === 'enrollments' ? '#00aeef' : '#888', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Заявки
                        {pendingCount > 0 && (
                            <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', lineHeight: 1 }}>{pendingCount}</span>
                        )}
                    </button>
                    <button onClick={() => { setSettingsTab('team'); fetchCollaborators(); }} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'team' ? '2px solid #00aeef' : '2px solid transparent', color: settingsTab === 'team' ? '#00aeef' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>Команда</button>
                </div>

                <div style={{ padding: '25px', overflowY: 'auto', flex: 1 }}>
                    
                    {/* --- ВКЛАДКА 1: ОСНОВНОЕ --- */}
                    {settingsTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div><label style={{ fontSize: '12px', color: '#888' }}>Название курса</label><input className="modern-input" value={editCourseData.title} onChange={e => setEditCourseData({...editCourseData, title: e.target.value})} /></div>
                            <div><label style={{ fontSize: '12px', color: '#888' }}>ФИО Преподавателя</label><input className="modern-input" value={editCourseData.instructor} onChange={e => setEditCourseData({...editCourseData, instructor: e.target.value})} /></div>
                            <div><label style={{ fontSize: '12px', color: '#888' }}>Описание</label><textarea className="modern-input" style={{ minHeight: '150px' }} value={editCourseData.description} onChange={e => setEditCourseData({...editCourseData, description: e.target.value})} /></div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1, opacity: isChanged ? 1 : 0.5 }} disabled={!isChanged} onClick={async () => {
                                    try {
                                        await updateCourseApi(course.id, editCourseData as any);
                                        onCourseUpdated(); 
                                        onClose(); 
                                        showToast('Курс обновлен!', 'success');
                                    } catch (e) { showToast('Ошибка', 'error'); }
                                }}>Сохранить</button>
                                
                                {isOwner && (
                                    <button className="btn btn-ghost" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d' }} onClick={async () => {
                                        if (window.confirm('⚠️ Вы уверены, что хотите навсегда удалить этот курс?')) {
                                            try { await deleteCourseApi(course.id); navigate('/courses'); } catch (e) { showToast('Ошибка', 'error'); }
                                        }
                                    }}>🗑️ Удалить</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- ВКЛАДКА 2: КОМАНДА --- */}
                    {settingsTab === 'team' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {isOwner ? (
                                <div style={{ position: 'relative', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a', borderRadius: '12px', padding: '0 15px', border: '1px solid #333', transition: 'border-color 0.2s', position: 'relative', zIndex: 101 }}>
                                        <span style={{color: '#888'}}>🔍</span>
                                        <input 
                                            className="modern-input" 
                                            style={{ marginBottom: 0, border: 'none', background: 'transparent', boxShadow: 'none', flex: 1, padding: '15px 10px' }} 
                                            placeholder="Поиск или выбор из списка..." 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)} 
                                            onFocus={() => { 
                                                setShowDropdown(true);
                                                if (!searchQuery.trim()) loadAllUsers();
                                            }}
                                        />
                                        {isSearching && <span className="loader-dots" style={{color: '#00aeef', paddingRight: '10px'}}>...</span>}
                                    </div>

                                    {showDropdown && searchResults.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '55px', left: 0, right: 0,
                                            background: '#161616', border: '1px solid #333', borderRadius: '12px',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 102, overflowY: 'auto', 
                                            maxHeight: '260px', animation: 'fadeIn 0.2s ease'
                                        }}>
                                            {searchResults.map(userItem => {
                                                if (collaborators.some(c => c.userId === userItem.id)) return null;
                                                return (
                                                    <div key={userItem.id} 
                                                        onClick={() => handleInviteUser(userItem.email)}
                                                        style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #222', transition: 'background 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            {userItem.avatarUrl ? <img src={userItem.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <span style={{color:'#fff', fontSize:'14px'}}>{userItem.firstName?.[0] || '?'}</span>}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{userItem.firstName} {userItem.lastName}</div>
                                                            <div style={{ color: '#888', fontSize: '12px' }}>{userItem.email}</div>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#00aeef', background: 'rgba(0,174,239,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                                            {userItem.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {showDropdown && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex: 99}} onClick={() => setShowDropdown(false)} />}
                                </div>
                            ) : (
                                <div style={{color: '#ff9900', fontSize: '13px', background: 'rgba(255,153,0,0.1)', padding: '10px', borderRadius: '8px'}}>Только Владелец курса может управлять командой.</div>
                            )}

                            <div style={{ background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
                                {collaborators.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>Никого нет</div> : collaborators.map(col => (
                                    <div key={col.userId} style={{ padding: '12px 15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{col.user?.firstName} {col.user?.lastName}</div>
                                            <div style={{ color: '#888', fontSize: '12px' }}>{col.user?.email}</div>
                                        </div>
                                        {isOwner && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button 
                                                    onClick={() => setTransferUserId(col.userId)}
                                                    style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#ffd700', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: '0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'}
                                                    title="Передать права владельца курса"
                                                >
                                                    👑 Сделать владельцем
                                                </button>
                                                <button className="btn-icon" style={{ color: '#ff4d4d', padding: '4px 8px' }} onClick={() => handleRemoveCollaborator(col.userId)}>✕</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ВКЛАДКА 3: ЗАЯВКИ --- */}
                    {settingsTab === 'enrollments' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                                <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Режим доступа к курсу</label>
                                <select 
                                    className="modern-input" 
                                    value={editCourseData.enrollmentType} 
                                    onChange={async (e) => {
                                        const newType = e.target.value as 'open' | 'request' | 'closed';
                                        setEditCourseData({...editCourseData, enrollmentType: newType});
                                        try {
                                            await updateCourseApi(course.id, { enrollmentType: newType });
                                            onCourseUpdated(); 
                                            showToast('Режим доступа успешно изменен!', 'success');
                                        } catch (error) {
                                            showToast('Ошибка при сохранении режима', 'error');
                                        }
                                    }}
                                    style={{ cursor: 'pointer', appearance: 'auto', marginBottom: 0 }}
                                >
                                    <option value="open">🟢 Открытый (Свободный вход)</option>
                                    <option value="request">🟡 По заявкам (Ручная модерация)</option>
                                    <option value="closed">🔴 Закрытый (Запись остановлена)</option>
                                </select>
                            </div>
                            
                            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>Свободный доступ для коллег</div>
                                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>Автоматически одобрять заявки от других преподавателей</div>
                                </div>
                                
                                <label className="lumeo-toggle">
                                    <input 
                                        type="checkbox" 
                                        // Не забудь добавить allowTeachersFreeAccess в стейт editCourseData при инициализации!
                                        checked={editCourseData.allowTeachersFreeAccess || false} 
                                        onChange={async (e) => {
                                            const isChecked = e.target.checked;
                                            setEditCourseData({...editCourseData, allowTeachersFreeAccess: isChecked});
                                            try {
                                                await updateCourseApi(course.id, { allowTeachersFreeAccess: isChecked });
                                                onCourseUpdated();
                                                showToast(isChecked ? 'Доступ для коллег открыт' : 'Доступ для коллег закрыт', 'success');
                                            } catch (error) {
                                                showToast('Ошибка при сохранении', 'error');
                                            }
                                        }}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            {enrollmentsList.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                                    Пока нет ни одной заявки
                                </div>
                            ) : (
                                enrollmentsList.map(req => (
                                    <div key={req.id} style={{ background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {req.user?.avatarUrl ? <img src={req.user.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <span style={{color:'#fff', fontWeight: 'bold'}}>{req.user?.firstName?.[0] || '?'}</span>}
                                            </div>
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>{req.user?.firstName} {req.user?.lastName}</div>
                                                <div style={{ color: '#888', fontSize: '12px' }}>{req.user?.email}</div>
                                                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                    Заявка от: {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            {req.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-icon" style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,136,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(0,255,136,0.1)'} onClick={() => onEnrollmentAction(req.id, 'approved')}>
                                                        ✅ Принять
                                                    </button>
                                                    <button className="btn-icon" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 77, 77, 0.3)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,77,77,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,77,77,0.1)'} onClick={() => onEnrollmentAction(req.id, 'rejected')}>
                                                        ❌ Отклонить
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', background: req.status === 'approved' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 77, 77, 0.1)', color: req.status === 'approved' ? '#00ff88' : '#ff4d4d', border: `1px solid ${req.status === 'approved' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 77, 77, 0.3)'}` }}>
                                                    {req.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Модалка передачи прав (внутри SettingsModal) */}
            {transferUserId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }} onClick={() => setTransferUserId(null)}>
                    <div style={{ background: '#111', padding: '30px', borderRadius: '20px', border: '1px solid #ff4d4d', width: '450px', animation: 'fadeIn 0.2s ease', textAlign: 'center', boxShadow: '0 20px 50px rgba(255, 77, 77, 0.15)' }} onClick={(e) => e.stopPropagation()} >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                        <h2 style={{color: '#fff', marginBottom: '15px', marginTop: 0}}>Передача прав</h2>
                        <p style={{color: '#aaa', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px'}}>
                            Вы уверены, что хотите передать права Владельца этому пользователю? <br/><br/>
                            <span style={{color: '#ff4d4d', fontWeight: 'bold'}}>Вы станете обычным соавтором</span>, а ФИО преподавателя на обложке курса изменится. Отменить это действие самостоятельно будет невозможно.
                        </p>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, color: '#888' }} onClick={() => setTransferUserId(null)} disabled={isTransferring}>
                                Отмена
                            </button>
                            <button style={{ flex: 1, background: 'rgba(255, 77, 77, 0.2)', border: '1px solid rgba(255, 77, 77, 0.4)', color: '#ff4d4d', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onClick={handleTransferOwnership} disabled={isTransferring}>
                                {isTransferring ? 'Передаем...' : 'Да, передать права'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
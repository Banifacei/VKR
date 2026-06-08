import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { updateCourseApi, deleteCourseApi } from '../../api/videoApi';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { ICourse } from '../../types';
import { Icons } from '../Icons';

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
    const confirm = useConfirm();
    const navigate = useNavigate();
    
    // Стейты самой модалки
    const [settingsTab, setSettingsTab] = useState<'info' | 'team' | 'enrollments'>('info');
    const [editCourseData, setEditCourseData] = useState({ title: '', description: '', instructor: '', enrollmentType: 'open', allowTeachersFreeAccess: false });
    
    const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'banned'>('all');
    const [isMassApproving, setIsMassApproving] = useState(false);
    const [enrollmentDropdownOpen, setEnrollmentDropdownOpen] = useState(false);

    const enrollmentOptions = [
        { value: 'open',    label: '🟢 Открытый (Свободный вход)' },
        { value: 'request', label: '🟡 По заявкам (Ручная модерация)' },
        { value: 'closed',  label: '🔴 Закрытый (Запись остановлена)' },
    ];
    const [courseBans, setCourseBans] = useState<any[]>([]);

    const loadCourseBans = async () => {
        try {
            const res = await api.get(`/videos/courses/${course.id}/bans`);
            setCourseBans(res.data);
        } catch { /* */ }
    };

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
    }, [course]);

    const handleCloseModal = () => {
        setSettingsTab('info');
        setEnrollmentFilter('all'); // Сбрасываем фильтр при закрытии
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
        const ok = await confirm({ title: 'Удалить из команды', message: 'Убрать этого пользователя из команды курса?', confirmText: 'Удалить', danger: true });
        if (!ok) return;
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

    const filteredEnrollments = enrollmentFilter === 'banned'
        ? []
        : enrollmentsList.filter(req => {
            if (enrollmentFilter === 'all') return true;
            return req.status === enrollmentFilter;
        });

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div style={{ background: 'var(--bg-panel)', borderRadius: 'clamp(12px, 3vw, 24px)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '700px', height: 'min(600px, calc(100dvh - 40px))', margin: '0 16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column'}}>
                
                <div style={{ padding: 'clamp(12px, 4vw, 20px) clamp(14px, 5vw, 25px)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{margin: 0, color: 'var(--text-main)'}}>Настройки курса</h3>
                    <button style={{background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'20px'}} onClick={handleCloseModal}>✕</button>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-deep)' }}>
                    <button onClick={() => setSettingsTab('info')} style={{ flex: 1, padding: 'clamp(10px, 3vw, 15px) clamp(6px, 2vw, 15px)', background: 'none', border: 'none', borderBottom: settingsTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', color: settingsTab === 'info' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', fontSize: 'clamp(12px, 3vw, 14px)' }}>Основное</button>
                    <button onClick={() => { setSettingsTab('enrollments'); fetchEnrollments(); loadCourseBans(); }} style={{ flex: 1, padding: 'clamp(10px, 3vw, 15px) clamp(6px, 2vw, 15px)', background: 'none', border: 'none', borderBottom: settingsTab === 'enrollments' ? '2px solid var(--primary)' : '2px solid transparent', color: settingsTab === 'enrollments' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: 'clamp(12px, 3vw, 14px)' }}>
                        Заявки
                        {pendingCount > 0 && (
                            <span style={{ background: '#ff4d4d', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', lineHeight: 1 }}>{pendingCount}</span>
                        )}
                    </button>
                    <button onClick={() => { setSettingsTab('team'); fetchCollaborators(); }} style={{ flex: 1, padding: 'clamp(10px, 3vw, 15px) clamp(6px, 2vw, 15px)', background: 'none', border: 'none', borderBottom: settingsTab === 'team' ? '2px solid var(--primary)' : '2px solid transparent', color: settingsTab === 'team' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', fontSize: 'clamp(12px, 3vw, 14px)' }}>Команда</button>
                </div>

                <div style={{ padding: 'clamp(12px, 3vw, 20px) clamp(12px, 3.5vw, 20px)', overflowY: 'auto', flex: 1 }}>
                    
                    {/* --- ВКЛАДКА 1: ОСНОВНОЕ --- */}
                    {settingsTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Название курса</label><input className="modern-input" value={editCourseData.title} onChange={e => setEditCourseData({...editCourseData, title: e.target.value})} /></div>
                            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ФИО Преподавателя</label><input className="modern-input" value={editCourseData.instructor} onChange={e => setEditCourseData({...editCourseData, instructor: e.target.value})} /></div>
                            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Описание</label><textarea className="modern-input" style={{ minHeight: '150px' }} value={editCourseData.description} onChange={e => setEditCourseData({...editCourseData, description: e.target.value})} /></div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1, opacity: isChanged ? 1 : 0.5 }} disabled={!isChanged} onClick={async () => {
                                    try {
                                        await updateCourseApi(course.id, editCourseData as any);
                                        onCourseUpdated(); 
                                        handleCloseModal(); 
                                        showToast('Курс обновлен!', 'success');
                                    } catch (e) { showToast('Ошибка', 'error'); }
                                }}>Сохранить</button>
                                
                                {isOwner && (
                                    <button className="btn btn-ghost" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d' }} onClick={async () => {
                                        const ok = await confirm({ title: 'Удалить курс', message: `Навсегда удалить курс «${course.title}»? Все уроки, тесты и прогресс студентов будут потеряны. Это действие необратимо.`, confirmText: 'Удалить курс', danger: true });
                                        if (!ok) return;
                                        try { await deleteCourseApi(course.id); navigate('/'); } catch (e) { showToast('Ошибка', 'error'); }
                                    }}><Icons.Trash size={14}/> Удалить</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- ВКЛАДКА 2: КОМАНДА --- */}
                    {settingsTab === 'team' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {isOwner ? (
                                <div style={{ position: 'relative', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '12px', padding: '0 15px', border: '1px solid var(--border-color)', transition: 'border-color 0.2s', position: 'relative', zIndex: 101 }}>
                                        <Icons.Search size={15} />
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
                                        {isSearching && <span className="loader-dots" style={{color: 'var(--primary)', paddingRight: '10px'}}>...</span>}
                                    </div>

                                    {showDropdown && searchResults.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '55px', left: 0, right: 0,
                                            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 102, overflowY: 'auto', 
                                            maxHeight: '260px', animation: 'fadeIn 0.2s ease'
                                        }}>
                                            {searchResults.map(userItem => {
                                                if (collaborators.some(c => c.userId === userItem.id)) return null;
                                                return (
                                                    <div key={userItem.id} 
                                                        onClick={() => handleInviteUser(userItem.email)}
                                                        style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            {userItem.avatarUrl ? <img src={userItem.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <span style={{color:'var(--text-main)', fontSize:'14px'}}>{userItem.firstName?.[0] || '?'}</span>}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 'bold' }}>{userItem.firstName} {userItem.lastName}</div>
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{userItem.email}</div>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)', padding: '4px 8px', borderRadius: '6px' }}>
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

                            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                {collaborators.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Никого нет</div> : collaborators.map(col => (
                                    <div key={col.userId} style={{ padding: '12px 15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ flex: 1, minWidth: '140px' }}>
                                            <div style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 'bold' }}>{col.user?.firstName} {col.user?.lastName}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{col.user?.email}</div>
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
                            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Режим доступа к курсу</label>
                                <div style={{ position: 'relative' }}>
                                    <div
                                        onClick={() => setEnrollmentDropdownOpen(o => !o)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid #333', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)', userSelect: 'none' }}
                                    >
                                        <span>{enrollmentOptions.find(o => o.value === editCourseData.enrollmentType)?.label}</span>
                                        <span style={{ marginLeft: '10px', color: 'var(--text-muted)', fontSize: '12px', transition: 'transform 0.2s', display: 'inline-block', transform: enrollmentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                    </div>
                                    {enrollmentDropdownOpen && (
                                        <>
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setEnrollmentDropdownOpen(false)} />
                                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', zIndex: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                                {enrollmentOptions.map(opt => (
                                                    <div
                                                        key={opt.value}
                                                        onClick={async () => {
                                                            setEnrollmentDropdownOpen(false);
                                                            if (opt.value === editCourseData.enrollmentType) return;
                                                            const newType = opt.value as 'open' | 'request' | 'closed';
                                                            setEditCourseData({...editCourseData, enrollmentType: newType});
                                                            try {
                                                                await updateCourseApi(course.id, { enrollmentType: newType });
                                                                onCourseUpdated();
                                                                showToast('Режим доступа успешно изменен!', 'success');
                                                            } catch {
                                                                showToast('Ошибка при сохранении режима', 'error');
                                                            }
                                                        }}
                                                        style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px', color: opt.value === editCourseData.enrollmentType ? 'var(--primary)' : 'var(--text-main)', background: opt.value === editCourseData.enrollmentType ? 'rgba(var(--primary-rgb),0.08)' : 'transparent', borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => { if (opt.value !== editCourseData.enrollmentType) e.currentTarget.style.background = 'var(--bg-input)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = opt.value === editCourseData.enrollmentType ? 'rgba(var(--primary-rgb),0.08)' : 'transparent'; }}
                                                    >
                                                        {opt.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 'bold' }}>Свободный доступ для коллег</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Автоматически одобрять заявки от других преподавателей</div>
                                </div>
                                <label className="lumeo-toggle">
                                    <input 
                                        type="checkbox" 
                                        checked={editCourseData.allowTeachersFreeAccess || false} 
                                        onChange={async (e) => {
                                            const isChecked = e.target.checked;
                                            setEditCourseData({...editCourseData, allowTeachersFreeAccess: isChecked});
                                            try {
                                                await updateCourseApi(course.id, { allowTeachersFreeAccess: isChecked });
                                                onCourseUpdated();
                                                showToast(isChecked ? 'Доступ для коллег открыт' : 'Доступ для коллег закрыт', 'success');
                                            } catch (error) { showToast('Ошибка при сохранении', 'error'); }
                                        }}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                                    <button onClick={() => setEnrollmentFilter('all')} className={enrollmentFilter === 'all' ? 'enrollment-filter-all-active' : ''} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: enrollmentFilter === 'all' ? '#333' : 'transparent', color: enrollmentFilter === 'all' ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', transition: '0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>Все ({enrollmentsList.length})</button>
                                    <button onClick={() => setEnrollmentFilter('pending')} className={enrollmentFilter === 'pending' ? 'enrollment-filter-pending-active' : ''} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: enrollmentFilter === 'pending' ? 'rgba(255, 215, 0, 0.15)' : 'transparent', color: enrollmentFilter === 'pending' ? '#ffd700' : 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', transition: '0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>Новые ({pendingCount})</button>
                                    <button onClick={() => setEnrollmentFilter('approved')} className={enrollmentFilter === 'approved' ? 'enrollment-filter-approved-active' : ''} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: enrollmentFilter === 'approved' ? 'rgba(0, 255, 136, 0.15)' : 'transparent', color: enrollmentFilter === 'approved' ? '#00ff88' : 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', transition: '0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>Одобрены</button>
                                    <button onClick={() => setEnrollmentFilter('rejected')} className={enrollmentFilter === 'rejected' ? 'enrollment-filter-rejected-active' : ''} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: enrollmentFilter === 'rejected' ? 'rgba(255, 77, 77, 0.15)' : 'transparent', color: enrollmentFilter === 'rejected' ? '#ff4d4d' : 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', transition: '0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>Отклонены</button>
                                    <button onClick={() => setEnrollmentFilter('banned')} className={enrollmentFilter === 'banned' ? 'enrollment-filter-banned-active' : ''} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: enrollmentFilter === 'banned' ? 'rgba(255,100,0,0.15)' : 'transparent', color: enrollmentFilter === 'banned' ? '#ff6400' : 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', transition: '0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>Заблокированы ({courseBans.length})</button>
                                </div>

                                {/* Кнопка "Принять всех" появляется только если есть заявки в ожидании */}
                                {pendingCount > 0 && (
                                    <button 
                                        onClick={async () => {
                                            const ok = await confirm({ title: 'Массовое одобрение', message: `Одобрить все ${pendingCount} новых заявки на курс?`, confirmText: 'Одобрить все' });
                                            if (!ok) return;
                                            setIsMassApproving(true);
                                            try {
                                                const pendingIds = enrollmentsList.filter(req => req.status === 'pending').map(req => req.id);
                                                // Отправляем запросы параллельно для скорости
                                                await Promise.all(pendingIds.map(id => api.put(`/videos/courses/enrollments/${id}`, { status: 'approved' })));
                                                showToast(`Успешно одобрено заявок: ${pendingCount}`, 'success');
                                                fetchEnrollments();
                                            } catch (e) {
                                                showToast('Ошибка при массовом одобрении', 'error');
                                            } finally {
                                                setIsMassApproving(false);
                                            }
                                        }}
                                        disabled={isMassApproving}
                                        style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00b35f 100%)', color: '#000', border: 'none', padding: '6px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 255, 136, 0.2)', opacity: isMassApproving ? 0.5 : 1 }}
                                    >
                                        {isMassApproving ? 'Загрузка...' : <><Icons.Rocket size={14}/> Принять всех</>}
                                    </button>
                                )}
                            </div>

                            {/* Список заблокированных */}
                            {enrollmentFilter === 'banned' && (
                                courseBans.length === 0 ? (
                                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                                        Нет заблокированных пользователей
                                    </div>
                                ) : courseBans.map(ban => (
                                    <div key={ban.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid rgba(255,100,0,0.3)', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {ban.user?.avatarUrl ? <img src={ban.user.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} alt=""/> : <span style={{color:'var(--text-main)', fontWeight: 'bold'}}>{ban.user?.firstName?.[0] || '?'}</span>}
                                            </div>
                                            <div>
                                                <div style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 'bold' }}>{ban.user?.firstName} {ban.user?.lastName}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{ban.user?.email}</div>
                                                {ban.reason && <div style={{ fontSize: '11px', color: '#ff6400', marginTop: '4px' }}>Причина: {ban.reason}</div>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                await api.delete(`/videos/courses/${course.id}/bans/${ban.userId}`);
                                                setCourseBans(prev => prev.filter(b => b.id !== ban.id));
                                                showToast('Пользователь разблокирован', 'success');
                                            }}
                                            style={{ background: 'transparent', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                        >Разблокировать</button>
                                    </div>
                                ))
                            )}

                            {enrollmentFilter !== 'banned' && (filteredEnrollments.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                                    Ничего не найдено
                                </div>
                            ) : (
                                filteredEnrollments.map(req => (
                                    <div key={req.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '140px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {req.user?.avatarUrl ? <img src={req.user.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <span style={{color:'var(--text-main)', fontWeight: 'bold'}}>{req.user?.firstName?.[0] || '?'}</span>}
                                            </div>
                                            <div>
                                                <div style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 'bold' }}>{req.user?.firstName} {req.user?.lastName}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{req.user?.email}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    Заявка от: {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            {req.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-icon" style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', display: 'inline-flex', alignItems: 'center', gap: '5px' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,136,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(0,255,136,0.1)'} onClick={() => onEnrollmentAction(req.id, 'approved')}>
                                                        <Icons.LogSuccess size={13}/> Принять
                                                    </button>
                                                    <button className="btn-icon" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 77, 77, 0.3)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', display: 'inline-flex', alignItems: 'center', gap: '5px' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,77,77,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,77,77,0.1)'} onClick={() => onEnrollmentAction(req.id, 'rejected')}>
                                                        <Icons.Fail size={13}/> Отклонить
                                                    </button>
                                                </div>
                                            ) : req.status === 'approved' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
                                                        Одобрено
                                                    </span>
                                                    <button
                                                        onClick={async () => { const ok = await confirm({ title: 'Исключить студента', message: 'Отозвать доступ к курсу?', confirmText: 'Исключить', danger: true }); if (ok) onEnrollmentAction(req.id, 'rejected'); }}
                                                        style={{ background: 'transparent', color: '#ff4d4d', border: '1px solid rgba(255,77,77,0.3)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }}
                                                        title="Исключить студента"
                                                    >Исключить</button>
                                                    <button
                                                        onClick={async () => {
                                                            const ok = await confirm({ title: 'Заблокировать в курсе', message: `Заблокировать ${req.user?.firstName} в этом курсе? Студент потеряет доступ.`, confirmText: 'Заблокировать', danger: true });
                                                            if (!ok) return;
                                                            await api.post(`/videos/courses/${course.id}/bans/${req.user?.id}`, { reason: '' });
                                                            onEnrollmentAction(req.id, 'rejected');
                                                            await loadCourseBans();
                                                            showToast('Пользователь заблокирован в курсе', 'success');
                                                        }}
                                                        style={{ background: 'transparent', color: '#ff6400', border: '1px solid rgba(255,100,0,0.3)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }}
                                                        title="Заблокировать в курсе"
                                                    >Заблокировать</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                                                        Отклонено
                                                    </span>
                                                    {/* Кнопка возврата доступа */}
                                                    <button 
                                                        onClick={() => onEnrollmentAction(req.id, 'approved')}
                                                        style={{ background: 'transparent', color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.3)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }}
                                                        onMouseEnter={e=>e.currentTarget.style.background='rgba(0, 255, 136, 0.1)'} 
                                                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                                                        title="Вернуть доступ"
                                                    >
                                                        <Icons.RotateCcw size={13}/> Вернуть
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Модалка передачи прав */}
            {transferUserId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }} onClick={() => setTransferUserId(null)}>
                    <div style={{ background: 'var(--bg-panel)', padding: 'clamp(20px, 5vw, 30px)', borderRadius: '20px', border: '1px solid #ff4d4d', width: 'calc(100% - 32px)', maxWidth: '450px', animation: 'fadeIn 0.2s ease', textAlign: 'center', boxShadow: '0 20px 50px rgba(255, 77, 77, 0.15)' }} onClick={(e) => e.stopPropagation()} >
                        <div style={{ marginBottom: '15px' }}><Icons.AlertTriangle size={48}/></div>
                        <h2 style={{color: 'var(--text-main)', marginBottom: '15px', marginTop: 0}}>Передача прав</h2>
                        <p style={{color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px'}}>
                            Вы уверены, что хотите передать права Владельца этому пользователю? <br/><br/>
                            <span style={{color: '#ff4d4d', fontWeight: 'bold'}}>Вы станете обычным соавтором</span>, а ФИО преподавателя на обложке курса изменится. Отменить это действие самостоятельно будет невозможно.
                        </p>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--text-muted)' }} onClick={() => setTransferUserId(null)} disabled={isTransferring}>
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
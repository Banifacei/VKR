import { useState, useEffect } from 'react';
import { UserProfile } from '../components/UserProfile';
import { Link } from 'react-router-dom';
import './AdminPage.css';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, changeUserRole, updateUser, createUser, deleteUser } from '../api/userApi';
import type { IAdminUser } from '../api/userApi';

const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Server: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>,
    Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Shield: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
    Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
    Code: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
    Database: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
    Terminal: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>,
    Zap: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
    LogInfo: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aeef" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
    LogSuccess: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
    LogWarning: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    LogError: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
};

interface ISystemLog { id: number; time: string; msg: string; type: 'info' | 'success' | 'error' | 'warning'; }

export const AdminPage = () => {
  const { user, logout, updateUser: updateContextUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [usersList, setUsersList] = useState<IAdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Стейты для реальных данных сервера
  const [storageData, setStorageData] = useState({ total: 100, video: 0, db: 0, cache: 0 });
  const [systemLogs, setSystemLogs] = useState<ISystemLog[]>([]);
  const [serverStats, setServerStats] = useState({ cpu: 0, ram: 0, connections: 0, uptime: '...' });
  const [isActionExecuting, setIsActionExecuting] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  // Модальное окно управления пользователем
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', role: 'student', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  
  const fetchSystemData = async () => {
      try {
          const token = localStorage.getItem('lumeo_token');
          const headers = { 'Authorization': `Bearer ${token}` };
          
          const storageRes = await fetch('http://localhost:5000/api/admin/storage', { headers });
          if (storageRes.ok) setStorageData(await storageRes.json());
          
          const logsRes = await fetch('http://localhost:5000/api/admin/logs', { headers });
          if (logsRes.ok) setSystemLogs(await logsRes.json());
      } catch (e) { console.error('Ошибка загрузки статических данных системы'); }
  };

  const fetchLiveServerStats = async () => {
      try {
          const token = localStorage.getItem('lumeo_token');
          const headers = { 'Authorization': `Bearer ${token}` };
          const serverRes = await fetch('http://localhost:5000/api/admin/server-stats', { headers });
          if (serverRes.ok) setServerStats(await serverRes.json());
      } catch (e) {}
  };

  // Инициализация и радары
  useEffect(() => {
      fetchUsers();
      fetchSystemData();
      fetchLiveServerStats();
      
      const staticInterval = setInterval(fetchSystemData, 10000);
      const liveInterval = setInterval(fetchLiveServerStats, 1500); 

      return () => {
          clearInterval(staticInterval);
          clearInterval(liveInterval);
      };
  }, []);

  const handleQuickAction = async (endpoint: string, actionName: string) => {
      if (!window.confirm(`Вы уверены, что хотите: ${actionName}?`)) return;
      setIsActionExecuting(true);
      try {
          const token = localStorage.getItem('lumeo_token');
          const res = await fetch(`http://localhost:5000/api/admin/${endpoint}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) throw new Error();
          alert(`✅ Успешно: ${actionName}`);
          fetchSystemData();
      } catch (e) { alert(`❌ Ошибка выполнения.`); } 
      finally { setIsActionExecuting(false); }
  };

  const systemPlugins = [
      { id: 1, name: 'Lumeo Core API', version: 'v2.4.1', status: 'Активен' },
      { id: 2, name: 'AI Subtitle Engine', version: 'v1.1.0', status: 'Активен' },
      { id: 3, name: 'Video Transcoder', version: 'v4.4.2', status: 'Активен' },
      { id: 4, name: 'PostgreSQL DB', version: 'v14.5', status: 'Активен' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('lumeo_user');
    localStorage.removeItem('lumeo_token');
    logout();
    window.location.href = '/auth';
  };

  const handleAvatarUpdate = (newUrl: string) => updateContextUser({ avatarUrl: newUrl });

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const data = await getAllUsers();
          setUsersList(data);
      } catch (e) { alert('Ошибка при загрузке пользователей'); } 
      finally { setLoading(false); }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
      const oldList = [...usersList];
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      try { await changeUserRole(userId, newRole); } 
      catch (e) { alert('Не удалось сменить роль'); setUsersList(oldList); }
  };

  // Управление пользователями
  const openAddModal = () => {
      setModalMode('add');
      setUserForm({ firstName: '', lastName: '', email: '', role: 'student', password: '' });
  };

  const openEditModal = (u: IAdminUser) => {
      setModalMode('edit');
      setEditingUserId(u.id);
      setUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, password: '' });
  };

  const closeModal = () => {
      setModalMode(null);
      setEditingUserId(null);
  };

  const handleSubmitUser = async () => {
      setIsSaving(true);
      try {
          if (modalMode === 'add') {
              if (!userForm.password || !userForm.email) return alert('Email и пароль обязательны!');
              const newUser = await createUser(userForm);
              setUsersList([newUser, ...usersList]);
              alert('Пользователь успешно создан!');
          } else if (modalMode === 'edit' && editingUserId) {
              await updateUser(editingUserId, userForm);
              setUsersList(prev => prev.map(u => u.id === editingUserId ? { ...u, ...userForm } as IAdminUser : u));
              if (user && user.id === editingUserId) {
                  updateContextUser({ firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, role: userForm.role });
              }
              alert('Данные обновлены');
          }
          closeModal();
      } catch (e) { alert('Ошибка при сохранении пользователя'); } 
      finally { setIsSaving(false); }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
      if (user?.id === userId) return alert('Вы не можете удалить самого себя!');
      if (!window.confirm(`Вы действительно хотите удалить пользователя ${userName}? Это действие необратимо.`)) return;
      
      try {
          await deleteUser(userId);
          setUsersList(prev => prev.filter(u => u.id !== userId));
      } catch (e) {
          alert('Ошибка при удалении пользователя');
      }
  };

  const storageTotal = storageData.total || 1; 
  const storageUsed = storageData.video + storageData.db + storageData.cache;
  const filteredLogs = systemLogs.filter(log => logFilter === 'all' || log.type === logFilter);
  return (
    <div className="lumeo-layout">
      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ */}
      {modalMode && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3>{modalMode === 'add' ? 'Добавить пользователя' : 'Редактирование профиля'}</h3>
                      <button className="btn-icon" onClick={closeModal}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
                          <div style={{ flex: 1 }}>
                              <label>Имя</label>
                              <input className="modern-input" value={userForm.firstName} onChange={e => setUserForm({...userForm, firstName: e.target.value})} />
                          </div>
                          <div style={{ flex: 1 }}>
                              <label>Фамилия</label>
                              <input className="modern-input" value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})} />
                          </div>
                      </div>
                      <div className="form-group">
                          <label>Email (Логин)</label>
                          <input className="modern-input" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Уровень доступа</label>
                          <select className="modern-input" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                              <option value="student">Студент</option>
                              <option value="teacher">Преподаватель</option>
                              <option value="admin">Администратор</option>
                          </select>
                      </div>
                      <div className="form-group" style={{marginTop: '25px', borderTop: '1px solid #333', paddingTop: '15px'}}>
                          <label style={{color: modalMode === 'add' ? '#fff' : '#ff4d4d'}}>
                              {modalMode === 'add' ? 'Пароль (Обязательно)' : 'Смена пароля'}
                          </label>
                          <input 
                              className="modern-input" 
                              type="password" 
                              placeholder={modalMode === 'add' ? 'Введите пароль' : 'Оставьте пустым, если не меняете'} 
                              value={userForm.password} 
                              onChange={e => setUserForm({...userForm, password: e.target.value})} 
                          />
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                      <button className="btn btn-primary" onClick={handleSubmitUser} disabled={isSaving}>
                          {isSaving ? 'Загрузка...' : (modalMode === 'add' ? 'Создать пользователя' : 'Сохранить изменения')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ШАПКА */}
      <header className="lumeo-header">
          <div className="logo-group">
            <div className="logo">Lumeo<span className="dot">.</span></div>
            <span className="admin-badge">ROOT ACCESS</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              {user && <UserProfile user={user} onUpdate={handleAvatarUpdate} onLogout={handleLogout} />}
          </div>
      </header>

      <div className="lumeo-container">
        <main className="admin-layout">
            
            <div className="admin-header">
                <h1>Панель управления</h1>
                <p>Центр мониторинга и управления образовательной платформой</p>
            </div>

            {/* ВКЛАДКИ НАВИГАЦИИ */}
            <div className="admin-tabs">
                <button className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                    <Icons.Server /> Обзор системы
                </button>
                <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <Icons.Users /> Управление пользователями
                </button>
            </div>

            {/* МЕТРИКИ СВЕРХУ */}
            <div className="metrics-row">
                <div className="stat-card mini">
                    <div className="stat-icon" style={{color: '#00aeef'}}><Icons.Users /></div>
                    <div className="stat-info">
                        <div className="stat-label">Пользователей</div>
                        <div className="stat-value">{usersList.length}</div>
                    </div>
                </div>
                <div className="stat-card mini">
                    <div className="stat-icon" style={{color: '#ffd700'}}><Icons.Code /></div>
                    <div className="stat-info">
                        <div className="stat-label">Преподавателей</div>
                        <div className="stat-value">{usersList.filter(u => u.role === 'teacher').length}</div>
                    </div>
                </div>
                <div className="stat-card mini">
                    <div className="stat-icon" style={{color: '#ff4d4d'}}><Icons.Shield /></div>
                    <div className="stat-info">
                        <div className="stat-label">Администраторов</div>
                        <div className="stat-value">{usersList.filter(u => u.role === 'admin').length}</div>
                    </div>
                </div>
                <div className="stat-card mini">
                    <div className="stat-icon" style={{color: '#00ff88'}}><Icons.Activity /></div>
                    <div className="stat-info">
                        <div className="stat-label">Активных сессий</div>
                        <div className="stat-value">{serverStats.connections}</div>
                    </div>
                </div>
            </div>

            {/* ==================== ВКЛАДКА 1: ОБЗОР СИСТЕМЫ ==================== */}
            {activeTab === 'system' && (
                <div className="dashboard-columns">
                    <div className="dashboard-main">
                        
                        {/* 🔥 ПРОКАЧАННАЯ ПАНЕЛЬ ЛОГОВ */}
                        <div className="admin-section log-section">
                            <div className="section-header compact" style={{flexWrap: 'wrap', gap: '10px'}}>
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Terminal /> Журнал событий</h2>
                                
                                {/* ПАНЕЛЬ ФИЛЬТРОВ */}
                                <div className="log-filters">
                                    <button className={`filter-btn ${logFilter === 'all' ? 'active' : ''}`} onClick={() => setLogFilter('all')}>Все</button>
                                    <button className={`filter-btn info ${logFilter === 'info' ? 'active' : ''}`} onClick={() => setLogFilter('info')}>Инфо</button>
                                    <button className={`filter-btn success ${logFilter === 'success' ? 'active' : ''}`} onClick={() => setLogFilter('success')}>Успех</button>
                                    <button className={`filter-btn warning ${logFilter === 'warning' ? 'active' : ''}`} onClick={() => setLogFilter('warning')}>Внимание</button>
                                    <button className={`filter-btn error ${logFilter === 'error' ? 'active' : ''}`} onClick={() => setLogFilter('error')}>Ошибки</button>
                                    <button className="btn-icon" style={{marginLeft: 'auto'}} onClick={fetchSystemData} title="Обновить"><Icons.Refresh /></button>
                                </div>
                            </div>
                            
                            <div className="section-body log-container">
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map(log => (
                                        <div key={log.id} className={`log-item log-type-${log.type}`}>
                                            <div className="log-time">{log.time}</div>
                                            <div className="log-icon-wrapper">
                                                {log.type === 'info' && <Icons.LogInfo />}
                                                {log.type === 'success' && <Icons.LogSuccess />}
                                                {log.type === 'warning' && <Icons.LogWarning />}
                                                {log.type === 'error' && <Icons.LogError />}
                                            </div>
                                            <div className="log-message">
                                                <span className={`log-badge badge-${log.type}`}>{log.type.toUpperCase()}</span>
                                                {log.msg}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="log-empty-state">
                                        <Icons.Terminal />
                                        <span>Нет записей для этого фильтра</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА (Сервер, Диск, Кнопки) */}
                    <aside className="dashboard-sidebar">
                        <div className="admin-section sidebar-section">
                            <div className="section-header compact">
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Server /> Сервер Lumeo</h2>
                                <div className="server-status small"><span className="pulse-dot"></span> Online</div>
                            </div>
                            <div className="section-body">
                                <div style={{fontSize: '11px', color: '#666', marginBottom: '15px', textAlign: 'right'}}>
                                    Аптайм: {serverStats.uptime}
                                </div>
                                <div className="server-monitor">
                                    <div className="monitor-row">
                                        <span>CPU ({serverStats.cpu.toFixed(1)}%)</span>
                                        <div className="progress-bar-bg"><div className="progress-bar-fill cpu" style={{width: `${serverStats.cpu}%`}}></div></div>
                                    </div>
                                    <div className="monitor-row">
                                        <span>RAM ({serverStats.ram.toFixed(1)}%)</span>
                                        <div className="progress-bar-bg"><div className="progress-bar-fill ram" style={{width: `${serverStats.ram}%`}}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="admin-section sidebar-section">
                            <div className="section-header compact">
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Database /> Хранилище (S3)</h2>
                            </div>
                            <div className="section-body">
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px'}}>
                                    <span style={{color: '#fff', fontWeight: 'bold'}}>{storageUsed.toFixed(1)} GB</span>
                                    <span style={{color: '#666'}}>из {storageTotal} GB</span>
                                </div>
                                <div className="storage-bar">
                                    <div className="storage-segment video" style={{width: `${(storageData.video / storageTotal) * 100}%`}}></div>
                                    <div className="storage-segment db" style={{width: `${(storageData.db / storageTotal) * 100}%`}}></div>
                                    <div className="storage-segment cache" style={{width: `${(storageData.cache / storageTotal) * 100}%`}}></div>
                                </div>
                                <div className="storage-legend">
                                    <div className="legend-item"><div className="dot video"></div>Видео</div>
                                    <div className="legend-item"><div className="dot db"></div>БД</div>
                                    <div className="legend-item"><div className="dot cache"></div>Кэш (AI)</div>
                                </div>
                            </div>
                        </div>

                        <div className="admin-section sidebar-section">
                            <div className="section-header compact">
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Zap /> Быстрые действия</h2>
                            </div>
                            <div className="section-body quick-actions-grid">
                                <button className="quick-action-btn" disabled={isActionExecuting} onClick={() => handleQuickAction('clear-cache', 'Очистить кэш ИИ')}>Очистить кэш ИИ</button>
                                <button className="quick-action-btn" disabled={isActionExecuting} onClick={() => handleQuickAction('backup-db', 'Сделать бэкап БД')}>Сделать бэкап БД</button>
                                <button className="quick-action-btn danger" disabled={isActionExecuting} onClick={() => handleQuickAction('restart', 'Принудительная перезагрузка')}>Принудительная перезагрузка</button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* ==================== ВКЛАДКА 2: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==================== */}
            {activeTab === 'users' && (
                <div className="admin-section">
                    <div className="section-header">
                        <h2>База пользователей</h2>
                        <div className="actions-row">
                            <button className="btn btn-primary" onClick={openAddModal}><Icons.Plus /> Добавить</button>
                            <button className="btn btn-secondary" onClick={fetchUsers}><Icons.Refresh /> Обновить</button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{padding: '40px', textAlign: 'center', color: '#666'}}>Загрузка базы данных...</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Пользователь</th>
                                        <th>Роль</th>
                                        <th style={{textAlign: 'right'}}>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{fontWeight: '600', color: '#fff', fontSize: '14px', marginBottom: '4px'}}>
                                                    {u.firstName} {u.lastName}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>{u.email} &bull; ID: {u.id}</div>
                                            </td>
                                            <td>
                                                <select className={`role-select ${u.role}`} value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                                                    <option value="student">Студент</option>
                                                    <option value="teacher">Преподаватель</option>
                                                    <option value="admin">Администратор</option>
                                                </select>
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                                                    <button className="btn-icon" onClick={() => openEditModal(u)} title="Настроить"><Icons.Edit /></button>
                                                    <button className="btn-icon delete-icon" onClick={() => handleDeleteUser(u.id, u.firstName)} title="Удалить"><Icons.Trash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </main>
      </div>
    </div>
  );
};
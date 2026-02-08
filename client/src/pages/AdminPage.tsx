import { useState, useEffect } from 'react';
import { UserProfile } from '../components/UserProfile';
import { Link } from 'react-router-dom';
import './AdminPage.css';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, changeUserRole, updateUser } from '../api/userApi';
import type { IAdminUser } from '../api/userApi'; // Отдельный импорт для типа

const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

export const AdminPage = () => {
  const { user, logout, updateUser: updateContextUser } = useAuth();
  const [usersList, setUsersList] = useState<IAdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояния для модального окна редактирования
  const [editingUser, setEditingUser] = useState<IAdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', role: 'student', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Вычисляем, изменились ли данные
  const hasChanges = editingUser && (
      editForm.firstName !== editingUser.firstName ||
      editForm.lastName !== editingUser.lastName ||
      editForm.email !== editingUser.email ||
      editForm.role !== editingUser.role ||
      editForm.password.trim() !== '' // Если пароль введен, считаем это изменением
  );

  const handleLogout = () => {
    localStorage.removeItem('lumeo_user');
    localStorage.removeItem('lumeo_token');
    logout();
    window.location.href = '/auth';
  };

  const handleAvatarUpdate = (newUrl: string) => {
        updateContextUser({ avatarUrl: newUrl });
  };

  const fetchUsers = async () => {
      try {
          const data = await getAllUsers();
          setUsersList(data);
      } catch (e) {
          alert('Ошибка при загрузке пользователей');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Быстрая смена роли (из списка)
  const handleRoleChange = async (userId: number, newRole: string) => {
      const oldList = [...usersList];
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      try {
          await changeUserRole(userId, newRole);
      } catch (e) {
          alert('Не удалось сменить роль');
          setUsersList(oldList);
      }
  };

  // Открытие модального окна
  const openEditModal = (user: IAdminUser) => {
      setEditingUser(user);
      setEditForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          password: '' // Пароль всегда пустой при открытии
      });
  };

  // Сохранение изменений из модалки
  const handleSaveUser = async () => {
      if (!editingUser) return;
      setIsSaving(true);
      try {
          // 1. Отправляем изменения на сервер
          await updateUser(editingUser.id, editForm);
          
          // 2. Обновляем таблицу (локальный список)
          setUsersList(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } as IAdminUser : u));

          // 3. ВАЖНОЕ ИЗМЕНЕНИЕ: Если админ редактирует СЕБЯ, обновляем контекст
          // user - это текущий залогиненный пользователь из useAuth()
          if (user && user.id === editingUser.id) {
              updateContextUser({
                  firstName: editForm.firstName,
                  lastName: editForm.lastName,
                  email: editForm.email,
                  role: editForm.role,
                  // avatarUrl мы тут не меняем, он останется старым
              });
          }
          
          setEditingUser(null); // Закрываем окно
          alert('Данные пользователя обновлены');
      } catch (e) {
          alert('Ошибка при сохранении');
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="lumeo-layout">
      {/* --- МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ --- */}
      {editingUser && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3>Редактирование пользователя</h3>
                      <button className="btn-icon" onClick={() => setEditingUser(null)}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group">
                          <label>Имя</label>
                          <input className="modern-input" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Фамилия</label>
                          <input className="modern-input" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Email (Логин)</label>
                          <input className="modern-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Роль</label>
                          <select className="modern-input" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                              <option value="student">Студент</option>
                              <option value="teacher">Преподаватель</option>
                              <option value="admin">Администратор</option>
                          </select>
                      </div>
                      <div className="form-group" style={{marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px'}}>
                          <label style={{color: '#ff4d4d'}}>Сброс пароля</label>
                          <input 
                            className="modern-input" 
                            placeholder="Новый пароль (оставьте пустым, если не меняете)" 
                            value={editForm.password}
                            onChange={e => setEditForm({...editForm, password: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>Отмена</button>
                      <button 
                        className="btn btn-primary" 
                        style={{ justifyContent: 'center' }} 
                        onClick={handleSaveUser} 
                        disabled={isSaving || !hasChanges} // Блокируем, если нет изменений
                      >
                          {isSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Шапка */}
      <header className="lumeo-header">
          <div className="logo-group">
            <div className="logo">Lumeo<span className="dot">.</span></div>
            <span className="admin-badge">ROOT ACCESS</span>
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              {user && (
                    <UserProfile 
                        user={user} 
                        onUpdate={handleAvatarUpdate} 
                        onLogout={handleLogout} 
                    />
                )}
          </div>
      </header>

      <div className="lumeo-container">
        <main className="admin-layout">
            
            <div className="admin-header">
                <h1>Панель управления</h1>
                <p>Мониторинг системы и управление образовательным контентом</p>
            </div>

            {/* Статистика */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Всего пользователей</div>
                    <div className="stat-value">{usersList.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Преподавателей</div>
                    <div className="stat-value blue">
                        {usersList.filter(u => u.role === 'teacher').length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Состояние системы</div>
                    <div className="server-status">
                        <span className="pulse-dot"></span>
                        Online
                    </div>
                </div>
            </div>

            {/* Таблица пользователей */}
            <div className="admin-section">
                <div className="section-header">
                    <h2>Пользователи системы</h2>
                    <div className="actions-row">
                        <button className="btn btn-secondary" onClick={fetchUsers}><Icons.Refresh /> Обновить</button>
                    </div>
                </div>

                {loading ? (
                    <div style={{padding: '20px', color: '#666'}}>Загрузка списка...</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Имя пользователя</th>
                                <th>Email</th>
                                <th>Роль</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersList.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{fontWeight: '500', color: '#fff'}}>
                                            {u.firstName} {u.lastName}
                                        </div>
                                        <div style={{fontSize: '11px', color: '#444'}}>ID: {u.id}</div>
                                    </td>
                                    <td>
                                        <div style={{fontSize: '13px', color: '#888'}}>{u.email}</div>
                                    </td>
                                    <td>
                                        <select 
                                            className={`role-select ${u.role}`}
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                        >
                                            <option value="student">Студент</option>
                                            <option value="teacher">Преподаватель</option>
                                            <option value="admin">Администратор</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button className="btn-icon" onClick={() => openEditModal(u)} title="Редактировать">
                                            <Icons.Edit />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

        </main>
      </div>
    </div>
  );
};
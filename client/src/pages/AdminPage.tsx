import React, { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { Link } from 'react-router-dom';
import './AdminPage.css';

// Иконки для кнопок
const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
};

export const AdminPage = () => {
  const [userData, setUserData] = useState<any>(JSON.parse(localStorage.getItem('lumeo_user') || '{}'));

  const handleLogout = () => {
    localStorage.removeItem('lumeo_user');
    localStorage.removeItem('lumeo_token');
    window.location.href = '/auth';
  };
  const handleAvatarUpdate = (newUrl: string) => {
    const updated = { ...userData, avatarUrl: newUrl };
    setUserData(updated);
    localStorage.setItem('lumeo_user', JSON.stringify(updated));
  };
  return (
    <div className="lumeo-layout">
      {/* Шапка */}
      <header className="lumeo-header">
          <div className="logo-group">
            <div className="logo">Lumeo<span className="dot">.</span></div>
            <span className="admin-badge">ROOT ACCESS</span>
          </div>
          
          {/* Правая часть хедера */}
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              
              {/* Вставляем профиль */}
              {userData.username && (
                <UserProfile 
                    user={userData} 
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
                    <div className="stat-label">Доступно уроков</div>
                    <div className="stat-value">12</div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-label">Активные пользователи</div>
                    <div className="stat-value blue">42</div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-label">Состояние системы</div>
                    <div className="server-status">
                        <span className="pulse-dot"></span>
                        All Systems Normal
                    </div>
                </div>
            </div>

            {/* Таблица пользователей */}
            <div className="admin-section">
                <div className="section-header">
                    <h2>Пользователи системы</h2>
                    <div className="actions-row">
                        <button className="btn btn-secondary"><Icons.Settings /> LDAP</button>
                        <button className="btn btn-primary"><Icons.Plus /> Добавить</button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Имя пользователя</th>
                            <th>Роль</th>
                            <th>Последний вход</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div style={{fontWeight: '500', color: '#fff'}}>Алексей Смирнов</div>
                                <div style={{fontSize: '12px', color: '#666'}}>alex.smirnov@lumeo.ru</div>
                            </td>
                            <td><span className="role-badge teacher">Преподаватель</span></td>
                            <td>Сегодня, 14:30</td>
                            <td>
                                <button className="btn-icon" title="Редактировать"><Icons.Edit /></button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div style={{fontWeight: '500', color: '#fff'}}>Елена Воробей</div>
                                <div style={{fontSize: '12px', color: '#666'}}>elena.v@student.ru</div>
                            </td>
                            <td><span className="role-badge student">Студент</span></td>
                            <td>Вчера, 09:15</td>
                            <td>
                                <button className="btn-icon" title="Редактировать"><Icons.Edit /></button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div style={{fontWeight: '500', color: '#fff'}}>Дмитрий Козлов</div>
                                <div style={{fontSize: '12px', color: '#666'}}>d.kozlov@student.ru</div>
                            </td>
                            <td><span className="role-badge student">Студент</span></td>
                            <td>2 дня назад</td>
                            <td>
                                <button className="btn-icon" title="Редактировать"><Icons.Edit /></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </main>
      </div>
    </div>
  );
};
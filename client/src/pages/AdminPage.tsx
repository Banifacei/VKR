import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../components/UserProfile';
import { BrandingTab } from '../components/Admin/BrandingTab';
import { Link } from 'react-router-dom';
import './AdminPage.css';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAllUsers, changeUserRole, updateUser, createUser, deleteUser } from '../api/userApi';
import type { IAdminUser } from '../api/userApi';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { Icons } from '../components/Icons';

interface ISystemLog { id: number; time: string; msg: string; type: 'info' | 'success' | 'error' | 'warning'; }

export const AdminPage = () => {
  const { showToast } = useToast();
  const { user, logout, updateUser: updateContextUser } = useAuth();
  const { globalTheme } = useTheme();
  const [showSamlModal, setShowSamlModal] = useState(false);
  const [samlForm, setSamlForm] = useState({ enabled: false, entryPoint: '', cert: '' });
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'requests' | 'integrations' | 'branding'>('system');
  const [usersList, setUsersList] = useState<IAdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [systemLoading, setSystemLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [storageData, setStorageData] = useState({ total: 100, video: 0, db: 0, cache: 0 });
  const [systemLogs, setSystemLogs] = useState<ISystemLog[]>([]);
  const [serverStats, setServerStats] = useState({ cpu: 0, ram: 0, connections: 0, uptime: '...' });
  const [isActionExecuting, setIsActionExecuting] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleForm, setGoogleForm] = useState({ enabled: false, clientId: '', clientSecret: '' });
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'template' | null>(null);
  const [skipTemplateModal, setSkipTemplateModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', role: 'student', password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [showYandexModal, setShowYandexModal] = useState(false);
  const [yandexForm, setYandexForm] = useState({ enabled: false, clientId: '', clientSecret: '' });
  const [showLdapModal, setShowLdapModal] = useState(false);
  const [ldapForm, setLdapForm] = useState({ enabled: false, url: '', searchBase: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openSamlModal = () => {
      setSamlForm({
          enabled: systemSettings.saml_enabled === 'true' || systemSettings.saml_enabled === true,
          entryPoint: systemSettings.saml_entry_point || '',
          cert: systemSettings.saml_cert || ''
      });
      setShowSamlModal(true);
  };

  const handleSaveSaml = async () => {
      setIsSaving(true);
      try {
          await api.post('/admin/settings/toggle', { key: 'saml_enabled', value: String(samlForm.enabled) });
          await api.post('/admin/settings/toggle', { key: 'saml_entry_point', value: samlForm.entryPoint });
          await api.post('/admin/settings/toggle', { key: 'saml_cert', value: samlForm.cert });
          showToast('Настройки SAML успешно сохранены!', 'success');
          setShowSamlModal(false);
          fetchSystemData(); 
      } catch (e) { showToast('Ошибка при сохранении SAML', 'error'); } 
      finally { setIsSaving(false); }
  };
  const [systemModules, setSystemModules] = useState<{ name: string; version: string; status: string; note?: string }[]>([]);

  const fetchSystemData = async () => {
      try {
          const [storageRes, logsRes, settingsRes, modulesRes] = await Promise.all([
              api.get('/admin/storage'),
              api.get('/admin/logs'),
              api.get('/admin/settings'),
              api.get('/admin/system-modules'),
          ]);
          setStorageData(storageRes.data);
          setSystemLogs(logsRes.data);
          setRequiresApproval(settingsRes.data.registration_requires_approval);
          setSystemSettings(settingsRes.data);
          setSystemModules(modulesRes.data);
      } catch (e) { console.error('Ошибка загрузки статических данных системы'); }
      finally { setSystemLoading(false); }
  };

  const openLdapModal = () => {
      setLdapForm({
          enabled: systemSettings.ldap_enabled === true || systemSettings.ldap_enabled === 'true',
          url: systemSettings.ldap_url || 'ldap://ldap.forumsys.com:389',
          searchBase: systemSettings.ldap_search_base || 'dc=example,dc=com'
      });
      setShowLdapModal(true);
  };

  const handleSaveLdap = async () => {
      setIsSaving(true);
      try {
          await api.post('/admin/settings/toggle', { key: 'ldap_enabled', value: String(ldapForm.enabled) });
          await api.post('/admin/settings/toggle', { key: 'ldap_url', value: ldapForm.url });
          await api.post('/admin/settings/toggle', { key: 'ldap_search_base', value: ldapForm.searchBase });
          showToast('Настройки LDAP успешно сохранены!', 'success');
          setShowLdapModal(false);
          fetchSystemData();
      } catch (e) {
          showToast('Ошибка при сохранении настроек LDAP', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const openYandexModal = () => {
      setYandexForm({
          enabled: systemSettings.yandex_enabled === 'true' || systemSettings.yandex_enabled === true,
          clientId: systemSettings.yandex_client_id || '',
          clientSecret: systemSettings.yandex_client_secret || ''
      });
      setShowYandexModal(true);
  };

  const handleSaveYandex = async () => {
      setIsSaving(true);
      try {
          await api.post('/admin/settings/toggle', { key: 'yandex_enabled', value: String(yandexForm.enabled) });
          await api.post('/admin/settings/toggle', { key: 'yandex_client_id', value: yandexForm.clientId });
          await api.post('/admin/settings/toggle', { key: 'yandex_client_secret', value: yandexForm.clientSecret });
          showToast('Настройки Yandex ID успешно сохранены!', 'success');
          setShowYandexModal(false);
          fetchSystemData(); 
      } catch (e) {
          showToast('Ошибка при сохранении настроек Яндекс', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const openGoogleModal = () => {
      setGoogleForm({
          enabled: systemSettings.google_enabled === 'true' || systemSettings.google_enabled === true,
          clientId: systemSettings.google_client_id || '',
          clientSecret: systemSettings.google_client_secret || ''
      });
      setShowGoogleModal(true);
  };

  const handleSaveGoogle = async () => {
      setIsSaving(true);
      try {
          await api.post('/admin/settings/toggle', { key: 'google_enabled', value: String(googleForm.enabled) });
          await api.post('/admin/settings/toggle', { key: 'google_client_id', value: googleForm.clientId });
          await api.post('/admin/settings/toggle', { key: 'google_client_secret', value: googleForm.clientSecret });
          showToast('Настройки Google успешно сохранены!', 'success');
          setShowGoogleModal(false);
          fetchSystemData(); 
      } catch (e) {
          showToast('Ошибка при сохранении настроек Google', 'error');
      } finally {
          setIsSaving(false);
      }
  };
  const fetchLiveServerStats = async () => {
      try {
          const res = await api.get('/admin/server-stats');
          if (res.data) setServerStats(res.data);
      } catch (e) {}
  };

  const fetchPendingUsers = async () => {
      try {
          const res = await api.get('/users/pending');
          setPendingUsers(res.data);
      } catch (e) { console.error('Ошибка загрузки заявок'); }
  };

  useEffect(() => {
      fetchUsers();
      fetchPendingUsers();
      fetchSystemData();
      fetchLiveServerStats();

      // CPU/RAM статистика — оставляем polling (pull-данные без события)
      const liveInterval = setInterval(fetchLiveServerStats, 1500);

      // SSE: мгновенные уведомления о новых заявках и одобрениях/отклонениях
      const token = localStorage.getItem('lumeo_token');
      const es = token ? new EventSource(`/api/users/admin/stream?token=${token}`) : null;
      if (es) {
          es.onmessage = ({ data }) => {
              try {
                  const d = JSON.parse(data);
                  if (d.type === 'pending_user') {
                      setPendingUsers(prev => {
                          if (prev.find(u => u.id === d.userId)) return prev;
                          return [{ id: d.userId, email: d.email, firstName: d.name?.split(' ')[0] || '', lastName: d.name?.split(' ')[1] || '', createdAt: new Date().toISOString() }, ...prev];
                      });
                  } else if (d.type === 'user_approved' || d.type === 'user_rejected') {
                      setPendingUsers(prev => prev.filter(u => u.id !== d.userId));
                      if (d.type === 'user_approved') fetchUsers();
                  }
              } catch { /* игнорируем */ }
          };
          es.onerror = () => es.close();
      }

      return () => { clearInterval(liveInterval); es?.close(); };
  }, []);

  const handleToggleSetting = async () => {
      const newValue = !requiresApproval;
      setRequiresApproval(newValue);
      if (!newValue && activeTab === 'requests') setActiveTab('system');
      try {
          await api.post('/admin/settings/toggle', { key: 'registration_requires_approval', value: newValue });
          showToast('Настройки модерации обновлены', 'info');
          fetchSystemData(); 
      } catch (e) { showToast('Ошибка переключения настройки', 'error'); setRequiresApproval(!newValue); }
  };

  const handleRequestAction = async (id: number, action: 'approve' | 'reject') => {
      try {
          await api.post(`/users/${id}/${action}`);
          setPendingUsers(prev => prev.filter(u => u.id !== id));
          if (action === 'approve') fetchUsers(); 
          showToast(`Заявка успешно ${action === 'approve' ? 'одобрена' : 'отклонена'}`, 'success');
          fetchSystemData(); 
      } catch (e) { showToast('Ошибка при обработке заявки', 'error'); }
  };
  
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
          setIsActionExecuting(true);
          const res = await api.post('/users/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          showToast(res.data.message || 'Импорт завершен', 'success'); 
          fetchUsers(); fetchSystemData();
      } catch (err: any) { showToast(err.response?.data?.message || 'Сбой при загрузке файла', 'error'); } 
      finally { setIsActionExecuting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleTemplateClick = () => {
      const skipModal = localStorage.getItem(`lumeo_skip_template_${user?.id}`);
      if (skipModal === 'true') {
          downloadExcelTemplate(); 
      } else {
          setModalMode('template'); 
      }
  };

  const downloadExcelTemplate = async () => {
      if (skipTemplateModal) localStorage.setItem(`lumeo_skip_template_${user?.id}`, 'true');
      try {
          const res = await api.get('/users/template', { responseType: 'blob' });
          const url = window.URL.createObjectURL(res.data);
          const link = document.createElement('a');
          link.style.display = 'none'; link.href = url; link.download = 'Lumeo_Template.xlsx'; 
          document.body.appendChild(link); link.click();
          setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
      } catch (e) { showToast('Ошибка при скачивании шаблона', 'error'); }
  };

  const handleExportUsers = async () => {
      try {
          const res = await api.get('/users/export', { responseType: 'blob' });
          const url = URL.createObjectURL(res.data);
          const link = document.createElement('a');
          link.href = url; link.setAttribute('download', `Lumeo_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
          document.body.appendChild(link); link.click(); link.remove();
          showToast('База успешно выгружена', 'success');
      } catch (e) { showToast('Ошибка при выгрузке базы пользователей', 'error'); }
  };

  const handleQuickAction = async (endpoint: string, actionName: string) => {
      if (!window.confirm(`Вы уверены, что хотите: ${actionName}?`)) return;
      setIsActionExecuting(true);
      try {
          await api.post(`/admin/${endpoint}`);
          showToast(`Успешно: ${actionName}`, 'success'); fetchSystemData();
      } catch (e) { showToast(`Ошибка выполнения: ${actionName}`, 'error'); } 
      finally { setIsActionExecuting(false); }
  };

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
      } catch (e) { showToast('Ошибка при загрузке пользователей', 'error'); } 
      finally { setLoading(false); }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
      const oldList = [...usersList];
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      try { 
          await changeUserRole(userId, newRole);
          showToast('Роль пользователя изменена', 'info');
      } 
      catch (e) { showToast('Не удалось сменить роль', 'error'); setUsersList(oldList); }
  };

  const openAddModal = () => { setModalMode('add'); setUserForm({ firstName: '', lastName: '', email: '', role: 'student', password: '' }); };
  const openEditModal = (u: IAdminUser) => { setModalMode('edit'); setEditingUserId(u.id); setUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, password: '' }); };
  const closeModal = () => { setModalMode(null); setEditingUserId(null); };

  const handleSubmitUser = async () => {
      setIsSaving(true);
      try {
          if (modalMode === 'add') {
              if (!userForm.password || !userForm.email) {
                  showToast('Email и пароль обязательны!', 'error');
                  return;
              }
              const newUser = await createUser(userForm);
              setUsersList([newUser, ...usersList]);
              showToast('Пользователь успешно создан!', 'success');
          } else if (modalMode === 'edit' && editingUserId) {
              await updateUser(editingUserId, userForm);
              setUsersList(prev => prev.map(u => u.id === editingUserId ? { ...u, ...userForm } as IAdminUser : u));
              if (user && user.id === editingUserId) updateContextUser({ firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, role: userForm.role });
              showToast('Данные пользователя обновлены', 'success');
          }
          closeModal();
      } catch (e) { showToast('Ошибка при сохранении пользователя', 'error'); } 
      finally { setIsSaving(false); }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
      if (user?.id === userId) {
          showToast('Вы не можете удалить самого себя!', 'error');
          return;
      }
      if (!window.confirm(`Вы действительно хотите удалить пользователя ${userName}? Это действие необратимо.`)) return;
      try { 
          await deleteUser(userId); 
          setUsersList(prev => prev.filter(u => u.id !== userId));
          showToast(`Пользователь ${userName} удален`, 'info');
      } 
      catch (e) { showToast('Ошибка при удалении пользователя', 'error'); }
  };

  const storageTotal = storageData.total || 1; 
  const storageUsed = storageData.video + storageData.db + storageData.cache;
  const filteredLogs = systemLogs.filter(log => logFilter === 'all' || log.type === logFilter);

  return (
    <div className="lumeo-layout">
      {/* Скрытый input для Excel */}
      <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleExcelUpload} 
      />

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ */}
      {(modalMode === 'add' || modalMode === 'edit') && (
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
        {/* МОДАЛЬНОЕ ОКНО LDAP */}
      {showLdapModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3>Настройки LDAP / Active Directory</h3>
                      <button className="btn-icon" onClick={() => setShowLdapModal(false)}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="lumeo-switch" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
                              <input type="checkbox" checked={ldapForm.enabled} onChange={e => setLdapForm({...ldapForm, enabled: e.target.checked})} />
                              <span className="slider round"></span>
                          </label>
                          <strong style={{ color: ldapForm.enabled ? '#00ff88' : '#888', verticalAlign: 'middle' }}>
                              {ldapForm.enabled ? 'Интеграция ВКЛЮЧЕНА' : 'Интеграция ОТКЛЮЧЕНА'}
                          </strong>
                      </div>
                      <div className="form-group">
                          <label>URL сервера (LDAP URL)</label>
                          <input className="modern-input" placeholder="ldap://10.0.0.5:389" value={ldapForm.url} onChange={e => setLdapForm({...ldapForm, url: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>База поиска (Search Base)</label>
                          <input className="modern-input" placeholder="dc=example,dc=com" value={ldapForm.searchBase} onChange={e => setLdapForm({...ldapForm, searchBase: e.target.value})} />
                      </div>
                      <p style={{fontSize: '12px', color: '#888', marginTop: '10px'}}>
                          *Для тестирования по умолчанию подставлен публичный сервер Forumsys.
                      </p>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowLdapModal(false)}>Отмена</button>
                      <button className="btn btn-primary" onClick={handleSaveLdap} disabled={isSaving}>
                          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* МОДАЛЬНОЕ ОКНО YANDEX */}
      {showYandexModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3>Настройки OpenID: Yandex ID</h3>
                      <button className="btn-icon" onClick={() => setShowYandexModal(false)}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="lumeo-switch" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
                              <input type="checkbox" checked={yandexForm.enabled} onChange={e => setYandexForm({...yandexForm, enabled: e.target.checked})} />
                              <span className="slider round"></span>
                          </label>
                          <strong style={{ color: yandexForm.enabled ? '#00ff88' : '#888', verticalAlign: 'middle' }}>
                              {yandexForm.enabled ? 'Интеграция ВКЛЮЧЕНА' : 'Интеграция ОТКЛЮЧЕНА'}
                          </strong>
                      </div>
                      <div className="form-group">
                          <label>Client ID</label>
                          <input className="modern-input" placeholder="ID приложения Яндекса" value={yandexForm.clientId} onChange={e => setYandexForm({...yandexForm, clientId: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Client Secret (Пароль)</label>
                          <input className="modern-input" type="password" placeholder="Секретный ключ" value={yandexForm.clientSecret} onChange={e => setYandexForm({...yandexForm, clientSecret: e.target.value})} />
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowYandexModal(false)}>Отмена</button>
                      <button className="btn btn-primary" onClick={handleSaveYandex} disabled={isSaving}>
                          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* МОДАЛЬНОЕ ОКНО GOOGLE */}
      {showGoogleModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3>Настройки OpenID: Google Workspace</h3>
                      <button className="btn-icon" onClick={() => setShowGoogleModal(false)}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="lumeo-switch" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
                              <input type="checkbox" checked={googleForm.enabled} onChange={e => setGoogleForm({...googleForm, enabled: e.target.checked})} />
                              <span className="slider round"></span>
                          </label>
                          <strong style={{ color: googleForm.enabled ? '#00ff88' : '#888', verticalAlign: 'middle' }}>
                              {googleForm.enabled ? 'Интеграция ВКЛЮЧЕНА' : 'Интеграция ОТКЛЮЧЕНА'}
                          </strong>
                      </div>
                      <div className="form-group">
                          <label>Client ID</label>
                          <input className="modern-input" placeholder="Идентификатор клиента Google" value={googleForm.clientId} onChange={e => setGoogleForm({...googleForm, clientId: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Client Secret</label>
                          <input className="modern-input" type="password" placeholder="Секрет клиента" value={googleForm.clientSecret} onChange={e => setGoogleForm({...googleForm, clientSecret: e.target.value})} />
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowGoogleModal(false)}>Отмена</button>
                      <button className="btn btn-primary" onClick={handleSaveGoogle} disabled={isSaving}>
                          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {showSamlModal && (
          <div className="modal-overlay">
              <div className="modal-content" style={{ width: '500px' }}>
                  <div className="modal-header">
                      <h3>Корпоративный вход (SAML 2.0)</h3>
                      <button className="btn-icon" onClick={() => setShowSamlModal(false)}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="lumeo-switch" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
                              <input type="checkbox" checked={samlForm.enabled} onChange={e => setSamlForm({...samlForm, enabled: e.target.checked})} />
                              <span className="slider round"></span>
                          </label>
                          <strong style={{ color: samlForm.enabled ? '#00ff88' : '#888', verticalAlign: 'middle' }}>{samlForm.enabled ? 'Интеграция ВКЛЮЧЕНА' : 'Интеграция ОТКЛЮЧЕНА'}</strong>
                      </div>
                      <div className="form-group">
                          <label>SSO URL (Entry Point)</label>
                          <input className="modern-input" placeholder="https://idp.example.com/saml2/idp/sso" value={samlForm.entryPoint} onChange={e => setSamlForm({...samlForm, entryPoint: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Публичный сертификат (Public X.509 Cert)</label>
                          <textarea className="modern-input" style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '12px' }} placeholder="MIIC4jCCAcqgAwIBAgIQ..." value={samlForm.cert} onChange={e => setSamlForm({...samlForm, cert: e.target.value})} />
                      </div>
                      <p style={{fontSize: '12px', color: '#888', marginTop: '10px'}}>
                          *Укажите Entity ID (Issuer): <strong>lumeo-web</strong><br/>
                          *Callback URL (ACS): <strong>{apiUrl}/auth/saml/callback</strong>
                      </p>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowSamlModal(false)}>Отмена</button>
                      <button className="btn btn-primary" onClick={handleSaveSaml} disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
                  </div>
              </div>
          </div>
      )}
      {/* ШАПКА */}
      <header className="lumeo-header">
          <div className="logo-group">
            <div className="logo">
              {globalTheme.platform_logo && <img src={globalTheme.platform_logo} alt="logo" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />}
              {globalTheme.platform_name}<span className="dot">.</span>
            </div>
            <span className="admin-badge">ROOT ACCESS</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              {user && <UserProfile user={user} onUpdate={handleAvatarUpdate} onLogout={handleLogout} />}
          </div>
      </header>

      <div className="lumeo-container">
        <main className="admin-layout">
            
            <div className="admin-header" style={{ display: 'center', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Панель управления</h1>
                    <p>Центр мониторинга и управления образовательной платформой</p>
                </div>
                {/* ТУМБЛЕР МОДЕРАЦИИ СВЕРХУ СПРАВА */}
                <div className="settings-toggle-card">
                    <div className="settings-toggle-info">
                        <strong>Модерация регистраций</strong>
                        <span>{requiresApproval ? 'Только по заявкам' : 'Свободный вход'}</span>
                    </div>
                    <label className="lumeo-switch">
                        <input type="checkbox" checked={requiresApproval} onChange={handleToggleSetting} />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
            
            {/* ВКЛАДКИ НАВИГАЦИИ */}
            <div className="admin-tabs">
                <button className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                    <Icons.Server /> Обзор системы
                </button>
                <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <Icons.Users /> База пользователей
                </button>
                <button className={`admin-tab ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>
                    <Icons.LinkIcon /> Интеграции (SSO)
                </button>
                <button className={`admin-tab ${activeTab === 'branding' ? 'active' : ''}`} onClick={() => setActiveTab('branding')}>
                    <Icons.Palette /> Брендинг
                </button>
                {/* Вкладка заявок появляется ТОЛЬКО если модерация включена */}
                {requiresApproval && (
                    <button className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
                        <Icons.Bell /> Заявки
                        {pendingUsers.length > 0 && <span className="tab-badge">{pendingUsers.length}</span>}
                    </button>
                )}
            </div>

            {/* МЕТРИКИ СВЕРХУ (Скрываем на вкладке заявок для чистоты) */}
            {activeTab !== 'requests' && (
                <div className={`metrics-row${systemLoading ? ' metrics-loading' : ''}`}>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{color: 'var(--primary)'}}><Icons.Users /></div>
                        <div className="stat-info"><div className="stat-label">Пользователей</div><div className="stat-value">{usersList.length}</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{color: '#ffd700'}}><Icons.Code /></div>
                        <div className="stat-info"><div className="stat-label">Преподавателей</div><div className="stat-value">{usersList.filter(u => u.role === 'teacher').length}</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{color: '#ff4d4d'}}><Icons.Shield /></div>
                        <div className="stat-info"><div className="stat-label">Администраторов</div><div className="stat-value">{usersList.filter(u => u.role === 'admin').length}</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{color: '#00ff88'}}><Icons.Activity /></div>
                        <div className="stat-info"><div className="stat-label">Активных сессий</div><div className="stat-value">{serverStats.connections}</div></div>
                    </div>
                </div>
            )}

            {/* ==================== ВКЛАДКА 1: ОБЗОР СИСТЕМЫ ==================== */}
            {activeTab === 'system' && (
                <div className="dashboard-columns">
                    <div className="dashboard-main">
                        <div className="admin-section log-section">
                            <div className="section-header compact" style={{flexWrap: 'wrap', gap: '10px'}}>
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Terminal /> Журнал событий</h2>
                                
                                <div className="log-filters">
                                    <button className={`filter-btn ${logFilter === 'all' ? 'active' : ''}`} onClick={() => setLogFilter('all')}>Все</button>
                                    <button className={`filter-btn info ${logFilter === 'info' ? 'active' : ''}`} onClick={() => setLogFilter('info')}>Инфо</button>
                                    <button className={`filter-btn success ${logFilter === 'success' ? 'active' : ''}`} onClick={() => setLogFilter('success')}>Успех</button>
                                    <button className={`filter-btn warning ${logFilter === 'warning' ? 'active' : ''}`} onClick={() => setLogFilter('warning')}>Внимание</button>
                                    <button className={`filter-btn error ${logFilter === 'error' ? 'active' : ''}`} onClick={() => setLogFilter('error')}>Ошибки</button>
                                    <button className="btn-icon" style={{marginLeft: 'auto'}} onClick={fetchSystemData} title="Обновить"><Icons.Refresh /></button>
                                </div>
                            </div>
                            
                            <div className="section-body log-container modern-scroll">
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

                    <aside className="dashboard-sidebar">
                        <div className="admin-section sidebar-section">
                            <div className="section-header compact">
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Server /> Сервер Lumeo</h2>
                                <div className="server-status small"><span className="pulse-dot"></span> Online</div>
                            </div>
                            <div className="section-body">
                                <div style={{fontSize: '11px', color: '#666', marginBottom: '15px', textAlign: 'right'}}>Аптайм: {serverStats.uptime}</div>
                                <div className="server-monitor">
                                    <div className="monitor-row"><span>CPU ({serverStats.cpu.toFixed(1)}%)</span><div className="progress-bar-bg"><div className="progress-bar-fill cpu" style={{width: `${serverStats.cpu}%`}}></div></div></div>
                                    <div className="monitor-row"><span>RAM ({serverStats.ram.toFixed(1)}%)</span><div className="progress-bar-bg"><div className="progress-bar-fill ram" style={{width: `${serverStats.ram}%`}}></div></div></div>
                                </div>
                            </div>
                        </div>

                        <div className="admin-section sidebar-section">
                            <div className="section-header compact"><h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Database /> Хранилище (S3)</h2></div>
                            <div className="section-body">
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px'}}><span style={{color: '#fff', fontWeight: 'bold'}}>{storageUsed.toFixed(1)} GB</span><span style={{color: '#666'}}>из {storageTotal} GB</span></div>
                                <div className="storage-bar">
                                    <div className="storage-segment video" style={{width: `${(storageData.video / storageTotal) * 100}%`}}></div>
                                    <div className="storage-segment db" style={{width: `${(storageData.db / storageTotal) * 100}%`}}></div>
                                    <div className="storage-segment cache" style={{width: `${(storageData.cache / storageTotal) * 100}%`}}></div>
                                </div>
                                <div className="storage-legend">
                                    <div className="legend-item"><div className="dot video"></div>Видео</div><div className="legend-item"><div className="dot db"></div>БД</div><div className="legend-item"><div className="dot cache"></div>Кэш (AI)</div>
                                </div>
                            </div>
                        </div>

                        <div className="admin-section sidebar-section">
                            <div className="section-header compact">
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Activity /> Статус модулей</h2>
                            </div>
                            <div className="section-body">
                                {systemModules.length === 0 ? (
                                    <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', padding: '10px 0' }}>Загрузка...</div>
                                ) : systemModules.map((mod, i) => {
                                    const isActive = mod.status === 'active';
                                    const isIdle = mod.status === 'idle';
                                    const color = isActive ? '#00ff88' : isIdle ? '#ffd700' : '#ff4d4d';
                                    return (
                                        <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                            <div>
                                                <div style={{color: '#fff', fontWeight: '500', fontSize: '12px'}}>{mod.name}</div>
                                                <div style={{color: '#666', fontSize: '10px'}}>{mod.note || mod.version}</div>
                                            </div>
                                            <div style={{color, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
                                                <span className={isActive ? 'pulse-dot' : ''} style={{width: '6px', height: '6px', background: color, borderRadius: '50%', display: 'inline-block'}}></span>
                                                {isActive ? 'Активен' : isIdle ? 'Ожидание' : 'Недоступен'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="admin-section sidebar-section">
                            <div className="section-header compact"><h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Zap /> Быстрые действия</h2></div>
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
                            <button className="btn btn-secondary" onClick={handleTemplateClick} title="Скачать шаблон (Excel)">
                                <Icons.Download /> Шаблон
                            </button>
                            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isActionExecuting}>
                                <Icons.Upload /> {isActionExecuting ? 'Импорт...' : 'Импорт Excel'}
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportUsers} title="Выгрузить всех пользователей в Excel" style={{color: '#00ff88', borderColor: 'rgba(0, 255, 136, 0.3)'}}>
                                <Icons.Database /> Выгрузить БД
                            </button>
                            <button className="btn btn-primary" onClick={openAddModal}><Icons.Plus /> Добавить</button>
                            <button className="btn btn-secondary" onClick={fetchUsers}><Icons.Refresh /> Обновить</button>
                        </div>
                        {/* МОДАЛЬНОЕ ОКНО ИНСТРУКЦИИ К ШАБЛОНУ */}
                        {modalMode === 'template' && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{ width: '580px', padding: '30px' }}>
                                    <div className="modal-header" style={{ marginBottom: '15px', borderBottom: 'none' }}>
                                        <h3 style={{ fontSize: '20px' }}>Инструкция к импорту</h3>
                                        <button className="btn-icon" onClick={closeModal}><Icons.Close /></button>
                                    </div>
                                    <div className="modal-body">
                                        <p style={{ color: '#888', fontSize: '13.5px', marginBottom: '24px', lineHeight: '1.5' }}>
                                            Для массовой регистрации скачайте Excel-шаблон и заполните его, соблюдая следующие правила:
                                        </p>
                                        
                                        <ul className="template-rules">
                                            <li><strong>Имя, Фамилия, Email, Пароль</strong> — <span style={{color: '#ff4d4d'}}>обязательные</span> поля.</li>
                                            <li>В колонке <strong>Роль</strong> нужно использовать строго системные значения: <code>student</code>, <code>teacher</code> или <code>admin</code>. Оставите пустым — станет студентом.</li>
                                            <li>Поля <strong>Отчество</strong> и <strong>Телефон</strong> можно оставить пустыми.</li>
                                            <li><strong style={{color: '#ffd700'}}>Важно:</strong> Не удаляйте и не переименовывайте самую первую строку с названиями колонок!</li>
                                        </ul>

                                        {/* НАШ НОВЫЙ ЧЕКБОКС */}
                                        {/* НАШ ИДЕАЛЬНЫЙ ЧЕКБОКС */}
                                        <label className="dont-show-again">
                                            <input 
                                                type="checkbox" 
                                                checked={skipTemplateModal} 
                                                onChange={(e) => setSkipTemplateModal(e.target.checked)} 
                                            />
                                            <span className="custom-checkbox"></span>
                                            <span className="checkbox-text">Больше не показывать мне это уведомление</span>
                                        </label>
                                        
                                    </div>
                                    
                                    {/* Красивые кнопки */}
                                    <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '10px', gap: '15px' }}>
                                        <button className="btn btn-secondary" onClick={closeModal} style={{flex: 1, padding: '14px', background: '#1a1a1a'}}>
                                            Закрыть
                                        </button>
                                        <button className="btn btn-primary" onClick={downloadExcelTemplate} style={{ backgroundColor: '#00ff88', color: '#000', flex: 2, padding: '14px', fontSize: '14px' }}>
                                            <Icons.Download /> Скачать шаблон
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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

            {/* ==================== ВКЛАДКА 3: ЗАЯВКИ (PRO) ==================== */}
            {activeTab === 'requests' && requiresApproval && (
                <div className="admin-section">
                    <div className="section-header">
                        <h2>Ожидают подтверждения</h2>
                        <button className="btn btn-secondary" onClick={fetchPendingUsers}><Icons.Refresh /> Обновить</button>
                    </div>

                    {pendingUsers.length === 0 ? (
                        <div className="empty-requests">
                            <div className="empty-shield"><Icons.Shield /></div>
                            <h3>Очередь пуста</h3>
                            <p>Все заявки обработаны. Новых пользователей нет.</p>
                        </div>
                    ) : (
                        <div className="requests-list">
                            {pendingUsers.map((u) => (
                                <div className="request-card" key={u.id}>
                                    
                                    {/* Инфо профиля */}
                                    <div className="req-user-info">
                                        <div className="req-avatar">
                                            {(u.firstName?.[0] || '')}{(u.lastName?.[0] || '')}
                                        </div>
                                        <div className="req-details">
                                            <h4>{u.firstName} {u.lastName}</h4>
                                            <span className="req-email">{u.email}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Мета-данные */}
                                    <div className="req-meta">
                                        <div className="req-badge">Новый аккаунт</div>
                                        <div className="req-date">
                                            {new Date(u.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    {/* Кнопки */}
                                    <div className="req-actions">
                                        <button className="req-btn approve" onClick={() => handleRequestAction(u.id, 'approve')}>
                                            <Icons.Check /> Принять
                                        </button>
                                        <button className="req-btn reject" onClick={() => handleRequestAction(u.id, 'reject')} title="Отклонить">
                                            <Icons.Close />
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* ==================== ВКЛАДКА 4: ИНТЕГРАЦИИ SSO ==================== */}
            {activeTab === 'branding' && <BrandingTab />}

            {activeTab === 'integrations' && (
                <div className="admin-section">
                    <div className="section-header">
                        <h2>Провайдеры аутентификации (Single Sign-On)</h2>
                        <button className="btn btn-primary" onClick={() => showToast('Магазин плагинов недоступен в демо-версии', 'info')}><Icons.Plus /> Добавить провайдер</button>
                    </div>
                    
                    <div className="section-body">
                        <div className="integrations-grid">
                            
                            {/* Карточка SAML */}
                            <div className="integration-card active">
                                <div className="int-header">
                                    <div className="int-icon saml"><Icons.Shield /></div>
                                    <div className="int-status"><span className="pulse-dot"></span> Активен</div>
                                </div>
                                <h3>SAML 2.0 (Active Directory)</h3>
                                <p>Корпоративная аутентификация через Microsoft ADFS или Keycloak.</p>
                                <div className="int-meta">
                                    <span>Урл: sso.lumeo.edu/saml</span>
                                </div>
                                <div className="int-actions">
                                    <button 
                                        className={systemSettings.saml_enabled === 'true' || systemSettings.saml_enabled === true ? "btn btn-secondary" : "btn btn-primary"} 
                                        style={{width: '100%'}} 
                                        onClick={openSamlModal}
                                    >
                                        Настроить
                                    </button>
                                </div>
                            </div>

                            {/* Карточка LDAP */}
                            <div className={`integration-card ${systemSettings.ldap_enabled === 'true' || systemSettings.ldap_enabled === true ? 'active' : ''}`}>
                                <div className="int-header">
                                    <div className="int-icon ldap"><Icons.Database /></div>
                                    <div className={`int-status ${systemSettings.ldap_enabled === 'true' || systemSettings.ldap_enabled === true ? '' : 'disabled'}`}>
                                        {systemSettings.ldap_enabled === 'true' || systemSettings.ldap_enabled === true ? <><span className="pulse-dot"></span> Активен</> : 'Отключен'}
                                    </div>
                                </div>
                                <h3>LDAP / OpenLDAP</h3>
                                <p>Прямое подключение к серверу каталогов для синхронизации студентов.</p>
                                <div className="int-meta">
                                    <span>Сервер: {systemSettings.ldap_url || 'Не настроен'}</span>
                                </div>
                                <div className="int-actions">
                                    <button 
                                        className={systemSettings.ldap_enabled === 'true' || systemSettings.ldap_enabled === true ? "btn btn-secondary" : "btn btn-primary"} 
                                        style={{width: '100%'}} 
                                        onClick={openLdapModal}
                                    >
                                        Настроить
                                    </button>
                                </div>
                            </div>

                            {/* Карточка OpenID (Яндекс) */}
                            <div className={`integration-card ${systemSettings.yandex_enabled === 'true' || systemSettings.yandex_enabled === true ? 'active' : ''}`}>
                                <div className="int-header">
                                    <div className="int-icon openid"><Icons.Globe /></div>
                                    <div className={`int-status ${systemSettings.yandex_enabled === 'true' || systemSettings.yandex_enabled === true ? '' : 'disabled'}`}>
                                        {systemSettings.yandex_enabled === 'true' || systemSettings.yandex_enabled === true ? <><span className="pulse-dot"></span> Активен</> : 'Отключен'}
                                    </div>
                                </div>
                                <h3>Yandex ID (OpenID Connect)</h3>
                                <p>Вход через аккаунт Яндекса (поддерживается автоматическое создание профиля).</p>
                                <div className="int-actions">
                                    <button 
                                        className={systemSettings.yandex_enabled === 'true' || systemSettings.yandex_enabled === true ? "btn btn-secondary" : "btn btn-primary"} 
                                        style={{width: '100%'}} 
                                        onClick={openYandexModal}
                                    >
                                        Настроить
                                    </button>
                                </div>
                            </div>

                            {/* Карточка Google */}
                            <div className={`integration-card ${systemSettings.google_enabled === 'true' || systemSettings.google_enabled === true ? 'active' : ''}`}>
                                <div className="int-header">
                                    <div className="int-icon openid" style={{background: 'rgba(66, 133, 244, 0.2)', color: '#4285F4'}}>
                                        <Icons.Globe /> 
                                    </div>
                                    <div className={`int-status ${systemSettings.google_enabled === 'true' || systemSettings.google_enabled === true ? '' : 'disabled'}`}>
                                        {systemSettings.google_enabled === 'true' || systemSettings.google_enabled === true ? <><span className="pulse-dot"></span> Активен</> : 'Отключен'}
                                    </div>
                                </div>
                                <h3>Google Workspace</h3>
                                <p>Вход через аккаунт Google (OpenID Connect).</p>
                                <div className="int-actions">
                                    <button 
                                        className={systemSettings.google_enabled === 'true' || systemSettings.google_enabled === true ? "btn btn-secondary" : "btn btn-primary"} 
                                        style={{width: '100%'}} 
                                        onClick={openGoogleModal}
                                    >
                                        Настроить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};
import { useState, useEffect, useRef, useMemo } from 'react';
import { BrandingTab } from '../components/Admin/BrandingTab';
import { EmailTab } from '../components/Admin/EmailTab';
import './AdminPage.css';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, changeUserRole, updateUser, createUser, deleteUser, banUser, unbanUser } from '../api/userApi';
import type { IAdminUser } from '../api/userApi';
import api from '../api/axiosInstance';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Icons } from '../components/Icons';
import { AppHeader } from '../components/AppHeader';
import '../components/GlobalSearch.css';
import { sseQuery } from '../utils/sseTicket';

interface ISystemLog { id: number; time: string; msg: string; type: 'info' | 'success' | 'error' | 'warning'; }

interface IOnlineUser {
  userId?: number;
  firstName?: string;
  lastName?: string;
  role?: string;
  page?: string;
  avatarUrl?: string;
  lastSeen?: number;
  ip?: string;
}

function formatPage(page?: string): string {
  if (!page) return '—';
  if (page === '/') return 'Каталог курсов';
  if (page === '/dashboard') return 'Дашборд';
  if (page === '/history') return 'История';
  if (page === '/profile') return 'Профиль';
  if (page === '/analytics') return 'Аналитика';
  if (page === '/adminpanel') return 'Панель администратора';
  if (/^\/course\/\d+\/lesson\/\d+/.test(page)) return 'Просмотр урока';
  if (/^\/course\/\d+/.test(page)) return 'Страница курса';
  return page;
}

function formatLastSeen(lastSeen?: number): string {
  if (!lastSeen) return '';
  const diff = Math.floor((Date.now() - lastSeen) / 1000);
  if (diff < 60) return 'сейчас';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  return `${Math.floor(diff / 3600)} ч назад`;
}

const ROLE_LABELS: Record<string, string> = { student: 'Студент', teacher: 'Преподаватель', admin: 'Админ' };
const ROLE_COLORS: Record<string, string> = { student: '#4a9eff', teacher: '#ffd700', admin: '#ff4d4d' };

export const AdminPage = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { user, updateUser: updateContextUser } = useAuth();
  const [showSamlModal, setShowSamlModal] = useState(false);
  const [samlForm, setSamlForm] = useState({ enabled: false, entryPoint: '', cert: '' });
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'requests' | 'integrations' | 'branding' | 'moderation' | 'email' | 'updates'>('system');
  const [bannedWords, setBannedWords] = useState<{ id: number; word: string }[]>([]);
  const [offenders, setOffenders] = useState<any[]>([]);
  const [newWord, setNewWord] = useState('');
  const [importText, setImportText] = useState('');
  const [wordLoading, setWordLoading] = useState(false);
  const [usersList, setUsersList] = useState<IAdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersByRole, setUsersByRole] = useState({ student: 0, teacher: 0, admin: 0 });
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersProviderFilter, setUsersProviderFilter] = useState('');
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<IOnlineUser[]>([]);
  const [onlineRoleFilter, setOnlineRoleFilter] = useState<string>('all');
  const [systemLoading, setSystemLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [storageData, setStorageData] = useState({ total: 100, video: 0, db: 0, cache: 0 });
  const [systemLogs, setSystemLogs] = useState<ISystemLog[]>([]);
  const [serverStats, setServerStats] = useState({ cpu: 0, ram: 0, connections: 0, uptime: '...' });
  const [isActionExecuting, setIsActionExecuting] = useState(false);
  const [analyticsDemo, setAnalyticsDemo] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'template' | null>(null);
  const [skipTemplateModal, setSkipTemplateModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', role: 'student', password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [banModalUser, setBanModalUser] = useState<IAdminUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [showYandexModal, setShowYandexModal] = useState(false);
  const [yandexForm, setYandexForm] = useState({ enabled: false, clientId: '', clientSecret: '' });
  const [showLdapModal, setShowLdapModal] = useState(false);
  const [ldapForm, setLdapForm] = useState({ enabled: false, url: '', searchBase: '' });
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ enabled: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateEsRef = useRef<EventSource | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const [installerStatus, setInstallerStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [updateLog, setUpdateLog] = useState<Array<{type: string; text: string}>>([]);
  const [isUpdating, setIsUpdating] = useState(false);
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
          if (settingsRes.data.analytics_demo_button_visible !== undefined) {
              setAnalyticsDemo(settingsRes.data.analytics_demo_button_visible !== false && settingsRes.data.analytics_demo_button_visible !== 'false');
          }
          setAiForm(prev => ({
              ...prev,
              enabled: settingsRes.data.ai_assistant_enabled !== false && settingsRes.data.ai_assistant_enabled !== 'false',
          }));
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

  const openAiModal = () => {
      setAiForm({
          enabled: systemSettings.ai_assistant_enabled !== false && systemSettings.ai_assistant_enabled !== 'false',
      });
      setShowAiModal(true);
  };

  const handleSaveAi = async () => {
      setIsSaving(true);
      try {
          await api.post('/admin/settings/toggle', { key: 'ai_assistant_enabled', value: String(aiForm.enabled) });
          showToast('Настройки ИИ-ассистента сохранены!', 'success');
          setShowAiModal(false);
          fetchSystemData();
      } catch {
          showToast('Ошибка при сохранении настроек ИИ-ассистента', 'error');
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
      let es: EventSource | null = null;
      let active = true;
      sseQuery().then(q => {
          if (!active || !q) return;
          es = new EventSource(`/api/users/admin/stream?${q}`);
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
          es.onerror = () => es?.close();
      });

      return () => { active = false; clearInterval(liveInterval); es?.close(); };
  }, []);

  // SSE онлайн-пользователей — подключаемся когда открыта модалка или активна вкладка системы
  useEffect(() => {
    if (!showOnlineModal && activeTab !== 'system') return;
    let es: EventSource | null = null;
    let active = true;
    sseQuery().then(q => {
        if (!active || !q) return;
        es = new EventSource(`/api/admin/online-users/stream?${q}`);
        es.onmessage = ({ data }) => {
            try { setOnlineUsers(JSON.parse(data).users ?? []); } catch {}
        };
        es.onerror = () => es?.close();
    });
    return () => { active = false; es?.close(); };
  }, [showOnlineModal, activeTab]);

  // ─── Обновления (встроено в сервис, через Watchtower) ─────────────────────────

  const checkUpdateService = async () => {
    setInstallerStatus('unknown');
    try {
      const res = await api.get('/admin/updates/check');
      setInstallerStatus(res.data.ready ? 'connected' : 'error');
    } catch {
      setInstallerStatus('error');
    }
  };

  const startUpdate = async () => {
    setIsUpdating(true);
    setUpdateLog([]);
    if (updateEsRef.current) updateEsRef.current.close();

    const q = await sseQuery();
    if (!q) { setIsUpdating(false); return; }

    const es = new EventSource(`/api/admin/updates/stream?${q}`);
    updateEsRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.text?.trim()) setUpdateLog(prev => [...prev, data]);
        if (data.type === 'done' || data.type === 'failed') {
          setIsUpdating(false);
          es.close();
          updateEsRef.current = null;
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      updateEsRef.current = null;
      // Сервер перезапустился — опрашиваем до восстановления
      setUpdateLog(prev => [...prev, { type: 'info', text: '🔄 Сервер перезапускается...' }]);
      let attempts = 0;
      const poll = async () => {
        attempts++;
        if (attempts > 60) { setIsUpdating(false); return; }
        try {
          await fetch('/api/theme', { signal: AbortSignal.timeout(2000) });
          setUpdateLog(prev => [...prev, { type: 'success', text: '✅ Сервер снова работает! Обновление завершено.' }]);
          setIsUpdating(false);
        } catch {
          setTimeout(poll, 3000);
        }
      };
      setTimeout(poll, 8000);
    };
  };

  useEffect(() => {
    if (activeTab === 'updates') {
      checkUpdateService();
    } else {
      updateEsRef.current?.close();
      updateEsRef.current = null;
    }
  }, [activeTab]);

  useEffect(() => {
    if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [updateLog]);

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
      const ok = await confirm({ title: 'Подтверждение', message: `Вы уверены, что хотите: ${actionName}?` });
      if (!ok) return;
      setIsActionExecuting(true);
      try {
          await api.post(`/admin/${endpoint}`);
          showToast(`Успешно: ${actionName}`, 'success'); fetchSystemData();
      } catch (e) { showToast(`Ошибка выполнения: ${actionName}`, 'error'); } 
      finally { setIsActionExecuting(false); }
  };


  const fetchUsers = async (page = usersPage, search = usersSearch, role = usersRoleFilter, provider = usersProviderFilter) => {
      setLoading(true);
      try {
          const data = await getAllUsers({ page, limit: 50, search: search || undefined, role: role || undefined, provider: provider || undefined });
          setUsersList(data.users);
          setUsersTotal(data.total);
          setUsersPage(data.page);
          setUsersTotalPages(data.totalPages);
          setUsersByRole(data.byRole);
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
              if (!userForm.email) { showToast('Email обязателен', 'error'); return; }
              if (!userForm.password) { showToast('Пароль обязателен', 'error'); return; }
              if (userForm.password.length < 8) { showToast('Пароль должен быть минимум 8 символов', 'error'); return; }
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
      } catch (e: any) {
          const msg = e?.response?.data?.message || 'Ошибка при сохранении пользователя';
          showToast(msg, 'error');
      } finally { setIsSaving(false); }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
      if (user?.id === userId) {
          showToast('Вы не можете удалить самого себя!', 'error');
          return;
      }
      const ok = await confirm({ title: 'Удалить пользователя', message: `Удалить ${userName}? Это действие необратимо — все данные будут потеряны.`, confirmText: 'Удалить', danger: true });
      if (!ok) return;
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

  type AlertSeverity = 'critical' | 'warning' | 'info';
  interface SystemAlert { id: string; severity: AlertSeverity; title: string; message: string; action?: { label: string; onClick: () => void }; }

  const systemAlerts = useMemo<SystemAlert[]>(() => {
    if (systemLoading) return [];
    const alerts: SystemAlert[] = [];

    // CPU
    if (serverStats.cpu >= 90)
      alerts.push({ id: 'cpu-critical', severity: 'critical', title: 'Критическая нагрузка CPU', message: `CPU загружен на ${serverStats.cpu.toFixed(1)}%. Возможно зависание сервера.` });
    else if (serverStats.cpu >= 75)
      alerts.push({ id: 'cpu-warn', severity: 'warning', title: 'Высокая нагрузка CPU', message: `CPU загружен на ${serverStats.cpu.toFixed(1)}%. Рекомендуется проверить фоновые задачи.` });

    // RAM
    if (serverStats.ram >= 90)
      alerts.push({ id: 'ram-critical', severity: 'critical', title: 'Критическое использование RAM', message: `RAM занята на ${serverStats.ram.toFixed(1)}%. Риск нехватки памяти.` });
    else if (serverStats.ram >= 80)
      alerts.push({ id: 'ram-warn', severity: 'warning', title: 'Высокое использование RAM', message: `RAM занята на ${serverStats.ram.toFixed(1)}%. Рекомендуется мониторинг.` });

    // Disk
    const diskPct = storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0;
    if (diskPct >= 90)
      alerts.push({ id: 'disk-critical', severity: 'critical', title: 'Хранилище почти заполнено', message: `Использовано ${diskPct.toFixed(0)}% дискового пространства (${storageUsed.toFixed(1)} GB из ${storageTotal} GB).` });
    else if (diskPct >= 75)
      alerts.push({ id: 'disk-warn', severity: 'warning', title: 'Заканчивается место на диске', message: `Использовано ${diskPct.toFixed(0)}% хранилища. Рассмотрите очистку видеоархива.` });

    // Pending user approvals
    if (pendingUsers.length > 0)
      alerts.push({ id: 'pending', severity: 'info', title: `${pendingUsers.length} заявок на вступление`, message: `Пользователи ожидают подтверждения регистрации.`, action: { label: 'Перейти', onClick: () => setActiveTab('requests') } });

    // Error spike in logs
    const recentErrors = systemLogs.filter(l => l.type === 'error').length;
    if (recentErrors >= 5)
      alerts.push({ id: 'errors', severity: 'warning', title: `${recentErrors} ошибок в журнале`, message: 'Зафиксировано повышенное количество ошибок. Проверьте журнал событий.', action: { label: 'Смотреть', onClick: () => setLogFilter('error') } });

    // Too many admins
    if (usersByRole.admin > 3)
      alerts.push({ id: 'admins', severity: 'warning', title: 'Много администраторов', message: `В системе ${usersByRole.admin} администраторов. Рекомендуется минимизировать число привилегированных аккаунтов.`, action: { label: 'Управлять', onClick: () => setActiveTab('users') } });

    // No external auth configured
    const isEnabled = (v: any) => v === true || v === 'true';
    const hasExternalAuth =
      isEnabled(systemSettings.yandex_enabled) ||
      isEnabled(systemSettings.ldap_enabled) ||
      isEnabled(systemSettings.saml_enabled);
    if (!hasExternalAuth)
      alerts.push({ id: 'auth', severity: 'info', title: 'Используется только локальная аутентификация', message: 'Внешние провайдеры (Яндекс, LDAP, SAML) не настроены. Рекомендуется для корпоративных развёртываний.', action: { label: 'Настроить', onClick: () => setActiveTab('integrations') } });

    return alerts;
  }, [systemLoading, serverStats, storageUsed, storageTotal, pendingUsers, systemLogs, usersByRole, systemSettings]);

  const loadBannedWords = async () => {
    try {
      const [words, offs] = await Promise.all([
        api.get('/banned-words'),
        api.get('/banned-words/offenders'),
      ]);
      setBannedWords(words.data);
      setOffenders(offs.data);
    } catch { /* */ }
  };
  const addWord = async () => {
    if (!newWord.trim()) return;
    setWordLoading(true);
    try {
      await api.post('/banned-words', { word: newWord.trim() });
      setNewWord('');
      await loadBannedWords();
      showToast('Слово добавлено', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Ошибка', 'error');
    } finally { setWordLoading(false); }
  };
  const removeWord = async (id: number) => {
    await api.delete(`/banned-words/${id}`);
    setBannedWords(prev => prev.filter(w => w.id !== id));
  };
  const importWords = async () => {
    const words = importText.split(/[\n,;]+/).map(w => w.trim()).filter(Boolean);
    if (!words.length) return;
    setWordLoading(true);
    try {
      const r = await api.post('/banned-words/import', { words });
      setImportText('');
      await loadBannedWords();
      showToast(`Добавлено ${r.data.added} из ${r.data.total}`, 'success');
    } catch { showToast('Ошибка импорта', 'error'); }
    finally { setWordLoading(false); }
  };

  return (
    <div className="lumeo-layout admin-page">
      {/* Модалка бана пользователя */}
      {banModalUser && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)' }}>Заблокировать пользователя</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 16px' }}>
                      {banModalUser.firstName} {banModalUser.lastName} ({banModalUser.email})
                  </p>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>Причина блокировки (необязательно)</label>
                  <textarea
                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 80, outline: 'none' }}
                      placeholder="Например: нарушение правил платформы..."
                      value={banReasonInput}
                      onChange={e => setBanReasonInput(e.target.value)}
                      maxLength={500}
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" onClick={() => setBanModalUser(null)}>Отмена</button>
                      <button
                          className="btn btn-primary"
                          style={{ background: '#ff4444', borderColor: '#ff4444' }}
                          onClick={async () => {
                              await banUser(banModalUser.id, banReasonInput.trim() || undefined);
                              setUsersList(prev => prev.map(x => x.id === banModalUser.id ? { ...x, status: 'banned' } : x));
                              showToast('Пользователь заблокирован', 'success');
                              setBanModalUser(null);
                          }}
                      >
                          Заблокировать
                      </button>
                  </div>
              </div>
          </div>
      )}
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
                      <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px'}}>
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
      {/* МОДАЛЬНОЕ ОКНО ИИ-АССИСТЕНТ */}
      {showAiModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3>🤖 Настройки ИИ-ассистента (Луми)</h3>
                      <button className="btn-icon" onClick={() => setShowAiModal(false)}><Icons.Close /></button>
                  </div>
                  <div className="modal-body">
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="lumeo-switch" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
                              <input type="checkbox" checked={aiForm.enabled} onChange={e => setAiForm({ ...aiForm, enabled: e.target.checked })} />
                              <span className="slider round"></span>
                          </label>
                          <strong style={{ color: aiForm.enabled ? '#00ff88' : '#888', verticalAlign: 'middle' }}>
                              {aiForm.enabled ? 'Ассистент ВКЛЮЧЁН' : 'Ассистент ОТКЛЮЧЁН'}
                          </strong>
                      </div>
                      <div className="form-group" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>🤖</span>
                              <strong style={{ fontSize: 14 }}>Локальная модель: Ollama qwen2.5:3b</strong>
                              <span style={{ fontSize: 11, background: 'rgba(0,255,136,0.15)', color: '#00ff88', padding: '2px 7px', borderRadius: 4, fontWeight: 600, marginLeft: 'auto' }}>Локально</span>
                          </div>
                          <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.6 }}>
                              ИИ работает полностью локально — без API-ключей и интернета.<br/>
                              Модель запускается автоматически при старте системы (сервис Ollama).
                          </p>
                      </div>
                  </div>
                  <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowAiModal(false)}>Отмена</button>
                      <button className="btn btn-primary" onClick={handleSaveAi} disabled={isSaving}>
                          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {showSamlModal && (
          <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '500px' }}>
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
                      <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px'}}>
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
      <AppHeader badge="Администратор" badgeColor="danger" />

      <div className="lumeo-container">
        <main className="admin-layout">
            
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                <button className={`admin-tab ${activeTab === 'email' ? 'active' : ''}`} onClick={() => setActiveTab('email')}>
                    <Icons.Mail /> Почта
                </button>
                <button className={`admin-tab ${activeTab === 'moderation' ? 'active' : ''}`} onClick={() => { setActiveTab('moderation'); loadBannedWords(); }}>
                    <Icons.Shield /> Модерация
                </button>
                <button className={`admin-tab ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>
                    <Icons.RotateCcw /> Обновления
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
                        <div className="stat-info"><div className="stat-label">Пользователей</div><div className="stat-value">{usersTotal || usersByRole.student + usersByRole.teacher + usersByRole.admin}</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{color: '#ffd700'}}><Icons.Code /></div>
                        <div className="stat-info"><div className="stat-label">Преподавателей</div><div className="stat-value">{usersByRole.teacher}</div></div>
                    </div>
                    <div className="stat-card mini">
                        <div className="stat-icon" style={{color: '#ff4d4d'}}><Icons.Shield /></div>
                        <div className="stat-info"><div className="stat-label">Администраторов</div><div className="stat-value">{usersByRole.admin}</div></div>
                    </div>
                    <div className="stat-card mini" style={{cursor: 'pointer'}} onClick={() => setShowOnlineModal(true)} title="Посмотреть кто онлайн">
                        <div className="stat-icon" style={{color: '#00ff88'}}><Icons.Activity /></div>
                        <div className="stat-info"><div className="stat-label">Активных сессий</div><div className="stat-value">{serverStats.connections}</div></div>
                    </div>
                </div>
            )}

            {/* ==================== ВКЛАДКА 1: ОБЗОР СИСТЕМЫ ==================== */}
            {activeTab === 'system' && (
              <>
                {/* СИСТЕМНЫЕ УВЕДОМЛЕНИЯ */}
                {!systemLoading && (
                  <div className="system-alerts-panel">
                    {systemAlerts.length === 0 ? (
                      <div className="system-alert alert-ok">
                        <span className="alert-icon">✓</span>
                        <span className="alert-text">Все системы работают в штатном режиме</span>
                      </div>
                    ) : (
                      systemAlerts.map(alert => (
                        <div key={alert.id} className={`system-alert alert-${alert.severity}`}>
                          <span className="alert-icon">
                            {alert.severity === 'critical' && <Icons.Fail size={14}/>}
                            {alert.severity === 'warning' && <Icons.AlertTriangle size={14}/>}
                            {alert.severity === 'info' && <Icons.LogInfo size={14}/>}
                          </span>
                          <div className="alert-body">
                            <span className="alert-title">{alert.title}</span>
                            <span className="alert-message">{alert.message}</span>
                          </div>
                          {alert.action && (
                            <button className="alert-action-btn" onClick={alert.action.onClick}>
                              {alert.action.label}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* МЕТРИКИ — строка карточек */}
                <div className="sys-metrics-row">
                    <div className="sys-metric-card">
                        <div className="sys-metric-icon" style={{background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)'}}><Icons.Server size={20}/></div>
                        <div className="sys-metric-body">
                            <div className="sys-metric-label">Статус сервера</div>
                            <div className="sys-metric-value" style={{fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <span className="pulse-dot"></span> Online
                            </div>
                            <div className="sys-metric-sub">Аптайм: {serverStats.uptime}</div>
                        </div>
                    </div>
                    <div className="sys-metric-card">
                        <div className="sys-metric-icon" style={{background: 'rgba(255,200,0,0.1)', color: '#ffc800'}}><Icons.Cpu size={20}/></div>
                        <div className="sys-metric-body">
                            <div className="sys-metric-label">CPU</div>
                            <div className="sys-metric-value">{serverStats.cpu.toFixed(1)}%</div>
                            <div className="sys-metric-bar"><div style={{width: `${serverStats.cpu}%`, background: serverStats.cpu > 80 ? 'var(--danger)' : '#ffc800'}}></div></div>
                        </div>
                    </div>
                    <div className="sys-metric-card">
                        <div className="sys-metric-icon" style={{background: 'rgba(181,23,158,0.1)', color: '#b5179e'}}><Icons.Activity size={20}/></div>
                        <div className="sys-metric-body">
                            <div className="sys-metric-label">RAM</div>
                            <div className="sys-metric-value">{serverStats.ram.toFixed(1)}%</div>
                            <div className="sys-metric-bar"><div style={{width: `${serverStats.ram}%`, background: serverStats.ram > 85 ? 'var(--danger)' : '#b5179e'}}></div></div>
                        </div>
                    </div>
                    <div className="sys-metric-card">
                        <div className="sys-metric-icon" style={{background: 'rgba(0,255,136,0.1)', color: '#00ff88'}}><Icons.Database size={20}/></div>
                        <div className="sys-metric-body">
                            <div className="sys-metric-label">Хранилище</div>
                            <div className="sys-metric-value">{storageUsed.toFixed(1)} <span style={{fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)'}}>/ {storageTotal} GB</span></div>
                            <div className="sys-metric-bar"><div style={{width: `${(storageUsed/storageTotal)*100}%`, background: (storageUsed/storageTotal) > 0.85 ? 'var(--danger)' : '#00ff88'}}></div></div>
                        </div>
                    </div>
                    <div className="sys-metric-card">
                        <div className="sys-metric-icon" style={{background: 'rgba(var(--primary-rgb),0.08)', color: 'var(--primary)'}}><Icons.Users size={20}/></div>
                        <div className="sys-metric-body">
                            <div className="sys-metric-label">Онлайн сейчас</div>
                            <div className="sys-metric-value">{onlineUsers.length}</div>
                            <div className="sys-metric-sub">{serverStats.connections} активных сессий</div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-columns">
                    {/* ЖУРНАЛ — collapsible */}
                    <div className="dashboard-main">
                        <div className="admin-section log-section">
                            <div className="section-header compact" style={{flexWrap: 'wrap', gap: '10px'}}>
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', cursor:'pointer', userSelect:'none'}} onClick={() => setLogCollapsed(v => !v)}>
                                    <Icons.Terminal />
                                    Журнал событий
                                    <span style={{fontSize:'11px', color:'var(--text-muted)', marginLeft:'4px', transition:'transform 0.2s', display:'inline-block', transform: logCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}}>▾</span>
                                </h2>
                                {!logCollapsed && (
                                    <div className="log-filters">
                                        <button className={`filter-btn ${logFilter === 'all' ? 'active' : ''}`} onClick={() => setLogFilter('all')}>Все</button>
                                        <button className={`filter-btn info ${logFilter === 'info' ? 'active' : ''}`} onClick={() => setLogFilter('info')}>Инфо</button>
                                        <button className={`filter-btn success ${logFilter === 'success' ? 'active' : ''}`} onClick={() => setLogFilter('success')}>Успех</button>
                                        <button className={`filter-btn warning ${logFilter === 'warning' ? 'active' : ''}`} onClick={() => setLogFilter('warning')}>Внимание</button>
                                        <button className={`filter-btn error ${logFilter === 'error' ? 'active' : ''}`} onClick={() => setLogFilter('error')}>Ошибки</button>
                                        <button className="btn-icon" style={{marginLeft: 'auto'}} onClick={fetchSystemData} title="Обновить"><Icons.Refresh /></button>
                                    </div>
                                )}
                            </div>
                            {!logCollapsed && (
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
                            )}
                        </div>
                    </div>

                    {/* САЙДБАР — только быстрые действия */}
                    <aside className="dashboard-sidebar">
                        <div className="admin-section">
                            <div className="section-header compact">
                                <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px'}}><Icons.Zap /> Быстрые действия</h2>
                            </div>
                            <div className="section-body" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                <button className="quick-action-btn" disabled={isActionExecuting} onClick={() => handleQuickAction('clear-cache', 'Очистить кэш ИИ')} style={{display:'flex', alignItems:'center', gap:'14px'}}>
                                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'rgba(var(--primary-rgb),0.12)', border:'1px solid rgba(var(--primary-rgb),0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--primary)', flexShrink:0}}>
                                        <Icons.AI size={18}/>
                                    </div>
                                    <div><div style={{fontWeight:600, fontSize:'13px'}}>Очистить кэш ИИ</div><div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>Освободить память субтитров</div></div>
                                </button>
                                <button className="quick-action-btn" disabled={isActionExecuting} onClick={() => handleQuickAction('backup-db', 'Сделать бэкап БД')} style={{display:'flex', alignItems:'center', gap:'14px'}}>
                                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'rgba(181,23,158,0.12)', border:'1px solid rgba(181,23,158,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#b5179e', flexShrink:0}}>
                                        <Icons.Database size={18}/>
                                    </div>
                                    <div><div style={{fontWeight:600, fontSize:'13px'}}>Бэкап базы данных</div><div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>Создать резервную копию</div></div>
                                </button>
                                <button
                                    className="quick-action-btn"
                                    disabled={isActionExecuting}
                                    onClick={async () => {
                                        const next = !analyticsDemo;
                                        setAnalyticsDemo(next);
                                        await api.post('/admin/settings/toggle', { key: 'analytics_demo_button_visible', value: String(next) });
                                        showToast(next ? 'Кнопка демо-режима показана всем' : 'Кнопка демо-режима скрыта у всех', 'info');
                                    }}
                                    style={{display:'flex', alignItems:'center', gap:'14px'}}
                                >
                                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#ffd700', flexShrink:0, fontSize:'18px'}}>
                                        ✦
                                    </div>
                                    <div>
                                        <div style={{fontWeight:600, fontSize:'13px'}}>Кнопка демо-режима</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                            {analyticsDemo ? 'Видна всем в аналитике' : 'Скрыта у всех в аналитике'}
                                        </div>
                                    </div>
                                </button>
                                <button className="quick-action-btn danger" disabled={isActionExecuting} onClick={() => handleQuickAction('restart', 'Принудительная перезагрузка')} style={{display:'flex', alignItems:'center', gap:'14px'}}>
                                    <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'rgba(var(--danger-rgb),0.12)', border:'1px solid rgba(var(--danger-rgb),0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)', flexShrink:0}}>
                                        <Icons.RotateCcw size={18}/>
                                    </div>
                                    <div><div style={{fontWeight:600, fontSize:'13px'}}>Перезагрузить сервер</div><div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>Принудительный рестарт</div></div>
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* НИЖНЯЯ СТРОКА — Хранилище + Модули рядом */}
                <div className="sys-bottom-row">
                    <div className="admin-section">
                        <div className="section-header compact">
                            <h2 style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'15px'}}><Icons.Database /> Хранилище</h2>
                            <span style={{fontSize:'12px', color:'var(--text-muted)'}}>{storageUsed.toFixed(1)} / {storageTotal} GB</span>
                        </div>
                        <div className="section-body" style={{display:'flex', flexDirection:'column', gap:'14px'}}>
                            {[
                                {label:'Видео',       val:storageData.video, color:'var(--primary)',  bg:'rgba(var(--primary-rgb),0.1)'},
                                {label:'База данных', val:storageData.db,    color:'#b5179e',         bg:'rgba(181,23,158,0.1)'},
                                {label:'Кэш ИИ',      val:storageData.cache, color:'var(--warning)',  bg:'rgba(var(--warning-rgb),0.1)'},
                            ].map(item => {
                                const maxVal = Math.max(storageData.video, storageData.db, storageData.cache, 0.01);
                                const pct = Math.max((item.val / maxVal) * 100, item.val > 0 ? 4 : 0);
                                return (
                                    <div key={item.label}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                <div style={{width:'8px', height:'8px', borderRadius:'50%', background:item.color, flexShrink:0, boxShadow:`0 0 5px ${item.color}`}}></div>
                                                <span style={{fontSize:'13px', color:'var(--text-muted)'}}>{item.label}</span>
                                            </div>
                                            <span style={{fontSize:'13px', color:'var(--text-main)', fontWeight:600}}>{item.val.toFixed(2)} GB</span>
                                        </div>
                                        <div style={{height:'6px', background:'var(--bg-deep)', borderRadius:'3px', overflow:'hidden'}}>
                                            <div style={{height:'100%', width:`${pct}%`, background:item.color, borderRadius:'3px', transition:'width 0.5s ease', boxShadow:`0 0 8px ${item.color}55`}}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div style={{borderTop:'1px solid var(--border-color)', paddingTop:'10px', display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--text-muted)'}}>
                                <span>Итого занято</span>
                                <span style={{color:'var(--text-main)', fontWeight:600}}>{storageUsed.toFixed(2)} GB <span style={{fontWeight:400}}>из {storageTotal} GB</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="admin-section">
                        <div className="section-header compact">
                            <h2 style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'15px'}}><Icons.Activity /> Статус модулей</h2>
                        </div>
                        <div className="section-body" style={{padding:'12px 20px'}}>
                            {systemModules.length === 0 ? (
                                <div style={{color:'var(--text-muted)', fontSize:'12px', textAlign:'center', padding:'10px 0'}}>Загрузка...</div>
                            ) : systemModules.map((mod, i) => {
                                const isActive = mod.status === 'active';
                                const isIdle   = mod.status === 'idle';
                                const color    = isActive ? '#00ff88' : isIdle ? '#ffd700' : '#ff4d4d';
                                return (
                                    <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < systemModules.length-1 ? '1px solid var(--border-color)' : 'none'}}>
                                        <div>
                                            <div style={{color:'var(--text-main)', fontWeight:'500', fontSize:'13px'}}>{mod.name}</div>
                                            <div style={{color:'var(--text-muted)', fontSize:'11px', marginTop:'2px'}}>{mod.note || mod.version}</div>
                                        </div>
                                        <div style={{display:'flex', alignItems:'center', gap:'5px', flexShrink:0}}>
                                            <span style={{width:'7px', height:'7px', background:color, borderRadius:'50%', display:'inline-block', boxShadow: isActive ? `0 0 6px ${color}` : 'none'}}></span>
                                            <span style={{color, fontSize:'12px', fontWeight:500}}>{isActive ? 'Активен' : isIdle ? 'Ожидание' : 'Недоступен'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
              </>
            )}

            {/* ==================== ВКЛАДКА 2: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==================== */}
            {activeTab === 'users' && (
                <div className="admin-section">
                    <div className="section-header">
                        <h2>База пользователей</h2>
                        <div className="users-btn-group">
                            <div className="users-btn-row">
                                <button className="btn btn-secondary" onClick={handleTemplateClick} title="Скачать шаблон (Excel)">
                                    <Icons.Download /> Шаблон
                                </button>
                                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isActionExecuting}>
                                    <Icons.Upload /> {isActionExecuting ? 'Импорт...' : 'Импорт Excel'}
                                </button>
                                <button className="btn btn-secondary" onClick={() => fetchUsers()}><Icons.Refresh /> Обновить</button>
                            </div>
                            <div className="users-btn-row">
                                <button className="btn btn-secondary" onClick={handleExportUsers} title="Выгрузить всех пользователей в Excel" style={{color: '#00ff88', borderColor: 'rgba(0, 255, 136, 0.3)'}}>
                                    <Icons.Database /> Выгрузить БД
                                </button>
                                <button className="btn btn-primary" onClick={openAddModal}><Icons.Plus /> Добавить</button>
                            </div>
                        </div>
                        {/* МОДАЛЬНОЕ ОКНО ИНСТРУКЦИИ К ШАБЛОНУ */}
                        {modalMode === 'template' && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{ maxWidth: '580px', padding: '30px' }}>
                                    <div className="modal-header" style={{ marginBottom: '15px', borderBottom: 'none' }}>
                                        <h3 style={{ fontSize: '20px' }}>Инструкция к импорту</h3>
                                        <button className="btn-icon" onClick={closeModal}><Icons.Close /></button>
                                    </div>
                                    <div className="modal-body">
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '24px', lineHeight: '1.5' }}>
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
                                        <button className="btn btn-secondary" onClick={closeModal} style={{flex: 1, padding: '14px', background: 'var(--bg-card)'}}>
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

                    {/* Поиск и фильтр */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <input
                            className="modern-input"
                            style={{ flex: 1, minWidth: '200px' }}
                            placeholder="Поиск по имени или email..."
                            value={usersSearch}
                            onChange={e => {
                                setUsersSearch(e.target.value);
                                setUsersPage(1);
                                fetchUsers(1, e.target.value, usersRoleFilter);
                            }}
                        />
                        <select
                            className="modern-input"
                            style={{ width: '180px' }}
                            value={usersRoleFilter}
                            onChange={e => {
                                setUsersRoleFilter(e.target.value);
                                setUsersPage(1);
                                fetchUsers(1, usersSearch, e.target.value, usersProviderFilter);
                            }}
                        >
                            <option value="">Все роли</option>
                            <option value="student">Студенты</option>
                            <option value="teacher">Преподаватели</option>
                            <option value="admin">Администраторы</option>
                        </select>
                        <select
                            className="modern-input"
                            style={{ width: '160px' }}
                            value={usersProviderFilter}
                            onChange={e => {
                                setUsersProviderFilter(e.target.value);
                                setUsersPage(1);
                                fetchUsers(1, usersSearch, usersRoleFilter, e.target.value);
                            }}
                        >
                            <option value="">Все источники</option>
                            <option value="local">Локальные</option>
                            <option value="ldap">LDAP / AD</option>
                            <option value="yandex">Яндекс</option>
                            <option value="saml">SAML SSO</option>
                        </select>
                    </div>

                    {loading ? (
                        <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-muted)'}}>Загрузка базы данных...</div>
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
                                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                                    <span style={{fontWeight: '600', color: 'var(--text-main)', fontSize: '14px'}}>
                                                        {u.firstName} {u.lastName}
                                                    </span>
                                                    {u.authProvider && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: '600',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            letterSpacing: '0.5px',
                                                            textTransform: 'uppercase',
                                                            background: u.authProvider === 'yandex' ? 'rgba(255,51,51,0.15)'
                                                                      : u.authProvider === 'ldap'   ? 'rgba(0,255,136,0.15)'
                                                                      : u.authProvider === 'local'  ? 'rgba(100,100,100,0.2)'
                                                                      : 'rgba(155,89,182,0.15)',
                                                            color: u.authProvider === 'yandex' ? '#ff5555'
                                                                 : u.authProvider === 'ldap'   ? '#00ff88'
                                                                 : u.authProvider === 'local'  ? '#888'
                                                                 : '#c39bd3',
                                                            border: `1px solid ${
                                                                u.authProvider === 'yandex' ? 'rgba(255,51,51,0.3)'
                                                              : u.authProvider === 'ldap'   ? 'rgba(0,255,136,0.3)'
                                                              : u.authProvider === 'local'  ? 'rgba(100,100,100,0.3)'
                                                              : 'rgba(155,89,182,0.3)'
                                                            }`,
                                                        }}>
                                                            {u.authProvider}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{u.email}</div>
                                                <div style={{fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6}}>ID: {u.id}</div>
                                            </td>
                                            <td>
                                                <select className={`role-select ${u.role}`} value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                                                    <option value="student">Студент</option>
                                                    <option value="teacher">Преподаватель</option>
                                                    <option value="admin">Администратор</option>
                                                </select>
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <div className="user-actions-row" style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center'}}>
                                                    {u.status === 'banned' && (
                                                        <span style={{ fontSize: '10px', color: '#ff4d4d', background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>БАН</span>
                                                    )}
                                                    <button className="btn-icon" onClick={() => openEditModal(u)} title="Настроить"><Icons.Edit /></button>
                                                    {u.status === 'banned' ? (
                                                        <button className="btn-icon" style={{ color: '#00ff88', borderColor: 'rgba(0,255,136,0.3)' }} title="Разблокировать" onClick={async () => { await unbanUser(u.id); setUsersList(prev => prev.map(x => x.id === u.id ? {...x, status: 'active'} : x)); showToast('Пользователь разблокирован', 'success'); }}>✓</button>
                                                    ) : (
                                                        <button className="btn-icon" style={{ color: '#ff9900', borderColor: 'rgba(255,153,0,0.3)' }} title="Заблокировать" onClick={() => { setBanModalUser(u); setBanReasonInput(''); }}>🚫</button>
                                                    )}
                                                    <button className="btn-icon delete-icon" onClick={() => handleDeleteUser(u.id, u.firstName)} title="Удалить"><Icons.Trash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Пагинация */}
                    {usersTotalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                            <button
                                className="btn btn-secondary"
                                disabled={usersPage <= 1}
                                onClick={() => { const p = usersPage - 1; setUsersPage(p); fetchUsers(p); }}
                            >
                                &lsaquo; Назад
                            </button>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                Стр. {usersPage} / {usersTotalPages} &nbsp;&bull;&nbsp; Всего: {usersTotal}
                            </span>
                            <button
                                className="btn btn-secondary"
                                disabled={usersPage >= usersTotalPages}
                                onClick={() => { const p = usersPage + 1; setUsersPage(p); fetchUsers(p); }}
                            >
                                Вперёд &rsaquo;
                            </button>
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
            {activeTab === 'email' && <EmailTab />}

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

                            {/* Карточка ИИ-ассистент */}
                            {(() => {
                                const aiEnabled = systemSettings.ai_assistant_enabled !== false && systemSettings.ai_assistant_enabled !== 'false';
                                return (
                                <div className={`integration-card ${aiEnabled ? 'active' : ''}`}>
                                    <div className="int-header">
                                        <div className="int-icon" style={{background: 'rgba(0,255,136,0.12)', color: 'var(--primary)', fontSize: '20px', display:'flex', alignItems:'center', justifyContent:'center', width:40, height:40, borderRadius:10}}>🤖</div>
                                        <div className={`int-status ${aiEnabled ? '' : 'disabled'}`}>
                                            {aiEnabled ? <><span className="pulse-dot"></span> Активен</> : 'Отключен'}
                                        </div>
                                    </div>
                                    <h3>ИИ-ассистент (Луми)</h3>
                                    <p>Локальная модель Ollama qwen2.5:3b. Без API-ключей, полностью офлайн.</p>
                                    <div className="int-meta">
                                        <span>Движок: Ollama (локально)</span>
                                    </div>
                                    <div className="int-actions">
                                        <button className={aiEnabled ? 'btn btn-secondary' : 'btn btn-primary'} style={{width:'100%'}} onClick={openAiModal}>
                                            Настроить
                                        </button>
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
            {/* ==================== ВКЛАДКА: МОДЕРАЦИЯ ==================== */}
            {activeTab === 'moderation' && (
                <div className="admin-section">
                    <div className="section-header">
                        <h2>Фильтр слов</h2>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Запрещённые слова заменяются на *** в комментариях</span>
                    </div>
                    <div className="section-body">
                        {/* Добавить одно слово */}
                        <div className="word-filter-row" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <input
                                className="modern-input"
                                style={{ flex: 1, maxWidth: 320 }}
                                placeholder="Добавить слово..."
                                value={newWord}
                                onChange={e => setNewWord(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addWord(); }}
                            />
                            <button className="btn btn-primary" onClick={addWord} disabled={wordLoading || !newWord.trim()}>
                                <Icons.Plus /> Добавить
                            </button>
                        </div>

                        {/* Массовый импорт */}
                        <div style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 20px' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Массовый импорт — вставьте слова через запятую, пробел или каждое с новой строки:</div>
                            <textarea
                                className="modern-textarea"
                                style={{ minHeight: 80, marginBottom: 10 }}
                                placeholder="мат, грубость, спам..."
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                            />
                            <button className="btn btn-secondary" onClick={importWords} disabled={wordLoading || !importText.trim()}>
                                Импортировать
                            </button>
                        </div>

                        {/* Топ нарушителей */}
                        {offenders.length > 0 && (
                            <div style={{ marginBottom: 28 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                    Топ нарушителей
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {offenders.map((o: any, i) => {
                                        const u = o.user;
                                        const initials = u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '?';
                                        const lastSeen = o.lastSeen ? new Date(o.lastSeen).toLocaleDateString('ru-RU') : '—';
                                        return (
                                            <div key={o.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 16px' }}>
                                                <span style={{ fontSize: 13, color: 'var(--text-muted)', width: 20, flexShrink: 0 }}>#{i + 1}</span>
                                                {u?.avatarUrl
                                                    ? <img src={u.avatarUrl} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                                                }
                                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u?.firstName} {u?.lastName}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u?.email}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4b4b' }}>{o.count}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>нарушений</div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>последнее</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lastSeen}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Список слов */}
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                            Всего в списке: <strong style={{ color: 'var(--text-main)' }}>{bannedWords.length}</strong>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {bannedWords.map(w => (
                                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 10px 4px 12px', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-main)' }}>{w.word}</span>
                                    <button
                                        onClick={() => removeWord(w.id)}
                                        style={{ background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '0 0 0 4px', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Icons.Close size={12} />
                                    </button>
                                </div>
                            ))}
                            {bannedWords.length === 0 && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Список пуст — все слова разрешены</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>

    {/* ===== МОДАЛКА ОНЛАЙН ПОЛЬЗОВАТЕЛЕЙ ===== */}
    {showOnlineModal && (
      <div className="modal-overlay" onClick={() => setShowOnlineModal(false)}>
        <div className="modal-content" style={{ maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Онлайн сейчас</h3>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {onlineUsers.filter(u => u.userId).length} польз. · {onlineUsers.filter(u => !u.userId).length} гост.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'student', 'teacher', 'admin', 'guest'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setOnlineRoleFilter(r)}
                  style={{
                    padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12,
                    background: onlineRoleFilter === r ? 'var(--primary)' : 'var(--card-bg)',
                    color: onlineRoleFilter === r ? '#fff' : 'var(--text-secondary)',
                  }}
                >{r === 'all' ? 'Все' : r === 'guest' ? 'Гости' : ROLE_LABELS[r]}</button>
              ))}
            </div>
            <button onClick={() => setShowOnlineModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
              <Icons.Close size={18} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onlineUsers.filter(u => {
              if (onlineRoleFilter === 'all') return true;
              if (onlineRoleFilter === 'guest') return !u.userId;
              return u.role === onlineRoleFilter;
            }).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0', fontSize: 14 }}>
                Нет активных пользователей
              </div>
            ) : (
              onlineUsers
                .filter(u => {
                  if (onlineRoleFilter === 'all') return true;
                  if (onlineRoleFilter === 'guest') return !u.userId;
                  return u.role === onlineRoleFilter;
                })
                .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0))
                .map((u, i) => {
                  const isGuest = !u.userId;
                  const initials = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?';
                  const roleColor = isGuest ? '#888' : (ROLE_COLORS[u.role ?? ''] ?? '#888');
                  return (
                    <div key={u.userId ?? u.ip ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--card-bg)' }}>
                      {isGuest ? (
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#88888822', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icons.Globe size={18} color="#888" />
                        </div>
                      ) : u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: roleColor + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: roleColor, flexShrink: 0 }}>
                          {initials}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isGuest ? (u.ip ?? 'Неизвестный IP') : (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : `Пользователь #${u.userId}`)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {isGuest ? 'Не авторизован' : formatPage(u.page)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: roleColor + '22', color: roleColor, fontWeight: 500 }}>
                          {isGuest ? 'Гость' : (ROLE_LABELS[u.role ?? ''] ?? u.role)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {formatLastSeen(u.lastSeen)}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
            Обновляется автоматически каждые 10 сек
          </div>
        </div>
      </div>
    )}

    {/* ==================== ВКЛАДКА: ОБНОВЛЕНИЯ ==================== */}
    {activeTab === 'updates' && (
      <div className="admin-section">
        <div className="section-header compact">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <Icons.RotateCcw /> Обновления Lumeo
          </h2>
        </div>
        <div className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Главная карточка */}
          <div style={{
            background: 'rgba(108,99,255,.05)', border: '1px solid rgba(108,99,255,.15)',
            borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px',
          }}>
            {/* Шапка карточки */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(108,99,255,.2), rgba(168,85,247,.2))',
                  border: '1px solid rgba(108,99,255,.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'var(--primary)', display: 'flex' }}><Icons.RotateCcw size={20} /></span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Обновление сервиса
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    {installerStatus === 'unknown' && (
                      <><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.6 }} />
                      <span style={{ color: 'var(--text-muted)' }}>Проверяем...</span></>
                    )}
                    {installerStatus === 'connected' && (
                      <><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
                      <span style={{ color: '#22c55e', fontWeight: 500 }}>Watchtower подключён</span></>
                    )}
                    {installerStatus === 'error' && (
                      <><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }} />
                      <span style={{ color: '#ef4444', fontWeight: 500 }}>Сервис недоступен</span></>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={checkUpdateService} disabled={isUpdating} title="Обновить статус"
                style={{
                  background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px',
                  padding: '7px 9px', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'border-color .15s',
                }}
              >
                <Icons.RotateCcw size={13} />
              </button>
            </div>

            {/* Шаги обновления */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {(['📦 Загружает новые Docker-образы с GitHub Container Registry',
                 '🔄 Перезапускает контейнеры server и client',
                 '🗄️ База данных и загруженные файлы сохраняются'
                ] as const).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '15px', width: '22px', textAlign: 'center', flexShrink: 0 }}>{step.slice(0, 2)}</span>
                  {step.slice(2).trim()}
                </div>
              ))}
            </div>

            {/* Предупреждение при ошибке */}
            {installerStatus === 'error' && (
              <div style={{
                background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)',
                borderRadius: '8px', padding: '12px 14px', fontSize: '12px',
                color: 'var(--text-muted)', lineHeight: '1.7',
              }}>
                Контейнер <code style={{ background: 'rgba(255,255,255,.07)', padding: '0 5px', borderRadius: '3px' }}>lumeo-watchtower</code> не найден.
                Добавьте его в <code style={{ background: 'rgba(255,255,255,.07)', padding: '0 5px', borderRadius: '3px' }}>docker-compose.yml</code> и выполните:{' '}
                <code style={{ background: 'rgba(255,255,255,.07)', padding: '0 5px', borderRadius: '3px' }}>docker compose up -d watchtower</code>
              </div>
            )}

            {/* Кнопка */}
            <button
              onClick={startUpdate}
              disabled={isUpdating || installerStatus !== 'connected'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '13px 20px', borderRadius: '10px', border: 'none', width: '100%',
                background: (isUpdating || installerStatus !== 'connected')
                  ? 'rgba(108,99,255,.15)'
                  : 'linear-gradient(135deg, var(--primary), #a855f7)',
                color: (isUpdating || installerStatus !== 'connected') ? 'var(--text-muted)' : '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: (isUpdating || installerStatus !== 'connected') ? 'not-allowed' : 'pointer',
                boxShadow: (isUpdating || installerStatus !== 'connected') ? 'none' : '0 4px 18px rgba(108,99,255,.35)',
                transition: 'all .2s',
              }}
            >
              {isUpdating
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Обновление в процессе...</>
                : <><Icons.RotateCcw size={15} /> Обновить до последней версии</>
              }
            </button>
          </div>

          {/* Терминал лога */}
          {updateLog.length > 0 && (
            <div style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Строка заголовка в стиле macOS */}
              <div style={{
                padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.06)',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,.02)',
              }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => (
                    <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>Лог обновления</span>
                {isUpdating && (
                  <span style={{ fontSize: '11px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> выполняется
                  </span>
                )}
              </div>
              {/* Контент терминала */}
              <div
                ref={logScrollRef}
                style={{
                  padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px',
                  maxHeight: '260px', overflowY: 'auto', lineHeight: '1.8',
                }}
              >
                {updateLog.map((line, i) => (
                  <div key={i} style={{
                    color: line.type === 'success' ? '#22c55e'
                          : line.type === 'error'   ? '#ef4444'
                          : (line.type === 'warn' || line.type === 'warning') ? '#f59e0b'
                          : '#8080aa',
                  }}>
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    )}

    </div>
  );
};

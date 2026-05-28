import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const PROVIDERS = [
    { value: 'gmail',   label: 'Gmail',               host: 'smtp.gmail.com',       port: '587', hint: 'Нужен App Password — обычный пароль не подойдёт. Создайте на myaccount.google.com/apppasswords' },
    { value: 'yandex',  label: 'Яндекс 360',          host: 'smtp.yandex.ru',       port: '587', hint: 'Создайте пароль приложения в настройках Яндекс ID → Безопасность' },
    { value: 'mailru',  label: 'Mail.ru',              host: 'smtp.mail.ru',         port: '465', hint: 'Создайте пароль приложения в настройках Mail.ru → Пароли и безопасность' },
    { value: 'outlook', label: 'Microsoft / Outlook',  host: 'smtp.office365.com',   port: '587', hint: 'Используйте обычный пароль аккаунта Microsoft.' },
    { value: 'custom',  label: 'Другой (SMTP вручную)', host: '',                   port: '587', hint: '' },
];

export const EmailTab = () => {
    const { showToast } = useToast();
    const { user } = useAuth();

    const [provider, setProvider] = useState('custom');
    const [host,     setHost]     = useState('');
    const [port,     setPort]     = useState('587');
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPass, setSmtpPass] = useState('');
    const [from,     setFrom]     = useState('');
    const [testTo,   setTestTo]   = useState('');
    const [showPass, setShowPass] = useState(false);
    const [saving,   setSaving]   = useState(false);
    const [testing,  setTesting]  = useState(false);
    const [configured, setConfigured] = useState(false);

    useEffect(() => {
        api.get('/admin/settings').then(res => {
            const s = res.data;
            if (s.smtp_host) {
                setHost(s.smtp_host);
                setPort(s.smtp_port || '587');
                setSmtpUser(s.smtp_user || '');
                setSmtpPass(s.smtp_pass || '');
                setFrom(s.smtp_from || '');
                setConfigured(true);
                const matched = PROVIDERS.find(p => p.host === s.smtp_host);
                setProvider(matched ? matched.value : 'custom');
            }
        });
        if (user?.email) setTestTo(user.email);
    }, []);

    const handleProviderChange = (val: string) => {
        setProvider(val);
        const p = PROVIDERS.find(p => p.value === val);
        if (p && val !== 'custom') { setHost(p.host); setPort(p.port); }
    };

    const handleSave = async () => {
        if (!host || !smtpUser || !smtpPass) { showToast('Заполните хост, логин и пароль', 'error'); return; }
        setSaving(true);
        try {
            const fields: Record<string, string> = { smtp_host: host, smtp_port: port, smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from: from || smtpUser };
            await Promise.all(Object.entries(fields).map(([key, value]) => api.post('/admin/settings/toggle', { key, value })));
            setConfigured(true);
            showToast('Настройки почты сохранены', 'success');
        } catch {
            showToast('Ошибка сохранения', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!testTo) { showToast('Укажите адрес получателя', 'error'); return; }
        setTesting(true);
        try {
            await api.post('/admin/settings/email-test', { smtp_host: host, smtp_port: port, smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from: from || smtpUser, test_to: testTo });
            showToast(`Письмо отправлено на ${testTo}`, 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Ошибка отправки', 'error');
        } finally {
            setTesting(false);
        }
    };

    const currentProvider = PROVIDERS.find(p => p.value === provider);

    return (
        <div style={{ maxWidth: 640 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Настройки почты</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
                Используется для сброса пароля, уведомлений и подтверждения email.
            </p>

            {configured && (
                <div style={{ background: 'rgba(77,255,136,0.08)', border: '1px solid rgba(77,255,136,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#4dff88', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icons.CheckCircle size={14} /> Почта настроена и активна
                </div>
            )}

            {/* Провайдер */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Провайдер</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PROVIDERS.map(p => (
                        <button
                            key={p.value}
                            onClick={() => handleProviderChange(p.value)}
                            style={{
                                padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                                background: provider === p.value ? 'rgba(var(--primary-rgb),0.15)' : 'var(--bg-input)',
                                border: provider === p.value ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                color: provider === p.value ? 'var(--primary)' : 'var(--text-main)',
                                fontWeight: provider === p.value ? 600 : 400,
                            }}
                        >{p.label}</button>
                    ))}
                </div>
                {currentProvider?.hint && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 8, padding: '8px 12px' }}>
                        ℹ️ {currentProvider.hint}
                    </div>
                )}
            </div>

            {/* Поля */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SMTP хост</label>
                    <input className="modern-input" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.example.com" style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Порт</label>
                    <input className="modern-input" value={port} onChange={e => setPort(e.target.value)} placeholder="587" style={{ width: '100%' }} />
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Логин (email отправителя)</label>
                <input className="modern-input" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="noreply@university.edu" style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Пароль приложения</label>
                <div style={{ position: 'relative' }}>
                    <input
                        className="modern-input" type={showPass ? 'text' : 'password'}
                        value={smtpPass} onChange={e => setSmtpPass(e.target.value)}
                        placeholder="•••••••••••••••"
                        style={{ width: '100%', paddingRight: 44 }}
                    />
                    <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                        {showPass ? <Icons.EyeOff size={16}/> : <Icons.Eye size={16}/>}
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Имя/адрес отправителя <span style={{ opacity: 0.5 }}>(необязательно)</span></label>
                <input className="modern-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="Lumeo LMS <noreply@university.edu>" style={{ width: '100%' }} />
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <><Icons.Spinner size={15}/> Сохранение...</> : <><Icons.Save size={15}/> Сохранить настройки</>}
            </button>

            {/* Тест */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Тестовое письмо</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Отправит письмо с текущими настройками — можно проверить до сохранения.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <input className="modern-input" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="test@example.com" style={{ flex: 1 }} />
                    <button className="btn btn-secondary" onClick={handleTest} disabled={testing} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {testing ? <><Icons.Spinner size={14}/> Отправка...</> : <><Icons.Send size={14}/> Отправить тест</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

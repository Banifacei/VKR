import { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// ─── SMTP ────────────────────────────────────────────────────────────────────

const PROVIDERS = [
    { value: 'gmail',   label: 'Gmail',               host: 'smtp.gmail.com',      port: '587', hint: 'Нужен App Password. Создайте на myaccount.google.com/apppasswords' },
    { value: 'yandex',  label: 'Яндекс 360',          host: 'smtp.yandex.ru',      port: '587', hint: 'Создайте пароль приложения: Яндекс ID → Безопасность → Пароли приложений' },
    { value: 'mailru',  label: 'Mail.ru',              host: 'smtp.mail.ru',        port: '465', hint: 'Создайте пароль приложения: account.mail.ru → Пароли и безопасность' },
    { value: 'outlook', label: 'Microsoft / Outlook',  host: 'smtp.office365.com',  port: '587', hint: 'Используйте обычный пароль аккаунта Microsoft.' },
    { value: 'custom',  label: 'Другой (вручную)',     host: '',                    port: '587', hint: '' },
];

const SmtpSection = () => {
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
                setHost(s.smtp_host); setPort(s.smtp_port || '587');
                setSmtpUser(s.smtp_user || ''); setSmtpPass(s.smtp_pass || '');
                setFrom(s.smtp_from || ''); setConfigured(true);
                const matched = PROVIDERS.find(p => p.host === s.smtp_host);
                setProvider(matched ? matched.value : 'custom');
            }
        });
        if (user?.email) setTestTo(user.email);
    }, []);

    const onProviderChange = (val: string) => {
        setProvider(val);
        const p = PROVIDERS.find(p => p.value === val);
        if (p && val !== 'custom') { setHost(p.host); setPort(p.port); }
    };

    const handleSave = async () => {
        if (!host || !smtpUser || !smtpPass) { showToast('Заполните хост, логин и пароль', 'error'); return; }
        setSaving(true);
        try {
            const fields = { smtp_host: host, smtp_port: port, smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from: from || smtpUser };
            await Promise.all(Object.entries(fields).map(([key, value]) => api.post('/admin/settings/toggle', { key, value })));
            setConfigured(true);
            showToast('Настройки почты сохранены', 'success');
        } catch { showToast('Ошибка сохранения', 'error'); }
        finally { setSaving(false); }
    };

    const handleTest = async () => {
        if (!testTo) { showToast('Укажите адрес получателя', 'error'); return; }
        setTesting(true);
        try {
            await api.post('/admin/settings/email-test', { smtp_host: host, smtp_port: port, smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from: from || smtpUser, test_to: testTo });
            showToast(`Письмо отправлено на ${testTo}`, 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Ошибка отправки', 'error');
        } finally { setTesting(false); }
    };

    const currentProvider = PROVIDERS.find(p => p.value === provider);

    return (
        <>
            {/* Статус */}
            {configured && (
                <div className="admin-section" style={{ marginBottom: 20 }}>
                    <div className="section-body" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#4dff88', fontSize: 14 }}>
                        <Icons.CheckCircle size={16} />
                        <span>Почта настроена и активна</span>
                    </div>
                </div>
            )}

            {/* Провайдер */}
            <div className="admin-section" style={{ marginBottom: 20 }}>
                <div className="section-header">
                    <h2>Провайдер</h2>
                </div>
                <div className="section-body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: currentProvider?.hint ? 12 : 0 }}>
                        {PROVIDERS.map(p => (
                            <button key={p.value} onClick={() => onProviderChange(p.value)} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', background: provider === p.value ? 'rgba(var(--primary-rgb),0.15)' : 'var(--bg-input)', border: provider === p.value ? '1px solid var(--primary)' : '1px solid var(--border-color)', color: provider === p.value ? 'var(--primary)' : 'var(--text-main)', fontWeight: provider === p.value ? 600 : 400 }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {currentProvider?.hint && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-deep)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid rgba(var(--primary-rgb),0.4)' }}>
                            ℹ️ {currentProvider.hint}
                        </div>
                    )}
                </div>
            </div>

            {/* Подключение */}
            <div className="admin-section" style={{ marginBottom: 20 }}>
                <div className="section-header">
                    <h2>Параметры подключения</h2>
                </div>
                <div className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>SMTP хост</label>
                            <input className="modern-input" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.example.com" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Порт</label>
                            <input className="modern-input" value={port} onChange={e => setPort(e.target.value)} placeholder="587" style={{ width: '100%' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Логин (email отправителя)</label>
                        <input className="modern-input" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="noreply@university.edu" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Пароль приложения</label>
                        <div style={{ position: 'relative' }}>
                            <input className="modern-input" type={showPass ? 'text' : 'password'} value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="•••••••••••••••" style={{ width: '100%', paddingRight: 44 }} />
                            <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                                {showPass ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                            Имя/адрес отправителя <span style={{ opacity: 0.5, fontWeight: 400 }}>(необязательно)</span>
                        </label>
                        <input className="modern-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="Lumeo LMS <noreply@university.edu>" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>

            {/* Сохранить */}
            <div className="admin-section" style={{ marginBottom: 20 }}>
                <div className="section-body">
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {saving ? <><Icons.Spinner size={15} /> Сохранение...</> : <><Icons.Save size={15} /> Сохранить настройки</>}
                    </button>
                </div>
            </div>

            {/* Тест */}
            <div className="admin-section">
                <div className="section-header">
                    <h2>Тестовое письмо</h2>
                </div>
                <div className="section-body">
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>
                        Проверьте соединение — письмо отправится с текущими полями формы (до сохранения).
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input className="modern-input" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="test@example.com" style={{ flex: 1 }} />
                        <button className="btn btn-secondary" onClick={handleTest} disabled={testing} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {testing ? <><Icons.Spinner size={14} /> Отправка...</> : <><Icons.Send size={14} /> Отправить тест</>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── ШАБЛОНЫ ─────────────────────────────────────────────────────────────────

const TEMPLATE_DEFS = [
    { key: 'verify_email',       label: 'Подтверждение email', vars: [{ name: 'code', desc: 'Код подтверждения' }, { name: 'platformName', desc: 'Название платформы' }] },
    { key: 'reset_password',     label: 'Сброс пароля',        vars: [{ name: 'link', desc: 'Ссылка для сброса' }, { name: 'platformName', desc: 'Название платформы' }] },
    { key: 'resend_verification', label: 'Повторный код',       vars: [{ name: 'code', desc: 'Новый код' }, { name: 'platformName', desc: 'Название платформы' }] },
];

const SAMPLE_VARS: Record<string, string> = {
    code: '847 291',
    link: 'https://lumeo.su/reset-password?token=example',
    platformName: 'Lumeo',
};

const renderPreview = (html: string) =>
    Object.entries(SAMPLE_VARS).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), html);

const TemplatesSection = () => {
    const { showToast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [activeTpl,    setActiveTpl]    = useState(TEMPLATE_DEFS[0].key);
    const [subjects,     setSubjects]     = useState<Record<string, string>>({});
    const [bodies,       setBodies]       = useState<Record<string, string>>({});
    const [defaults,     setDefaults]     = useState<Record<string, { subject: string; html: string }>>({});
    const [showPreview,  setShowPreview]  = useState(false);
    const [saving,       setSaving]       = useState(false);

    useEffect(() => {
        Promise.all([api.get('/admin/settings'), api.get('/admin/settings/email-templates/defaults')]).then(([sRes, dRes]) => {
            const s = sRes.data; const d = dRes.data;
            setDefaults(d);
            const newS: Record<string, string> = {};
            const newB: Record<string, string> = {};
            TEMPLATE_DEFS.forEach(({ key }) => {
                newS[key] = s[`email_tpl_${key}_subject`] || d[key]?.subject || '';
                newB[key] = s[`email_tpl_${key}_html`]    || d[key]?.html    || '';
            });
            setSubjects(newS); setBodies(newB);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(TEMPLATE_DEFS.flatMap(({ key }) => [
                api.post('/admin/settings/toggle', { key: `email_tpl_${key}_subject`, value: subjects[key] || '' }),
                api.post('/admin/settings/toggle', { key: `email_tpl_${key}_html`,    value: bodies[key]   || '' }),
            ]));
            showToast('Шаблоны сохранены', 'success');
        } catch { showToast('Ошибка сохранения', 'error'); }
        finally { setSaving(false); }
    };

    const handleReset = () => {
        const def = defaults[activeTpl];
        if (!def) return;
        setSubjects(s => ({ ...s, [activeTpl]: def.subject }));
        setBodies(b =>   ({ ...b, [activeTpl]: def.html }));
        showToast('Шаблон сброшен до стандартного', 'info');
    };

    const insertVar = (varName: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart, end = ta.selectionEnd;
        const val = bodies[activeTpl] || '';
        const newVal = val.slice(0, start) + `{{${varName}}}` + val.slice(end);
        setBodies(b => ({ ...b, [activeTpl]: newVal }));
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + varName.length + 4; ta.focus(); });
    };

    const tplDef = TEMPLATE_DEFS.find(t => t.key === activeTpl)!;

    return (
        <>
            {/* Выбор шаблона */}
            <div className="admin-section" style={{ marginBottom: 20 }}>
                <div className="section-header">
                    <h2>Шаблон</h2>
                </div>
                <div className="section-body">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {TEMPLATE_DEFS.map(t => (
                            <button key={t.key} onClick={() => { setActiveTpl(t.key); setShowPreview(false); }} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', background: activeTpl === t.key ? 'rgba(var(--primary-rgb),0.15)' : 'var(--bg-input)', border: activeTpl === t.key ? '1px solid var(--primary)' : '1px solid var(--border-color)', color: activeTpl === t.key ? 'var(--primary)' : 'var(--text-main)', fontWeight: activeTpl === t.key ? 600 : 400 }}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Редактор */}
            <div className="admin-section" style={{ marginBottom: 20 }}>
                <div className="section-header" style={{ justifyContent: 'space-between' }}>
                    <h2>Содержимое</h2>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setShowPreview(false)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: !showPreview ? 'rgba(var(--primary-rgb),0.15)' : 'transparent', border: !showPreview ? '1px solid var(--primary)' : '1px solid var(--border-color)', color: !showPreview ? 'var(--primary)' : 'var(--text-muted)' }}>
                            HTML
                        </button>
                        <button onClick={() => setShowPreview(true)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: showPreview ? 'rgba(var(--primary-rgb),0.15)' : 'transparent', border: showPreview ? '1px solid var(--primary)' : '1px solid var(--border-color)', color: showPreview ? 'var(--primary)' : 'var(--text-muted)' }}>
                            Превью
                        </button>
                    </div>
                </div>
                <div className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Тема */}
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Тема письма</label>
                        <input className="modern-input" value={subjects[activeTpl] || ''} onChange={e => setSubjects(s => ({ ...s, [activeTpl]: e.target.value }))} style={{ width: '100%' }} />
                    </div>

                    {/* Переменные */}
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Переменные — нажмите чтобы вставить в курсор</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {tplDef.vars.map(v => (
                                <button key={v.name} onClick={() => insertVar(v.name)} title={v.desc} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'var(--bg-deep)', border: '1px solid rgba(var(--primary-rgb),0.3)', color: 'var(--primary)', fontFamily: 'monospace', transition: 'all 0.15s' }}>
                                    {`{{${v.name}}}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Тело */}
                    {!showPreview ? (
                        <textarea
                            ref={textareaRef}
                            value={bodies[activeTpl] || ''}
                            onChange={e => setBodies(b => ({ ...b, [activeTpl]: e.target.value }))}
                            spellCheck={false}
                            style={{ width: '100%', minHeight: 300, background: 'var(--bg-deep)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-main)', padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                    ) : (
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: '#fff', minHeight: 300 }}>
                            <iframe srcDoc={renderPreview(bodies[activeTpl] || '')} style={{ width: '100%', minHeight: 300, border: 'none', display: 'block' }} sandbox="allow-same-origin" title="email-preview" />
                        </div>
                    )}
                </div>
            </div>

            {/* Действия */}
            <div className="admin-section">
                <div className="section-body">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {saving ? <><Icons.Spinner size={15} /> Сохранение...</> : <><Icons.Save size={15} /> Сохранить шаблоны</>}
                        </button>
                        <button className="btn btn-ghost" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icons.Refresh size={14} /> Сбросить этот шаблон
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── ОСНОВНОЙ КОМПОНЕНТ ───────────────────────────────────────────────────────

export const EmailTab = () => {
    const [section, setSection] = useState<'smtp' | 'templates'>('smtp');

    return (
        <div>
            {/* Переключатель */}
            <div className="admin-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Настройки почты</h2>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-deep)', borderRadius: 8, padding: 4 }}>
                        {([['smtp', 'SMTP'], ['templates', 'Шаблоны']] as const).map(([key, label]) => (
                            <button key={key} onClick={() => setSection(key)} style={{ padding: '6px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: section === key ? 'var(--bg-card)' : 'transparent', color: section === key ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: section === key ? 600 : 400, boxShadow: section === key ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="section-body" style={{ padding: '12px 24px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                        {section === 'smtp' ? 'SMTP-подключение для отправки писем — сброс пароля, подтверждение email.' : 'Редактируйте текст и оформление писем. Поддерживает HTML и переменные.'}
                    </p>
                </div>
            </div>

            {section === 'smtp'      && <SmtpSection />}
            {section === 'templates' && <TemplatesSection />}
        </div>
    );
};

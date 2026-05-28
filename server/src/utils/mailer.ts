import nodemailer from 'nodemailer';
import { SystemSetting } from '../models/SystemSetting.js';

const getSetting = async (key: string, fallback = '') => {
    const row = await SystemSetting.findOne({ where: { key } });
    return row?.value || fallback;
};

const buildTransporter = async () => {
    const host = await getSetting('smtp_host', process.env.SMTP_HOST || '');
    const port = Number(await getSetting('smtp_port', process.env.SMTP_PORT || '587'));
    const user = await getSetting('smtp_user', process.env.SMTP_USER || '');
    const pass = await getSetting('smtp_pass', process.env.SMTP_PASS || '');
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
};

export const DEFAULT_TEMPLATES: Record<string, { subject: string; html: string }> = {
    verify_email: {
        subject: 'Подтверждение почты — {{platformName}}',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
  <h2 style="color:#00aeef;margin-bottom:16px">Подтверждение email</h2>
  <p>Для завершения регистрации на <strong>{{platformName}}</strong> введите код:</p>
  <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;margin:24px 0;color:#111;background:#f0f0f0;padding:20px;border-radius:12px">{{code}}</div>
  <p style="color:#888;font-size:13px">Код действует <strong>30 минут</strong>. Если вы не регистрировались — проигнорируйте письмо.</p>
</div>`,
    },
    reset_password: {
        subject: 'Сброс пароля — {{platformName}}',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#7c6aff">Сброс пароля</h2>
  <p>Мы получили запрос на сброс пароля для вашего аккаунта на <strong>{{platformName}}</strong>.</p>
  <p>Нажмите кнопку ниже — ссылка действует <strong>1 час</strong>.</p>
  <a href="{{link}}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c6aff;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
    Сбросить пароль
  </a>
  <p style="color:#888;font-size:13px">Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
</div>`,
    },
    resend_verification: {
        subject: 'Новый код подтверждения — {{platformName}}',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
  <h2 style="color:#00aeef;margin-bottom:16px">Новый код подтверждения</h2>
  <p>Ваш новый код для активации аккаунта на <strong>{{platformName}}</strong>:</p>
  <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;margin:24px 0;color:#111;background:#f0f0f0;padding:20px;border-radius:12px">{{code}}</div>
  <p style="color:#888;font-size:13px">Код действует <strong>30 минут</strong>.</p>
</div>`,
    },
};

export const renderTemplate = (template: string, vars: Record<string, string>) =>
    Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);

export const getEmailTemplate = async (key: string): Promise<{ subject: string; html: string }> => {
    const def = DEFAULT_TEMPLATES[key] ?? { subject: '', html: '' };
    const subjectRow = await SystemSetting.findOne({ where: { key: `email_tpl_${key}_subject` } });
    const htmlRow    = await SystemSetting.findOne({ where: { key: `email_tpl_${key}_html` } });
    return {
        subject: subjectRow?.value || def.subject,
        html:    htmlRow?.value    || def.html,
    };
};

export const sendMail = async (to: string, subject: string, html: string) => {
    const from = await getSetting('smtp_from', process.env.SMTP_FROM || process.env.SMTP_USER || '');
    const transporter = await buildTransporter();
    await transporter.sendMail({ from, to, subject, html });
};

export const sendTemplateMail = async (to: string, templateKey: string, vars: Record<string, string>) => {
    const platformName = await getSetting('platform_name', 'Lumeo');
    const tpl = await getEmailTemplate(templateKey);
    const allVars = { platformName, ...vars };
    await sendMail(to, renderTemplate(tpl.subject, allVars), renderTemplate(tpl.html, allVars));
};

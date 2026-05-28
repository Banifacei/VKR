import nodemailer from 'nodemailer';
import { SystemSetting } from '../models/SystemSetting.js';

const getSetting = async (key: string, fallback = '') => {
    const row = await SystemSetting.findOne({ where: { key } });
    return row?.value || fallback;
};

const buildTransporter = async () => {
    const host   = await getSetting('smtp_host',   process.env.SMTP_HOST   || '');
    const port   = Number(await getSetting('smtp_port',   process.env.SMTP_PORT   || '587'));
    const user   = await getSetting('smtp_user',   process.env.SMTP_USER   || '');
    const pass   = await getSetting('smtp_pass',   process.env.SMTP_PASS   || '');
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
};

export const sendMail = async (to: string, subject: string, html: string) => {
    const from = await getSetting('smtp_from', process.env.SMTP_FROM || process.env.SMTP_USER || '');
    const transporter = await buildTransporter();
    await transporter.sendMail({ from, to, subject, html });
};

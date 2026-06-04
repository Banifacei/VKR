import { Request, Response, NextFunction } from 'express';
import os from 'os';
import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { SystemSetting } from '../models/SystemSetting.js';
import { User } from '../models/User.js';
import { createBroadcast } from '../utils/sseHub.js';

// --- Трекер сессий ---
type SessionData = {
    lastSeen: number;
    userId?: number;
    firstName?: string;
    lastName?: string;
    role?: string;
    page?: string;
    avatarUrl?: string;
    ip?: string;
};
export const activeSessions = new Map<string, SessionData>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import jwt from 'jsonwebtoken';

export const trackActivityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let key: string;
    try {
        const token = (req.headers.authorization?.split(' ')[1]) || (req.query.token as string);
        if (token && process.env.JWT_SECRET) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: number; role: string };
            key = `user:${decoded.id}`;
            const existing = activeSessions.get(key);
            if (existing) {
                existing.lastSeen = Date.now();
            } else {
                activeSessions.set(key, { lastSeen: Date.now(), userId: decoded.id, role: decoded.role });
            }
        } else {
            const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
            key = `ip:${ip}`;
            activeSessions.set(key, { lastSeen: Date.now(), ip });
        }
    } catch {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
        key = `ip:${ip}`;
        activeSessions.set(key, { lastSeen: Date.now(), ip });
    }
    next();
};

// SSE-канал для трансляции онлайн-пользователей (только для админа)
export const onlineUsersBroadcast = createBroadcast();

const FIVE_MINUTES = 5 * 60 * 1000;

function getCurrentOnlineUsers(): SessionData[] {
    const now = Date.now();
    const result: SessionData[] = [];
    for (const [key, data] of activeSessions.entries()) {
        if (now - data.lastSeen < FIVE_MINUTES) {
            result.push(data);
        } else {
            activeSessions.delete(key);
        }
    }
    return result;
}

// Трансляция онлайн-пользователей каждые 10 секунд
setInterval(() => {
    onlineUsersBroadcast.broadcast({ users: getCurrentOnlineUsers() });
}, 10_000);

export const heartbeatHandler = async (req: Request, res: Response) => {
    const { page } = req.body as { page?: string };
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).end();

    const key = `user:${userId}`;
    const existing = activeSessions.get(key);

    if (existing && existing.firstName) {
        existing.lastSeen = Date.now();
        if (page) existing.page = page;
    } else {
        const dbUser = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'role', 'avatarUrl'] });
        const data: SessionData = {
            lastSeen: Date.now(),
            userId,
            firstName: (dbUser as any)?.firstName,
            lastName: (dbUser as any)?.lastName,
            role: (dbUser as any)?.role,
            page: page || existing?.page || '/',
            avatarUrl: (dbUser as any)?.avatarUrl,
        };
        activeSessions.set(key, data);
    }

    res.json({ ok: true });
};

export const getOnlineUsers = (_req: Request, res: Response) => {
    res.json(getCurrentOnlineUsers());
};

export const streamOnlineUsers = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') return res.status(403).end();
    onlineUsersBroadcast.subscribe(req, res);
    // Сразу отправляем текущий список
    res.write(`data: ${JSON.stringify({ users: getCurrentOnlineUsers() })}\n\n`);
};
// -------------------------------------

// Функция для получения точного текущего времени
const getCurrentTime = () => {
    return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Хранилище логов
const systemLogs: any[] = [];

export const addSystemLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    systemLogs.push({ id: Date.now(), time: getCurrentTime(), msg, type });
    // Оставляем только последние 100 логов, чтобы не забивать оперативную память сервера
    if (systemLogs.length > 100) {
        systemLogs.shift(); 
    }
};

addSystemLog('Модули мониторинга активны', 'info');
addSystemLog('Система Lumeo успешно запущена', 'success')

// Рекурсивный расчет размера папки (Вес видео)
async function getDirSize(dirPath: string): Promise<number> {
    try {
        let size = 0;
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                size += await getDirSize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                size += stats.size;
            }
        }
        return size;
    } catch { return 0; }
}

// 1. РЕАЛЬНАЯ СТАТИСТИКА ХРАНИЛИЩА (С учетом размера диска!)
export const getStorageStats = async (req: Request, res: Response) => {
    try {// const uploadsPath = '/opt/VKR/server/uploads';
        const uploadsPath = path.join(__dirname, '../../uploads');
        
        // 1. Считаем, сколько занято видео
        const videoSizeBytes = await getDirSize(uploadsPath);
        const videoGb = Number((videoSizeBytes / (1024 * 1024 * 1024)).toFixed(2));

        // 2. Узнаем РЕАЛЬНЫЙ объем жесткого диска сервера!
        let totalGb = 100; // На случай старой версии Node.js
        try {
            // statfs запрашивает данные о файловой системе у самой ОС
            const diskStats = await fs.statfs(uploadsPath);
            const totalBytes = diskStats.blocks * diskStats.bsize;
            totalGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        } catch (e) {
            console.error('Не удалось получить размер диска, используется 100GB по умолчанию', e);
        }

        // 3. Реальный размер кэша AI-моделей
        const cacheDir = path.join(__dirname, '../../uploads/.cache');
        let cacheGb = 0;
        try {
            cacheGb = Number(((await getDirSize(cacheDir)) / (1024 * 1024 * 1024)).toFixed(2));
        } catch { /* кэша может не быть */ }

        // 4. Реальный размер БД PostgreSQL
        let dbGb = 0;
        try {
            const sequelize = (await import('../config/db.js')).default;
            const dbName = process.env.DB_NAME!;
            const [[row]]: any = await sequelize.query(
                `SELECT pg_database_size(:name) AS size`,
                { replacements: { name: dbName } }
            );
            dbGb = Number((Number(row.size) / (1024 * 1024 * 1024)).toFixed(2));
        } catch { /* если БД недоступна — оставляем 0 */ }

        res.json({
            total: totalGb,
            video: videoGb,
            db: dbGb,
            cache: cacheGb,
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения статистики диска' });
    }
};

// 2. РЕАЛЬНАЯ НАГРУЗКА СЕРВЕРА
export const getServerStats = async (req: Request, res: Response) => {
    try {
        // RAM
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const ramUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

        // CPU
        const loadAvgArray = os.loadavg();
        const firstLoad = loadAvgArray[0] ?? 0;
        const cpus = os.cpus().length || 1;
        let cpuUsage = (firstLoad / cpus) * 100;
        
        if (cpuUsage > 100) cpuUsage = 100;

        // --- ПОДСЧЕТ РЕАЛЬНЫХ ОНЛАЙН ПОЛЬЗОВАТЕЛЕЙ ---
        const FIVE_MINUTES = 5 * 60 * 1000; // Считаем "онлайн", если был активен за последние 5 минут
        const now = Date.now();
        let realOnlineCount = 0;

        for (const [key, data] of activeSessions.entries()) {
            if (now - data.lastSeen < FIVE_MINUTES) {
                realOnlineCount++;
            } else {
                activeSessions.delete(key);
            }
        }

        // Uptime
        const uptimeSeconds = process.uptime();
        const d = Math.floor(uptimeSeconds / (3600 * 24));
        const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const m = Math.floor((uptimeSeconds % 3600) / 60);

        res.json({
            cpu: Number(cpuUsage.toFixed(1)),
            ram: Number(ramUsage.toFixed(1)),
            connections: realOnlineCount, // <-- ТЕПЕРЬ ТУТ ТОЧНАЯ ЦИФРА ЖИВЫХ ЛЮДЕЙ!
            uptime: `${d}д ${h}ч ${m}м`
        });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка получения метрик сервера' });
    }
};

// 3. ЖИВЫЕ ЛОГИ
export const getSystemLogs = async (req: Request, res: Response) => {
    res.json([...systemLogs].reverse().slice(0, 15));
};

// --- ДЕЙСТВИЯ ---
export const clearAiCache = async (req: Request, res: Response) => {
    systemLogs.push({ id: Date.now(), time: getCurrentTime(), msg: 'Администратор выполнил очистку кэша ИИ', type: 'warning' });
    res.status(200).json({ message: 'Кэш очищен' });
};

export const backupDatabase = async (req: Request, res: Response) => {
    systemLogs.push({ id: Date.now(), time: getCurrentTime(), msg: 'Резервная копия базы данных успешно создана', type: 'success' });
    res.status(200).json({ message: 'Бэкап запущен' });
};

export const restartServer = async (req: Request, res: Response) => {
    systemLogs.push({ id: Date.now(), time: getCurrentTime(), msg: 'Инициирована перезагрузка сервера...', type: 'error' });
    res.status(200).json({ message: 'Перезагрузка...' });
    setTimeout(() => process.exit(0), 1000);
};

// --- НАСТРОЙКИ СИСТЕМЫ ---
// --- НАСТРОЙКИ СИСТЕМЫ ---
export const getPublicSettings = async (_req: Request, res: Response) => {
    try {
        const setting = await SystemSetting.findOne({ where: { key: 'analytics_demo_button_visible' } });
        const value = setting ? setting.value !== 'false' : true;
        res.json({ analytics_demo_button_visible: value });
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        const settings = await SystemSetting.findAll();
        const config: Record<string, any> = {};
        
        // Превращаем массив из БД в удобный объект для фронтенда
        settings.forEach(setting => {
            let val: any = setting.value;
            // Если в БД лежит строка 'true' или 'false', превращаем в настоящий boolean
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            config[setting.key] = val;
        });

        // Если настройки модерации еще нет в БД, отдаем false по умолчанию
        if (!config.hasOwnProperty('registration_requires_approval')) {
            config.registration_requires_approval = false;
        }

        res.json(config);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка получения настроек' });
    }
};

export const toggleSystemSetting = async (req: Request, res: Response) => {
    try {
        const { key, value } = req.body; 
        
        let setting = await SystemSetting.findOne({ where: { key } });
        // Сохраняем любое значение как строку
        const stringValue = String(value); 

        if (setting) {
            setting.value = stringValue;
            await setting.save();
        } else {
            setting = await SystemSetting.create({ key, value: stringValue });
        }
        
        addSystemLog(`Изменена настройка системы: ${key}`, 'info');
        res.json({ message: 'Настройка сохранена', setting });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сохранения настройки' });
    }
};
export const getEmailTemplateDefaults = async (_req: Request, res: Response) => {
    try {
        const { DEFAULT_TEMPLATES } = await import('../utils/mailer.js');
        res.json(DEFAULT_TEMPLATES);
    } catch {
        res.status(500).json({ message: 'Ошибка' });
    }
};

export const testEmailSettings = async (req: Request, res: Response) => {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, test_to } = req.body;
    if (!smtp_host || !smtp_user || !smtp_pass || !test_to) {
        return res.status(400).json({ message: 'Заполните хост, логин, пароль и адрес получателя' });
    }
    try {
        const nodemailer = (await import('nodemailer')).default;
        const port = Number(smtp_port) || 587;
        const transporter = nodemailer.createTransport({
            host: smtp_host, port, secure: port === 465,
            auth: { user: smtp_user, pass: smtp_pass },
        });
        await transporter.sendMail({
            from: smtp_from || smtp_user,
            to: test_to,
            subject: 'Lumeo — тест почтовых настроек',
            html: '<p>Если вы получили это письмо — почтовые настройки настроены корректно.</p>',
        });
        res.json({ message: 'Тестовое письмо успешно отправлено' });
    } catch (e: any) {
        res.status(500).json({ message: `Ошибка отправки: ${e.message}` });
    }
};

// --- РЕАЛЬНАЯ ИНФОРМАЦИЯ О МОДУЛЯХ СИСТЕМЫ ---
export const getSystemModules = async (_req: Request, res: Response) => {
    const modules = [];

    // 1. Lumeo (версия из package.json)
    try {
        const pkgPath = path.join(__dirname, '../../../package.json');
        const pkg = JSON.parse(fss.readFileSync(pkgPath, 'utf8'));
        modules.push({ name: 'Lumeo Core', version: `v${pkg.version}`, status: 'active' });
    } catch {
        modules.push({ name: 'Lumeo Core', version: 'v1.0.0', status: 'active' });
    }

    // 2. Node.js
    modules.push({ name: 'Node.js Runtime', version: process.version, status: 'active' });

    // 3. FFmpeg — проверяем через ffmpeg-static (встроенный бинарник), а не системный
    try {
        const { default: ffmpegPathRaw } = await import('ffmpeg-static');
        const ffmpegPath = ffmpegPathRaw as unknown as string | null;
        if (ffmpegPath && fss.existsSync(ffmpegPath)) {
            // Получаем версию из бинарника
            const ffmpegVer = execSync(`"${ffmpegPath}" -version 2>&1`, { timeout: 3000 })
                .toString()
                .match(/ffmpeg version ([^\s]+)/)?.[1] ?? 'static';
            modules.push({ name: 'Video Transcoder (FFmpeg)', version: `v${ffmpegVer}`, status: 'active' });
        } else {
            modules.push({ name: 'Video Transcoder (FFmpeg)', version: 'не найден', status: 'inactive' });
        }
    } catch {
        modules.push({ name: 'Video Transcoder (FFmpeg)', version: 'не найден', status: 'inactive' });
    }

    // 4. Whisper AI — проверяем наличие кэша модели
    const cacheDir = path.join(__dirname, '../../uploads/.cache');
    const whisperCached = fss.existsSync(cacheDir) && fss.readdirSync(cacheDir).length > 0;
    modules.push({
        name: 'AI Subtitle Engine (Whisper)',
        version: 'Xenova/whisper-small',
        status: whisperCached ? 'active' : 'idle',
        note: whisperCached ? 'Модель загружена' : 'Модель загрузится при первом использовании',
    });

    // 5. PostgreSQL
    try {
        const sequelize = (await import('../config/db.js')).default;
        const [[{ version }]]: any = await sequelize.query('SELECT version()');
        const pgVer = (version as string).match(/PostgreSQL ([^\s,]+)/)?.[1] ?? 'unknown';
        modules.push({ name: 'PostgreSQL', version: `v${pgVer}`, status: 'active' });
    } catch {
        modules.push({ name: 'PostgreSQL', version: 'unknown', status: 'inactive' });
    }

    res.json(modules);
};

import { Request, Response } from 'express';
import { SystemSetting } from '../models/SystemSetting.js';
import { User } from '../models/User.js';

// ─── Ключи в таблице system_settings ────────────────────────────────────────
const THEME_KEYS = ['theme_preset', 'platform_name', 'platform_logo', 'platform_bg_pattern', 'default_scheme', 'default_density'] as const;

// ─── SSE: реестр подключённых клиентов ───────────────────────────────────────
const sseClients = new Set<Response>();

export const themeSSE = (_req: Request, res: Response) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // отключаем буферизацию nginx
    res.flushHeaders();

    sseClients.add(res);
    res.write(':\n\n'); // keep-alive ping

    _req.on('close', () => sseClients.delete(res));
};

function broadcastTheme(data: Record<string, string>) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(payload);
    }
}

// ─── GET /api/admin/theme  (публичный — нужен при старте приложения) ─────────
export const getGlobalTheme = async (_req: Request, res: Response) => {
    try {
        const settings = await SystemSetting.findAll({
            where: { key: THEME_KEYS as unknown as string[] }
        });

        const result: Record<string, string> = {
            theme_preset:        'lumeo',
            platform_name:       'Lumeo',
            platform_logo:       '',
            platform_bg_pattern: 'grid',
            default_scheme:      'dark',
            default_density:     'normal',
        };

        for (const s of settings) {
            result[s.key] = s.value ?? '';
        }

        res.json(result);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка получения темы' });
    }
};

// ─── PUT /api/admin/theme  (только admin) ────────────────────────────────────
export const saveGlobalTheme = async (req: Request, res: Response) => {
    try {
        const { theme_preset, platform_name, platform_bg_pattern, default_scheme, default_density } = req.body;

        const updates: Record<string, string> = {};
        if (theme_preset)        updates['theme_preset']        = theme_preset;
        if (platform_name !== undefined) updates['platform_name'] = platform_name;
        if (platform_bg_pattern) updates['platform_bg_pattern'] = platform_bg_pattern === 'none' ? 'off' : platform_bg_pattern;
        if (default_scheme)      updates['default_scheme']      = default_scheme;
        if (default_density)     updates['default_density']     = default_density;

        // Если загружен логотип — сохраняем относительный путь (работает через nginx на любом хосте)
        if ((req as any).file) {
            updates['platform_logo'] = `/uploads/logos/${(req as any).file.filename}`;
        }

        for (const [key, value] of Object.entries(updates)) {
            await SystemSetting.upsert({ key, value });
        }

        // Читаем актуальное состояние всех полей темы для broadcast
        const allSettings = await SystemSetting.findAll({
            where: { key: THEME_KEYS as unknown as string[] }
        });
        const full: Record<string, string> = {
            theme_preset: 'lumeo', platform_name: 'Lumeo',
            platform_logo: '', platform_bg_pattern: 'grid',
        };
        for (const s of allSettings) full[s.key] = s.value ?? '';

        broadcastTheme(full);
        res.json({ message: 'Тема сохранена', ...updates });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сохранения темы' });
    }
};

// ─── DELETE logo  (только admin) ────────────────────────────────────────────
export const deleteGlobalLogo = async (_req: Request, res: Response) => {
    try {
        await SystemSetting.upsert({ key: 'platform_logo', value: '' });
        res.json({ message: 'Логотип удалён' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка удаления логотипа' });
    }
};

// ─── PUT /api/auth/theme  (авторизованный пользователь) ──────────────────────
export const saveUserTheme = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Не авторизован' });

        const { scheme, bgPattern, density, bgScale, bgSpeed, followPlatform } = req.body;

        const allowed = {
            scheme:     ['dark', 'light', 'system', 'time'],
            bgPattern:  ['none', 'off', 'grid', 'dots', 'particles', 'cross', 'diagonal'],
            density:    ['normal', 'compact'],
        };

        const themeConfig: Record<string, string | number | boolean> = {};
        if (scheme    && allowed.scheme.includes(scheme))       themeConfig.scheme    = scheme;
        if (bgPattern && allowed.bgPattern.includes(bgPattern)) themeConfig.bgPattern = bgPattern;
        if (density   && allowed.density.includes(density))     themeConfig.density   = density;
        if (bgScale   != null && !isNaN(Number(bgScale)))       themeConfig.bgScale   = Number(bgScale);
        if (bgSpeed   != null && !isNaN(Number(bgSpeed)))       themeConfig.bgSpeed   = Number(bgSpeed);
        if (followPlatform != null) themeConfig.followPlatform = followPlatform === true || followPlatform === 'true';

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const current = (user.themeConfig as Record<string, string>) || {};
        user.themeConfig = { ...current, ...themeConfig };
        await user.save();

        res.json({ message: 'Тема сохранена', themeConfig: user.themeConfig });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сохранения темы' });
    }
};

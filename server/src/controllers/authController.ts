import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Op } from 'sequelize';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { addSystemLog } from './adminController.js';
import { adminSse } from './userController.js';
import LdapAuth from 'ldapauth-fork';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET не задан в .env. Установите переменную окружения перед запуском сервера.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5001';

// Временное хранилище одноразовых кодов для OAuth (code → jwtToken, TTL 60 сек)
const oauthCodeStore = new Map<string, { token: string; expiresAt: number }>();

function createOAuthCode(jwtToken: string): string {
    const code = randomBytes(32).toString('hex');
    oauthCodeStore.set(code, { token: jwtToken, expiresAt: Date.now() + 60_000 });
    // Чистим просроченные коды (lazy cleanup)
    for (const [k, v] of oauthCodeStore) {
        if (v.expiresAt < Date.now()) oauthCodeStore.delete(k);
    }
    return code;
}

export const exchangeOAuthCode = (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ message: 'Код не передан' });
    const entry = oauthCodeStore.get(code);
    if (!entry) return res.status(400).json({ message: 'Код недействителен или истёк' });
    if (entry.expiresAt < Date.now()) {
        oauthCodeStore.delete(code);
        return res.status(400).json({ message: 'Код истёк' });
    }
    oauthCodeStore.delete(code);
    return res.json({ token: entry.token });
};
export const register = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, middleName, email, phone, password } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Некорректный адрес email' });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });
        }
        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'Имя и фамилия обязательны' });
        }

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email },
                    ...(phone ? [{ phone }] : [])
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким Email или телефоном уже существует' });
        }

        const hash = await bcrypt.hash(password, 10);
        const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

        if (smtpConfigured) {
            const code = String(Math.floor(100000 + Math.random() * 900000));
            await User.create({
                firstName,
                lastName,
                middleName: middleName || null,
                email,
                phone: phone || null,
                password: hash,
                status: 'email_pending',
                authProvider: 'local',
                emailVerificationToken: code,
                emailVerificationExpiry: new Date(Date.now() + 30 * 60 * 1000),
            });
            const { sendMail } = await import('../utils/mailer.js');
            await sendMail(
                email,
                'Подтверждение почты — Lumeo',
                `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
                    <h2 style="color:#00aeef;margin-bottom:16px">Подтверждение email</h2>
                    <p>Для завершения регистрации на <strong>Lumeo</strong> введите код:</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;margin:24px 0;color:#111;background:#f0f0f0;padding:20px;border-radius:12px">${code}</div>
                    <p style="color:#888;font-size:13px">Код действует <strong>30 минут</strong>. Если вы не регистрировались — проигнорируйте письмо.</p>
                </div>`,
            );
            return res.status(201).json({ message: 'Код подтверждения отправлен на почту', status: 'verify_email' });
        }

        const setting = await SystemSetting.findOne({ where: { key: 'registration_requires_approval' } });
        const requiresApproval = setting?.value === 'true';
        const userStatus = requiresApproval ? 'pending' : 'active';

        const user = await User.create({
            firstName,
            lastName,
            middleName: middleName || null,
            email,
            phone: phone || null,
            password: hash,
            status: userStatus,
            authProvider: 'local',
        });

        if (requiresApproval) {
            addSystemLog(`Новая заявка на регистрацию: ${email}`, 'warning');
            adminSse.broadcast({
                type: 'pending_user',
                userId: user.id,
                email,
                name: `${firstName} ${lastName}`,
            });
            return res.status(201).json({ message: 'Заявка отправлена на рассмотрение', status: 'pending' });
        }

        addSystemLog(`Новый пользователь зарегистрирован: ${email}`, 'success');
        res.status(201).json({ message: 'Регистрация успешна', status: 'active' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка регистрации' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        // 🔥 ФИКС 1: Фронтенд может присылать логин под разными ключами
        const authId = req.body.identifier || req.body.email || req.body.username || req.body.login;
        const password = req.body.password;

        if (!authId || !password) {
            return res.status(400).json({ message: 'Введите логин/email и пароль' });
        }

        // 1. Получаем настройки LDAP из БД
        const ldapEnabledSetting = await SystemSetting.findOne({ where: { key: 'ldap_enabled' } });
        const ldapUrlSetting = await SystemSetting.findOne({ where: { key: 'ldap_url' } });
        const ldapSearchBaseSetting = await SystemSetting.findOne({ where: { key: 'ldap_search_base' } });

        const isLdapEnabled = ldapEnabledSetting?.value === 'true';

        let authenticatedViaLdap = false;
        let ldapUser: any = null;

        // 2. Если LDAP включен, стучимся на сервер Active Directory
        if (isLdapEnabled && ldapUrlSetting?.value && ldapSearchBaseSetting?.value) {
            try {
                const ldap = new LdapAuth({
                    url: ldapUrlSetting.value,
                    searchBase: ldapSearchBaseSetting.value,
                    searchFilter: '(uid={{username}})',
                    connectTimeout: 3000,
                    timeout: 3000,
                    reconnect: false,
                });

                ldap.on('error', (err: any) => {
                    console.error('⚠️ Глобальная ошибка LDAP (сервер недоступен):', err.message);
                });

                const username = authId.includes('@') ? authId.split('@')[0] : authId;

                const ldapAuth = new Promise((resolve, reject) => {
                    ldap.authenticate(username, password, (err: any, user: any) => {
                        ldap.close(() => {});
                        if (err) reject(err);
                        else resolve(user);
                    });
                });
                const ldapTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('LDAP timeout')), 4000)
                );

                ldapUser = await Promise.race([ldapAuth, ldapTimeout]);

                authenticatedViaLdap = true;
                addSystemLog(`Успешная LDAP авторизация: ${username}`, 'success');
            } catch (ldapErr: any) {
                console.log('⚠️ LDAP недоступен или пароль неверен, проверяем локальную БД...');
            }
        }

        // 3. Ищем юзера в нашей локальной БД Lumeo
        let user = await User.findOne({ where: { email: authId } });

        // 4. Если LDAP пустил, а у нас юзера нет — АВТОМАТИЧЕСКИ РЕГИСТРИРУЕМ!
        if (authenticatedViaLdap) {
            if (!user) {
                user = await User.create({
                    email: authId,
                    firstName: ldapUser?.givenName || ldapUser?.cn || 'Корпоративный',
                    lastName: ldapUser?.sn || 'Пользователь',
                    password: await bcrypt.hash(password, 10),
                    role: 'student',
                    status: 'active',
                    authProvider: 'ldap',
                });
                addSystemLog(`Создан новый профиль из LDAP: ${authId}`, 'success');
            } else if (user.authProvider !== 'ldap') {
                user.authProvider = 'ldap';
            }
        } else {
            // 5. Обычная локальная проверка (если LDAP выключен, упал или логин не подошел)
            if (!user) {
                return res.status(401).json({ message: 'Неверный логин или пароль' });
            }

            if (user.status === 'email_pending') {
                return res.status(403).json({ status: 'email_pending', message: 'Подтвердите email для входа' });
            }
            if (user.status === 'pending') {
                return res.json({ status: 'pending', message: 'Ваш аккаунт находится на рассмотрении' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }
            if (user.status === 'banned') {
                return res.status(403).json({ banned: true, message: 'Ваш аккаунт заблокирован администратором.', banReason: user.banReason ?? null });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: 'Неверный логин или пароль' });
            }
        }

        // 6. Успех!
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ message: 'Ошибка сервера при авторизации' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        // Всегда берём userId из токена — пользователь не может изменить чужой профиль
        const userId = (req as any).user.id;
        const { firstName, lastName, middleName, phone, email, newPassword } = req.body;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (email || phone) {
            const existingUser = await User.findOne({
                where: {
                    [Op.and]: [
                        { id: { [Op.ne]: userId } },
                        {
                            [Op.or]: [
                                ...(email ? [{ email }] : []),
                                ...(phone ? [{ phone }] : [])
                            ]
                        }
                    ]
                }
            });
            if (existingUser) {
                return res.status(400).json({ message: 'Этот Email или Телефон уже используется другим пользователем' });
            }
        }
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (middleName !== undefined) user.middleName = middleName;
        if (email) user.email = email;
        if (phone !== undefined) user.phone = phone;
        
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        addSystemLog(`Пользователь (ID: ${user.id}) обновил данные профиля`, 'info');
        res.json({ 
            message: 'Данные обновлены', 
            user: { 
                id: user.id, 
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatarUrl: user.avatarUrl,
                status: user.status
            } 
        });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка при обновлении' });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            status: user.status,
            themeConfig: user.themeConfig || {},
        });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// --- 1. ОТДАЕМ НАСТРОЙКИ ДЛЯ КНОПКИ НА ФРОНТЕНДЕ ---
export const getAuthSettings = async (req: Request, res: Response) => {
    try {
        const yandexSetting = await SystemSetting.findOne({ where: { key: 'yandex_enabled' } });
        const googleSetting = await SystemSetting.findOne({ where: { key: 'google_enabled' } });
        const samlSetting = await SystemSetting.findOne({ where: { key: 'saml_enabled' } });
        // 🔥 Убрали сравнение с логическим true, оставили только строку
        const isYandexEnabled = yandexSetting?.value === 'true';
        
        res.json({
            yandex: yandexSetting?.value === 'true',
            google: googleSetting?.value === 'true', 
            saml: samlSetting?.value === 'true',
        });
    } catch (error) {
        console.error("Ошибка при получении настроек авторизации:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// --- 2. ДИНАМИЧЕСКИЙ РЕДИРЕКТ НА ЯНДЕКС ---
export const yandexLoginRedirect = async (req: Request, res: Response) => {
    const clientId = await SystemSetting.findOne({ where: { key: 'yandex_client_id' } });
    
    if (!clientId || !clientId.value) {
        return res.status(500).send('Авторизация через Яндекс не настроена администратором.');
    }

    // 🔥 ВОТ ОН, НАШ РОДНОЙ LOCALHOST!
    const redirectUri = `${API_URL}/api/auth/yandex/callback`;
    const url = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId.value}&redirect_uri=${redirectUri}`;
    
    res.redirect(url);
};

// --- 3. ЧИСТЫЙ КОЛЛБЭК С ЧТЕНИЕМ ИЗ БД ---
export const yandexCallback = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;
        if (!code) return res.redirect(`${CLIENT_URL}/auth?error=yandex_rejected`);

        const clientId = await SystemSetting.findOne({ where: { key: 'yandex_client_id' } });
        const clientSecret = await SystemSetting.findOne({ where: { key: 'yandex_client_secret' } });

        const tokenRes = await fetch('https://oauth.yandex.ru/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId?.value || '',
                client_secret: clientSecret?.value || ''
            }).toString()
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) return res.redirect(`${API_URL}/auth?error=token_failed`);

        const profileRes = await fetch('https://login.yandex.ru/info?format=json', {
            headers: { Authorization: `OAuth ${tokenData.access_token}` }
        });
        const profile = await profileRes.json();

        // Ищем или создаем пользователя в Lumeo
        const email = profile.default_email || profile.emails?.[0] || `${profile.login}@yandex.ru`;
        let user = await User.findOne({ where: { email } });

        // Формируем ссылку на аватар из Яндекса
        const yandexAvatar = (!profile.is_avatar_empty && profile.default_avatar_id) 
            ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200` 
            : null;

        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), salt);

            user = await User.create({
                email,
                firstName: profile.first_name || profile.real_name || 'Студент',
                lastName: profile.last_name || '',
                role: 'student',
                status: 'active',
                password: randomPassword,
                avatarUrl: yandexAvatar,
                authProvider: 'yandex',
            });
            addSystemLog(`Создан профиль через Яндекс (Динамический): ${email}`, 'success');
        } else {
            if (yandexAvatar && !user.avatarUrl) {
                user.avatarUrl = yandexAvatar;
            }
            if (user.authProvider !== 'yandex') user.authProvider = 'yandex';
        }

        user.lastLogin = new Date();
        await user.save();
        
        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        const oneTimeCode = createOAuthCode(jwtToken);
        res.redirect(`${CLIENT_URL}/auth?code=${oneTimeCode}`);
    } catch (error) {
        console.error('Ошибка Yandex OAuth:', error);
        // 🔥 МЕНЯЕМ НА CLIENT_URL
        res.redirect(`${CLIENT_URL}/auth?error=server_error`);
    }
};
// ==================== GOOGLE OAUTH ====================

// --- РЕДИРЕКТ НА GOOGLE ---
export const googleLoginRedirect = async (req: Request, res: Response) => {
    const clientId = await SystemSetting.findOne({ where: { key: 'google_client_id' } });
    
    if (!clientId || !clientId.value) {
        return res.status(500).send('Авторизация через Google не настроена администратором.');
    }

    const redirectUri = `${API_URL}/api/auth/google/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId.value}&redirect_uri=${redirectUri}&response_type=code&scope=email profile`;
    res.redirect(url);
};

// --- КОЛЛБЭК GOOGLE ---
export const googleCallback = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;
        if (!code) return res.redirect(`${CLIENT_URL}/auth?error=google_rejected`);

        const clientId = await SystemSetting.findOne({ where: { key: 'google_client_id' } });
        const clientSecret = await SystemSetting.findOne({ where: { key: 'google_client_secret' } });
        const redirectUri = `${API_URL}/api/auth/google/callback`;

        // 1. Меняем код на токен
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId?.value || '',
                client_secret: clientSecret?.value || '',
                redirect_uri: redirectUri // Google строго требует передавать URI и здесь тоже!
            }).toString()
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) return res.redirect(`${CLIENT_URL}/auth?error=token_failed`);

        // 2. Получаем профиль
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await profileRes.json();

        // 3. Ищем или создаем пользователя
        const email = profile.email;
        if (!email) return res.redirect(`${CLIENT_URL}/auth?error=no_email`);

        let user = await User.findOne({ where: { email } });
        let googleAvatar = profile.picture || null;

        // 🔥 ФИКС: Если ссылка от Google пришла, гарантируем нормальный размер
        if (googleAvatar && googleAvatar.includes('googleusercontent.com')) {
            // Убираем старые параметры размера (если есть) и ставим s200-c
            googleAvatar = googleAvatar.split('=')[0] + '=s200-c';
        }

        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), salt);

            user = await User.create({
                email,
                firstName: profile.given_name || 'Студент',
                lastName: profile.family_name || '',
                role: 'student',
                status: 'active',
                password: randomPassword,
                avatarUrl: googleAvatar,
                authProvider: 'google',
            });
            addSystemLog(`Создан профиль через Google: ${email}`, 'success');
        } else {
            if (googleAvatar && (!user.avatarUrl || user.avatarUrl.endsWith('/0') || user.avatarUrl.includes('googleusercontent.com'))) {
                user.avatarUrl = googleAvatar;
            }
            if (user.authProvider !== 'google') user.authProvider = 'google';
        }

        user.lastLogin = new Date();
        await user.save();
        
        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        const oneTimeCode = createOAuthCode(jwtToken);
        res.redirect(`${CLIENT_URL}/auth?code=${oneTimeCode}`);
    } catch (error) {
        console.error('Ошибка Google OAuth:', error);
        res.redirect(`${CLIENT_URL}/auth?error=server_error`);
    }
};

// ==================== SAML 2.0 (ENTERPRISE) ====================

// --- РЕДИРЕКТ НА КОРПОРАТИВНЫЙ ПОРТАЛ (IDP) ---
export const samlLoginRedirect = async (req: Request, res: Response, next: any) => {
    try {
        const entryPoint = await SystemSetting.findOne({ where: { key: 'saml_entry_point' } });
        const cert = await SystemSetting.findOne({ where: { key: 'saml_cert' } });

        if (!entryPoint?.value || !cert?.value) {
            return res.status(500).send('SAML не настроен администратором.');
        }

        // Генерируем стратегию "на лету", чтобы читать свежие настройки из БД
        const strategy = new SamlStrategy({
            path: '/api/auth/saml/callback',
            entryPoint: entryPoint.value,
            issuer: 'lumeo-web', // Имя нашего приложения для корпоративного сервера
            cert: cert.value
        }, (profile: any, done: any) => done(null, profile));

        passport.authenticate(strategy, { session: false })(req, res, next);
    } catch (error) {
        res.status(500).send('Ошибка инициализации SAML');
    }
};

// --- КОЛЛБЭК SAML (ПРИЕМ XML-ОТВЕТА) ---
export const samlCallback = async (req: Request, res: Response, next: any) => {
    try {
        const entryPoint = await SystemSetting.findOne({ where: { key: 'saml_entry_point' } });
        const cert = await SystemSetting.findOne({ where: { key: 'saml_cert' } });

        const strategy = new SamlStrategy({
            path: '/api/auth/saml/callback',
            entryPoint: entryPoint?.value || '',
            issuer: 'lumeo-web',
            cert: cert?.value || ''
        }, async (profile: any, done: any) => {
            try {
                // Корпоративные серверы могут отдавать email в разных полях
                const email = profile.email || profile.nameID || profile.nameIDFormat || 'saml-user@corporate.local';
                let user = await User.findOne({ where: { email } });

                if (!user) {
                    const salt = await bcrypt.genSalt(10);
                    const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), salt);

                    user = await User.create({
                        email,
                        firstName: profile.firstName || profile.givenName || 'Сотрудник',
                        lastName: profile.lastName || profile.sn || '',
                        role: 'student',
                        status: 'active',
                        password: randomPassword,
                        authProvider: 'saml',
                    });
                    addSystemLog(`Создан корпоративный профиль (SAML): ${email}`, 'success');
                } else if (user.authProvider !== 'saml') {
                    user.authProvider = 'saml';
                }

                user.lastLogin = new Date();
                await user.save();
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        });

        // Запускаем проверку XML-подписи
        passport.authenticate(strategy, { session: false }, (err: any, user: any) => {
            if (err || !user) {
                console.error("Ошибка SAML валидации:", err);
                return res.redirect(`${CLIENT_URL}/auth?error=saml_rejected`);
            }
            
            const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            const oneTimeCode = createOAuthCode(jwtToken);
            res.redirect(`${CLIENT_URL}/auth?code=${oneTimeCode}`);
        })(req, res, next);

    } catch (error) {
        console.error('Ошибка обработки SAML callback:', error);
        res.redirect(`${CLIENT_URL}/auth?error=server_error`);
    }
};
// POST /api/auth/forgot-password  { email }
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    // Всегда отвечаем одинаково — не раскрываем, есть ли такой email
    const ok = () => res.json({ message: 'Если такой email зарегистрирован, письмо отправлено.' });

    try {
        const user = await User.findOne({ where: { email: (email || '').toLowerCase().trim() } });
        if (!user) return ok();

        // Генерируем токен на 1 час
        const token = randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        const CLIENT_URL = process.env.CLIENT_URL || 'https://lumeo.su';
        const link = `${CLIENT_URL}/reset-password?token=${token}`;

        const { sendMail } = await import('../utils/mailer.js');
        await sendMail(
            user.email,
            'Сброс пароля — Lumeo',
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                <h2 style="color:#7c6aff">Сброс пароля</h2>
                <p>Мы получили запрос на сброс пароля для вашего аккаунта на <strong>Lumeo</strong>.</p>
                <p>Нажмите кнопку ниже — ссылка действует <strong>1 час</strong>.</p>
                <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c6aff;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
                    Сбросить пароль
                </a>
                <p style="color:#888;font-size:13px">Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
            </div>`,
        );

        addSystemLog(`Запрос сброса пароля для ${user.email}`, 'info');
        ok();
    } catch (e) {
        console.error('[forgotPassword]', e);
        ok(); // Не раскрываем ошибку клиенту
    }
};

// POST /api/auth/reset-password  { token, password }
export const resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password || password.length < 8) {
        return res.status(400).json({ message: 'Токен и пароль (мин. 8 символов) обязательны.' });
    }

    try {
        const user = await User.findOne({
            where: {
                resetToken: token,
                resetTokenExpiry: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: 'Ссылка недействительна или истекла. Запросите новую.' });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        addSystemLog(`Пароль сброшен для ${user.email}`, 'warning');
        res.json({ message: 'Пароль успешно изменён. Теперь можете войти.' });
    } catch (e) {
        console.error('[resetPassword]', e);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
};

// POST /api/auth/verify-email  { email, code }
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ message: 'Email и код обязательны' });
        }

        const user = await User.findOne({
            where: {
                email: (email as string).toLowerCase().trim(),
                status: 'email_pending',
                emailVerificationToken: String(code).trim(),
                emailVerificationExpiry: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: 'Неверный код или срок действия истёк' });
        }

        const setting = await SystemSetting.findOne({ where: { key: 'registration_requires_approval' } });
        const requiresApproval = setting?.value === 'true';

        user.emailVerificationToken = null;
        user.emailVerificationExpiry = null;
        user.status = requiresApproval ? 'pending' : 'active';
        await user.save();

        if (requiresApproval) {
            addSystemLog(`Новая заявка на регистрацию: ${user.email}`, 'warning');
            adminSse.broadcast({
                type: 'pending_user',
                userId: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            });
            return res.json({ status: 'pending', message: 'Почта подтверждена. Заявка отправлена на рассмотрение.' });
        }

        addSystemLog(`Новый пользователь зарегистрирован: ${user.email}`, 'success');
        res.json({ status: 'active', message: 'Почта подтверждена! Теперь можете войти.' });
    } catch (e) {
        console.error('[verifyEmail]', e);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// POST /api/auth/resend-verification  { email }
export const resendVerification = async (req: Request, res: Response) => {
    const ok = () => res.json({ message: 'Если аккаунт ожидает подтверждения — код отправлен.' });
    try {
        const { email } = req.body;
        if (!email) return ok();

        const user = await User.findOne({
            where: { email: (email as string).toLowerCase().trim(), status: 'email_pending' },
        });
        if (!user) return ok();

        const code = String(Math.floor(100000 + Math.random() * 900000));
        user.emailVerificationToken = code;
        user.emailVerificationExpiry = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();

        const { sendMail } = await import('../utils/mailer.js');
        await sendMail(
            user.email,
            'Новый код подтверждения — Lumeo',
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
                <h2 style="color:#00aeef;margin-bottom:16px">Новый код подтверждения</h2>
                <p>Ваш новый код для активации аккаунта на <strong>Lumeo</strong>:</p>
                <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;margin:24px 0;color:#111;background:#f0f0f0;padding:20px;border-radius:12px">${code}</div>
                <p style="color:#888;font-size:13px">Код действует <strong>30 минут</strong>.</p>
            </div>`,
        );

        ok();
    } catch (e) {
        console.error('[resendVerification]', e);
        ok();
    }
};

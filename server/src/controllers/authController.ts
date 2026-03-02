import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { addSystemLog } from './adminController.js';
import LdapAuth from 'ldapauth-fork';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
const JWT_SECRET = process.env.JWT_SECRET || 'lumeo_super_secret_2024';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5001';
export const register = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, middleName, email, phone, password } = req.body;
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

        const setting = await SystemSetting.findOne({ where: { key: 'registration_requires_approval' } });
        const requiresApproval = setting ? setting.value : false; // По умолчанию пропускаем всех
        const userStatus = requiresApproval ? 'pending' : 'active';
        
        const user = await User.create({ 
            firstName, 
            lastName, 
            middleName: middleName || null, 
            email, 
            phone: phone || null,
            password: hash,
            status: userStatus
        });

        if (requiresApproval) {
            addSystemLog(`Новая заявка на регистрацию: ${email}`, 'warning');
            res.status(201).json({ message: 'Заявка отправлена на рассмотрение', status: 'pending' });
        } else {
            addSystemLog(`Новый пользователь зарегистрирован: ${email}`, 'success');
            res.status(201).json({ message: 'Регистрация успешна', status: 'active' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка регистрации', error: e });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        console.log('=== ВХОДЯЩИЕ ДАННЫЕ ===');
        console.log(req.body);
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
                    searchFilter: '(uid={{username}})', // Для AD обычно используется (sAMAccountName={{username}})
                });

                // 🔥 ФИКС 2: Перехватываем ошибки отпавшего LDAP-сервера, чтобы бэкенд НЕ ПАДАЛ
                ldap.on('error', (err: any) => {
                    console.error('⚠️ Глобальная ошибка LDAP (сервер недоступен):', err.message);
                });

                // Если ввели ivan@test.com, отрезаем всё после @ для LDAP
                const username = authId.includes('@') ? authId.split('@')[0] : authId;

                ldapUser = await new Promise((resolve, reject) => {
                    ldap.authenticate(username, password, (err: any, user: any) => {
                        ldap.close((closeErr: any) => { /* игнорим ошибку закрытия */ });
                        if (err) reject(err);
                        else resolve(user);
                    });
                });

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
                    email: authId, // Сохраняем логин как email
                    firstName: ldapUser?.givenName || ldapUser?.cn || 'Корпоративный',
                    lastName: ldapUser?.sn || 'Пользователь',
                    password: await bcrypt.hash(password, 10),
                    role: 'student',
                    status: 'active'
                });
                addSystemLog(`Создан новый профиль из LDAP: ${authId}`, 'success');
            }
        } else {
            // 5. Обычная локальная проверка (если LDAP выключен, упал или логин не подошел)
            if (!user) {
                return res.status(401).json({ message: 'Неверный логин или пароль' });
            }

            if (user.status === 'pending') {
                return res.json({ status: 'pending', message: 'Ваш аккаунт находится на рассмотрении' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ message: 'Доступ запрещен' });
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
        const { userId, firstName, lastName, middleName, phone, email, newPassword } = req.body;
        
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
            status: user.status
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
            const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt);

            user = await User.create({
                email,
                firstName: profile.first_name || profile.real_name || 'Студент',
                lastName: profile.last_name || '',
                role: 'student',
                status: 'active',
                password: randomPassword,
                avatarUrl: yandexAvatar // Присваиваем при создании
            });
            addSystemLog(`Создан профиль через Яндекс (Динамический): ${email}`, 'success');
        } else {
            // 🔥 ФИКС: Если юзер уже есть, но аватарки в Lumeo нет — забираем с Яндекса!
            if (yandexAvatar && !user.avatarUrl) {
                user.avatarUrl = yandexAvatar;
            }
        }

        user.lastLogin = new Date();
        await user.save();
        
        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'lumeo_super_secret_2024', { expiresIn: '7d' });
        
        // 🔥 И ТУТ ТОЖЕ LOCALHOST!
        res.redirect(`${CLIENT_URL}/auth?token=${jwtToken}`);
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
        const googleAvatar = profile.picture || null;

        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt);

            user = await User.create({
                email,
                firstName: profile.given_name || 'Студент',
                lastName: profile.family_name || '',
                role: 'student',
                status: 'active',
                password: randomPassword,
                avatarUrl: googleAvatar
            });
            addSystemLog(`Создан профиль через Google: ${email}`, 'success');
        } else {
            // Обновляем аватарку, если её нет
            if (googleAvatar && !user.avatarUrl) {
                user.avatarUrl = googleAvatar;
            }
        }

        user.lastLogin = new Date();
        await user.save();
        
        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'lumeo_super_secret_2024', { expiresIn: '7d' });
        
        // 🔥 МЕНЯЕМ API_URL НА CLIENT_URL
        res.redirect(`${CLIENT_URL}/auth?token=${jwtToken}`);
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
                    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt);

                    user = await User.create({
                        email,
                        firstName: profile.firstName || profile.givenName || 'Сотрудник',
                        lastName: profile.lastName || profile.sn || '',
                        role: 'student',
                        status: 'active',
                        password: randomPassword
                    });
                    addSystemLog(`Создан корпоративный профиль (SAML): ${email}`, 'success');
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
            
            const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'lumeo_super_secret_2024', { expiresIn: '7d' });
            res.redirect(`${CLIENT_URL}/auth?token=${jwtToken}`);
        })(req, res, next);

    } catch (error) {
        console.error('Ошибка обработки SAML callback:', error);
        res.redirect(`${CLIENT_URL}/auth?error=server_error`);
    }
};
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { addSystemLog } from './adminController.js';
import LdapAuth from 'ldapauth-fork';
const JWT_SECRET = process.env.JWT_SECRET || 'lumeo_super_secret_2024';

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
        
        // 🔥 Убрали сравнение с логическим true, оставили только строку
        const isYandexEnabled = yandexSetting?.value === 'true';
        
        res.json({
            yandex: isYandexEnabled,
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
    const redirectUri = 'http://localhost:5001/api/auth/yandex/callback';
    const url = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId.value}&redirect_uri=${redirectUri}`;
    
    res.redirect(url);
};

// --- 3. ЧИСТЫЙ КОЛЛБЭК С ЧТЕНИЕМ ИЗ БД ---
export const yandexCallback = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;
        if (!code) return res.redirect('http://localhost:5173/auth?error=yandex_rejected');

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

        if (!tokenData.access_token) return res.redirect('http://localhost:5173/auth?error=token_failed');

        const profileRes = await fetch('https://login.yandex.ru/info?format=json', {
            headers: { Authorization: `OAuth ${tokenData.access_token}` }
        });
        const profile = await profileRes.json();

        const email = profile.default_email || profile.emails?.[0] || `${profile.login}@yandex.ru`;
        let user = await User.findOne({ where: { email } });

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
                avatarUrl: profile.is_avatar_empty ? null : `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
            });
            addSystemLog(`Создан профиль через Яндекс (Динамический): ${email}`, 'success');
        }

        user.lastLogin = new Date();
        await user.save();
        
        const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'lumeo_super_secret_2024', { expiresIn: '7d' });
        
        // 🔥 И ТУТ ТОЖЕ LOCALHOST!
        res.redirect(`http://localhost:5173/auth?token=${jwtToken}`);
    } catch (error) {
        console.error('Ошибка Yandex OAuth:', error);
        res.redirect('http://localhost:5173/auth?error=server_error');
    }
};
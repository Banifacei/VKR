import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../models/User.js';
import { addSystemLog } from './adminController.js';

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
        
        const user = await User.create({ 
            firstName, 
            lastName, 
            middleName: middleName || null, 
            email, 
            phone: phone || null,
            password: hash 
        });

        res.status(201).json({ message: 'Регистрация успешна' });
        addSystemLog(`Новый пользователь зарегистрирован: ${email}`, 'success');
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка регистрации', error: e });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: identifier },
                    { phone: identifier }
                ]
            }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Неверный логин или пароль' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        addSystemLog(`Успешный вход: ${user.email} (Роль: ${user.role})`, 'info');
        res.json({
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (e) {
        console.error(e);
        addSystemLog(`Ошибка при попытке авторизации`, 'error');
        res.status(500).json({ message: 'Ошибка входа' });
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
                avatarUrl: user.avatarUrl
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
            avatarUrl: user.avatarUrl
        });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
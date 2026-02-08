import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize'; // <--- ВАЖНО: Добавь этот импорт
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lumeo_super_secret_2024';

export const register = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, middleName, email, phone, password } = req.body;
        
        // Проверяем, есть ли уже такой email ИЛИ телефон
        const existingUser = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { email },
                    ...(phone ? [{ phone }] : []) // Проверяем телефон только если он передан
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
            phone: phone || null, // Если пустая строка, пишем null
            password: hash 
        });

        res.status(201).json({ message: 'Регистрация успешна' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка регистрации', error: e });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password } = req.body; // identifier = email ИЛИ телефон

        // Ищем пользователя где (email == identifier) ИЛИ (phone == identifier)
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
                        { id: { [Op.ne]: userId } }, // ID НЕ равен текущему пользователю
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
        if (email) user.email = email; // Теперь обновляем и Email
        if (phone !== undefined) user.phone = phone;
        
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        
        res.json({ 
            message: 'Данные обновлены', 
            user: { 
                id: user.id, 
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
                email: user.email, // Возвращаем обновленный email
                phone: user.phone,
                role: user.role,
                avatarUrl: user.avatarUrl
            } 
        });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка при обновлении' });
    }
};

// Проверка текущего пользователя по токену
export const getMe = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id; // Берем из checkAuth
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
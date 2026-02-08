import { Request, Response } from 'express';
import { User } from '../models/User.js';
import bcrypt from 'bcrypt';
// 1. Получить всех пользователей
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'lastLogin'], // Берем только нужное
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка получения списка пользователей' });
    }
};

// 2. Изменить роль пользователя
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Простая валидация ролей
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Недопустимая роль' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        user.role = role;
        await user.save();

        res.json({ success: true, user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка обновления роли' });
    }
};

export const updateUserByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, role, password } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        // Обновляем основные поля
        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.role = role;

        // Если прислали пароль — хешируем и обновляем
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.json({ success: true, user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка при обновлении пользователя' });
    }
};
// server/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lumeo_super_secret_2024';

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenUserId = (req as any).user?.id; 

        if (!tokenUserId) {
            return res.status(401).json({ message: 'Пользователь не идентифицирован' });
        }

        const currentUser = await User.findByPk(tokenUserId);

        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Доступ запрещен. Роль была понижена или у вас нет прав.' 
            });
        }

        // Всё отлично, пускаем дальше
        next();
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка проверки прав доступа' });
    }
};

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
        next();
        return;
    }

    try {
        const token = req.headers.authorization?.split(' ')[1]; 
        
        if (!token) {
            return res.status(401).json({ message: 'Токен отсутствует. Пожалуйста, войдите в систему.' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string; email: string };
        
        (req as any).user = decoded;
        
        next();
    } catch (e) {
        res.status(401).json({ message: 'Сессия истекла или токен неверный' });
    }
};
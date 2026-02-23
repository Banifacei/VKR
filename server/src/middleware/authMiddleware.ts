// server/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lumeo_super_secret_2024';

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
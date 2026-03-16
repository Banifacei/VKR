import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { checkAuth } from '../middleware/authMiddleware.js';
import {
    getGlobalTheme,
    saveGlobalTheme,
    deleteGlobalLogo,
    saveUserTheme,
} from '../controllers/themeController.js';

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user && user.role === 'admin') return next();
    res.status(403).json({ message: 'Требуются права администратора' });
};

// Фабрика роутера — принимает logoUpload из index.ts
export default (logoUpload: multer.Multer) => {
    const router = Router();

    // Глобальная тема (публичный GET — нужен при старте приложения)
    router.get('/', getGlobalTheme);

    // Сохранение глобальной темы + загрузка логотипа (только admin)
    router.put('/', checkAuth, isAdmin, logoUpload.single('logo'), saveGlobalTheme);

    // Удаление логотипа (только admin)
    router.delete('/logo', checkAuth, isAdmin, deleteGlobalLogo);

    // Локальная тема пользователя
    router.put('/user', checkAuth, saveUserTheme);

    return router;
};

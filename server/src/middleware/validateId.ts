import { Request, Response, NextFunction } from 'express';

/**
 * Middleware: проверяет, что указанные параметры маршрута являются
 * положительными целыми числами. Отклоняет запросы с NaN, float, 0 и отрицательными.
 *
 * Пример: router.get('/:videoId', validateId('videoId'), handler)
 */
export const validateId = (...params: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        for (const param of params) {
            const val = req.params[param];
            if (val === undefined) continue;
            const num = parseInt(val, 10);
            if (isNaN(num) || num <= 0 || String(num) !== val) {
                return res.status(400).json({ message: `Некорректный параметр: ${param}` });
            }
        }
        next();
    };

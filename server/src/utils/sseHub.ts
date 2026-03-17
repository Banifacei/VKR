import { Request, Response } from 'express';

function sseInit(res: Response) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(':\n\n'); // keep-alive ping
}

/** Канал с ключом — каждый подписчик идентифицируется ключом K (напр. videoId, userId) */
export function createChannel<K = number>() {
    const map = new Map<K, Set<Response>>();

    return {
        subscribe(key: K, req: Request, res: Response) {
            sseInit(res);
            if (!map.has(key)) map.set(key, new Set());
            map.get(key)!.add(res);
            req.on('close', () => {
                map.get(key)?.delete(res);
                if (map.get(key)?.size === 0) map.delete(key);
            });
        },
        broadcast(key: K, data: Record<string, unknown>) {
            const set = map.get(key);
            if (!set) return;
            const payload = `data: ${JSON.stringify(data)}\n\n`;
            for (const res of set) res.write(payload);
        },
    };
}

/** Широковещательный канал — сообщение получают все подписчики */
export function createBroadcast() {
    const set = new Set<Response>();

    return {
        subscribe(req: Request, res: Response) {
            sseInit(res);
            set.add(res);
            req.on('close', () => set.delete(res));
        },
        broadcast(data: Record<string, unknown>) {
            const payload = `data: ${JSON.stringify(data)}\n\n`;
            for (const res of set) res.write(payload);
        },
    };
}

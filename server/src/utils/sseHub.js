function sseInit(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(':\n\n'); // keep-alive ping
}
/** Канал с ключом — каждый подписчик идентифицируется ключом K (напр. videoId, userId) */
export function createChannel() {
    const map = new Map();
    return {
        subscribe(key, req, res) {
            sseInit(res);
            if (!map.has(key))
                map.set(key, new Set());
            map.get(key).add(res);
            const hb = setInterval(() => {
                if (res.writableEnded) {
                    clearInterval(hb);
                    return;
                }
                res.write(':\n\n');
            }, 25000);
            req.on('close', () => {
                clearInterval(hb);
                map.get(key)?.delete(res);
                if (map.get(key)?.size === 0)
                    map.delete(key);
            });
        },
        broadcast(key, data) {
            const set = map.get(key);
            if (!set)
                return;
            const payload = `data: ${JSON.stringify(data)}\n\n`;
            for (const res of set)
                res.write(payload);
        },
    };
}
/** Широковещательный канал — сообщение получают все подписчики */
export function createBroadcast() {
    const set = new Set();
    return {
        subscribe(req, res) {
            sseInit(res);
            set.add(res);
            const hb = setInterval(() => {
                if (res.writableEnded) {
                    clearInterval(hb);
                    return;
                }
                res.write(':\n\n');
            }, 25000);
            req.on('close', () => { clearInterval(hb); set.delete(res); });
        },
        broadcast(data) {
            const payload = `data: ${JSON.stringify(data)}\n\n`;
            for (const res of set)
                res.write(payload);
        },
    };
}

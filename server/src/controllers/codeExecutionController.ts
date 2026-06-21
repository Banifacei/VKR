import { Request, Response } from 'express';

const PISTON_URL = process.env.PISTON_URL || 'http://lumeo-piston:2000';

const FILE_NAMES: Record<string, string> = {
    python: 'main.py', javascript: 'main.js', typescript: 'main.ts',
    java: 'Main.java', c: 'main.c', 'c++': 'main.cpp',
};

export const executeCode = async (req: Request, res: Response) => {
    try {
        const { language, code, stdin = '' } = req.body;

        if (!FILE_NAMES[language]) {
            res.status(400).json({ message: 'Неподдерживаемый язык' });
            return;
        }
        if (!code?.trim()) {
            res.status(400).json({ message: 'Код не может быть пустым' });
            return;
        }

        const pistonRes = await fetch(`${PISTON_URL}/api/v2/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language,
                version: '*',
                files: [{ name: FILE_NAMES[language], content: code }],
                stdin,
                args: [],
                run_timeout: 10000,
                compile_timeout: 30000,
                run_memory_limit: 256 * 1024 * 1024,
            }),
            signal: AbortSignal.timeout(45000),
        });

        if (!pistonRes.ok) {
            const err = await pistonRes.text().catch(() => '');
            res.status(502).json({ message: `Ошибка компилятора: ${err || pistonRes.status}` });
            return;
        }

        const data: any = await pistonRes.json();
        const compileOut = data.compile ? (data.compile.stdout + data.compile.stderr).trim() : null;

        res.json({
            stdout: data.run?.stdout ?? '',
            stderr: data.run?.stderr ?? '',
            exitCode: data.run?.code ?? -1,
            compileOutput: compileOut || null,
        });
    } catch (e: any) {
        if (e?.name === 'TimeoutError') {
            res.status(504).json({ message: 'Превышено время ожидания компилятора (45с)' });
        } else {
            res.status(503).json({ message: 'Сервер компиляции недоступен. Установите рантаймы в настройках.' });
        }
    }
};

export const getPistonStatus = async (_req: Request, res: Response) => {
    try {
        const r = await fetch(`${PISTON_URL}/api/v2/runtimes`, { signal: AbortSignal.timeout(5000) });
        const runtimes: any[] = await r.json();
        res.json({
            available: true,
            runtimes: runtimes.map(r => ({ language: r.language, version: r.version })),
        });
    } catch {
        res.json({ available: false, runtimes: [] });
    }
};

export const installPistonRuntimes = async (_req: Request, res: Response) => {
    const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'c', 'c++'];
    const results: any[] = [];

    for (const lang of LANGUAGES) {
        try {
            const r = await fetch(`${PISTON_URL}/api/v2/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang, version: '*' }),
                signal: AbortSignal.timeout(300_000),
            });
            const data = await r.json().catch(() => ({}));
            results.push({ language: lang, ok: r.ok, data });
        } catch (e: any) {
            results.push({ language: lang, ok: false, error: e.message });
        }
    }

    res.json({ results });
};

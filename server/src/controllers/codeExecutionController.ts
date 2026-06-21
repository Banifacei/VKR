import { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PISTON_URL = process.env.PISTON_URL || 'http://lumeo-piston:2000';
const PISTON_PACKAGES_DIR = '/piston/packages';
const PISTON_INDEX_URL = 'https://github.com/engineer-man/piston/releases/download/pkgs/index';
const PISTON_CONTAINER = process.env.PISTON_CONTAINER || 'lumeo-piston';
const DOCKER_SOCKET = '/var/run/docker.sock';

const FILE_NAMES: Record<string, string> = {
    python: 'main.py', javascript: 'main.js', typescript: 'main.ts',
    java: 'Main.java', c: 'main.c', 'c++': 'main.cpp',
};

// Maps our language IDs to the language name Piston reports in /api/v2/runtimes
const PISTON_LANG: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    java: 'java',
    c: 'c',
    'c++': 'c++',
};

// Piston package names to install (one gcc covers both c and c++)
const PISTON_PACKAGES = ['python', 'node', 'typescript', 'java', 'gcc'];

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

        const pistonLang = PISTON_LANG[language];
        const pistonRes = await fetch(`${PISTON_URL}/api/v2/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: pistonLang,
                version: '*',
                files: [{ name: FILE_NAMES[language], content: code }],
                stdin,
                args: [],
                run_timeout: 3000,
                compile_timeout: 10000,
                run_memory_limit: 256 * 1024 * 1024,
            }),
            signal: AbortSignal.timeout(45000),
        });

        if (!pistonRes.ok) {
            const errText = await pistonRes.text().catch(() => '');
            let errMsg = `Ошибка компилятора (${pistonRes.status})`;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.message) errMsg = errJson.message;
            } catch { /* not JSON */ }
            if (errMsg.includes('runtime is unknown') || errMsg.includes('unknown')) {
                errMsg = `Язык "${language}" не установлен в компиляторе. Попросите администратора установить рантаймы.`;
            }
            res.status(502).json({ message: errMsg });
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
        const installedPistonLangs = new Set(runtimes.map((r: any) => r.language));

        const langStatus = Object.entries(PISTON_LANG).map(([ourId, pistonId]) => ({
            language: ourId,
            pistonRuntime: pistonId,
            installed: installedPistonLangs.has(pistonId),
            version: runtimes.find((r: any) => r.language === pistonId)?.version ?? null,
        }));

        res.json({ available: true, runtimes: langStatus });
    } catch {
        res.json({ available: false, runtimes: [] });
    }
};

// Follow redirects and resolve the final URL
function resolveRedirects(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { headers: { 'User-Agent': 'lumeo-server/1.0' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                resolveRedirects(res.headers.location).then(resolve).catch(reject);
            } else {
                res.resume();
                resolve(url);
            }
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout resolving redirects')); });
    });
}

// Download a URL to a file path, following redirects
function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { headers: { 'User-Agent': 'lumeo-server/1.0' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const out = fs.createWriteStream(destPath);
            res.pipe(out);
            out.on('finish', () => out.close(() => resolve()));
            out.on('error', reject);
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(300000, () => { req.destroy(); reject(new Error('Download timeout')); });
    });
}

// Fetch Piston package index and parse it
async function fetchPistonIndex(): Promise<Map<string, { version: string; checksum: string; download: string }>> {
    const finalUrl = await resolveRedirects(PISTON_INDEX_URL);
    const text = await new Promise<string>((resolve, reject) => {
        const lib = finalUrl.startsWith('https') ? https : http;
        lib.get(finalUrl, { headers: { 'User-Agent': 'lumeo-server/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });

    const index = new Map<string, { version: string; checksum: string; download: string }>();
    for (const line of text.split('\n')) {
        const parts = line.trim().split(',', 4);
        if (parts.length < 4) continue;
        const [lang, version, checksum, download] = parts as [string, string, string, string];
        // Keep the latest version for each language
        if (!index.has(lang) || version > index.get(lang)!.version) {
            index.set(lang, { version, checksum, download });
        }
    }
    return index;
}

// Verify sha256 checksum of a file
function verifyChecksum(filePath: string, expected: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex') === expected));
        stream.on('error', reject);
    });
}

// Restart Piston container via Docker socket
function restartPistonContainer(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(DOCKER_SOCKET)) {
            reject(new Error('Docker socket not available'));
            return;
        }
        const req = http.request({
            socketPath: DOCKER_SOCKET,
            path: `/containers/${PISTON_CONTAINER}/restart`,
            method: 'POST',
        }, (res) => {
            res.resume();
            if (res.statusCode === 204 || res.statusCode === 200) resolve();
            else reject(new Error(`Docker restart failed: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Docker restart timeout')); });
        req.end();
    });
}

// Install a single Piston package by downloading and extracting it into the shared volume
async function installPackage(
    pkg: string,
    entry: { version: string; checksum: string; download: string }
): Promise<{ language: string; ok: boolean; error?: string }> {
    const installDir = path.join(PISTON_PACKAGES_DIR, pkg, entry.version);
    const tarPath = path.join(installDir, 'pkg.tar.gz');

    try {
        // Remove all existing versions of this language (clean slate)
        const langDir = path.join(PISTON_PACKAGES_DIR, pkg);
        if (fs.existsSync(langDir)) {
            await fsp.rm(langDir, { recursive: true, force: true });
        }
        await fsp.mkdir(installDir, { recursive: true });

        // Download
        await downloadFile(entry.download, tarPath);

        // Verify checksum
        const ok = await verifyChecksum(tarPath, entry.checksum);
        if (!ok) throw new Error('Checksum mismatch');

        // Extract
        await execAsync(`tar xzf "${tarPath}" -C "${installDir}"`);

        // Generate .env from the environment script inside the package.
        // Must cd into installDir first so $PWD resolves to the package dir
        // (Piston's environment scripts use `export PATH=$PWD/bin:$PATH`).
        const envScript = path.join(installDir, 'environment');
        if (fs.existsSync(envScript)) {
            const { stdout } = await execAsync(
                `cd "${installDir}" && env -i bash -c 'source ./environment; env'`
            ).catch(() => ({ stdout: '' }));
            const filtered = stdout
                .split('\n')
                .filter(l => !['PWD', 'OLDPWD', '_', 'SHLVL'].some(k => l.startsWith(k + '=')))
                .join('\n');
            await fsp.writeFile(path.join(installDir, '.env'), filtered);
        }

        // Write installed marker (same file Piston checks: .ppman-installed)
        await fsp.writeFile(path.join(installDir, '.ppman-installed'), Date.now().toString());

        return { language: pkg, ok: true };
    } catch (e: any) {
        // Clean up failed install
        await fsp.rm(installDir, { recursive: true, force: true }).catch(() => {});
        return { language: pkg, ok: false, error: e.message };
    }
}

export const installPistonRuntimes = async (_req: Request, res: Response) => {
    try {
        const index = await fetchPistonIndex();
        const results: { language: string; ok: boolean; error?: string }[] = [];

        for (const pkg of PISTON_PACKAGES) {
            const entry = index.get(pkg);
            if (!entry) {
                results.push({ language: pkg, ok: false, error: 'Пакет не найден в индексе' });
                continue;
            }
            const result = await installPackage(pkg, entry);
            results.push(result);
        }

        // Restart Piston so it loads the newly installed runtimes
        const anyOk = results.some(r => r.ok);
        if (anyOk) {
            try {
                await restartPistonContainer();
                // Wait a bit for Piston to come back up
                await new Promise(r => setTimeout(r, 5000));
            } catch (e: any) {
                // Non-fatal: packages are installed, user can restart manually
                results.push({ language: '_restart', ok: false, error: `Перезапуск Piston: ${e.message}` });
            }
        }

        res.json({ results });
    } catch (e: any) {
        res.status(500).json({ message: `Ошибка установки: ${e.message}` });
    }
};

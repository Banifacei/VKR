import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface ScanResult {
    safe: boolean;
    reason?: string;
}

// Первые байты каждого разрешённого типа файла
const MAGIC: Record<string, number[]> = {
    pdf:  [0x25, 0x50, 0x44, 0x46], // %PDF
    png:  [0x89, 0x50, 0x4E, 0x47], // .PNG
    jpg:  [0xFF, 0xD8, 0xFF],        // JPEG SOI
    docx: [0x50, 0x4B, 0x03, 0x04], // PK (ZIP)
    xlsx: [0x50, 0x4B, 0x03, 0x04],
    pptx: [0x50, 0x4B, 0x03, 0x04],
    doc:  [0xD0, 0xCF, 0x11, 0xE0], // OLE
    xls:  [0xD0, 0xCF, 0x11, 0xE0],
};

function checkMagicBytes(filepath: string, ext: string): ScanResult {
    const expected = MAGIC[ext];
    if (!expected) return { safe: true }; // txt — нет фиксированной сигнатуры

    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filepath, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);

    for (let i = 0; i < expected.length; i++) {
        if (buf[i] !== expected[i]) {
            return {
                safe: false,
                reason: `Расширение .${ext} не соответствует реальному содержимому файла`,
            };
        }
    }
    return { safe: true };
}

function runPythonScan(filepath: string, ext: string): ScanResult {
    const script = path.join(process.cwd(), 'scripts', 'scan_file.py');
    const result = spawnSync('python3', [script, filepath, ext], {
        timeout: 30_000,
        encoding: 'utf8',
    });

    if (result.error) return { safe: false, reason: 'Сканер временно недоступен' };
    if (result.status !== 0) {
        return { safe: false, reason: result.stderr?.trim() || 'Ошибка при сканировании файла' };
    }

    try {
        return JSON.parse(result.stdout.trim()) as ScanResult;
    } catch {
        return { safe: false, reason: 'Не удалось разобрать результат сканирования' };
    }
}

export function scanFile(filepath: string, originalName: string): ScanResult {
    const ext = originalName.split('.').pop()?.toLowerCase() ?? '';

    const magic = checkMagicBytes(filepath, ext);
    if (!magic.safe) return magic;

    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'pptx'].includes(ext)) {
        return runPythonScan(filepath, ext);
    }

    return { safe: true };
}

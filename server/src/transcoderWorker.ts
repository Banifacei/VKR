// server/src/transcoderWorker.ts
// Запускается в отдельном Worker Thread — не блокирует основной поток
import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

interface WorkerData {
    inputPath: string;
    uploadsDir: string;
    base: string;
}

const { inputPath, uploadsDir, base } = workerData as WorkerData;
const ffmpegBin = (ffmpegPath as unknown as string) || 'ffmpeg';

const targets = [
    { quality: '360p', width: 640,  height: 360 },
    { quality: '720p', width: 1280, height: 720 },
];

const transcodeOne = (outPath: string, width: number, height: number): Promise<void> =>
    new Promise((resolve, reject) => {
        const args = [
            '-i', inputPath,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',  // Самый быстрый пресет, минимальная нагрузка на CPU
            '-crf', '28',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-threads', '2',         // Ограничиваем CPU
            '-movflags', '+faststart',
            '-y',
            outPath,
        ];

        // nice -n 19 = наименьший приоритет, Node.js всегда получит CPU в первую очередь
        const trySpawn = (useNice: boolean) => {
            const cmd  = useNice ? 'nice' : ffmpegBin;
            const argv = useNice ? ['-n', '19', ffmpegBin, ...args] : args;
            const proc = spawn(cmd, argv, { stdio: 'ignore' });
            proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)));
            proc.on('error', err => {
                if (useNice) trySpawn(false); // nice недоступен → запускаем напрямую
                else reject(err);
            });
        };
        trySpawn(true);
    });

const run = async () => {
    if (!fs.existsSync(inputPath)) {
        parentPort?.postMessage({ status: 'error', error: 'Input file not found' });
        return;
    }

    const results: { quality: string; url: string }[] = [];

    for (const t of targets) {
        const outName = `${base}_${t.quality}.mp4`;
        const outPath = path.join(uploadsDir, outName);
        parentPort?.postMessage({ status: `transcoding_${t.quality}` });
        try {
            await transcodeOne(outPath, t.width, t.height);
            results.push({ quality: t.quality, url: `/uploads/${outName}` });
        } catch (e: any) {
            parentPort?.postMessage({ status: 'warn', message: `Ошибка ${t.quality}: ${e.message}` });
        }
    }

    parentPort?.postMessage({ status: 'done', results });
};

run();

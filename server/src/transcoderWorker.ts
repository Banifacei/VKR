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
    { quality: '360p', width: 640,  height: 360,  bandwidth: 800000  },
    { quality: '720p', width: 1280, height: 720,  bandwidth: 2500000 },
];

const hlsDir = path.join(uploadsDir, `${base}_hls`);

const transcodeHLS = (qualityDir: string, width: number, height: number): Promise<void> =>
    new Promise((resolve, reject) => {
        fs.mkdirSync(qualityDir, { recursive: true });

        const args = [
            '-i', inputPath,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-threads', '2',
            '-f', 'hls',
            '-hls_time', '6',
            '-hls_playlist_type', 'vod',
            '-hls_segment_type', 'mpegts',
            '-hls_segment_filename', path.join(qualityDir, 'seg%03d.ts'),
            '-y',
            path.join(qualityDir, 'index.m3u8'),
        ];

        const trySpawn = (useNice: boolean) => {
            const cmd  = useNice ? 'nice' : ffmpegBin;
            const argv = useNice ? ['-n', '19', ffmpegBin, ...args] : args;
            const proc = spawn(cmd, argv, { stdio: 'ignore' });
            proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)));
            proc.on('error', err => {
                if (useNice) trySpawn(false);
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

    fs.mkdirSync(hlsDir, { recursive: true });

    const results: { quality: string; url: string }[] = [];

    for (const t of targets) {
        const qualityDir = path.join(hlsDir, t.quality);
        parentPort?.postMessage({ status: `transcoding_${t.quality}` });
        try {
            await transcodeHLS(qualityDir, t.width, t.height);
            results.push({ quality: t.quality, url: `/uploads/${base}_hls/${t.quality}/index.m3u8` });
        } catch (e: any) {
            parentPort?.postMessage({ status: 'warn', message: `Ошибка ${t.quality}: ${e.message}` });
        }
    }

    // Генерируем master playlist
    const masterPath = path.join(hlsDir, 'master.m3u8');
    const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
    for (const t of targets) {
        const found = results.find(r => r.quality === t.quality);
        if (found) {
            masterLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${t.bandwidth},RESOLUTION=${t.width}x${t.height},NAME="${t.quality}"`);
            masterLines.push(`${t.quality}/index.m3u8`);
        }
    }
    fs.writeFileSync(masterPath, masterLines.join('\n') + '\n');

    const hlsUrl = `/uploads/${base}_hls/master.m3u8`;
    parentPort?.postMessage({ status: 'done', results, hlsUrl });
};

run();

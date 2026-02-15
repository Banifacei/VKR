// server/src/subtitleWorker.ts
import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { pipeline, env } from '@xenova/transformers';
// Используем import default, так как библиотека wavefile часто экспортирует себя как CJS
import * as wavefile from 'wavefile';

// Настройка путей для кэша моделей (опционально, чтобы не качал каждый раз в /tmp)
env.cacheDir = './uploads/.cache'; 

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

const formatVttTime = (seconds: number) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substring(11, 23); // format: HH:mm:ss.SSS
};

const createVttFile = (chunks: any[], outputPath: string) => {
    let vttContent = "WEBVTT\n\n";
    chunks.forEach((chunk) => {
        if (chunk.timestamp) {
            const start = formatVttTime(chunk.timestamp[0]);
            const end = formatVttTime(chunk.timestamp[1]);
            const text = chunk.text.trim();
            vttContent += `${start} --> ${end}\n${text}\n\n`;
        }
    });
    fs.writeFileSync(outputPath, vttContent);
};

const extractAudio = (videoPath: string, audioPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .toFormat('wav')
            .audioFrequency(16000)
            .audioChannels(1)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(audioPath);
    });
};

// Запускаем процесс
(async () => {
    try {
        const { videoPath, tempAudioPath, vttPath } = workerData;

        parentPort?.postMessage({ status: 'Извлекаем аудио...' });
        await extractAudio(videoPath, tempAudioPath);

        parentPort?.postMessage({ status: 'Запускаем нейросеть Whisper...' });
        
        // Загружаем модель
        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
        
        // Читаем аудио
        const buffer = fs.readFileSync(tempAudioPath);
        
        // --- ИСПРАВЛЕНИЕ ИМПОРТА WAVEFILE ---
        // Пытаемся получить конструктор безопасно для разных систем сборки
        // @ts-ignore
        const WaveFile = wavefile.WaveFile || wavefile.default?.WaveFile || wavefile.default || wavefile;
        
        const wav = new WaveFile(buffer);
        wav.toBitDepth('32f');
        const audioData = wav.getSamples();
        let float32Array = Array.isArray(audioData) ? audioData[0] : audioData;

        // Транскрибация
        const output = await transcriber(float32Array, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'russian',
            task: 'transcribe',
            return_timestamps: true,
        });

        // @ts-ignore
        createVttFile(output.chunks, vttPath);

        // Чистим времянку
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

        parentPort?.postMessage({ status: 'done' });
    } catch (error) {
        // Логируем ошибку подробно
        console.error("Worker Error Details:", error);
        parentPort?.postMessage({ status: 'error', error: String(error) });
    }
})();
import fs from 'fs/promises';
import path from 'path';
import { Video } from '../models/Video.js';
import { User } from '../models/User.js';
import { addSystemLog } from '../controllers/adminController.js';

export const cleanupOrphanFiles = async (uploadDir: string, avatarDir: string) => {
    try {
        console.log('🧹 [Garbage Collector] Запуск сканирования потерянных файлов...');
        
        // 1. Создаем Set (множество) для сверхбыстрого поиска файлов, которые ЕСТЬ в БД
        const usedFiles = new Set<string>();
        
        // Достаем все видео и субтитры
        const videos = await Video.findAll();
        videos.forEach(v => {
            if (v.url) {
                const fileName = v.url.split('/').pop();
                if (fileName) usedFiles.add(fileName);
            }
            if (v.subtitles && Array.isArray(v.subtitles)) {
                v.subtitles.forEach(sub => {
                    if (sub.src) {
                        const subName = sub.src.split('/').pop();
                        if (subName) usedFiles.add(subName);
                    }
                });
            }
            if (v.qualityUrls && Array.isArray(v.qualityUrls)) {
                v.qualityUrls.forEach((q: any) => {
                    if (q.url) {
                        const qName = q.url.split('/').pop();
                        if (qName) usedFiles.add(qName);
                    }
                });
            }
        });

        // Достаем все аватарки юзеров
        const users = await User.findAll();
        users.forEach(u => {
            if (u.avatarUrl) {
                const avatarName = u.avatarUrl.split('/').pop();
                if (avatarName) usedFiles.add(avatarName);
            }
        });

        let deletedCount = 0;

        // 2. Сканируем папку /uploads (видео и субтитры)
        const uploadFiles = await fs.readdir(uploadDir, { withFileTypes: true });
        for (const dirent of uploadFiles) {
            // Игнорируем папки (avatars, .cache) и скрытые файлы (типа .DS_Store или .gitignore)
            if (dirent.isFile() && !dirent.name.startsWith('.')) { 
                if (!usedFiles.has(dirent.name)) {
                    await fs.unlink(path.join(uploadDir, dirent.name));
                    deletedCount++;
                    console.log(`🗑️ [Удален мусор] Видео/Саб: ${dirent.name}`);
                }
            }
        }

        // 3. Сканируем папку /uploads/avatars
        const avatarFiles = await fs.readdir(avatarDir, { withFileTypes: true });
        for (const dirent of avatarFiles) {
            if (dirent.isFile() && !dirent.name.startsWith('.')) {
                if (!usedFiles.has(dirent.name)) {
                    await fs.unlink(path.join(avatarDir, dirent.name));
                    deletedCount++;
                    console.log(`🗑️ [Удален мусор] Аватар: ${dirent.name}`);
                }
            }
        }

        // 4. Отчитываемся
        if (deletedCount > 0) {
            console.log(`✨ [Garbage Collector] Очистка завершена. Удалено файлов: ${deletedCount}`);
            addSystemLog(`Сборщик мусора освободил диск: удалено ${deletedCount} неиспользуемых файлов`, 'info');
        } else {
            console.log('✨ [Garbage Collector] Мусора не найдено. Диск чист!');
        }

    } catch (error) {
        console.error('❌ Ошибка при очистке файлов:', error);
    }
};
import { BannedWord } from '../models/BannedWord.js';
import { ModerationLog } from '../models/ModerationLog.js';
import { User } from '../models/User.js';
import { fn, col, literal } from 'sequelize';
// Кеш слов в памяти — обновляется при изменениях, не грузит БД на каждый комментарий
let cache = [];
let cacheLoaded = false;
const loadCache = async () => {
    const rows = await BannedWord.findAll({ attributes: ['word'] });
    cache = rows.map(r => r.word.toLowerCase());
    cacheLoaded = true;
};
export const filterText = async (text, context) => {
    if (!cacheLoaded)
        await loadCache();
    if (cache.length === 0)
        return text;
    let result = text;
    for (const word of cache) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        if (regex.test(text) && context) {
            // Логируем нарушение
            ModerationLog.create({
                userId: context.userId,
                videoId: context.videoId ?? null,
                word,
            }).catch(() => { });
        }
        result = result.replace(new RegExp(escaped, 'gi'), '***');
    }
    return result;
};
// GET /api/banned-words
export const getBannedWords = async (_req, res) => {
    try {
        const words = await BannedWord.findAll({ order: [['word', 'ASC']] });
        res.json(words);
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка загрузки' });
    }
};
// POST /api/banned-words  { word }
export const addBannedWord = async (req, res) => {
    const word = (req.body.word || '').trim().toLowerCase();
    if (!word || word.length > 100)
        return res.status(400).json({ message: 'Слово не может быть пустым или длиннее 100 символов' });
    try {
        const [record, created] = await BannedWord.findOrCreate({ where: { word } });
        if (!created)
            return res.status(409).json({ message: 'Слово уже в списке' });
        cache = [...cache, word];
        res.status(201).json(record);
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка добавления' });
    }
};
// DELETE /api/banned-words/:id
export const deleteBannedWord = async (req, res) => {
    try {
        const record = await BannedWord.findByPk(Number(req.params.id));
        if (!record)
            return res.status(404).json({ message: 'Не найдено' });
        cache = cache.filter(w => w !== record.word.toLowerCase());
        await record.destroy();
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка удаления' });
    }
};
// POST /api/banned-words/import  { words: string[] } — массовый импорт
export const importBannedWords = async (req, res) => {
    const words = (req.body.words || [])
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0 && w.length <= 100);
    if (words.length === 0)
        return res.status(400).json({ message: 'Нет слов для импорта' });
    try {
        let added = 0;
        for (const word of words) {
            const [, created] = await BannedWord.findOrCreate({ where: { word } });
            if (created)
                added++;
        }
        await loadCache();
        res.json({ added, total: words.length });
    }
    catch (e) {
        res.status(500).json({ message: 'Ошибка импорта' });
    }
};
// GET /api/banned-words/offenders — топ нарушителей
export const getOffenders = async (_req, res) => {
    try {
        const rows = await ModerationLog.findAll({
            attributes: [
                'userId',
                [fn('COUNT', col('ModerationLog.id')), 'count'],
                [fn('MAX', col('ModerationLog.createdAt')), 'lastSeen'],
            ],
            include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'email'],
                }],
            group: ['userId', 'user.id'],
            order: [[literal('count'), 'DESC']],
            limit: 20,
        });
        res.json(rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка загрузки' });
    }
};

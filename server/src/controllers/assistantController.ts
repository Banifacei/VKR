import { Request, Response } from 'express';
import { pipeline, env } from '@xenova/transformers';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { SystemSetting } from '../models/SystemSetting.js';

env.allowLocalModels = false;

let semanticExtractor: any = null;

async function getEmbedding(text: string): Promise<number[]> {
    if (!semanticExtractor) {
        semanticExtractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { quantized: true });
    }
    const out = await semanticExtractor(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data as Float32Array);
}

function cosineSim(a: number[], b: number[]): number {
    let sim = 0;
    for (let i = 0; i < a.length; i++) sim += (a[i] ?? 0) * (b[i] ?? 0);
    return Math.max(0, sim);
}

const FAQ: Array<{ q: string; a: string }> = [
    { q: 'что такое lumeo', a: 'Lumeo — образовательная платформа для онлайн-обучения с видеоуроками, тестами и домашними заданиями.' },
    { q: 'как пройти курс', a: 'Откройте раздел «Курсы», выберите нужный курс и просматривайте видеоуроки по порядку.' },
    { q: 'как получить сертификат', a: 'Сертификат выдаётся автоматически после завершения курса на 100% — просмотрите все видео и пройдите все тесты.' },
    { q: 'как сдать домашнее задание', a: 'На странице курса откройте раздел «Домашние задания», прикрепите файл или введите текст ответа и нажмите «Отправить».' },
    { q: 'забыл пароль', a: 'Нажмите «Забыли пароль?» на странице входа — инструкция придёт на email.' },
    { q: 'как изменить аватар', a: 'Перейдите в «Профиль» → нажмите на аватар → выберите и загрузите новое изображение.' },
    { q: 'что такое бейджи', a: 'Бейджи — награды за достижения: первый завершённый курс, отличные результаты тестов, сдачу заданий до дедлайна.' },
    { q: 'как связаться с преподавателем', a: 'Используйте комментарии под уроком — преподаватель получит уведомление и ответит.' },
    { q: 'как скачать сертификат', a: 'Перейдите в раздел «Мои сертификаты» или на страницу курса — там появится кнопка скачивания после завершения.' },
    { q: 'лидерборд', a: 'На странице курса нажмите кнопку «Лидерборд» — увидите топ-10 студентов по результатам тестов.' },
    { q: 'таймер', a: 'Некоторые вопросы в видео имеют таймер. Ответь до истечения времени — иначе ответ будет засчитан как неверный.' },
    { q: 'тест', a: 'Тесты доступны в разделе курса. Некоторые тесты имеют ограничение по времени, указанное вверху страницы.' },
];

async function getSetting(key: string): Promise<string | null> {
    try {
        const row = await SystemSetting.findOne({ where: { key } });
        return row?.value ?? null;
    } catch {
        return null;
    }
}

const OLLAMA_URL = () => (process.env.OLLAMA_URL || 'http://ollama:11434').replace(/\/$/, '');
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || 'qwen2.5:3b';

async function isOllamaAvailable(): Promise<boolean> {
    try {
        const res = await fetch(`${OLLAMA_URL()}/api/tags`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch {
        return false;
    }
}

async function callOllama(systemPrompt: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
        const ollamaMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.filter(m => m.role !== 'system'),
        ];
        const res = await fetch(`${OLLAMA_URL()}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL(),
                messages: ollamaMessages,
                stream: false,
                options: { temperature: 0.7, num_predict: 512 },
            }),
            signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) {
            console.error('[Assistant] Ollama error:', res.status);
            return '';
        }
        const data = await res.json() as any;
        return (data.message?.content ?? '').trim();
    } catch (e) {
        console.error('[Assistant] Ollama недоступен:', (e as Error).message);
        return '';
    }
}

export const getAssistantStatus = async (_req: Request, res: Response): Promise<void> => {
    const enabled = await getSetting('ai_assistant_enabled');
    const ollamaUp = await isOllamaAvailable();
    res.json({
        enabled: enabled === null ? true : enabled === 'true',
        hasKey: ollamaUp,
        provider: ollamaUp ? 'ollama' : 'faq',
    });
};

export const askAssistant = async (req: Request, res: Response): Promise<void> => {
    const userName: string = (req as any).user?.name || 'Студент';
    const userRole: string = (req as any).user?.role || 'student';
    const { question, history = [] } = req.body;

    const enabledSetting = await getSetting('ai_assistant_enabled');
    if (enabledSetting === 'false') {
        res.status(503).json({ message: 'ИИ-ассистент отключён администратором' });
        return;
    }

    if (!question || typeof question !== 'string' || question.trim().length < 2) {
        res.status(400).json({ message: 'Вопрос не может быть пустым' });
        return;
    }

    const q = question.trim();

    // Проверка: не является ли вопрос учебным заданием курса
    try {
        const events = await InteractiveEvent.findAll({ where: { type: 'question' }, attributes: ['question'], limit: 300 });
        if (events.length > 0) {
            const qEmb = await getEmbedding(q);
            for (const event of events) {
                if (!event.question || event.question.length < 5) continue;
                const eEmb = await getEmbedding(event.question);
                if (cosineSim(qEmb, eEmb) > 0.75) {
                    res.json({ answer: '🔒 Этот вопрос является частью учебного курса. Попробуй найти ответ самостоятельно — это поможет лучше усвоить материал!', blocked: true });
                    return;
                }
            }
        }
    } catch (e) {
        console.error('[Assistant] Ошибка проверки курсовых вопросов:', e);
    }

    const roleLabel = userRole === 'student' ? 'студент' : userRole === 'teacher' ? 'преподаватель' : 'администратор';
    const systemPrompt = `Ты — Луми, умный ИИ-ассистент образовательной платформы Lumeo. Помогаешь студентам и преподавателям разбираться в функциях платформы, отвечаешь на общие вопросы об обучении.

Правила:
- НЕ решаешь задачи из курсов и не даёшь прямые ответы на тестовые вопросы.
- Если вопрос явно из учебного теста — вежливо откажи и предложи подумать самостоятельно.
- Отвечай по-русски, кратко и по делу (2–4 предложения).
- Будь дружелюбным и поддерживающим.
Пользователь: ${userName} (${roleLabel}).`;

    const chatHistory = history.slice(-6).map((h: any) => ({ role: h.role as string, content: h.content as string }));

    // Ollama — основной
    const ollamaAnswer = await callOllama(systemPrompt, [...chatHistory, { role: 'user', content: q }]);
    if (ollamaAnswer) {
        res.json({ answer: ollamaAnswer, blocked: false });
        return;
    }

    // FAQ-фоллбэк — если Ollama недоступна
    const qLower = q.toLowerCase();
    for (const faq of FAQ) {
        if (qLower.includes(faq.q)) {
            res.json({ answer: faq.a, blocked: false });
            return;
        }
    }

    res.json({
        answer: 'Локальная ИИ-модель сейчас недоступна. Попробуй позже или задай вопрос преподавателю в комментариях к уроку.',
        blocked: false,
    });
};

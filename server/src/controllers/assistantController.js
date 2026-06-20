import { pipeline, env } from '@xenova/transformers';
import { InteractiveEvent } from '../models/InteractiveEvent.js';
import { SystemSetting } from '../models/SystemSetting.js';
env.allowLocalModels = false;
let semanticExtractor = null;
async function getEmbedding(text) {
    if (!semanticExtractor) {
        semanticExtractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { quantized: true });
    }
    const out = await semanticExtractor(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data);
}
function cosineSim(a, b) {
    let sim = 0;
    for (let i = 0; i < a.length; i++)
        sim += (a[i] ?? 0) * (b[i] ?? 0);
    return Math.max(0, sim);
}
const FAQ = [
    // Приветствия и small-talk
    { q: 'привет', a: 'Привет! Я Луми — ИИ-ассистент платформы Lumeo. Чем могу помочь?' },
    { q: 'здравствуй', a: 'Здравствуйте! Я Луми, помогу разобраться с платформой. Задайте любой вопрос!' },
    { q: 'добрый день', a: 'Добрый день! Я Луми — ИИ-ассистент Lumeo. Чем могу помочь?' },
    { q: 'добрый вечер', a: 'Добрый вечер! Рад помочь. Задайте вопрос о платформе или обучении.' },
    { q: 'доброе утро', a: 'Доброе утро! Я Луми — готов помочь с любым вопросом по Lumeo.' },
    { q: 'как дела', a: 'Отлично, спасибо! Готов помочь вам с вопросами по платформе.' },
    { q: 'кто ты', a: 'Я Луми — ИИ-ассистент образовательной платформы Lumeo. Помогаю студентам и преподавателям разбираться в функциях платформы.' },
    { q: 'что ты умеешь', a: 'Я могу помочь разобраться с курсами, тестами, домашними заданиями, сертификатами и другими функциями Lumeo. Просто задайте вопрос!' },
    { q: 'спасибо', a: 'Пожалуйста! Если появятся ещё вопросы — всегда рад помочь.' },
    { q: 'благодар', a: 'Пожалуйста! Обращайтесь, если понадобится помощь.' },
    { q: 'помоги', a: 'Конечно! Спросите о курсах, тестах, домашних заданиях, сертификатах — отвечу на всё.' },
    { q: 'не понимаю', a: 'Попробуйте переформулировать вопрос. Я могу помочь с курсами, тестами, заданиями и другими функциями платформы.' },
    // Платформа
    { q: 'что такое lumeo', a: 'Lumeo — образовательная платформа для онлайн-обучения с видеоуроками, интерактивными вопросами, тестами и домашними заданиями.' },
    { q: 'как зарегистрироваться', a: 'Перейдите на страницу входа и нажмите «Регистрация» — введите имя, email и пароль.' },
    { q: 'как войти', a: 'Откройте страницу /auth, введите email и пароль. Если забыли пароль — нажмите «Забыли пароль?».' },
    { q: 'забыл пароль', a: 'Нажмите «Забыли пароль?» на странице входа — инструкция придёт на email.' },
    { q: 'как изменить аватар', a: 'Перейдите в «Профиль» → нажмите на аватар → выберите и загрузите новое изображение.' },
    { q: 'как изменить имя', a: 'Перейдите в «Профиль» → нажмите «Редактировать» — там можно изменить имя и другие данные.' },
    { q: 'как изменить пароль', a: 'Перейдите в «Профиль» → раздел «Безопасность» — там можно сменить текущий пароль.' },
    // Курсы и видео
    { q: 'как найти курс', a: 'Все доступные курсы отображаются на главной странице в разделе «Курсы».' },
    { q: 'как записаться на курс', a: 'Откройте страницу курса и нажмите «Записаться». Если курс требует одобрения — дождитесь подтверждения от преподавателя.' },
    { q: 'как пройти курс', a: 'Откройте раздел «Курсы», выберите нужный курс и просматривайте видеоуроки по порядку.' },
    { q: 'прогресс', a: 'Прогресс по курсу отображается на его странице. Видео считается просмотренным, когда вы досмотрели его до конца.' },
    { q: 'субтитры', a: 'Если преподаватель включил автосубтитры, они появятся под видео. Нажмите кнопку «CC» в плеере для включения/выключения.' },
    { q: 'главы', a: 'Главы (chapters) — это временны́е метки в видео. Нажмите на главу во вкладке «Главы» под плеером, чтобы перейти к нужному месту.' },
    { q: 'интерактивные вопросы', a: 'Во время просмотра видео могут появляться вопросы. Ответь на них — это влияет на твой результат по курсу.' },
    // Тесты и задания
    { q: 'тест', a: 'Тесты доступны в разделе курса. Некоторые тесты имеют ограничение по времени, указанное вверху страницы.' },
    { q: 'таймер', a: 'Некоторые вопросы в видео имеют таймер. Ответь до истечения времени — иначе ответ будет засчитан как неверный.' },
    { q: 'как сдать домашнее задание', a: 'На странице курса откройте раздел «Домашние задания», прикрепите файл или введите текст ответа и нажмите «Отправить».' },
    { q: 'дедлайн', a: 'Дедлайн домашнего задания указан рядом с его названием. Сдайте работу до этой даты — за сдачу вовремя начисляется бейдж.' },
    { q: 'результаты', a: 'Результаты тестов и интерактивных вопросов видны на странице курса в разделе «Моя статистика».' },
    // Достижения и сертификаты
    { q: 'как получить сертификат', a: 'Сертификат выдаётся автоматически после завершения курса на 100% — просмотрите все видео и пройдите все тесты.' },
    { q: 'как скачать сертификат', a: 'Перейдите в раздел «Мои сертификаты» или на страницу курса — там появится кнопка скачивания после завершения.' },
    { q: 'что такое бейджи', a: 'Бейджи — награды за достижения: первый завершённый курс, отличные результаты тестов, сдача заданий до дедлайна.' },
    { q: 'лидерборд', a: 'На странице курса нажмите кнопку «Лидерборд» — увидите топ-10 студентов по результатам тестов.' },
    // Коммуникация
    { q: 'как связаться с преподавателем', a: 'Используйте комментарии под уроком — преподаватель получит уведомление и ответит.' },
    { q: 'комментари', a: 'Комментарии находятся под каждым видеоуроком. Можно задавать вопросы и обсуждать материал с другими студентами.' },
    { q: 'уведомлени', a: 'Уведомления о новых заданиях, ответах преподавателя и результатах тестов отображаются в шапке сайта (иконка колокольчика).' },
    // Для преподавателей
    { q: 'как добавить видео', a: 'В разделе «Управление курсами» нажмите «Добавить видео» — укажите название, загрузите файл или вставьте ссылку.' },
    { q: 'как создать курс', a: 'Перейдите в «Управление курсами» → нажмите «Создать курс» — укажите название, описание и добавьте видео.' },
    { q: 'аналитик', a: 'Аналитика по курсу доступна преподавателям в разделе управления: статистика просмотров, результаты тестов, активность студентов.' },
    // Техническое
    { q: 'видео не воспроизводится', a: 'Попробуйте обновить страницу или очистить кэш браузера. Убедитесь, что интернет-соединение стабильно.' },
    { q: 'не загружается', a: 'Попробуйте обновить страницу (F5). Если проблема сохраняется — напишите администратору платформы.' },
];
async function getSetting(key) {
    try {
        const row = await SystemSetting.findOne({ where: { key } });
        return row?.value ?? null;
    }
    catch {
        return null;
    }
}
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const OLLAMA_CANDIDATES = [
    (process.env.OLLAMA_URL || 'http://ollama:11434').replace(/\/$/, ''),
    'http://localhost:11434',
    'http://127.0.0.1:11434',
];
let _resolvedOllamaUrl = null;
async function resolveOllamaUrl() {
    if (_resolvedOllamaUrl) {
        try {
            const res = await fetch(`${_resolvedOllamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
            if (res.ok)
                return _resolvedOllamaUrl;
        }
        catch { /* fall through to re-probe */ }
        _resolvedOllamaUrl = null;
    }
    for (const url of OLLAMA_CANDIDATES) {
        try {
            const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) });
            if (res.ok) {
                _resolvedOllamaUrl = url;
                return url;
            }
        }
        catch { /* try next */ }
    }
    return null;
}
async function isOllamaAvailable() {
    return (await resolveOllamaUrl()) !== null;
}
async function callOllama(systemPrompt, messages) {
    const ollamaUrl = await resolveOllamaUrl();
    if (!ollamaUrl)
        return '';
    try {
        const ollamaMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.filter(m => m.role !== 'system'),
        ];
        const res = await fetch(`${ollamaUrl}/api/chat`, {
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
        const data = await res.json();
        return (data.message?.content ?? '').trim();
    }
    catch (e) {
        console.error('[Assistant] Ollama недоступен:', e.message);
        return '';
    }
}
export const getAssistantStatus = async (_req, res) => {
    const enabled = await getSetting('ai_assistant_enabled');
    const ollamaUp = await isOllamaAvailable();
    res.json({
        enabled: enabled === null ? true : enabled === 'true',
        hasKey: ollamaUp,
        provider: ollamaUp ? 'ollama' : 'faq',
    });
};
export const askAssistant = async (req, res) => {
    const userName = req.user?.name || 'Студент';
    const userRole = req.user?.role || 'student';
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
                if (!event.question || event.question.length < 5)
                    continue;
                const eEmb = await getEmbedding(event.question);
                if (cosineSim(qEmb, eEmb) > 0.75) {
                    res.json({ answer: '🔒 Этот вопрос является частью учебного курса. Попробуй найти ответ самостоятельно — это поможет лучше усвоить материал!', blocked: true });
                    return;
                }
            }
        }
    }
    catch (e) {
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
    const chatHistory = history.slice(-6).map((h) => ({ role: h.role, content: h.content }));
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

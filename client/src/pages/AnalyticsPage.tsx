import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../api/axiosInstance';
import { Icons } from '../components/Icons';
import { AppHeader } from '../components/AppHeader';
import '../components/GlobalSearch.css';
import { ExportModal } from '../components/Analytics/ExportModal';
import { AnalyticsDrillDownModal } from '../components/Analytics/AnalyticsDrillDownModal';

import './ProfilePage.css';
import './CoursesPage.css';
import './AnalyticsPage.css';

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

const DEMO_COURSES = [
    { id: -1, title: 'Администрирование Linux-серверов', description: 'Базовые и продвинутые навыки работы с Linux: файловая система, сервисы, сеть, безопасность.' },
    { id: -2, title: 'Основы сетевых технологий', description: 'Протоколы TCP/IP, маршрутизация, коммутация, настройка сетевого оборудования.' },
    { id: -3, title: 'Веб-разработка: React + Node.js', description: 'Полный стек: от компонентов React до REST API на Express и PostgreSQL.' },
];

const DEMO_ANALYTICS: Record<number, any> = {
    [-1]: {
        totalStudents: 34, globalAvgProgress: 78, globalAvgScore: 82,
        studentsProgress: [
            { id: 1,  name: 'Иванов Дмитрий',   email: 'ivanov.d@edu.ru',    progressPercent: 100, avgScore: 94, lastLogin: daysAgo(1) },
            { id: 2,  name: 'Петрова Анна',      email: 'petrova.a@edu.ru',   progressPercent: 100, avgScore: 91, lastLogin: daysAgo(0) },
            { id: 3,  name: 'Сидоров Кирилл',    email: 'sidorov.k@edu.ru',   progressPercent: 96,  avgScore: 88, lastLogin: daysAgo(2) },
            { id: 4,  name: 'Козлова Мария',     email: 'kozlova.m@edu.ru',   progressPercent: 90,  avgScore: 85, lastLogin: daysAgo(3) },
            { id: 5,  name: 'Новиков Артём',     email: 'novikov.a@edu.ru',   progressPercent: 87,  avgScore: 83, lastLogin: daysAgo(4) },
            { id: 6,  name: 'Морозова Елена',    email: 'morozova.e@edu.ru',  progressPercent: 82,  avgScore: 79, lastLogin: daysAgo(5) },
            { id: 7,  name: 'Волков Павел',      email: 'volkov.p@edu.ru',    progressPercent: 75,  avgScore: 76, lastLogin: daysAgo(6) },
            { id: 8,  name: 'Зайцева Ирина',     email: 'zaiceva.i@edu.ru',   progressPercent: 70,  avgScore: 72, lastLogin: daysAgo(8) },
            { id: 9,  name: 'Лебедев Фёдор',     email: 'lebedev.f@edu.ru',   progressPercent: 64,  avgScore: 68, lastLogin: daysAgo(10) },
            { id: 10, name: 'Орлова Наталья',    email: 'orlova.n@edu.ru',    progressPercent: 55,  avgScore: 61, lastLogin: daysAgo(14) },
            { id: 11, name: 'Семёнов Игорь',     email: 'semenov.i@edu.ru',   progressPercent: 25,  avgScore: 54, lastLogin: daysAgo(18) },
            { id: 12, name: 'Захарова Вера',     email: 'zaharova.v@edu.ru',  progressPercent: 15,  avgScore: 42, lastLogin: daysAgo(21) },
        ],
        funnel: [
            { id: 1, realId: 1, type: 'video', title: 'Введение в Linux. Файловая система', startedRate: 100, completionRate: 97 },
            { id: 2, realId: 2, type: 'video', title: 'Управление пользователями и правами', startedRate: 95, completionRate: 91 },
            { id: 3, realId: 1, type: 'test',  title: 'Тест: базовые команды',               startedRate: 90, completionRate: 87 },
            { id: 4, realId: 3, type: 'video', title: 'Сервисы systemd и автозапуск',         startedRate: 85, completionRate: 80 },
            { id: 5, realId: 4, type: 'video', title: 'Настройка сети: IP, маршруты, DNS',    startedRate: 78, completionRate: 72 },
            { id: 6, realId: 2, type: 'test',  title: 'Тест: сеть и сервисы',                 startedRate: 70, completionRate: 65 },
            { id: 7, realId: 5, type: 'video', title: 'SSH, ключи, безопасность сервера',     startedRate: 62, completionRate: 57 },
            { id: 8, realId: 3, type: 'test',  title: 'Итоговый тест',                        startedRate: 55, completionRate: 48 },
        ],
    },
    [-2]: {
        totalStudents: 21, globalAvgProgress: 65, globalAvgScore: 74,
        studentsProgress: [
            { id: 101, name: 'Алексеев Роман',    email: 'alekseev.r@edu.ru',  progressPercent: 100, avgScore: 96, lastLogin: daysAgo(1) },
            { id: 102, name: 'Фёдорова Юлия',     email: 'fedorova.yu@edu.ru', progressPercent: 95,  avgScore: 89, lastLogin: daysAgo(2) },
            { id: 103, name: 'Михайлов Денис',    email: 'mihaylov.d@edu.ru',  progressPercent: 88,  avgScore: 84, lastLogin: daysAgo(4) },
            { id: 104, name: 'Соколова Ксения',   email: 'sokolova.k@edu.ru',  progressPercent: 80,  avgScore: 77, lastLogin: daysAgo(6) },
            { id: 105, name: 'Яковлев Антон',     email: 'yakovlev.a@edu.ru',  progressPercent: 72,  avgScore: 71, lastLogin: daysAgo(9) },
            { id: 106, name: 'Попова Светлана',   email: 'popova.s@edu.ru',    progressPercent: 60,  avgScore: 63, lastLogin: daysAgo(12) },
            { id: 107, name: 'Кузнецов Олег',     email: 'kuznecov.o@edu.ru',  progressPercent: 20,  avgScore: 55, lastLogin: daysAgo(16) },
            { id: 108, name: 'Васильева Надежда',  email: 'vasilieva.n@edu.ru', progressPercent: 10,  avgScore: 40, lastLogin: daysAgo(25) },
        ],
        funnel: [
            { id: 1, realId: 1, type: 'video', title: 'Модель OSI и TCP/IP',       startedRate: 100, completionRate: 95 },
            { id: 2, realId: 2, type: 'video', title: 'IP-адресация и подсети',    startedRate: 93,  completionRate: 87 },
            { id: 3, realId: 1, type: 'test',  title: 'Тест: адресация',           startedRate: 85,  completionRate: 78 },
            { id: 4, realId: 3, type: 'video', title: 'Маршрутизация: OSPF, RIP',  startedRate: 75,  completionRate: 65 },
            { id: 5, realId: 2, type: 'test',  title: 'Итоговый тест',             startedRate: 60,  completionRate: 48 },
        ],
    },
    [-3]: {
        totalStudents: 47, globalAvgProgress: 58, globalAvgScore: 70,
        studentsProgress: [
            { id: 201, name: 'Тихонов Максим',    email: 'tihonov.m@edu.ru',   progressPercent: 100, avgScore: 98, lastLogin: daysAgo(0) },
            { id: 202, name: 'Громова Диана',     email: 'gromova.d@edu.ru',   progressPercent: 100, avgScore: 95, lastLogin: daysAgo(1) },
            { id: 203, name: 'Беляев Сергей',     email: 'belyaev.s@edu.ru',   progressPercent: 93,  avgScore: 90, lastLogin: daysAgo(3) },
            { id: 204, name: 'Никитина Алина',    email: 'nikitina.a@edu.ru',  progressPercent: 86,  avgScore: 85, lastLogin: daysAgo(5) },
            { id: 205, name: 'Виноградов Илья',   email: 'vinogradov.i@edu.ru',progressPercent: 79,  avgScore: 80, lastLogin: daysAgo(7) },
            { id: 206, name: 'Рыбакова Татьяна',  email: 'rybakova.t@edu.ru',  progressPercent: 71,  avgScore: 74, lastLogin: daysAgo(9) },
            { id: 207, name: 'Щербаков Андрей',   email: 'sherbakov.a@edu.ru', progressPercent: 64,  avgScore: 68, lastLogin: daysAgo(11) },
            { id: 208, name: 'Павлова Оксана',    email: 'pavlova.o@edu.ru',   progressPercent: 55,  avgScore: 61, lastLogin: daysAgo(14) },
            { id: 209, name: 'Соловьёв Вадим',    email: 'soloviev.v@edu.ru',  progressPercent: 22,  avgScore: 52, lastLogin: daysAgo(20) },
            { id: 210, name: 'Крылова Людмила',   email: 'krylova.l@edu.ru',   progressPercent: 8,   avgScore: 38, lastLogin: daysAgo(30) },
        ],
        funnel: [
            { id: 1, realId: 1, type: 'video', title: 'Введение в React: компоненты и JSX',     startedRate: 100, completionRate: 96 },
            { id: 2, realId: 2, type: 'video', title: 'Состояние и хуки (useState, useEffect)',  startedRate: 94,  completionRate: 89 },
            { id: 3, realId: 1, type: 'test',  title: 'Тест: основы React',                      startedRate: 87,  completionRate: 81 },
            { id: 4, realId: 3, type: 'video', title: 'REST API на Node.js + Express',            startedRate: 78,  completionRate: 70 },
            { id: 5, realId: 4, type: 'video', title: 'PostgreSQL и Sequelize ORM',               startedRate: 68,  completionRate: 58 },
            { id: 6, realId: 2, type: 'test',  title: 'Тест: бэкенд и БД',                       startedRate: 55,  completionRate: 45 },
            { id: 7, realId: 5, type: 'video', title: 'Аутентификация: JWT + bcrypt',             startedRate: 42,  completionRate: 33 },
            { id: 8, realId: 3, type: 'test',  title: 'Финальный проект',                         startedRate: 30,  completionRate: 22 },
        ],
    },
};

// ── Демо: метаданные контента курсов (для drill-down в демо-режиме) ──────────
const DEMO_COURSE_ITEMS: Record<number, { videos: any[], tests: any[], videoQuestions: Record<number, any[]> }> = {
    [-1]: {
        videos: [
            { id: 1, title: 'Введение в Linux. Файловая система' },
            { id: 2, title: 'Управление пользователями и правами' },
            { id: 3, title: 'Сервисы systemd и автозапуск' },
            { id: 4, title: 'Настройка сети: IP, маршруты, DNS' },
            { id: 5, title: 'SSH, ключи, безопасность сервера' },
        ],
        tests: [
            { id: 1, title: 'Тест: базовые команды', passingScore: 70, questions: [
                { id: 11, text: 'Команда для просмотра содержимого директории?', correctAnswer: 'ls', orderIndex: 0 },
                { id: 12, text: 'Команда для смены прав доступа к файлу?', correctAnswer: 'chmod', orderIndex: 1 },
                { id: 13, text: 'Команда для отображения текущей директории?', correctAnswer: 'pwd', orderIndex: 2 },
                { id: 14, text: 'Команда для копирования файла?', correctAnswer: 'cp', orderIndex: 3 },
                { id: 15, text: 'Команда для удаления директории с содержимым?', correctAnswer: 'rm -rf', orderIndex: 4 },
            ]},
            { id: 2, title: 'Тест: сеть и сервисы', passingScore: 70, questions: [
                { id: 21, text: 'Команда для проверки сетевого соединения?', correctAnswer: 'ping', orderIndex: 0 },
                { id: 22, text: 'Какой порт использует SSH по умолчанию?', correctAnswer: '22', orderIndex: 1 },
                { id: 23, text: 'Утилита управления сервисами в systemd?', correctAnswer: 'systemctl', orderIndex: 2 },
                { id: 24, text: 'Команда для просмотра активных сетевых соединений?', correctAnswer: 'netstat', orderIndex: 3 },
            ]},
            { id: 3, title: 'Итоговый тест', passingScore: 75, questions: [
                { id: 31, text: 'Как называется файл конфигурации SSH-сервера?', correctAnswer: 'sshd_config', orderIndex: 0 },
                { id: 32, text: 'Команда для добавления пользователя в группу?', correctAnswer: 'usermod -aG', orderIndex: 1 },
                { id: 33, text: 'Что означает chmod 755?', correctAnswer: 'rwxr-xr-x', orderIndex: 2 },
                { id: 34, text: 'Команда для проверки использования диска?', correctAnswer: 'df -h', orderIndex: 3 },
                { id: 35, text: 'Как посмотреть хвост лога в реальном времени?', correctAnswer: 'tail -f', orderIndex: 4 },
            ]},
        ],
        videoQuestions: {
            1: [
                { id: 101, question: 'Что такое inode в файловой системе Linux?', type: 'free_text', correctAnswer: 'индексный дескриптор', aiThreshold: 60 },
                { id: 102, question: 'Какая команда показывает дерево директорий?', type: 'single', correctAnswer: 'tree', aiThreshold: 0 },
            ],
            3: [
                { id: 103, question: 'Как называется целевой уровень по умолчанию в systemd?', type: 'free_text', correctAnswer: 'default.target', aiThreshold: 70 },
            ],
            5: [
                { id: 104, question: 'Как сгенерировать пару SSH-ключей?', type: 'free_text', correctAnswer: 'ssh-keygen', aiThreshold: 60 },
                { id: 105, question: 'Где хранятся авторизованные ключи SSH?', type: 'single', correctAnswer: '~/.ssh/authorized_keys', aiThreshold: 0 },
            ],
        },
    },
    [-2]: {
        videos: [
            { id: 1, title: 'Модель OSI и TCP/IP' },
            { id: 2, title: 'IP-адресация и подсети' },
            { id: 3, title: 'Маршрутизация: OSPF, RIP' },
        ],
        tests: [
            { id: 1, title: 'Тест: адресация', passingScore: 70, questions: [
                { id: 11, text: 'Сколько уровней в модели OSI?', correctAnswer: '7', orderIndex: 0 },
                { id: 12, text: 'Маска подсети для /24?', correctAnswer: '255.255.255.0', orderIndex: 1 },
                { id: 13, text: 'Протокол динамической адресации?', correctAnswer: 'DHCP', orderIndex: 2 },
                { id: 14, text: 'Что расшифровывается TCP?', correctAnswer: 'Transmission Control Protocol', orderIndex: 3 },
            ]},
            { id: 2, title: 'Итоговый тест', passingScore: 75, questions: [
                { id: 21, text: 'На каком уровне OSI работает маршрутизатор?', correctAnswer: '3 (сетевой)', orderIndex: 0 },
                { id: 22, text: 'Протокол разрешения IP в MAC-адрес?', correctAnswer: 'ARP', orderIndex: 1 },
                { id: 23, text: 'Алгоритм маршрутизации OSPF основан на?', correctAnswer: 'алгоритм Дейкстры', orderIndex: 2 },
                { id: 24, text: 'Максимальное количество хостов в /25?', correctAnswer: '126', orderIndex: 3 },
            ]},
        ],
        videoQuestions: {
            1: [
                { id: 201, question: 'На каком уровне OSI работает коммутатор?', type: 'single', correctAnswer: '2 (канальный)', aiThreshold: 0 },
            ],
            2: [
                { id: 202, question: 'Как вычислить адрес сети по IP и маске?', type: 'free_text', correctAnswer: 'операция AND', aiThreshold: 60 },
            ],
        },
    },
    [-3]: {
        videos: [
            { id: 1, title: 'Введение в React: компоненты и JSX' },
            { id: 2, title: 'Состояние и хуки (useState, useEffect)' },
            { id: 3, title: 'REST API на Node.js + Express' },
            { id: 4, title: 'PostgreSQL и Sequelize ORM' },
            { id: 5, title: 'Аутентификация: JWT + bcrypt' },
        ],
        tests: [
            { id: 1, title: 'Тест: основы React', passingScore: 70, questions: [
                { id: 11, text: 'Хук для управления состоянием?', correctAnswer: 'useState', orderIndex: 0 },
                { id: 12, text: 'Что такое JSX?', correctAnswer: 'синтаксическое расширение JavaScript', orderIndex: 1 },
                { id: 13, text: 'Хук для выполнения побочных эффектов?', correctAnswer: 'useEffect', orderIndex: 2 },
                { id: 14, text: 'Что передаётся компоненту через props?', correctAnswer: 'данные от родителя', orderIndex: 3 },
            ]},
            { id: 2, title: 'Тест: бэкенд и БД', passingScore: 70, questions: [
                { id: 21, text: 'Какой HTTP-метод используется для создания ресурса?', correctAnswer: 'POST', orderIndex: 0 },
                { id: 22, text: 'Что такое ORM?', correctAnswer: 'Object-Relational Mapping', orderIndex: 1 },
                { id: 23, text: 'Для чего используется bcrypt?', correctAnswer: 'хэширование паролей', orderIndex: 2 },
                { id: 24, text: 'Что такое REST API?', correctAnswer: 'архитектурный стиль для веб-сервисов', orderIndex: 3 },
            ]},
            { id: 3, title: 'Финальный проект', passingScore: 80, questions: [
                { id: 31, text: 'Что такое JWT?', correctAnswer: 'JSON Web Token', orderIndex: 0 },
                { id: 32, text: 'Из каких частей состоит JWT?', correctAnswer: 'header.payload.signature', orderIndex: 1 },
                { id: 33, text: 'Метод Sequelize для поиска одной записи?', correctAnswer: 'findOne', orderIndex: 2 },
                { id: 34, text: 'Статус-код успешного создания ресурса?', correctAnswer: '201', orderIndex: 3 },
                { id: 35, text: 'Middleware для CORS в Express?', correctAnswer: 'cors', orderIndex: 4 },
            ]},
        ],
        videoQuestions: {
            1: [
                { id: 301, question: 'Что такое виртуальный DOM в React?', type: 'free_text', correctAnswer: 'in-memory представление реального DOM', aiThreshold: 60 },
                { id: 302, question: 'Хук для выполнения побочных эффектов?', type: 'single', correctAnswer: 'useEffect', aiThreshold: 0 },
            ],
            3: [
                { id: 303, question: 'Что делает middleware в Express?', type: 'free_text', correctAnswer: 'промежуточная обработка запросов', aiThreshold: 65 },
            ],
            5: [
                { id: 304, question: 'Зачем разделять access и refresh токены?', type: 'free_text', correctAnswer: 'безопасность и управление сессиями', aiThreshold: 60 },
            ],
        },
    },
};

// Детерминированная "случайность" для стабильных демо-данных
const demoVar = (a: number, b: number) => ((a * 37 + b * 13) % 21) - 10;

const getDemoDrilldownData = (config: { id: number, type: string }, courseId: number): any => {
    const demoA = DEMO_ANALYTICS[courseId];
    const items = DEMO_COURSE_ITEMS[courseId];
    if (!demoA || !items) return null;

    // ── СТУДЕНТ ──────────────────────────────────────────────────────
    if (config.type === 'student') {
        const s = demoA.studentsProgress.find((x: any) => x.id === config.id);
        if (!s) return null;
        const [lastName, firstName] = s.name.split(' ');
        const watchedCount = Math.min(Math.round((s.progressPercent / 100) * items.videos.length), items.videos.length);
        const testsDone   = Math.min(Math.round((Math.max(0, s.progressPercent - 20) / 80) * items.tests.length), items.tests.length);

        const videoProgress = items.videos.slice(0, watchedCount).map((v: any) => ({
            id: v.id * 1000 + s.id, videoId: v.id, isWatched: true,
            video: { id: v.id, title: v.title },
        }));

        const testResults = items.tests.slice(0, testsDone).map((t: any, i: number) => {
            const score = Math.max(0, Math.min(100, s.avgScore + demoVar(s.id, t.id)));
            const answers: Record<number, string> = {};
            t.questions.forEach((q: any, qi: number) => {
                answers[q.id] = qi < Math.ceil(t.questions.length * score / 100) ? q.correctAnswer : 'нет ответа';
            });
            return { id: t.id * 10000 + s.id, testId: t.id, score: Math.round(score), answers,
                test: { id: t.id, title: t.title, passingScore: t.passingScore, questions: t.questions } };
        });

        const interactiveAnswers: any[] = [];
        videoProgress.forEach((vp: any) => {
            (items.videoQuestions[vp.videoId] || []).forEach((q: any) => {
                const correct = s.avgScore >= 70;
                interactiveAnswers.push({
                    id: q.id * 1000 + s.id, videoId: vp.videoId,
                    answer: correct ? q.correctAnswer : 'не уверен',
                    isCorrect: correct,
                    similarity: q.type === 'free_text' ? (correct ? 78 : 35) : null,
                    event: { question: q.question, type: q.type, correctAnswer: q.correctAnswer, aiThreshold: q.aiThreshold },
                    video: { title: items.videos.find((v: any) => v.id === vp.videoId)?.title || '' },
                });
            });
        });

        return { student: { id: s.id, firstName, lastName, email: s.email, avatarUrl: null, lastLogin: s.lastLogin },
            videoProgress, testResults, interactiveAnswers };
    }

    // ── ТЕСТ ─────────────────────────────────────────────────────────
    if (config.type === 'test') {
        const test = items.tests.find((t: any) => t.id === config.id);
        if (!test) return null;
        const funnel = demoA.funnel.find((f: any) => f.type === 'test' && f.realId === config.id);
        const passRate = funnel ? funnel.completionRate : 60;
        const respondents = demoA.studentsProgress.slice(0, Math.ceil(demoA.studentsProgress.length * passRate / 100));

        const results = respondents.map((s: any) => {
            const score = Math.max(0, Math.min(100, s.avgScore + demoVar(s.id, test.id)));
            const answers: Record<number, string> = {};
            test.questions.forEach((q: any, qi: number) => {
                answers[q.id] = qi < Math.ceil(test.questions.length * score / 100) ? q.correctAnswer : 'нет ответа';
            });
            const [lastName, firstName] = s.name.split(' ');
            return { id: test.id * 10000 + s.id, testId: test.id, userId: s.id, score: Math.round(score), answers,
                user: { id: s.id, firstName, lastName, email: s.email } };
        });

        const questionAnalytics = test.questions.map((q: any) => ({
            id: q.id, question: q.text,
            correctRate: Math.max(20, Math.min(95, passRate + ((q.id * 7) % 30) - 12)),
        })).sort((a: any, b: any) => a.correctRate - b.correctRate);

        return { item: test, type: 'test', results, questionAnalytics, totalStudents: demoA.totalStudents };
    }

    // ── ВИДЕО ─────────────────────────────────────────────────────────
    if (config.type === 'video') {
        const video = items.videos.find((v: any) => v.id === config.id);
        if (!video) return null;
        const questions = items.videoQuestions[config.id] || [];
        if (questions.length === 0) return { item: video, type: 'video', responses: [], totalStudents: demoA.totalStudents };

        const funnel = demoA.funnel.find((f: any) => f.type === 'video' && f.realId === config.id);
        const rate = funnel ? funnel.completionRate : 50;
        const respondents = demoA.studentsProgress.slice(0, Math.ceil(demoA.studentsProgress.length * rate / 100));

        const responses: any[] = [];
        respondents.forEach((s: any) => {
            const [lastName, firstName] = s.name.split(' ');
            questions.forEach((q: any) => {
                const correct = s.avgScore + demoVar(s.id, q.id) >= 65;
                responses.push({
                    id: q.id * 1000 + s.id, videoId: video.id, userId: s.id,
                    answer: correct ? q.correctAnswer : 'затрудняюсь ответить',
                    isCorrect: correct,
                    similarity: q.type === 'free_text' ? (correct ? 76 : 32) : null,
                    event: { question: q.question, type: q.type, correctAnswer: q.correctAnswer, aiThreshold: q.aiThreshold },
                    user: { id: s.id, firstName, lastName, email: s.email },
                });
            });
        });

        return { item: video, type: 'video', responses, totalStudents: demoA.totalStudents };
    }

    return null;
};

const COURSE_ACCENTS = [
    { from: '#7c3aed', to: '#4f46e5' },
    { from: '#b5179e', to: '#7209b7' },
    { from: '#0891b2', to: '#0e7490' },
    { from: '#059669', to: '#047857' },
    { from: '#d97706', to: '#b45309' },
    { from: '#dc2626', to: '#b91c1c' },
];

const SCORE_GROUPS = [
    { label: '0–20%',   min: 0,  max: 20,  color: '#ff4d4d' },
    { label: '20–40%',  min: 20, max: 40,  color: '#ff8c42' },
    { label: '40–60%',  min: 40, max: 60,  color: '#ffd700' },
    { label: '60–80%',  min: 60, max: 80,  color: '#4dff88' },
    { label: '80–100%', min: 80, max: 101, color: '#7c3aed' },
];

export const AnalyticsPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [isFetchingStats, setIsFetchingStats] = useState(false);
    const [drillDownConfig, setDrillDownConfig] = useState<{ id: number | null, type: 'student' | 'test' | 'video' | null } | null>(null);
    const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: 'gost' | 'detailed' | null}>({ isOpen: false, type: null });
    const [studentSearch, setStudentSearch] = useState('');
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [sortField, setSortField] = useState<'progress' | 'score' | 'activity'>('progress');
    const [showRisk, setShowRisk] = useState(false);

    useEffect(() => { loadTeacherCourses(); }, []);

    const loadTeacherCourses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/videos/my-courses');
            setCourses(res.data);
        } catch {
            showToast('Ошибка загрузки курсов', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleDemo = () => {
        const entering = !isDemoMode;
        setIsDemoMode(entering);
        setSelectedCourse(null);
        setAnalytics(null);
        setStudentSearch('');
        if (entering) showToast('Демо-режим включён — показаны учебные данные', 'info');
    };

    const handleSelectCourse = async (course: any) => {
        if (isDemoMode) {
            setSelectedCourse(course);
            setIsFetchingStats(true);
            setSortField('progress');
            setTimeout(() => { setAnalytics(DEMO_ANALYTICS[course.id]); setIsFetchingStats(false); }, 600);
            return;
        }
        setSelectedCourse(course);
        setIsFetchingStats(true);
        setSortField('progress');
        try {
            const res = await api.get(`/videos/courses/${course.id}/analytics`);
            setAnalytics(res.data);
        } catch {
            showToast('Ошибка загрузки аналитики курса', 'error');
            setSelectedCourse(null);
        } finally {
            setIsFetchingStats(false);
        }
    };

    const handleBackToDashboard = () => { setSelectedCourse(null); setAnalytics(null); };

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '100vh', color: 'var(--primary)', fontSize: '18px' }}><Icons.Spinner size={20}/> Lumeo Intelligence: Загрузка...</div>;
    }

    const displayCourses = isDemoMode ? DEMO_COURSES : courses;

    // ── Вычисляемые данные по аналитике ──────────────────────────────────
    const students: any[] = analytics?.studentsProgress || [];

    const sortedStudents = [...students].sort((a, b) => {
        if (sortField === 'score') return b.avgScore - a.avgScore;
        if (sortField === 'activity') {
            const ta = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
            const tb = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
            return tb - ta;
        }
        return b.progressPercent - a.progressPercent;
    });

    const atRisk = students.filter(s => {
        const days = s.lastLogin ? Math.floor((Date.now() - new Date(s.lastLogin).getTime()) / 86400000) : 999;
        return s.progressPercent < 30 || days > 7;
    });

    const completedCount = students.filter(s => s.progressPercent === 100).length;

    const hardestContent = [...(analytics?.funnel || [])]
        .filter(f => f.startedRate > 0)
        .sort((a, b) => (b.startedRate - b.completionRate) - (a.startedRate - a.completionRate))
        .slice(0, 3);

    const scoreDistribution = SCORE_GROUPS.map(g => ({
        ...g,
        count: students.filter(s => s.avgScore >= g.min && s.avgScore < g.max).length,
    }));
    const maxCount = Math.max(...scoreDistribution.map(g => g.count), 1);

    const filteredStudents = sortedStudents.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const formatLastLogin = (iso?: string) => {
        if (!iso) return 'Не входил';
        const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
        if (days === 0) return 'Сегодня';
        if (days === 1) return 'Вчера';
        return `${days} дн. назад`;
    };

    return (
        <div className="lumeo-layout">
            <AppHeader subtitle="Аналитика">
                <button
                    className="btn btn-ghost"
                    style={{ fontSize: 13, color: isDemoMode ? '#b5179e' : undefined, borderColor: isDemoMode ? 'rgba(181,23,158,0.4)' : undefined, background: isDemoMode ? 'rgba(181,23,158,0.08)' : undefined }}
                    onClick={handleToggleDemo}
                >
                    {isDemoMode ? '✕ Выйти из демо' : '✦ Демо-режим'}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate('/')}>Мои курсы</button>
            </AppHeader>

            {isDemoMode && (
                <div style={{ background: 'rgba(181,23,158,0.12)', borderBottom: '1px solid rgba(181,23,158,0.3)', padding: '8px 24px', fontSize: '13px', color: '#d966d6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✦</span> Демо-режим — отображаются учебные данные для презентации
                </div>
            )}

            <main className="analytics-main">

                {/* ══════════════════════════════════════════════════════════
                    ДАШБОРД: Выбор курса
                ══════════════════════════════════════════════════════════ */}
                {!selectedCourse ? (
                    <div className="fade-in" style={{ width: '100%' }}>

                        {/* Hero */}
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #b5179e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,58,237,0.4)', flexShrink: 0 }}>
                                    <Icons.BarChart2 size={26} />
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: '800' }}>Центр аналитики</h1>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Lumeo Intelligence — глубокий анализ успеваемости</p>
                                </div>
                            </div>
                        </div>

                        {/* Быстрые факты */}
                        {displayCourses.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '36px' }} className="analytics-stats-grid">
                                <div style={{ background: 'var(--bg-card)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Курсов в системе</div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)' }}>{displayCourses.length}</div>
                                </div>
                                <div style={{ background: 'var(--bg-card)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Детализация</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', lineHeight: 1.4 }}>Выберите курс<br/><span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>для глубокой аналитики</span></div>
                                </div>
                                <div style={{ background: 'var(--bg-card)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Доступно</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                                        Рейтинг · Воронка<br/>Зона риска · Экспорт
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Карточки курсов */}
                        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                            Ваши курсы
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {displayCourses.map((course, idx) => {
                                const accent = COURSE_ACCENTS[idx % COURSE_ACCENTS.length];
                                return (
                                    <div
                                        key={course.id}
                                        onClick={() => handleSelectCourse(course)}
                                        style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-color)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = accent.from; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.3)`; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        {/* Цветная шапка */}
                                        <div style={{ height: '6px', background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }} />
                                        <div style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `linear-gradient(135deg, ${accent.from}22, ${accent.to}22)`, border: `1px solid ${accent.from}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent.from, flexShrink: 0 }}>
                                                    <Icons.BarChart2 size={18} />
                                                </div>
                                                <div style={{ fontSize: '12px', color: accent.from, background: `${accent.from}18`, padding: '4px 10px', borderRadius: '20px', border: `1px solid ${accent.from}33`, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    Аналитика →
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.4 }}>{course.title}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {course.description || 'Нет описания'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {!isDemoMode && courses.length === 0 && (
                                <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', padding: '60px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '20px' }}>
                                    <Icons.BarChart2 size={40} /><br/><br/>У вас пока нет курсов для анализа
                                </div>
                            )}
                        </div>
                    </div>

                ) : (
                /* ══════════════════════════════════════════════════════════
                    АНАЛИТИКА КУРСА
                ══════════════════════════════════════════════════════════ */
                    <div className="fade-in" style={{ width: '100%' }}>
                        <button className="btn btn-ghost" onClick={handleBackToDashboard} style={{ marginBottom: '20px', color: 'var(--text-muted)', padding: 0 }}>
                            ← Вернуться к списку курсов
                        </button>

                        <div className="analytics-course-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h1 style={{ margin: '0 0 6px 0', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: '800' }}>{selectedCourse.title}</h1>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Панель управления курсом</p>
                            </div>
                            <div className="analytics-export-btns" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button className="btn btn-secondary" style={{ background: 'rgba(77,255,136,0.05)', color: '#4dff88', borderColor: 'rgba(77,255,136,0.2)', height: '45px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setExportModalConfig({ isOpen: true, type: 'detailed' })}>
                                    <Icons.Download size={15}/> Детальный .xlsx
                                </button>
                                <button className="btn btn-primary" style={{ height: '45px', padding: '0 25px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setExportModalConfig({ isOpen: true, type: 'gost' })}>
                                    <Icons.Printer size={15}/> Ведомость (ГОСТ)
                                </button>
                            </div>
                        </div>

                        {isFetchingStats || !analytics ? (
                            <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Icons.Spinner size={18}/> Сбор данных по курсу...
                            </div>
                        ) : (
                            <>
                                {/* ── 5 ВИДЖЕТОВ ─────────────────────────────────────── */}
                                <div className="analytics-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
                                    {[
                                        { icon: <Icons.Users size={24}/>, label: 'Студентов',      value: analytics.totalStudents,     color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
                                        { icon: <Icons.TrendingUp size={24}/>, label: 'Ср. прогресс', value: `${analytics.globalAvgProgress}%`, color: 'var(--primary)', bg: 'rgba(var(--primary-rgb),0.1)' },
                                        { icon: <Icons.Star size={24}/>, label: 'Ср. балл тестов', value: `${analytics.globalAvgScore}%`,  color: '#4dff88', bg: 'rgba(77,255,136,0.1)' },
                                        { icon: <Icons.Trophy size={24}/>, label: 'Завершили курс', value: completedCount,                color: '#ffd700', bg: 'rgba(255,215,0,0.1)' },
                                        { icon: <Icons.AlertTriangle size={24}/>, label: 'Зона риска', value: atRisk.length,               color: atRisk.length > 0 ? '#ff4d4d' : '#4dff88', bg: atRisk.length > 0 ? 'rgba(255,77,77,0.1)' : 'rgba(77,255,136,0.1)' },
                                    ].map((w, i) => (
                                        <div key={i} style={{ background: 'var(--bg-card)', padding: 'clamp(14px,2vw,22px)', borderRadius: '18px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ background: w.bg, color: w.color, width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{w.icon}</div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{w.label}</div>
                                                <div style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: '800', color: w.color, lineHeight: 1 }}>{w.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── ГРАФИК РАСПРЕДЕЛЕНИЯ БАЛЛОВ (полная ширина) ───── */}
                                <div style={{ background: 'var(--bg-card)', padding: 'clamp(16px,3vw,28px)', borderRadius: '20px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: 'clamp(15px,3vw,20px)', display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.BarChart2 size={18}/> Распределение баллов</h2>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Сколько студентов в каждом диапазоне</div>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{students.length} студентов</div>
                                    </div>
                                    <div className="score-dist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                                        {scoreDistribution.map(g => (
                                            <div key={g.label}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                                                    <span style={{ color: g.color, fontWeight: 600 }}>{g.label}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{g.count}</span>
                                                </div>
                                                <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${(g.count / maxCount) * 100}%`, height: '100%', background: g.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                                </div>
                                                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {students.length > 0 ? Math.round((g.count / students.length) * 100) : 0}% потока
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── BENTO GRID ──────────────────────────────────────── */}
                                <div className="analytics-bento-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '24px', alignItems: 'start' }}>

                                    {/* ЛЕВАЯ КОЛОНКА: РЕЙТИНГ */}
                                    <div style={{ background: 'var(--bg-card)', padding: 'clamp(16px,3vw,28px)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                        <div className="analytics-ranking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                                            <div>
                                                <h2 style={{ fontSize: 'clamp(15px,3vw,20px)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Icons.Trophy size={18}/> Рейтинг потока</h2>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Общая успеваемость студентов</div>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}><Icons.Search size={14}/></span>
                                                <input
                                                    type="text" placeholder="Поиск..."
                                                    value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '9px 14px 9px 36px', borderRadius: '12px', fontSize: '13px', width: 'clamp(130px,22vw,200px)', outline: 'none' }}
                                                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
                                                    onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; }}
                                                />
                                            </div>
                                        </div>

                                        {/* Сортировка */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                            {([['progress', 'Прогресс'], ['score', 'Балл'], ['activity', 'Активность']] as const).map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setSortField(key)}
                                                    style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${sortField === key ? 'var(--primary)' : 'var(--border-color)'}`, background: sortField === key ? 'rgba(var(--primary-rgb),0.12)' : 'transparent', color: sortField === key ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s' }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="analytics-rank-header" style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1.5fr 1fr 28px', padding: '0 12px 10px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                                            <div style={{ textAlign: 'center' }}>Ранг</div>
                                            <div>Студент</div>
                                            <div className="analytics-rank-progress-col">Прогресс</div>
                                            <div style={{ textAlign: 'right' }}>{sortField === 'activity' ? 'Активность' : 'Балл'}</div>
                                            <div/>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                                            {students.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>Нет студентов</div>}
                                            {students.length > 0 && filteredStudents.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>Ничего не найдено</div>}

                                            {filteredStudents.map((student: any) => {
                                                const originalRank = students.findIndex(s => s.id === student.id);
                                                const isTop1 = originalRank === 0;
                                                const rankStyles: Record<number, { bg: string; border: string; color: string }> = {
                                                    0: { bg: 'rgba(255,215,0,0.15)',   border: 'rgba(255,215,0,0.5)',   color: '#FFD700' },
                                                    1: { bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.4)', color: '#C0C0C0' },
                                                    2: { bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.4)',  color: '#CD7F32' },
                                                };
                                                const topStyle = rankStyles[originalRank];
                                                const rankBadge = topStyle
                                                    ? <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: topStyle.bg, border: `1px solid ${topStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: topStyle.color, fontWeight: '800', fontSize: '12px', boxShadow: `0 0 8px ${topStyle.border}` }}>{originalRank + 1}</div>
                                                    : <span style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '13px' }}>{originalRank + 1}</span>;

                                                const isAtRisk = atRisk.some(r => r.id === student.id);

                                                return (
                                                    <div
                                                        key={student.id}
                                                        className={`analytics-rank-row${isTop1 ? ' top1' : ''}`}
                                                        style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1.5fr 1fr 28px', alignItems: 'center', background: isTop1 ? 'linear-gradient(90deg, rgba(255,215,0,0.05) 0%, #161616 100%)' : '#161616', padding: '11px 12px', borderRadius: '12px', border: isTop1 ? '1px solid rgba(255,215,0,0.2)' : isAtRisk ? '1px solid rgba(255,77,77,0.15)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = isTop1 ? 'rgba(255,215,0,0.5)' : '#333'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = isTop1 ? 'linear-gradient(90deg, rgba(255,215,0,0.05) 0%, #161616 100%)' : '#161616'; e.currentTarget.style.borderColor = isTop1 ? 'rgba(255,215,0,0.2)' : isAtRisk ? 'rgba(255,77,77,0.15)' : 'transparent'; }}
                                                        onClick={() => setDrillDownConfig({ id: student.id, type: 'student' })}
                                                    >
                                                        <div style={{ textAlign: 'center' }}>{rankBadge}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isTop1 ? 'linear-gradient(135deg,#FFD700,#FDB931)' : '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: isTop1 ? '#000' : '#fff', flexShrink: 0, fontSize: '13px' }}>
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                                                <div className="rank-name" style={{ fontWeight: '600', color: isTop1 ? '#FFD700' : '#fff', fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{student.name}</div>
                                                                <div style={{ fontSize: '11px', color: isAtRisk ? '#ff4d4d' : 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                                    {isAtRisk ? '⚠ зона риска' : student.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="analytics-rank-progress-col" style={{ paddingRight: '16px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{student.progressPercent}%</span>
                                                            </div>
                                                            <div style={{ width: '100%', height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${student.progressPercent}%`, height: '100%', background: student.progressPercent < 30 ? '#ff4d4d' : 'var(--primary)', borderRadius: '2px' }} />
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', fontSize: '12px' }}>
                                                            {sortField === 'activity'
                                                                ? <span style={{ color: 'var(--text-muted)' }}>{formatLastLogin(student.lastLogin)}</span>
                                                                : <span style={{ color: student.avgScore >= 70 ? '#4dff88' : student.avgScore >= 50 ? '#ffd700' : '#ff4d4d', fontWeight: 'bold' }}>{student.avgScore}%</span>
                                                            }
                                                        </div>
                                                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>›</div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Зона риска — разворачиваемая секция */}
                                        {atRisk.length > 0 && (
                                            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                                <button
                                                    onClick={() => setShowRisk(v => !v)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.25)', color: '#ff4d4d', borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, width: '100%' }}
                                                >
                                                    <Icons.AlertTriangle size={15}/>
                                                    Зона риска — {atRisk.length} студент{atRisk.length > 1 ? 'ов' : ''}
                                                    <span style={{ marginLeft: 'auto', fontSize: '16px' }}>{showRisk ? '▲' : '▼'}</span>
                                                </button>
                                                {showRisk && (
                                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {atRisk.map((s: any) => {
                                                            const days = s.lastLogin ? Math.floor((Date.now() - new Date(s.lastLogin).getTime()) / 86400000) : 999;
                                                            const reasons = [];
                                                            if (s.progressPercent < 30) reasons.push(`прогресс ${s.progressPercent}%`);
                                                            if (days > 7) reasons.push(`не входил ${days} дн.`);
                                                            return (
                                                                <div key={s.id} onClick={() => setDrillDownConfig({ id: s.id, type: 'student' })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.15)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', gap: '8px' }}
                                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,77,77,0.4)'}
                                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,77,77,0.15)'}
                                                                >
                                                                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                                                    <div style={{ fontSize: '11px', color: '#ff4d4d', flexShrink: 0 }}>{reasons.join(' · ')}</div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* ПРАВАЯ КОЛОНКА */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                        {/* Трудный контент */}
                                        {hardestContent.length > 0 && (
                                            <div style={{ background: 'var(--bg-card)', padding: 'clamp(16px,3vw,24px)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                                <h2 style={{ fontSize: 'clamp(14px,3vw,18px)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.AlertTriangle size={17}/> Трудный контент</h2>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>Наибольший отсев студентов</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {hardestContent.map((item: any, i: number) => {
                                                        const dropoff = item.startedRate - item.completionRate;
                                                        const severity = dropoff >= 20 ? '#ff4d4d' : dropoff >= 10 ? '#ffd700' : '#ff8c42';
                                                        return (
                                                            <div key={item.id} onClick={() => setDrillDownConfig({ id: item.realId, type: item.type })}
                                                                style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', border: `1px solid ${severity}22`, transition: 'all 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.borderColor = severity}
                                                                onMouseLeave={e => e.currentTarget.style.borderColor = `${severity}22`}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                                                    <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.3 }}>
                                                                        <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>{i + 1}.</span>
                                                                        {item.type === 'video' ? <Icons.Monitor size={12}/> : <Icons.FileText size={12}/>}
                                                                        {' '}{item.title}
                                                                    </div>
                                                                    <div style={{ color: severity, fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>−{dropoff}%</div>
                                                                </div>
                                                                <div style={{ height: '5px', background: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${item.completionRate}%`, height: '100%', background: severity, borderRadius: '3px' }} />
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                                                                    <span>Начали: {item.startedRate}%</span>
                                                                    <span>Завершили: {item.completionRate}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Воронка отсева */}
                                        <div style={{ background: 'var(--bg-card)', padding: 'clamp(16px,3vw,24px)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                            <h2 style={{ fontSize: 'clamp(14px,3vw,18px)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Icons.Activity size={17}/> Воронка отсева</h2>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>Начали / Завершили по материалам</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                                                {analytics.funnel?.length > 0 ? analytics.funnel.map((item: any, index: number) => (
                                                    <div key={item.id}
                                                        style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                                        onClick={() => setDrillDownConfig({ id: item.realId, type: item.type })}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', alignItems: 'flex-start' }}>
                                                            <div style={{ color: 'var(--text-main)', fontWeight: '500', paddingRight: '8px', lineHeight: 1.4 }}>
                                                                {item.type === 'video' ? <Icons.Monitor size={11}/> : <Icons.FileText size={11}/>} {index + 1}. {item.title}
                                                            </div>
                                                            <div style={{ flexShrink: 0 }}>
                                                                <strong style={{ color: item.completionRate < 30 ? '#ff4d4d' : '#fff', fontSize: '13px' }}>{item.completionRate}%</strong>
                                                                <span style={{ color: 'var(--text-muted)' }}> / {item.startedRate}%</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ height: '5px', background: 'var(--bg-card)', borderRadius: '3px', position: 'relative' }}>
                                                            <div style={{ width: `${item.startedRate}%`, height: '100%', background: 'rgba(255,255,255,0.08)', position: 'absolute', left: 0, top: 0, borderRadius: '3px' }} />
                                                            <div style={{ width: `${item.completionRate}%`, height: '100%', background: item.type === 'video' ? 'var(--primary)' : '#b5179e', position: 'absolute', left: 0, top: 0, borderRadius: '3px', zIndex: 2 }} />
                                                        </div>
                                                    </div>
                                                )) : <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Нет материалов</div>}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            <AnalyticsDrillDownModal
                config={drillDownConfig}
                courseId={selectedCourse?.id}
                onClose={() => setDrillDownConfig(null)}
                isDemoMode={isDemoMode}
                demoResolver={(cfg) => getDemoDrilldownData(cfg, selectedCourse?.id)}
            />
            <ExportModal
                isOpen={exportModalConfig.isOpen}
                onClose={() => setExportModalConfig({ isOpen: false, type: null })}
                course={selectedCourse}
                analytics={analytics}
                exportType={exportModalConfig.type}
            />
        </div>
    );
};

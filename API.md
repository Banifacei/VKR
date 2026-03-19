# Lumeo — API Documentation

Базовый URL: `/api`

Все защищённые эндпоинты требуют заголовок:
```
Authorization: Bearer <JWT-токен>
```

---

## Содержание

- [Аутентификация](#аутентификация-apiauthentication)
- [Видео и курсы](#видео-и-курсы-apivideos)
- [Тесты](#тесты-apitests)
- [Пользователи](#пользователи-apiusers)
- [Администрирование](#администрирование-apiadmin)
- [SSE-стримы](#sse-стримы)
- [Коды ошибок](#коды-ошибок)

---

## Аутентификация `/api/auth`

### `GET /api/auth/settings`
Получить публичные настройки аутентификации (какие методы включены).

**Ответ `200`:**
```json
{
  "ldapEnabled": true,
  "yandexEnabled": false,
  "googleEnabled": true,
  "samlEnabled": false,
  "registrationApproval": false
}
```

---

### `POST /api/auth/register`
Зарегистрировать нового пользователя.
Rate limit: 20 запросов / 15 мин с одного IP.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "минимум8символов",
  "firstName": "Иван",
  "lastName": "Иванов",
  "middleName": "Иванович"
}
```

**Ответ `201`:**
```json
{
  "token": "<JWT>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "Иван",
    "lastName": "Иванов",
    "role": "student",
    "status": "active"
  }
}
```

> Если включён режим `registrationApproval`, статус будет `"pending"` и токен не возвращается.

---

### `POST /api/auth/login`
Войти по email/паролю или через LDAP.
Rate limit: 20 запросов / 15 мин с одного IP.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "пароль"
}
```

**Ответ `200`:**
```json
{
  "token": "<JWT>",
  "user": { "id": 1, "email": "...", "role": "student", "status": "active" }
}
```

---

### `GET /api/auth/me`
Получить профиль текущего пользователя. 🔒 Требует авторизацию.

**Ответ `200`:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "middleName": "Иванович",
  "role": "student",
  "status": "active",
  "phone": "+79991234567",
  "avatarUrl": "/uploads/avatars/1.jpg",
  "themeConfig": { "mode": "dark", "density": "default" }
}
```

---

### `PUT /api/auth/update`
Обновить профиль (имя, телефон, аватар, тему). 🔒 Требует авторизацию.

**Тело запроса (multipart/form-data):**
| Поле | Тип | Описание |
|---|---|---|
| `firstName` | string | Имя |
| `lastName` | string | Фамилия |
| `middleName` | string | Отчество |
| `phone` | string | Телефон |
| `themeConfig` | JSON string | Настройки темы |
| `avatar` | file | Изображение ≤ 5 МБ |

---

### OAuth

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/api/auth/yandex` | Редирект на Яндекс ID |
| `GET` | `/api/auth/yandex/callback` | Callback от Яндекса |
| `GET` | `/api/auth/google` | Редирект на Google OAuth |
| `GET` | `/api/auth/google/callback` | Callback от Google |
| `GET` | `/api/auth/saml` | Инициировать SAML SSO |
| `POST` | `/api/auth/saml/callback` | Callback от IdP (SAML) |

---

## Видео и курсы `/api/videos`

### Курсы

#### `GET /api/videos/courses`
Получить список всех курсов.

**Ответ `200`:** массив объектов `Course`
```json
[
  {
    "id": 1,
    "title": "Введение в Python",
    "description": "Курс для начинающих",
    "enrollmentType": "open",
    "ownerId": 2,
    "isPublished": true
  }
]
```

---

#### `POST /api/videos/courses`
Создать новый курс. 🔒 Требует авторизацию (teacher / admin).

**Тело запроса:**
```json
{
  "title": "Название курса",
  "description": "Описание",
  "enrollmentType": "open | request | closed"
}
```

---

#### `PUT /api/videos/courses/:courseId`
Обновить курс. 🔒 Требует авторизацию (владелец / соавтор / admin).

---

#### `DELETE /api/videos/courses/:courseId`
Удалить курс и все связанные данные. 🔒 Требует авторизацию (владелец / admin).

---

#### `GET /api/videos/courses/:courseId/videos`
Получить видео и тесты курса.

**Ответ `200`:**
```json
{
  "videos": [ { "id": 1, "title": "Урок 1", "url": "/uploads/...", "orderIndex": 0 } ],
  "tests": [ { "id": 1, "title": "Итоговый тест", "orderIndex": 1 } ]
}
```

---

#### `POST /api/videos/course/:courseId/reorder`
Изменить порядок элементов (видео + тесты) в курсе. 🔒

**Тело:**
```json
{
  "items": [
    { "type": "video", "id": 1, "orderIndex": 0 },
    { "type": "test",  "id": 2, "orderIndex": 1 }
  ]
}
```

---

### Зачисление

#### `POST /api/videos/courses/:courseId/enroll`
Записаться на курс (или подать заявку). 🔒

#### `GET /api/videos/courses/:courseId/enrollment-status`
Проверить статус зачисления текущего пользователя. 🔒

**Ответ:** `{ "status": "active | pending | rejected | none" }`

#### `GET /api/videos/courses/:courseId/enrollments`
Список заявок на курс. 🔒 (владелец / соавтор / admin)

#### `PUT /api/videos/courses/enrollments/:enrollmentId`
Обновить статус заявки. 🔒 (владелец / соавтор / admin)

**Тело:** `{ "status": "active | rejected" }`

---

### Соавторы

#### `GET /api/videos/courses/:courseId/collaborators`
Получить список соавторов курса. 🔒

#### `POST /api/videos/courses/:courseId/collaborators`
Добавить соавтора. 🔒 (владелец / admin)

**Тело:** `{ "userId": 5, "role": "editor | viewer" }`

#### `DELETE /api/videos/courses/:courseId/collaborators/:userId`
Удалить соавтора. 🔒 (владелец / admin)

#### `PUT /api/videos/courses/:courseId/transfer`
Передать владение курсом другому преподавателю. 🔒 (владелец)

**Тело:** `{ "newOwnerId": 7 }`

---

### Аналитика

#### `GET /api/videos/courses/:courseId/analytics`
Общая аналитика курса. 🔒 (владелец / соавтор / admin)

**Ответ:** список студентов с процентом прохождения и баллами.

#### `GET /api/videos/courses/:courseId/analytics/student/:studentId`
Детали прогресса конкретного студента. 🔒

#### `GET /api/videos/courses/:courseId/analytics/item/:itemType/:itemId`
Аналитика по конкретному видео или тесту. 🔒

`itemType`: `video` | `test`

---

### Видео

#### `POST /api/videos`
Загрузить видео в курс.

**Запрос (multipart/form-data):**
| Поле | Описание |
|---|---|
| `video` | Файл видео (≤ 500 МБ) |
| `title` | Название видео |
| `courseId` | ID курса |
| `subtitles` | Файл субтитров `.vtt` (опционально) |

#### `PATCH /api/videos/:videoId`
Обновить настройки видео. 🔒

**Тело:**
```json
{
  "title": "Новое название",
  "maxAttempts": 3,
  "passingScore": 70,
  "isHidden": false,
  "unlockDate": "2025-09-01T00:00:00Z"
}
```

#### `DELETE /api/videos/:videoId`
Удалить видео и связанные файлы. 🔒

#### `PUT /api/videos/reorder`
Изменить порядок видео внутри курса. 🔒

**Тело:** `{ "videoIds": [3, 1, 2] }`

---

### Субтитры

#### `POST /api/videos/:videoId/autocaptions`
Запустить автоматическую генерацию субтитров (Whisper AI). 🔒

Ответ приходит немедленно (`202 Accepted`); результат доставляется через SSE-стрим.

---

### Интерактивные события (вопросы в видео)

#### `POST /api/videos/:videoId/events`
Добавить интерактивный вопрос к видео.

**Тело:**
```json
{
  "timestamp": 42.5,
  "type": "single | multiple | text",
  "question": "Что такое инкапсуляция?",
  "options": ["Скрытие данных", "Наследование", "Полиморфизм"],
  "correctAnswer": "Скрытие данных",
  "points": 10
}
```

#### `PUT /api/videos/events/:eventId`
Обновить интерактивный вопрос.

#### `DELETE /api/videos/events/:eventId`
Удалить интерактивный вопрос.

---

### Прогресс и ответы

#### `POST /api/videos/progress`
Сохранить ответы на интерактивные вопросы видео. 🔒

**Тело:**
```json
{
  "videoId": 1,
  "eventId": 3,
  "answer": "Скрытие данных"
}
```

#### `DELETE /api/videos/:videoId/progress`
Сбросить прогресс по видео. 🔒

#### `GET /api/videos/progress/:videoId/:userId`
Получить все ответы пользователя на вопросы видео. 🔒

#### `GET /api/videos/:videoId/stats`
Статистика просмотров и ответов по видео.

#### `GET /api/videos/:videoId/playback-progress`
Получить сохранённую позицию воспроизведения. 🔒

**Ответ:** `{ "currentTime": 125.4 }`

#### `POST /api/videos/playback-progress`
Сохранить текущую позицию воспроизведения. 🔒

**Тело:** `{ "videoId": 1, "currentTime": 125.4 }`

---

### Прочее

#### `POST /api/videos/courses/:courseId/generate-demo`
Сгенерировать демо-данные для курса. 🔒 (admin)

---

## Тесты `/api/tests`

#### `GET /api/tests/courses/:courseId`
Получить все тесты курса. 🔒

#### `POST /api/tests/courses/:courseId`
Создать тест в курсе. 🔒

**Тело:**
```json
{
  "title": "Итоговый тест",
  "maxAttempts": 2,
  "passingScore": 60,
  "isHidden": false,
  "unlockDate": null
}
```

#### `PUT /api/tests/:testId`
Обновить настройки теста. 🔒

#### `DELETE /api/tests/:testId`
Удалить тест. 🔒

#### `GET /api/tests/:testId/stats`
Статистика по тесту (попытки, средний балл). 🔒

---

### Вопросы теста

#### `POST /api/tests/:testId/questions`
Добавить вопрос в тест. 🔒

**Тело:**
```json
{
  "question": "Текст вопроса",
  "type": "single | multiple | text",
  "options": ["А", "Б", "В"],
  "correctAnswer": "А",
  "points": 5
}
```

#### `DELETE /api/tests/questions/:questionId`
Удалить вопрос. 🔒

#### `POST /api/tests/:testId/questions/reorder`
Изменить порядок вопросов. 🔒

**Тело:** `{ "questionIds": [3, 1, 2] }`

---

### Прохождение теста

#### `POST /api/tests/:testId/submit`
Отправить ответы и получить результат. 🔒

**Тело:**
```json
{
  "answers": [
    { "questionId": 1, "answer": "А" },
    { "questionId": 2, "answer": ["Б", "В"] }
  ]
}
```

**Ответ `200`:**
```json
{
  "score": 80,
  "passed": true,
  "correctCount": 4,
  "totalCount": 5,
  "attemptsLeft": 1
}
```

#### `GET /api/tests/courses/:courseId/progress`
Прогресс текущего пользователя по всем тестам курса. 🔒

---

## Пользователи `/api/users`

#### `GET /api/users/stats`
Общая статистика (кол-во пользователей, ролей). 🔒

#### `GET /api/users/search?q=Иван`
Поиск пользователей по имени / email. 🔒

#### `GET /api/users/available`
Список пользователей, доступных для добавления в соавторы. 🔒

---

### Управление пользователями (только admin)

#### `GET /api/users`
Список всех пользователей. 🔒🔑

#### `POST /api/users`
Создать пользователя вручную. 🔒🔑

**Тело:** `{ "email", "password", "firstName", "lastName", "role" }`

#### `PUT /api/users/:id`
Редактировать пользователя. 🔒🔑

#### `PUT /api/users/:id/role`
Изменить роль пользователя. 🔒🔑

**Тело:** `{ "role": "student | teacher | admin" }`

#### `DELETE /api/users/:id`
Удалить пользователя. 🔒🔑

---

### Заявки на регистрацию (только admin)

#### `GET /api/users/pending`
Список пользователей со статусом `pending`. 🔒🔑

#### `POST /api/users/:id/approve`
Одобрить заявку. 🔒🔑

#### `POST /api/users/:id/reject`
Отклонить заявку. 🔒🔑

---

### Импорт / Экспорт

#### `GET /api/users/export`
Скачать список пользователей в формате `.xlsx`. 🔒🔑

#### `GET /api/users/template`
Скачать шаблон Excel для импорта. 🔒🔑

#### `POST /api/users/import`
Импортировать пользователей из Excel-файла. 🔒🔑

**Запрос (multipart/form-data):** поле `file` — `.xlsx`-файл.

---

## Администрирование `/api/admin`

Все эндпоинты требуют авторизацию с ролью `admin`. 🔒🔑

#### `GET /api/admin/storage`
Статистика файлового хранилища (видео, аватары, субтитры, кэш).

**Ответ:**
```json
{
  "total": "4.2 GB",
  "videos": "3.8 GB",
  "avatars": "120 MB",
  "cache": "980 MB"
}
```

#### `GET /api/admin/server-stats`
Текущее состояние сервера.

**Ответ:**
```json
{
  "cpu": 12.4,
  "ram": { "used": 1.2, "total": 8.0 },
  "disk": { "used": 42.0, "total": 100.0 },
  "uptime": 86400,
  "activeSessions": 5
}
```

#### `GET /api/admin/logs`
Последние 100 системных событий.

#### `POST /api/admin/clear-cache`
Очистить кэш ИИ-модели (Xenova/Whisper).

#### `POST /api/admin/backup-db`
Создать резервную копию базы данных.

#### `POST /api/admin/restart`
Перезапустить сервер.

---

### Системные настройки

#### `GET /api/admin/settings`
Получить текущие системные настройки (LDAP, OAuth, регистрация, брендинг).

#### `POST /api/admin/settings/toggle`
Включить / выключить функцию или обновить параметр.

**Тело:**
```json
{
  "key": "ldapEnabled | yandexEnabled | googleEnabled | registrationApproval | ...",
  "value": true
}
```

---

## SSE-стримы

Server-Sent Events — однонаправленный канал данных от сервера к клиенту.

Подключение: обычный `GET`-запрос с заголовком `Accept: text/event-stream`.

| Эндпоинт | Авторизация | Событие | Описание |
|---|---|---|---|
| `GET /api/videos/:videoId/events/stream` | Нет | `event-update` | Изменение списка вопросов видео |
| `GET /api/videos/enrollment/stream` | 🔒 | `enrollment-update` | Изменение статуса заявки студента |
| `GET /api/videos/courses/:courseId/enrollment/stream` | 🔒 | `new-enrollment` | Новая заявка на курс (для преподавателя) |
| `GET /api/videos/courses/:courseId/processing/stream` | 🔒 | `subtitles-ready` | Субтитры сгенерированы |
| `GET /api/users/admin/stream` | 🔒🔑 | `new-user` | Новая заявка на регистрацию (для admin) |

**Пример клиентского кода:**
```js
const es = new EventSource('/api/videos/enrollment/stream', {
  headers: { Authorization: `Bearer ${token}` }
});
es.addEventListener('enrollment-update', (e) => {
  const data = JSON.parse(e.data);
  console.log(data.status); // "active" | "rejected"
});
```

---

## Коды ошибок

| HTTP-код | Значение |
|---|---|
| `400` | Неверные параметры запроса |
| `401` | Нет или невалидный JWT-токен |
| `403` | Недостаточно прав (роль или доступ к курсу) |
| `404` | Ресурс не найден |
| `409` | Конфликт (например, пользователь уже существует) |
| `429` | Превышен лимит запросов (rate limit) |
| `500` | Внутренняя ошибка сервера |

Формат ошибки:
```json
{ "message": "Описание ошибки на русском" }
```

---

## Обозначения

| Значок | Значение |
|---|---|
| 🔒 | Требует JWT (`Authorization: Bearer <token>`) |
| 🔑 | Только для роли `admin` |

import api from '../api/axiosInstance';

/**
 * Получает краткосрочный SSE-тикет (UUID, TTL 5 мин).
 * Используется вместо передачи полного JWT в query-параметре URL,
 * чтобы токен не попадал в логи прокси/сервера и browser history.
 * Fallback: если запрос не удался, возвращает null — тогда клиент
 * должен использовать старый механизм ?token= (legacy).
 */
export const getSseTicket = async (): Promise<string | null> => {
    try {
        const res = await api.post<{ ticket: string }>('/auth/sse-ticket');
        return res.data.ticket;
    } catch {
        return null;
    }
};

/** Строит query-строку для SSE-соединения: предпочитает тикет, fallback на token. */
export const sseQuery = async (): Promise<string> => {
    const ticket = await getSseTicket();
    if (ticket) return `ticket=${ticket}`;
    const token = localStorage.getItem('lumeo_token');
    return token ? `token=${token}` : '';
};

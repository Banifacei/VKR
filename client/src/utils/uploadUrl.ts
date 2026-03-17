/**
 * Нормализует URL файла из uploads.
 * Старые записи в БД могут содержать абсолютный URL вида http://host/uploads/...
 * Новые — относительный /uploads/...
 * Оба варианта приводятся к относительному пути.
 */
export function normalizeUploadUrl(url: string | undefined | null): string {
    if (!url) return '';
    const match = url.match(/(\/uploads\/.+)/);
    return match ? match[1] : url;
}

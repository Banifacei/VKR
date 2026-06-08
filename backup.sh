#!/bin/bash
# =============================================================================
# Lumeo — резервное копирование PostgreSQL
# Использование: ./backup.sh [директория]
# По умолчанию: ./backups/
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${1:-$SCRIPT_DIR/backups}"
KEEP_LAST=7   # сколько резервных копий хранить

# Загружаем переменные окружения
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a; source "$SCRIPT_DIR/.env"; set +a
fi

DB_NAME="${DB_NAME:-lumeo}"
DB_USER="${DB_USER:-lumeo}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/lumeo_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "📦 Lumeo Backup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "   БД:   $DB_NAME @ $DB_HOST:$DB_PORT"
echo "   Файл: $BACKUP_FILE"
echo ""

# Определяем как запустить pg_dump
if docker compose ps --services 2>/dev/null | grep -q postgres; then
    # Через docker compose
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
        pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
elif command -v pg_dump &>/dev/null; then
    # Локальная установка
    PGPASSWORD="${DB_PASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" \
        -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    echo "❌ Не найден pg_dump и docker compose. Установите postgresql-client."
    exit 1
fi

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅ Резервная копия создана ($SIZE)"
echo ""

# Ротация: удаляем старые копии
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/lumeo_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$KEEP_LAST" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - KEEP_LAST))
    echo "🗑  Удаляю $DELETE_COUNT старых копий (оставляю $KEEP_LAST)..."
    ls -1t "$BACKUP_DIR"/lumeo_*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
fi

echo "📂 Всего копий в $BACKUP_DIR: $(ls -1 "$BACKUP_DIR"/lumeo_*.sql.gz 2>/dev/null | wc -l)"
echo "   Последняя: $(basename "$BACKUP_FILE")"

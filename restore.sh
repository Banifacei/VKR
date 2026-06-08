#!/bin/bash
# =============================================================================
# Lumeo — восстановление из резервной копии PostgreSQL
# Использование: ./restore.sh <файл.sql.gz>
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "${1:-}" ]; then
    # Без аргументов — показываем список доступных копий
    BACKUP_DIR="$SCRIPT_DIR/backups"
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.sql.gz 2>/dev/null)" ]; then
        echo "❌ Нет резервных копий в $BACKUP_DIR"
        echo "   Сначала выполните: ./backup.sh"
        exit 1
    fi
    echo "📂 Доступные резервные копии:"
    ls -lh "$BACKUP_DIR"/*.sql.gz | awk '{print "  " $NF, "(" $5 ")"}'
    echo ""
    echo "Использование: ./restore.sh <файл.sql.gz>"
    exit 0
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл не найден: $BACKUP_FILE"
    exit 1
fi

# Загружаем переменные окружения
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a; source "$SCRIPT_DIR/.env"; set +a
fi

DB_NAME="${DB_NAME:-lumeo}"
DB_USER="${DB_USER:-lumeo}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "⚠️  Восстановление Lumeo из резервной копии"
echo "   Файл: $(basename "$BACKUP_FILE")"
echo "   БД:   $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""
echo "ВНИМАНИЕ: все текущие данные будут ПЕРЕЗАПИСАНЫ!"
read -r -p "Продолжить? [y/N] " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
    echo "Отменено."
    exit 0
fi

echo ""
echo "🔄 Восстановление..."

if docker compose ps --services 2>/dev/null | grep -q postgres; then
    # Через docker compose
    gunzip -c "$BACKUP_FILE" | docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
        psql -U "$DB_USER" "$DB_NAME"
elif command -v psql &>/dev/null; then
    PGPASSWORD="${DB_PASSWORD:-}" gunzip -c "$BACKUP_FILE" | \
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
else
    echo "❌ Не найден psql и docker compose."
    exit 1
fi

echo ""
echo "✅ Восстановление завершено!"
echo "   Перезапустите сервер: docker compose restart server"

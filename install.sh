#!/bin/bash
set -e

OWNER="${LUMEO_OWNER:-banifacei}"
TAG="${LUMEO_TAG:-latest}"
WORKSPACE="${LUMEO_WORKSPACE:-/opt/lumeo}"
PORT="${LUMEO_PORT:-3333}"

echo ""
echo "  ██╗     ██╗   ██╗███╗   ███╗███████╗ ██████╗"
echo "  ██║     ██║   ██║████╗ ████║██╔════╝██╔═══██╗"
echo "  ██║     ██║   ██║██╔████╔██║█████╗  ██║   ██║"
echo "  ██║     ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║"
echo "  ███████╗╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝"
echo "  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝"
echo ""
echo "  LumeoLoadpad — Установщик Lumeo LMS"
echo ""

# Проверяем Docker
if ! command -v docker &>/dev/null; then
  echo "❌ Docker не найден. Установите Docker: https://docs.docker.com/engine/install/"
  exit 1
fi

# Создаём рабочую директорию
mkdir -p "$WORKSPACE"
echo "📁 Рабочая директория: $WORKSPACE"

# Если Lumeo уже установлен — запускаем в режиме updater
if [ -f "$WORKSPACE/.lumeo_installed" ]; then
  echo "✅ Lumeo уже установлен. Запускаю updater..."
fi

# Останавливаем старый installer если запущен
docker rm -f lumeo-installer 2>/dev/null || true

# Запускаем installer
echo "📦 Запускаем LumeoLoadpad..."
docker pull "ghcr.io/${OWNER}/lumeo-installer:${TAG}"

docker run -d \
  --name lumeo-installer \
  --restart unless-stopped \
  -p "${PORT}:3333" \
  -v "${WORKSPACE}:/workspace" \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -e "GITHUB_OWNER=${OWNER}" \
  -e "IMAGE_TAG=${TAG}" \
  -e "WORKSPACE=/workspace" \
  "ghcr.io/${OWNER}/lumeo-installer:${TAG}"

echo ""
echo "✅ LumeoLoadpad запущен!"
echo ""
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
SERVER_IP=${SERVER_IP:-$(ipconfig getifaddr en0 2>/dev/null)}
SERVER_IP=${SERVER_IP:-localhost}
echo "  👉 Откройте в браузере: http://${SERVER_IP}:${PORT}"
echo ""
echo "  После завершения установки Lumeo будет доступен на порту который вы указали."
echo "  Этот установщик продолжит работать для обновлений (управление в /adminpanel)."
echo ""

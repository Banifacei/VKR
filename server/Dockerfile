# =============================================================================
# Lumeo Backend
# =============================================================================
FROM node:20-slim

WORKDIR /app

# Устанавливаем зависимости отдельно (кэш Docker слоёв)
COPY package*.json ./
RUN npm ci

# Копируем исходники
COPY . .

# Папка для загрузок (перезаписывается volume из docker-compose)
RUN mkdir -p uploads/avatars

EXPOSE 5001

CMD ["npx", "tsx", "index.ts"]

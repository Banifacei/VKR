# =============================================================================
# Lumeo Backend
# =============================================================================
FROM node:20-slim

WORKDIR /app

# Копируем зависимости и исходники
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .

# Папка для загрузок (перезаписывается volume из docker-compose)
RUN mkdir -p uploads/avatars

EXPOSE 5001

CMD ["npx", "tsx", "index.ts"]

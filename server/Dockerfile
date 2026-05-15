# =============================================================================
# Lumeo Backend
# =============================================================================
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p uploads/avatars

EXPOSE 5001

CMD ["npx", "tsx", "index.ts"]

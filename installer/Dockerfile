FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# /workspace монтируется с хоста: туда пишем .env и docker-compose.yml
VOLUME ["/workspace"]

EXPOSE 3333

CMD ["node", "index.js"]

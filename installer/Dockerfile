FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# /workspace монтируется с хоста: туда пишем .env и docker-compose.yml
VOLUME ["/workspace"]

EXPOSE 3333

CMD ["node", "index.js"]

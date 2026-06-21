# =============================================================================
# Lumeo Backend
# =============================================================================
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip \
    && pip3 install --no-cache-dir oletools --break-system-packages \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p uploads/avatars uploads/homework scripts

EXPOSE 5001

CMD ["npx", "tsx", "index.ts"]

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev || npm install --omit=dev

COPY server.js ./

RUN mkdir -p /data/uploads

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "server.js"]

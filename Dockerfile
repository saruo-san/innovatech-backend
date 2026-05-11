FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production
COPY . .
RUN npm prune --production || true

FROM node:18-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app .
USER appuser
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]

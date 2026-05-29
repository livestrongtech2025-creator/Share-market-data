FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && \
    cp -R node_modules /app/node_modules_prod && \
    npm ci

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules_prod ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY scripts/ ./scripts/

RUN mkdir -p /app/logs && chown nestjs:nodejs /app/logs

USER nestjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main.js"]

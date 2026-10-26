# Multi-stage production container for Amrutam Telemedicine Backend
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Run as non-root user for healthcare security compliance
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./src/database/migrations

USER nodejs

EXPOSE 4000

CMD ["node", "dist/server.js"]

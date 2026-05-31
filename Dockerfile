# Forge Studio — Production Dockerfile
# Multi-stage build: builder → production
# Usage: docker build -t forge-studio .

# ─── Build Stage ─────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ─── Production Stage ────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache dumb-init curl

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts — Vite outputs to dist/public/, esbuild to dist/index.js
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations and schema for runtime migration
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Copy scripts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/ecosystem.production.cjs ./
COPY --from=builder /app/ecosystem.services.cjs ./
COPY --from=builder /app/services.conf ./

# Create non-root user
RUN addgroup -g 1001 -S forge && adduser -S forge -u 1001 -G forge
RUN chown -R forge:forge /app
USER forge

EXPOSE 5051

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5051/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

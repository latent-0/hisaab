# Hisaab — container image for Google Cloud Run.
#
# Runs with zero external services using the SQLite + mock/sandbox defaults
# (data is ephemeral on Cloud Run — resets on cold start). For real production,
# point DATABASE_URL at Cloud SQL Postgres (see README) and set HISAAB_SEED=false.

FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# OpenSSL is required by the Prisma query engine.
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# ---- deps: install all dependencies (incl. dev, for prisma CLI + tsx) ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: generate client + build the app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:./prisma/build.db"
RUN npx prisma generate && npm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL="file:/app/prisma/hisaab.db"
ENV LLM_PROVIDER=mock
ENV VOICE_PROVIDER=mock
ENV OCR_PROVIDER=mock
ENV HISAAB_SEED=true

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 8080
CMD ["./docker-entrypoint.sh"]

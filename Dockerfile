# OnerLab в контейнере — запасной вариант на случай, если Vercel или Neon
# недоступны. Как запускать и восстанавливать данные — BACKUP.md.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
# openssl — движку Prisma, ca-certificates — исходящим HTTPS-запросам (капча).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# Этот же этап запускает миграции (сервис migrate в compose.yaml): в нём есть
# Prisma CLI и папка prisma/.
FROM deps AS build
COPY . .
# Адрес сайта попадает в канонические ссылки, sitemap и robots.txt ещё при
# сборке. DATABASE_URL сборке нужен только по формату — к базе она не ходит.
ARG SITE_URL=https://onerlab.kz
ARG NEXT_PUBLIC_CAPTCHA_SITE_KEY=""
ENV NEXT_PUBLIC_SITE_URL=$SITE_URL \
    NEXT_PUBLIC_CAPTCHA_SITE_KEY=$NEXT_PUBLIC_CAPTCHA_SITE_KEY \
    NEXT_OUTPUT=standalone \
    DATABASE_URL=postgresql://build:build@127.0.0.1:1/build
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]

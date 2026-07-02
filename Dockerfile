FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production \
    ASTRO_TELEMETRY_DISABLED=1 \
    WORLDCUP_SYNC_INTERVAL_MINUTES=30 \
    WORLDCUP_SYNC_UNTIL=2026-07-20T00:00:00Z \
    PORT=7860

COPY package.json pnpm-lock.yaml ./
RUN corepack enable \
  && corepack prepare pnpm@latest --activate \
  && pnpm install --frozen-lockfile --prod

COPY scripts ./scripts
COPY data/worldcup ./data/worldcup

CMD ["pnpm", "worldcup:sync:daemon"]

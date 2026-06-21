FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH" \
    NODE_ENV=production
RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY brain-server/package.json ./brain-server/

RUN pnpm install --frozen-lockfile --filter @supatroppers/brain-server... --filter @supatroppers/shared

COPY shared ./shared
COPY brain-server ./brain-server

EXPOSE 8080
WORKDIR /app/brain-server
CMD ["pnpm", "start"]

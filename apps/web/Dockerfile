# Web app image. Build from the repo root:
#   docker build -f apps/web/Dockerfile -t fluentloop-web .
FROM node:22-slim AS base
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
# Placeholders only for Next's build-time analysis. Runtime uses Railway env.
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/fluentloop" \
    BETTER_AUTH_SECRET="build-time-placeholder-secret-32chars" \
    BETTER_AUTH_URL="http://localhost:3000"
RUN pnpm install --frozen-lockfile --filter "@fluentloop/web..."
RUN pnpm --filter @fluentloop/web build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=10000
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/packages/ai/prompts ./packages/ai/prompts
USER node
EXPOSE 10000
CMD ["node", "apps/web/server.js"]

FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --filter @heirloom/api... --no-frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["pnpm", "dev"]

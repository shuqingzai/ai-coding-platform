FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile --filter server

COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

RUN mkdir -p /app/workspace

EXPOSE 3001

CMD ["pnpm", "--filter", "server", "start"]

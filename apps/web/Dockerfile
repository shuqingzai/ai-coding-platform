FROM node:22-alpine AS build

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter web

COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

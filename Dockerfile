FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm i --frozen-lockfile || pnpm i
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate && pnpm i --prod --no-optional || true

# Stdio transport
CMD ["node", "dist/index.js"]


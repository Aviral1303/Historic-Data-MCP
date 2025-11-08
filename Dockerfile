FROM node:20-alpine AS base
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/Aviral1303/Historic-Data-MCP" \
      org.opencontainers.image.title="Historic Price MCP" \
      org.opencontainers.image.description="MCP server that finds historic price trends (Groq + scraping)"

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm i --frozen-lockfile || pnpm i
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    USER_AGENT="HistoricPriceMCP/0.1 (+https://github.com/dedalus-labs)"
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate && pnpm i --prod --no-optional || true

# Stdio transport
CMD ["node", "dist/index.js"]


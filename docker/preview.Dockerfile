# Imagem base dos previews de projetos gerados (Sprint 6).
# Sprint 0: apenas stub — não usado em produção ainda.

FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* ./
RUN if [ -f bun.lockb ]; then bun install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
COPY docker/preview-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

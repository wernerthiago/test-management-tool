# Build stage: install all dependencies and build the client (dist/public) and server (dist/index.js)
FROM node:22-alpine AS builder
# Corepack provides the pnpm version pinned in package.json ("packageManager")
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime stage: production dependencies, the build output and the migrations only
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
# Applied automatically at startup
COPY --from=builder /app/drizzle ./drizzle

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]

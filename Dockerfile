# 万幕生生产镜像：多阶段构建（Next.js standalone 输出）
# 构建上下文需包含完整仓库；数据库连接等敏感信息仅在运行时通过环境变量注入。

# ---------- 基础层：Debian slim + OpenSSL（Prisma 运行需要） ----------
FROM node:20-slim AS base
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- 依赖层：完整依赖（含 dev，供构建与迁移/种子使用） ----------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 构建层：prisma generate + next build ----------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期不需要真实数据库；占位连接串仅满足 PrismaClient 模块实例化时的环境校验
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wanmusheng?schema=public"
RUN npx prisma generate \
    && npm run build

# ---------- 迁移/种子（一次性服务，配合 docker-compose 的 migrate 使用） ----------
# 说明：使用 builder 层镜像执行，因为其中包含 prisma CLI 与 tsx。
FROM builder AS migrate
WORKDIR /app
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts"]

# ---------- 运行层：仅保留 standalone 产物，非 root 运行 ----------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# standalone 的文件追踪通常会带上 Prisma Client 与查询引擎；
# 显式再拷贝一次，规避不同平台下引擎二进制漏打包的问题。
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

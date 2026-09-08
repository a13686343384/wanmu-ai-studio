import { PrismaClient } from "@prisma/client"

/**
 * Prisma Client 单例。
 * 开发模式下 Next.js 热重载会重复执行模块，若每次都 new PrismaClient()
 * 会迅速耗尽数据库连接，因此挂载到 globalThis 复用。
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

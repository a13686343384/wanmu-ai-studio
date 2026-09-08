/**
 * 重置演示账号状态，供 E2E / 冒烟测试使用。
 *
 * 每次测试前把 demo 账号的积分补满，避免因累计扣费导致生成类用例失败。
 * 用法：node scripts/reset-demo.mjs
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const DEMO_EMAIL = "demo@wanmusheng.com"
const TAPIES = Number(process.env.DEMO_TAPIES ?? 9999)

const user = await prisma.user.update({
  where: { email: DEMO_EMAIL },
  data: { tapies: TAPIES },
  select: { email: true, tapies: true },
})

console.log(`[reset-demo] ${user.email} 积分已重置为 ${user.tapies}`)

await prisma.$disconnect()

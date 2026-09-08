/**
 * 本地开发数据库：内嵌 PostgreSQL。
 *
 * 本机没有系统级 PostgreSQL / Docker 时，用该脚本拉起一个真实 PostgreSQL 实例，
 * 数据目录落在项目下的 .pgdata（已在 .gitignore 中忽略）。
 *
 * 用法：
 *   node scripts/dev-db.mjs          # 前台运行，Ctrl+C 停止
 *   node scripts/dev-db.mjs --reset  # 删除数据目录后重建（会清空数据）
 *
 * 生产环境请直接把 DATABASE_URL 指向真实 PostgreSQL，无需本脚本。
 */
import EmbeddedPostgres from "embedded-postgres"
import { rmSync } from "node:fs"
import { resolve } from "node:path"

const PORT = Number(process.env.DEV_DB_PORT ?? 5432)
const USER = "postgres"
const PASSWORD = "postgres"
const DB_NAME = process.env.DEV_DB_NAME ?? "wanmusheng"
const databaseDir = resolve(process.cwd(), ".pgdata")

if (process.argv.includes("--reset")) {
  rmSync(databaseDir, { recursive: true, force: true })
  console.log("[dev-db] 已清空 .pgdata")
}

const pg = new EmbeddedPostgres({
  databaseDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  onLog: (message) => {
    if (/error|fatal/i.test(message)) console.error(`[postgres] ${message}`)
  },
})

async function main() {
  const alreadyInitialised = await pg
    .initialise()
    .then(() => false)
    .catch(() => true)

  if (alreadyInitialised) console.log("[dev-db] 数据目录已存在，跳过 initdb")

  await pg.start()
  console.log(`[dev-db] PostgreSQL 已启动 → postgresql://${USER}:***@localhost:${PORT}/${DB_NAME}`)

  try {
    await pg.createDatabase(DB_NAME)
    console.log(`[dev-db] 已创建数据库 ${DB_NAME}`)
  } catch {
    console.log(`[dev-db] 数据库 ${DB_NAME} 已存在`)
  }

  console.log("[dev-db] 就绪。保持本进程运行，另开终端执行 npm run db:migrate")
}

async function shutdown() {
  console.log("\n[dev-db] 正在停止 PostgreSQL…")
  await pg.stop().catch(() => {})
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

main().catch((error) => {
  console.error("[dev-db] 启动失败:", error)
  process.exit(1)
})

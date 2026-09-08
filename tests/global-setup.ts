import { execFileSync } from "node:child_process"

/**
 * Playwright 全局初始化：
 * 把演示账号积分补满，保证生成类用例不因累计扣费而失败。
 */
export default function globalSetup() {
  try {
    execFileSync("node", ["scripts/reset-demo.mjs"], { stdio: "inherit" })
  } catch {
    console.warn("[global-setup] 重置演示账号失败（数据库可能未启动），继续执行测试")
  }
}

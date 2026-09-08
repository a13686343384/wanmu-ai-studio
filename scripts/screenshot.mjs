/**
 * 视觉验证工具：登录后对指定路由截图。
 *
 * 用法：
 *   node scripts/screenshot.mjs                     # 默认截工作台
 *   node scripts/screenshot.mjs /canvas /creation   # 指定多个路由
 *
 * 产物保存在 .screenshots/（已在 .gitignore 中忽略）。
 */
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const OUT_DIR = resolve(process.cwd(), ".screenshots")
const DEMO = { email: "demo@wanmusheng.com", password: "demo1234" }

const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/"]

mkdirSync(OUT_DIR, { recursive: true })

function fileNameFor(route) {
  const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/[/?=&]/g, "-")
  return `${slug}.png`
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: "zh-CN",
})

const page = await context.newPage()

// 1) 登录
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })
await page.fill("#email", DEMO.email)
await page.fill("#password", DEMO.password)
await page.click('button[type="submit"]')
await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 })
console.log("✓ 登录成功")

// 2) 逐路由截图
for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" })
  // 等待字体与动画稳定
  await page.waitForTimeout(900)

  const file = resolve(OUT_DIR, fileNameFor(route))
  await page.screenshot({ path: file, fullPage: false })
  console.log(`✓ ${route} → .screenshots/${fileNameFor(route)}`)
}

await browser.close()

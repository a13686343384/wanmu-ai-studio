import { expect, test, type Locator, type Page } from "@playwright/test"

/** 演示账号（由 npm run db:seed 创建）。 */
export const DEMO = {
  email: "demo@wanmusheng.com",
  password: "demo1234",
}

/** 登录并把会话写入 storageState，供后续测试复用。 */
export async function login(page: Page) {
  await page.goto("/login")
  await page.fill("#email", DEMO.email)
  await page.fill("#password", DEMO.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
  await expect(page).toHaveURL(/\/($|\?)/)
}

/** 带登录态访问某路由。 */
export async function gotoAuthed(page: Page, path: string) {
  await login(page)
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

test.describe("认证", () => {
  test("未登录访问工作台会跳转登录页", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText("登录万幕生")).toBeVisible()
  })

  test("演示账号可以登录并进入工作台", async ({ page }) => {
    await login(page)
    await expect(page.getByText("你好，今天想生成点什么？")).toBeVisible()
  })

  test("错误密码会提示失败", async ({ page }) => {
    await page.goto("/login")
    await page.fill("#email", DEMO.email)
    await page.fill("#password", "wrong-password-123")
    await page.click('button[type="submit"]')
    await expect(page.getByText("邮箱或密码不正确")).toBeVisible()
  })
})

/**
 * 从 Radix 下拉菜单中选择一项。
 * 先等待菜单项可见再点击，避免菜单动画期间的 detached 抖动。
 */
export async function selectFromMenu(page: Page, trigger: Locator, name: string | RegExp) {
  await trigger.click()
  const item = page.getByRole("menuitem", { name })
  await item.waitFor({ state: "visible" })
  await item.click()
  await expect(item).toBeHidden()
}

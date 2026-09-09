import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("画布", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/canvas")
    await page.waitForLoadState("networkidle")
  })

  test("渲染个人 / 团队 Tab 与工具栏", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "个人" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "团队项目" })).toBeVisible()
    await expect(page.getByPlaceholder("搜索")).toBeVisible()
    await expect(page.getByRole("button", { name: /显示全部/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /新建项目/ }).first()).toBeVisible()
  })

  test("新建项目后进入画布编辑器", async ({ page }) => {
    const name = `E2E画布-${Date.now().toString(36)}`

    await page.getByRole("button", { name: /新建项目/ }).first().click()
    await page.fill("#project-name", name)
    await page.getByRole("button", { name: "创建项目" }).click()

    await expect(page).toHaveURL(/\/canvas\/[a-z0-9]+/i, { timeout: 30_000 })
    await expect(page.getByText(name, { exact: true })).toBeVisible()
    await expect(page.getByText(/画布是空的/)).toBeVisible()
  })

  test("添加节点并保存后可持久化", async ({ page }) => {
    const name = `E2E节点-${Date.now().toString(36)}`

    await page.getByRole("button", { name: /新建项目/ }).first().click()
    await page.fill("#project-name", name)
    await page.getByRole("button", { name: "创建项目" }).click()
    await expect(page).toHaveURL(/\/canvas\/[a-z0-9]+/i)

    // 从底部工具条添加一个文本节点
    await page.getByRole("button", { name: "新建文本", exact: true }).first().click()
    await expect(page.getByText("画布是空的")).toBeHidden()
    await page.getByPlaceholder("开启你的创作…").first().fill("E2E 画布节点内容")

    // 保存
    await page.getByTestId("studio-save").click()
    await expect(page.getByTestId("studio-save")).toContainText("已保存", { timeout: 15_000 })

    // 重新加载后节点仍在
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.getByPlaceholder("开启你的创作…").first()).toHaveValue(/E2E 画布节点内容/)
  })

  test("可以切换团队项目 Tab 并打开创建团队弹窗", async ({ page }) => {
    await page.getByRole("tab", { name: "团队项目" }).click()
    await page.getByRole("button", { name: /新建团队/ }).click()
    await expect(page.getByText("团队内所有成员共享画布、资产和 Tapies 额度")).toBeVisible()
    await page.getByRole("button", { name: "取消" }).click()
  })

  test("加入团队弹窗校验 32 位 Team ID", async ({ page }) => {
    await page.getByRole("tab", { name: "团队项目" }).click()
    await page.getByRole("button", { name: /加入团队/ }).click()

    await page.getByLabel("Team ID").fill("short")
    await page.getByRole("button", { name: "提交申请" }).click()
    await expect(page.getByText("Team ID 必须为 32 位字符串")).toBeVisible()
  })

  test("项目卡片右键菜单包含全部操作", async ({ page }) => {
    const card = page.getByTestId("project-card").filter({ hasText: "小和尚" }).first()
    await card.click({ button: "right" })
    await expect(page.getByRole("menuitem", { name: "打开" })).toBeVisible({ timeout: 15_000 })

    for (const label of ["重命名", "选择", "移动至…", "分享链接", "删除"]) {
      await expect(page.getByRole("menuitem", { name: label })).toBeVisible()
    }
    await page.keyboard.press("Escape")
  })
})

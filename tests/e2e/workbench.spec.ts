import { expect, test } from "@playwright/test"
import { login, selectFromMenu } from "./helpers"

test.describe("工作台", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("渲染生成面板与参数栏", async ({ page }) => {
    await expect(page.getByText("你好，今天想生成点什么？")).toBeVisible()
    await expect(page.getByTestId("reference-upload")).toBeVisible()
    await expect(page.getByPlaceholder(/上传参考素材、输入文字或/)).toBeVisible()
    await expect(page.getByTestId("generate")).toBeVisible()
    await expect(page.getByTestId("model-trigger")).toBeVisible()
    await expect(page.getByTestId("param-combined")).toBeVisible()
    await expect(page.getByTestId("param-combined")).toContainText("16:9")
    await expect(page.getByTestId("param-combined")).toContainText("480p")
  })

  test("切换媒体类型会更新模型清单", async ({ page }) => {
    // 默认视频 → Seedance
    await expect(page.getByTestId("model-trigger")).toContainText("Seedance 2.0")

    // 切到图片
    await selectFromMenu(page, page.getByTestId("media-type-trigger"), "图片")
    await expect(page.getByTestId("model-trigger")).toContainText("全能图片")

    // 切到音频
    await selectFromMenu(page, page.getByTestId("media-type-trigger"), "音频")
    await expect(page.getByTestId("model-trigger")).toContainText("MV Audio 5.5")
    await expect(page.getByPlaceholder(/描述你想要的音乐/)).toBeVisible()
    await expect(page.getByTestId("lyrics-trigger")).toContainText("智能歌词")
  })

  test("图片模式可以调整数量与画幅", async ({ page }) => {
    await selectFromMenu(page, page.getByTestId("media-type-trigger"), "图片")

    // 打开合并参数下拉：数量 → 4
    await page.getByTestId("param-combined").click()
    const countItem = page.getByRole("menuitemradio", { name: "4", exact: true })
    await countItem.waitFor({ state: "visible" })
    await countItem.click({ force: true })
    await expect(countItem).toBeHidden()
    await expect(page.getByTestId("param-combined")).toContainText("4")

    // 画幅 → 9:16
    await page.getByTestId("param-combined").click()
    const ratioItem = page.getByRole("menuitemradio", { name: "9:16" })
    await ratioItem.waitFor({ state: "visible" })
    await ratioItem.click({ force: true })
    await expect(ratioItem).toBeHidden()
    await expect(page.getByTestId("param-combined")).toContainText("9:16")
  })

  test("空提示词时生成按钮不可用", async ({ page }) => {
    await expect(page.getByTestId("generate")).toBeDisabled()
  })

  test("输入提示词后可以生成并看到结果", async ({ page }) => {
    await page
      .getByPlaceholder(/上传参考素材、输入文字或/)
      .fill("赛博朋克雨夜街头，霓虹倒影")
    await expect(page.getByTestId("generate")).toBeEnabled()
    await page.getByTestId("generate").click()

    // 完成后结果区出现
    await expect(page.getByText("本次生成")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId("work-card").first()).toBeVisible()
  })

  test("精选作品画廊可横向滚动", async ({ page }) => {
    await expect(page.getByText("让作品，成为最有力的表达")).toBeVisible()
    await expect(page.getByText(/09\s*SELECTED WORKS/i)).toBeVisible()
    await expect(page.getByTestId("work-card").first()).toBeVisible()

    const scroller = page.locator(".scrollbar-hide").first()
    const before = await scroller.evaluate((el) => el.scrollLeft)
    await page.getByRole("button", { name: "向右滚动" }).click()
    await page.waitForTimeout(800)
    const after = await scroller.evaluate((el) => el.scrollLeft)
    expect(after).toBeGreaterThan(before)
  })

  test("导航可跳转到画布与影视工厂", async ({ page }) => {
    await page.getByRole("link", { name: "画布", exact: true }).click()
    await expect(page).toHaveURL(/\/canvas/)
    await expect(page.getByRole("tab", { name: "个人" })).toBeVisible()

    await selectFromMenu(page, page.getByTestId("creation-center-trigger"), /影视工厂/)
    await expect(page).toHaveURL(/\/creation\/film-factory/)
    await expect(page.getByRole("heading", { name: "影视工厂" })).toBeVisible()
  })
})

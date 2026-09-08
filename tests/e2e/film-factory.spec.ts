import { expect, test, type Page } from "@playwright/test"
import { login, selectFromMenu } from "./helpers"

const SCRIPT_TEXT = `第1集 芯片
江婉为伊甸园VIP资格出卖林夜，赵天昊步步紧逼。第九层拾荒者林夜即将面临集团的致命围剿，生死一线。
江婉看着旁边林夜空着的睡铺，小声说：“对个起，怀林夜。我得活。”
---
第2集 反杀
林夜意外融合远古防御系统“雪崩”芯片，凭借吞噬数据与具现化能力反杀追兵。`

/**
 * 通过 API 新建一个干净的剧本（已生成分集、未拆分镜），
 * 使详情页用例不依赖 demo 数据的历史状态。
 */
async function createFreshScript(page: Page): Promise<string> {
  const title = `E2E剧本-${Date.now().toString(36)}`

  const created = await page.request.post("/api/scripts", {
    data: {
      title,
      content: SCRIPT_TEXT,
      workType: "vertical_short",
      seriesType: "limited",
      targetAspect: "9:16",
      textModel: "ovlm-6",
      processingMode: "consult_optimize",
      executionMode: "step_by_step",
    },
  })
  expect(created.ok()).toBeTruthy()
  const { data } = await created.json()

  const finalized = await page.request.post(`/api/scripts/${data.id}/finalize`, {
    data: {
      title,
      genre: "科幻/废土/复仇爽剧",
      narrativeStyle: "主角单线快节奏升级",
      visualStyle: "真人写实电影感",
      costumeStyle: "废土机能风",
      era: "近未来废土",
      totalEpisodes: 2,
      episodeDuration: 90,
      targetAspect: "9:16",
    },
  })
  expect(finalized.ok()).toBeTruthy()

  return data.id as string
}

test.describe("影视工厂", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/creation/film-factory")
    await page.waitForLoadState("networkidle")
  })

  test("首页渲染状态统计与剧本卡片", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "影视工厂" })).toBeVisible()
    await expect(page.getByText("Cinema Floor")).toBeVisible()
    for (const label of ["在产", "就绪", "已完成", "总计"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByPlaceholder("搜索剧本标题…")).toBeVisible()
    await expect(page.getByRole("link", { name: /新建剧本/ })).toBeVisible()
  })

  test("INTAKE 表单校验必填项", async ({ page }) => {
    await page.goto("/creation/film-factory/new")
    await page.getByRole("button", { name: /AI 智能立项/ }).click()

    await expect(page.getByText("请输入剧本标题")).toBeVisible()
    await expect(page.getByText("剧本内容太短，至少 20 字")).toBeVisible()
  })

  test("INTAKE 配置面板包含全部选项", async ({ page }) => {
    await page.goto("/creation/film-factory/new")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("剧本原料")).toBeVisible()
    await expect(page.getByText("参数配置")).toBeVisible()

    // 作品类型：4 个 pill
    for (const label of ["竖屏短剧", "横屏短剧", "微电影", "动漫"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
    }

    // 剧集类型 / 加工方式 / 执行方式
    await expect(page.getByRole("button", { name: /限定剧/ }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /会诊 \+ 台词优化/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /原样保留/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^逐步确认/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^全自动一步到位/ })).toBeVisible()
  })

  test("完整走通 INTAKE → 分析 → 审阅 → 创建剧本", async ({ page }) => {
    const title = `E2E流程-${Date.now().toString(36)}`

    await page.goto("/creation/film-factory/new")
    await page.fill("#script-title", title)
    await page.fill("#script-content", SCRIPT_TEXT)

    await page.getByRole("button", { name: /AI 智能立项/ }).click()

    await expect(page.getByText("AI 正在通读你的剧本")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText("审阅并创建剧本")).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText("AI 推理结果")).toBeVisible()
    await expect(page.getByText("AI 立项方案")).toBeVisible()

    await page.getByRole("button", { name: "创建剧本" }).click()

    await expect(page).toHaveURL(/\/creation\/film-factory\/[a-z0-9]+/i, { timeout: 60_000 })
    await expect(page.getByText(title, { exact: true })).toBeVisible()
    await expect(page.getByText("分集", { exact: true })).toBeVisible()
    await expect(page.getByText("全剧资产")).toBeVisible()
  })

  test("详情页展示工作流、分集与分镜区", async ({ page }) => {
    const scriptId = await createFreshScript(page)
    await page.goto(`/creation/film-factory/${scriptId}`)
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("button", { name: /^会诊/ })).toBeVisible()
    await expect(page.getByText("剧本内容")).toBeVisible()
    await expect(page.getByText("尚未拆分镜")).toBeVisible()
    await expect(page.getByText("先让 AI 复述理解本集").first()).toBeVisible()
    await expect(page.getByText(/单集时长/)).toBeVisible()
    await expect(page.getByText("全剧资产")).toBeVisible()
    await expect(page.getByRole("button", { name: /下一步/ }).first()).toBeVisible()
  })

  test("剧本会诊弹窗可以出具诊断报告", async ({ page }) => {
    const scriptId = await createFreshScript(page)
    await page.goto(`/creation/film-factory/${scriptId}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /^会诊/ }).click()
    await page.getByRole("button", { name: /开始会诊/ }).click()

    await expect(page.getByText("诊断报告", { exact: true }).first()).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText("建议清单（勾选要改的项）")).toBeVisible()
  })

  test("拆分镜弹窗包含四个 Tab", async ({ page }) => {
    const scriptId = await createFreshScript(page)
    await page.goto(`/creation/film-factory/${scriptId}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /批量生成分镜/ }).first().click()

    for (const tab of ["出图", "仅拆分镜", "出视频", "后期 BGM"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible()
    }
  })

  test("仅拆分镜可以生成镜头列表", async ({ page }) => {
    const scriptId = await createFreshScript(page)
    await page.goto(`/creation/film-factory/${scriptId}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /批量生成分镜/ }).first().click()
    await page.getByRole("tab", { name: "仅拆分镜" }).click()
    await page.getByRole("button", { name: "开始" }).click()

    await expect(page.getByText(/个镜头/).first()).toBeVisible({ timeout: 60_000 })
    // 拆分完成后卡片出现
    await expect(page.getByText(/分镜 1/).first()).toBeVisible({ timeout: 60_000 })
  })

  test("AI 复述理解本集", async ({ page }) => {
    const scriptId = await createFreshScript(page)
    await page.goto(`/creation/film-factory/${scriptId}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: /先让 AI 复述理解本集/ }).first().click()
    await page.getByRole("button", { name: /让 AI 复述理解/ }).click()

    await expect(page.getByText("AI 的理解")).toBeVisible({ timeout: 40_000 })
    await expect(page.getByText("建议镜组节奏")).toBeVisible()
  })

  test("资产侧边栏可提取角色 / 场景 / 道具", async ({ page }) => {
    const scriptId = await createFreshScript(page)
    await page.goto(`/creation/film-factory/${scriptId}`)
    await page.waitForLoadState("networkidle")

    await page.getByRole("button", { name: "重新提取资产" }).click()
    await expect(page.getByText(/资产已提取/).first()).toBeVisible({ timeout: 60_000 })

    await page.getByRole("tab", { name: /场景/ }).click()
    await expect(page.getByText(/拾荒|伊甸园|数据深渊/).first()).toBeVisible({ timeout: 20_000 })
  })
})

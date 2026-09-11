import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test("未知生成进度只显示实际等待时间，失败不创建结果", async ({ page }) => {
  await login(page)
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/ai/generate", async (route) => {
    await pending
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "受控生成失败" }),
    })
  })
  await page.getByPlaceholder(/上传参考素材、输入文字或/).fill("真实进度测试")
  await page.getByTestId("generate").click()
  try {
    await expect(page.getByRole("progressbar")).toHaveCount(0)
    await expect(page.getByTestId("request-pending")).toContainText("已等待")
    await page.waitForTimeout(10000)
    await expect(page.getByTestId("request-pending")).toContainText(
      /已等待 (1\d|[2-9]\d) 秒/,
    )
    await expect(page.getByTestId("request-pending")).not.toContainText("%")
  } finally {
    release()
  }
  await expect(page.getByText("受控生成失败", { exact: true })).toBeVisible()
  await expect(page.getByText("本次生成", { exact: true })).toHaveCount(0)
  await expect(page.getByTestId("generate")).toBeEnabled()
})

test("后期禁止假合成导出，并提供所有已有片段下载", async ({ page }) => {
  await login(page)
  const created = await page.request.post("/api/scripts", {
    data: {
      title: "后期反馈验收",
      content: "第1集 出发\n小雨收拾背包走出家门，在街口遇到前来送行的朋友。",
      workType: "vertical_short",
      seriesType: "limited",
      targetAspect: "9:16",
      textModel: "auto",
      processingMode: "consult_optimize",
      executionMode: "step_by_step",
    },
  })
  expect(created.ok()).toBeTruthy()
  const { data } = await created.json()
  try {
    const finalized = await page.request.post(
      `/api/scripts/${data.id}/finalize`,
      {
        data: {
          title: "后期反馈验收",
          genre: "剧情",
          narrativeStyle: "线性",
          visualStyle: "写实",
          costumeStyle: "现代",
          era: "现代",
          totalEpisodes: 1,
          episodeDuration: 90,
          targetAspect: "9:16",
        },
      },
    )
    expect(finalized.ok()).toBeTruthy()
    // Exercise the production panel with persisted script and controlled media records.
    await page.route(
      `**/api/scripts/${data.id}/episodes/*/storyboards`,
      async (route) => {
        await route.fulfill({
          json: {
            data: {
              storyboards: Array.from({ length: 5 }, (_, i) => ({
                id: `shot-${i}`,
                number: i + 1,
                title: `镜头${i + 1}`,
                description: "出发",
                duration: 5,
                videoUrl: `/fixtures/shot-${i}.mp4`,
                imageUrl: null,
                status: "completed",
              })),
            },
          },
        })
      },
    )
    await page.goto(`/creation/film-factory/${data.id}`)
    await page.getByRole("button", { name: "后期合成", exact: true }).click()
    await expect(
      page.getByRole("button", { name: "导出成片", exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByText("合成功能暂不可用", { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /下载镜头/ })).toHaveCount(5)
    await expect(
      page.getByRole("link", { name: "下载镜头 5", exact: true }),
    ).toHaveAttribute("href", "/fixtures/shot-4.mp4")
    await expect(page.getByText("成片已导出", { exact: true })).toHaveCount(0)
  } finally {
    await page.request.delete(`/api/scripts/${data.id}`)
  }
})

test("剧本建档等待分析时不虚构步骤完成，失败可重试", async ({ page }) => {
  await login(page)
  await page.goto("/creation/film-factory/new")
  await page.route("**/api/scripts", (route) =>
    route.fulfill({ status: 201, json: { data: { id: "controlled-intake" } } }),
  )
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    "**/api/scripts/controlled-intake/analyze",
    async (route) => {
      await pending
      await route.fulfill({ status: 502, json: { error: "受控分析失败" } })
    },
  )
  await page.fill("#script-title", "等待分析测试")
  await page.fill(
    "#script-content",
    "第1集 出发\n小雨收拾背包走出家门，在街口遇到前来送行的朋友。",
  )
  await page.getByRole("button", { name: /AI 智能立项/ }).click()
  try {
    await expect(page.getByTestId("request-pending")).toContainText(
      "正在通读全本",
    )
    await expect(page.getByRole("progressbar")).toHaveCount(0)
    await page.waitForTimeout(2200)
    await expect(page.getByTestId("request-pending")).toContainText(
      /已等待 [2-9] 秒/,
    )
    await expect(
      page.getByText("生成立项方案与分集灵感", { exact: true }),
    ).toHaveCount(0)
  } finally {
    release()
  }
  await expect(page.getByText("受控分析失败", { exact: true })).toBeVisible()
  await expect(page.getByTestId("request-pending")).toHaveCount(0)
  await expect(page.getByRole("button", { name: /AI 智能立项/ })).toBeEnabled()
})

test("剧本创作慢请求和失败不虚报完成", async ({ page }) => {
  await login(page)
  const response = await page.request.post("/api/writing-projects", {
    data: {
      title: "等待创作测试",
      genre: "悬疑",
      idea: "末班车的谜团",
      totalEpisodes: 2,
      episodeDuration: 90,
    },
  })
  expect(response.ok()).toBeTruthy()
  const { data } = await response.json()
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await page.route(`**/api/writing-projects/${data.id}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue()
      await pending
      await route.fulfill({ status: 502, json: { error: "受控创作失败" } })
    })
    await page.goto(`/creation/script-writing/${data.id}`)
    await page
      .getByRole("button", { name: "生成项目蓝图", exact: true })
      .click()
    await page.getByRole("button", { name: "开始生成", exact: true }).click()
    await expect(page.getByTestId("request-pending")).toContainText(
      "正在等待创作结果",
    )
    await expect(page.getByRole("progressbar")).toHaveCount(0)
    release()
    await expect(page.getByText("受控创作失败", { exact: true })).toBeVisible()
    await expect(page.getByText("生成完成", { exact: true })).toHaveCount(0)
    await expect(page.getByTestId("request-pending")).toHaveCount(0)
  } finally {
    release()
    await page.request.delete(`/api/writing-projects/${data.id}`)
  }
})

test("画布重新选中生成节点时保留真实等待时间，失败保留原内容", async ({
  page,
}) => {
  await login(page)
  const created = await page.request.post("/api/projects", {
    data: { name: "真实等待验收" },
  })
  expect(created.ok()).toBeTruthy()
  const { data } = await created.json()
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await page.request.put(`/api/canvas/${data.id}`, {
      data: {
        nodes: [
          {
            id: "a",
            type: "text",
            position: { x: 50, y: 100 },
            data: { label: "原始节点", kind: "text", text: "原内容" },
          },
          {
            id: "b",
            type: "image",
            position: { x: 650, y: 100 },
            data: { label: "另一个节点", kind: "image" },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 0.8 },
      },
    })
    await page.goto(`/canvas/${data.id}`)
    await expect(page.locator(".react-flow__node")).toHaveCount(2)
    const node = page.locator('[data-id="a"].react-flow__node')
    await node.click({ position: { x: 20, y: 5 } })
    await page.getByLabel("节点生成提示词").fill("写一段开场")
    await page.route("**/api/ai/generate", async (route) => {
      await pending
      await route.fulfill({ status: 502, json: { error: "受控画布失败" } })
    })
    await page.getByTestId("studio-composer-send").click()
    await expect(page.getByTestId("request-pending")).toBeVisible()
    await expect(page.getByRole("progressbar")).toHaveCount(0)
    await page
      .locator('[data-id="b"].react-flow__node')
      .click({ position: { x: 20, y: 5 } })
    await page.waitForTimeout(2200)
    await node.click({ position: { x: 20, y: 5 } })
    await expect(page.getByTestId("request-pending")).toContainText(
      /已等待 [2-9] 秒/,
    )
    release()
    await expect(page.getByText("受控画布失败", { exact: true })).toBeVisible()
    await expect(page.getByTestId("studio-composer-send")).toBeEnabled()
    await expect(node.locator("textarea").first()).toHaveValue("原内容")
  } finally {
    release()
    await page.request.delete(`/api/projects/${data.id}`)
  }
})

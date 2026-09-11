import { expect, test, type Page } from "@playwright/test"
import { login } from "./helpers"

const shots = [
  {
    id: "review-shot",
    number: 1,
    description: "小雨推开房门走向街道",
    duration: 5,
    shotType: "全景",
    camera: "固定",
    dialogue: null,
    action: "走出",
    imageUrl: null,
    videoUrl: null,
    audioUrl: null,
    prompt: null,
    negativePrompt: null,
    model: null,
    status: "pending",
    segmentTitle: "出发",
  },
]
async function fixture(page: Page, totalEpisodes = 1) {
  await login(page)
  const response = await page.request.post("/api/scripts", {
    data: {
      title: "校验交互测试",
      content: "第1集 出发\n小雨收拾背包走出家门，在街口遇到前来送行的朋友。",
      workType: "vertical_short",
      seriesType: "limited",
      targetAspect: "9:16",
      textModel: "auto",
      processingMode: "consult_optimize",
      executionMode: "step_by_step",
    },
  })
  expect(response.ok()).toBeTruthy()
  const { data } = await response.json()
  const finalized = await page.request.post(
    `/api/scripts/${data.id}/finalize`,
    {
      data: {
        title: "校验交互测试",
        genre: "剧情",
        narrativeStyle: "线性",
        visualStyle: "写实",
        costumeStyle: "现代",
        era: "现代",
        totalEpisodes,
        episodeDuration: 90,
        targetAspect: "9:16",
      },
    },
  )
  expect(finalized.ok()).toBeTruthy()
  await page.route(
    `**/api/scripts/${data.id}/episodes/*/storyboards`,
    (route) => route.fulfill({ json: { data: { storyboards: shots } } }),
  )
  return data.id as string
}

test("大模型校验展示阻断项与真实处理入口，不能显示全部通过", async ({
  page,
}) => {
  const id = await fixture(page)
  try {
    await page.route(`**/api/scripts/${id}/episodes/*/validate`, (route) =>
      route.fulfill({
        json: {
          data: {
            inputRevision: "v1",
            mode: "mock",
            report: {
              inputRevision: "v1",
              mode: "mock",
              issues: [
                {
                  id: "block",
                  severity: "blocking",
                  storyboardIds: ["review-shot"],
                  reason: "角色进入位置与上一镜冲突",
                  action: "edit",
                },
              ],
              advisoriesAcknowledged: false,
            },
          },
        },
      }),
    )
    await page.goto(`/creation/film-factory/${id}`)
    await expect(page.getByTestId("storyboard-checks")).toContainText(
      "1 项必须先解决",
    )
    await expect(page.getByTestId("storyboard-checks")).toContainText(
      "模拟校验",
    )
    await expect(page.getByTestId("storyboard-checks")).not.toContainText(
      "全部通过",
    )
    await expect(
      page.getByRole("button", { name: "进入视频阶段", exact: true }),
    ).toBeDisabled()
    await page
      .getByTestId("storyboard-checks")
      .getByRole("button", { name: "编辑镜头", exact: true })
      .click()
    await expect(page.getByRole("dialog")).toBeVisible()
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("建议必须显式确认，PATCH确认后才显示可生成", async ({ page }) => {
  const id = await fixture(page)
  let acknowledged = false
  let submittedRevision = ""
  const report = () => ({
    inputRevision: "v1",
    mode: "mock",
    issues: [
      {
        id: "advice",
        severity: "advisory",
        storyboardIds: ["review-shot"],
        reason: "可增加环境声衔接",
        action: "edit",
      },
    ],
    advisoriesAcknowledged: acknowledged,
  })
  try {
    await page.route(
      `**/api/scripts/${id}/episodes/*/validate`,
      async (route) => {
        if (route.request().method() === "PATCH") {
          submittedRevision = route.request().postDataJSON().inputRevision
          acknowledged = true
          await route.fulfill({ json: { data: report() } })
        } else
          await route.fulfill({
            json: {
              data: { inputRevision: "v1", mode: "mock", report: report() },
            },
          })
      },
    )
    await page.goto(`/creation/film-factory/${id}`)
    const checks = page.getByTestId("storyboard-checks")
    await expect(checks).toContainText("1 项建议待确认")
    await expect(checks).not.toContainText("校验通过")
    await checks
      .getByRole("button", { name: "我已审阅并确认建议", exact: true })
      .click()
    await expect(checks).toContainText("校验通过，可以批量生成（建议已确认）")
    expect(submittedRevision).toBe("v1")
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("旧报告已过期，重新校验上游失败不能恢复通过状态", async ({ page }) => {
  const id = await fixture(page)
  let selectedModel = ""
  try {
    await page.route(
      `**/api/scripts/${id}/episodes/*/validate`,
      async (route) => {
        if (route.request().method() === "POST") {
          selectedModel = route.request().postDataJSON().model
          await route.fulfill({
            status: 502,
            json: { error: "受控校验服务失败" },
          })
        } else
          await route.fulfill({
            json: {
              data: {
                inputRevision: "new",
                mode: "mock",
                report: {
                  inputRevision: "old",
                  issues: [],
                  advisoriesAcknowledged: true,
                },
              },
            },
          })
      },
    )
    await page.goto(`/creation/film-factory/${id}`)
    const checks = page.getByTestId("storyboard-checks")
    await expect(checks).toContainText("校验已过期")
    await expect(checks).not.toContainText("校验通过")
    await expect(page.getByLabel("校验模型", { exact: true })).not.toHaveValue(
      "",
    )
    const model = await page
      .getByLabel("校验模型", { exact: true })
      .inputValue()
    await checks.getByRole("button", { name: "重新校验", exact: true }).click()
    await expect(checks).toContainText("受控校验服务失败")
    await expect(checks).not.toContainText("校验通过")
    expect(selectedModel).toBe(model)
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("切集后迟到的上一集报告不能覆盖当前集", async ({ page }) => {
  const id = await fixture(page, 2)
  let firstEpisode = ""
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await page.route(
      `**/api/scripts/${id}/episodes/*/validate`,
      async (route) => {
        const episode = route
          .request()
          .url()
          .split("/episodes/")[1]!
          .split("/")[0]!
        if (!firstEpisode) firstEpisode = episode
        if (episode === firstEpisode) {
          await pending
          await route.fulfill({
            json: {
              data: {
                inputRevision: "v1",
                mode: "mock",
                report: { inputRevision: "v1", issues: [] },
              },
            },
          })
        } else
          await route.fulfill({
            json: {
              data: {
                inputRevision: "v2",
                mode: "mock",
                report: {
                  inputRevision: "v2",
                  issues: [
                    {
                      id: "b",
                      severity: "blocking",
                      storyboardIds: ["review-shot"],
                      reason: "第二集专属问题",
                      action: "edit",
                    },
                  ],
                },
              },
            },
          })
      },
    )
    await page.goto(`/creation/film-factory/${id}`)
    await expect(page.getByTestId("request-pending")).toContainText(
      "正在读取校验状态",
    )
    await page.getByRole("button", { name: /EP02/ }).click()
    await expect(page.getByTestId("storyboard-checks")).toContainText(
      "第二集专属问题",
    )
    release()
    await page.waitForTimeout(500)
    await expect(page.getByTestId("storyboard-checks")).toContainText(
      "第二集专属问题",
    )
    await expect(page.getByTestId("storyboard-checks")).not.toContainText(
      "校验通过",
    )
  } finally {
    release()
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("无报告不能生成，POST校验后重新读取当前版本才能通过", async ({ page }) => {
  const id = await fixture(page)
  let completed = false
  let readCount = 0
  let requestedModel = ""
  try {
    await page.route(
      `**/api/scripts/${id}/episodes/*/validate`,
      async (route) => {
        if (route.request().method() === "POST") {
          requestedModel = route.request().postDataJSON().model
          completed = true
          await route.fulfill({
            json: { data: { inputRevision: "v1", mode: "mock", issues: [] } },
          })
        } else {
          readCount++
          await route.fulfill({
            json: {
              data: {
                inputRevision: "v1",
                mode: "mock",
                report: completed
                  ? { inputRevision: "v1", mode: "mock", issues: [] }
                  : null,
              },
            },
          })
        }
      },
    )
    await page.goto(`/creation/film-factory/${id}`)
    const checks = page.getByTestId("storyboard-checks")
    await expect(checks).toContainText("尚未完成语义校验")
    await expect(
      page.getByRole("button", { name: "进入视频阶段", exact: true }),
    ).toBeDisabled()
    await checks.getByRole("button", { name: "开始校验", exact: true }).click()
    await expect(checks).toContainText("校验通过，可以批量生成")
    await expect(
      page.getByRole("button", { name: "进入视频阶段", exact: true }),
    ).toBeEnabled()
    expect(requestedModel).not.toBe("")
    expect(readCount).toBeGreaterThanOrEqual(2)
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("切到真实AI后模拟报告仍标模拟且不能作为真实校验通过", async ({ page }) => {
  const id = await fixture(page)
  try {
    await page.route(`**/api/scripts/${id}/episodes/*/validate`, (route) =>
      route.fulfill({
        json: {
          data: {
            inputRevision: "v1",
            mode: "live",
            report: {
              inputRevision: "v1",
              mode: "mock",
              issues: [],
              advisoriesAcknowledged: true,
            },
          },
        },
      }),
    )
    await page.goto(`/creation/film-factory/${id}`)
    const checks = page.getByTestId("storyboard-checks")
    await expect(checks).toContainText("模拟校验")
    await expect(checks).toContainText("校验已过期")
    await expect(checks).not.toContainText("校验通过")
    await expect(
      page.getByRole("button", { name: "进入视频阶段", exact: true }),
    ).toBeDisabled()
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

import { expect, test, type Page } from "@playwright/test"
import { login } from "./helpers"
async function fixture(page: Page) {
  await login(page)
  const response = await page.request.post("/api/scripts", {
    data: {
      title: "任务状态验收",
      content:
        "第1集 出发\n小雨收拾背包走出家门，在街口遇到前来送行的朋友。\n第2集 归来\n小雨带着新的消息回到街口。",
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
        title: "任务状态验收",
        genre: "剧情",
        narrativeStyle: "线性",
        visualStyle: "写实",
        costumeStyle: "现代",
        era: "现代",
        totalEpisodes: 2,
        episodeDuration: 90,
        targetAspect: "9:16",
      },
    },
  )
  expect(finalized.ok()).toBeTruthy()
  const detail = await (
    await page.request.get(`/api/scripts/${data.id}`)
  ).json()
  return {
    id: data.id as string,
    episodes: detail.data.episodes as { id: string }[],
  }
}
const task = (episodeId: string) => ({
  id: "controlled-task",
  episodeId,
  kind: "video_batch",
  state: "running",
  completed: 1,
  failed: 0,
  total: 3,
  currentLabel: "正在生成镜头2",
})

test("刷新保留任务部分失败信息与实际计数", async ({ page }) => {
  const { id, episodes } = await fixture(page)
  try {
    await page.route("**/api/tasks?episodeId=*", (route) =>
      route.fulfill({
        json: {
          data: [
            {
              ...task(episodes[0]!.id),
              state: "failed",
              completed: 1,
              failed: 2,
              currentLabel: "部分任务失败",
              error: "两项供应商错误",
            },
          ],
        },
      }),
    )
    await page.goto(`/creation/film-factory/${id}`)
    await expect(page.getByTestId("episode-task-status")).toContainText(
      "成功 1",
    )
    await expect(page.getByTestId("episode-task-status")).toContainText(
      "失败 2",
    )
    await page.reload()
    await expect(page.getByTestId("episode-task-status")).toContainText(
      "两项供应商错误",
    )
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("停止失败可见，接受停止请求后仍等待终态", async ({ page }) => {
  const { id, episodes } = await fixture(page)
  let state = "running"
  let fail = true
  try {
    await page.route("**/api/tasks?episodeId=*", (route) =>
      route.fulfill({ json: { data: [{ ...task(episodes[0]!.id), state }] } }),
    )
    await page.route("**/api/tasks/controlled-task", (route) => {
      if (fail)
        return route.fulfill({ status: 502, json: { error: "受控停止失败" } })
      state = "cancel_requested"
      return route.fulfill({
        json: { data: { ...task(episodes[0]!.id), state } },
      })
    })
    await page.goto(`/creation/film-factory/${id}`)
    await page
      .getByTestId("episode-task-status")
      .getByRole("button", { name: "请求停止", exact: true })
      .click()
    await expect(page.getByText("受控停止失败", { exact: true })).toBeVisible()
    fail = false
    await page
      .getByTestId("episode-task-status")
      .getByRole("button", { name: "请求停止", exact: true })
      .click()
    await expect(page.getByTestId("episode-task-status")).toContainText(
      "已请求停止，当前请求收尾中",
    )
    await expect(
      page
        .getByTestId("episode-task-status")
        .getByRole("button", { name: "等待停止确认", exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByText("任务已停止，已完成产物已保留", { exact: true }),
    ).toHaveCount(0)
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("切到无任务分集清除上一集拆分遮罩和任务状态", async ({ page }) => {
  const { id, episodes } = await fixture(page)
  try {
    await page.route("**/api/tasks?episodeId=*", (route) =>
      route.fulfill({
        json: {
          data: route.request().url().includes(episodes[0]!.id)
            ? [
                {
                  ...task(episodes[0]!.id),
                  kind: "split",
                  currentLabel: "第一集拆分中",
                },
              ]
            : [],
        },
      }),
    )
    await page.goto(`/creation/film-factory/${id}`)
    await expect(page.getByTestId("episode-task-status")).toContainText(
      "第一集拆分中",
    )
    await page.getByRole("button", { name: /EP02/ }).click()
    await expect(page.getByTestId("episode-task-status")).toHaveCount(0)
    await expect(page.getByText("第一集拆分中", { exact: true })).toHaveCount(0)
  } finally {
    await page.request.delete(`/api/scripts/${id}`)
  }
})

test("任务队列停止走任务API并准确展示取消收尾", async ({ page }) => {
  await login(page)
  let state = "running"
  let stops = 0
  let fakeScriptStops = 0
  await page.route("**/api/tasks", (route) =>
    route.fulfill({ json: { data: [{ ...task("queue-episode"), state }] } }),
  )
  await page.route("**/api/tasks/controlled-task", (route) => {
    stops++
    state = "cancel_requested"
    return route.fulfill({
      json: { data: { ...task("queue-episode"), state } },
    })
  })
  page.on("request", (request) => {
    if (request.method() === "PATCH" && /\/api\/scripts\//.test(request.url()))
      fakeScriptStops++
  })
  await page.goto("/creation/film-factory")
  await page.getByRole("button", { name: "任务队列", exact: true }).click()
  await page
    .getByTestId("queue-task")
    .getByRole("button", { name: "请求停止", exact: true })
    .click()
  await expect(page.getByTestId("queue-task")).toContainText("停止收尾中")
  await expect(
    page
      .getByTestId("queue-task")
      .getByRole("button", { name: "等待停止确认", exact: true }),
  ).toBeDisabled()
  expect(stops).toBe(1)
  expect(fakeScriptStops).toBe(0)
})

test("全部停止中有失败时显示准确结果而不虚报全停", async ({ page }) => {
  await login(page)
  const rows = [task("a"), { ...task("b"), id: "second-task" }]
  await page.route("**/api/tasks?active=1", (route) =>
    route.fulfill({ json: { data: rows } }),
  )
  await page.route("**/api/tasks/controlled-task", (route) =>
    route.fulfill({
      json: { data: { ...rows[0], state: "cancel_requested" } },
    }),
  )
  await page.route("**/api/tasks/second-task", (route) =>
    route.fulfill({ status: 502, json: { error: "第二项停止失败" } }),
  )
  await page.goto("/creation/film-factory")
  await page.getByRole("button", { name: "停止全部", exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText("可请求停止 2 项任务")
  await page.getByRole("button", { name: "请求全部停止", exact: true }).click()
  await expect(
    page.getByText(
      "停止请求失败 1 项；已停止 0 项，收尾中 1 项，请到任务队列重试",
      { exact: true },
    ),
  ).toBeVisible()
  await expect(page.getByRole("dialog")).toBeVisible()
})

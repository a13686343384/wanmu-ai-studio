import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test("剧本创作可以生成蓝图、保存正文、恢复版本并导入影视工厂", async ({
  page,
}) => {
  await login(page)
  await page.goto("/creation/script-writing")
  await page.getByRole("button", { name: "新建剧本", exact: true }).click()
  await page.getByLabel("剧名").fill("回归测试·最后一班地铁")
  await page
    .getByLabel("一句话灵感 / 故事核心")
    .fill(
      "一名地铁司机在末班车发现来自明天的求救信，必须在黎明前找到失踪的妹妹。",
    )
  await page.getByLabel("目标集数").fill("3")
  await page.getByRole("button", { name: "创建并进入" }).click()
  await expect(page).toHaveURL(/script-writing\/.+/)
  const id = page.url().split("/").pop()!
  let imported: string | undefined
  try {
    await page
      .getByRole("button", { name: "生成项目蓝图", exact: true })
      .click()
    await page.getByRole("button", { name: "开始生成", exact: true }).click()
    await expect(page.getByRole("button", { name: /第1集/ })).toBeVisible()
    await page
      .getByRole("button", { name: "生成本集正文", exact: true })
      .click()
    await page.getByRole("button", { name: "开始生成", exact: true }).click()
    const body = page.getByRole("textbox", { name: "本集正文", exact: true })
    await expect(body).not.toHaveValue("")
    await body.fill(
      "第一场 夜 地铁站\n司机林舟握紧求救信：我一定会找到你。\n站台另一端传来熟悉的脚步声。",
    )
    await page.getByRole("button", { name: "保存正文", exact: true }).click()
    await expect(page.getByText("正文已保存", { exact: true })).toBeVisible()
    await page.reload()
    await expect(body).toHaveValue(/司机林舟握紧求救信/)
    await page
      .getByRole("button", { name: "大纲版本历史", exact: true })
      .click()
    await expect(
      page.getByRole("button", { name: "恢复此版本" }).first(),
    ).toBeVisible()
    await page.getByRole("button", { name: "恢复此版本" }).first().click()
    await expect(body).not.toHaveValue(/司机林舟握紧求救信/)
    await page
      .getByRole("button", { name: "大纲版本历史", exact: true })
      .click()
    await page.getByRole("button", { name: "恢复此版本" }).first().click()
    await expect(body).toHaveValue(/司机林舟握紧求救信/)
    await page
      .getByRole("button", { name: "导入影视工厂", exact: true })
      .click()
    await expect(page).toHaveURL(/film-factory\/.+/)
    imported = page.url().split("/").pop()
    await expect(
      page.getByText("回归测试·最后一班地铁", { exact: true }).first(),
    ).toBeVisible()
  } finally {
    if (imported) await page.request.delete(`/api/scripts/${imported}`)
    await page.request.delete(`/api/writing-projects/${id}`)
  }
})

test("剧本创作拒绝过期版本覆盖和越权读取", async ({ page, browser }) => {
  await login(page)
  const response = await page.request.post("/api/writing-projects", {
    data: {
      title: "版本并发测试",
      genre: "悬疑",
      idea: "末班车的谜团",
      totalEpisodes: 2,
      episodeDuration: 90,
    },
  })
  expect(response.status()).toBe(201)
  const { data } = await response.json()
  try {
    const update = await page.request.post(`/api/writing-projects/${data.id}`, {
      data: { action: "blueprint", revision: 0, model: "ovlm-5.6" },
    })
    expect(update.ok()).toBeTruthy()
    const stale = await page.request.post(`/api/writing-projects/${data.id}`, {
      data: { action: "blueprint", revision: 0, model: "ovlm-5.6" },
    })
    expect(stale.status()).toBe(409)
    const other = await browser.newContext()
    const unauthorized = await other.request.get(
      `http://localhost:3000/api/writing-projects/${data.id}`,
    )
    expect(unauthorized.status()).toBe(401)
    await other.close()
  } finally {
    await page.request.delete(`/api/writing-projects/${data.id}`)
  }
})

test("浏览器后退再前进可以恢复未保存的正文草稿", async ({ page }) => {
  await login(page)
  await page.goto("/creation/script-writing")
  const response = await page.request.post("/api/writing-projects", {
    data: {
      title: "草稿恢复测试",
      genre: "悬疑",
      idea: "末班车的谜团",
      totalEpisodes: 2,
      episodeDuration: 90,
    },
  })
  const { data } = await response.json()
  try {
    await page.request.post(`/api/writing-projects/${data.id}`, {
      data: { action: "blueprint", revision: 0, model: "ovlm-5.6" },
    })
    await page.reload()
    await page
      .getByRole("link")
      .filter({ hasText: "草稿恢复测试" })
      .first()
      .click()
    const body = page.getByRole("textbox", { name: "本集正文", exact: true })
    await body.fill("尚未保存的地铁剧本正文")
    // App Router history navigation must preserve a recoverable local draft.
    await page.evaluate(() => window.history.back())
    await expect(page).toHaveURL(/script-writing$/)
    await page.evaluate(() => window.history.forward())
    await expect(body).toHaveValue("尚未保存的地铁剧本正文")
    const stored = (
      await (await page.request.get(`/api/writing-projects/${data.id}`)).json()
    ).data
    expect(stored.document.episodes[0].content).toBe("")
  } finally {
    await page.request.delete(`/api/writing-projects/${data.id}`)
  }
})

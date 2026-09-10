import { test, expect, type Page } from "@playwright/test"
import { login } from "./helpers"

let id: string
async function openCanvas(page: Page) {
  await login(page)
  const response = await page.request.post("/api/projects", {
    data: { name: "画布回归测试" },
  })
  id = (await response.json()).data.id
  await page.request.put(`/api/canvas/${id}`, {
    data: {
      nodes: [
        {
          id: "a",
          type: "text",
          position: { x: 50, y: 100 },
          data: { label: "测试文本", kind: "text", text: "原始内容" },
        },
        {
          id: "b",
          type: "image",
          position: { x: 650, y: 100 },
          data: { label: "测试图片", kind: "image" },
        },
      ],
      edges: [{ id: "ab", source: "a", target: "b" }],
      viewport: { x: 0, y: 0, zoom: 0.8 },
    },
  })
  await page.goto(`/canvas/${id}`)
  await expect(page.locator(".react-flow__node")).toHaveCount(2)
}
test.afterEach(async ({ page }) => {
  if (id) await page.request.delete(`/api/projects/${id}`)
})

test("缩放后连接端点贴住卡片边缘且鼠标悬停不改变位置", async ({ page }) => {
  await openCanvas(page)
  const handle = page.locator('[data-id="a"] .react-flow__handle-right')
  const before = await handle.boundingBox()
  const card = await page
    .locator('[data-id="a"] textarea')
    .evaluate((el) => el.parentElement!.getBoundingClientRect().toJSON())
  expect(Math.abs(before!.x + before!.width / 2 - card.right)).toBeLessThan(2)
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(before!.x + 3 + (i % 3), before!.y + 2)
    const now = await handle.boundingBox()
    expect(Math.abs(now!.x - before!.x)).toBeLessThan(1)
  }
})
test("小地图 SVG 不被外框裁切，窄屏底栏按钮可点击", async ({ page }) => {
  await openCanvas(page)
  const bounds = await page.locator(".react-flow__minimap").evaluate((el) => ({
    outer: el.getBoundingClientRect().toJSON(),
    svg: el.querySelector("svg")!.getBoundingClientRect().toJSON(),
  }))
  expect(bounds.svg.right).toBeLessThanOrEqual(bounds.outer.right)
  expect(bounds.svg.bottom).toBeLessThanOrEqual(bounds.outer.bottom)
  await page.setViewportSize({ width: 800, height: 600 })
  await page.getByRole("button", { name: "新建文本", exact: true }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await page.getByRole("button", { name: "隐藏小地图", exact: true }).click()
  await expect(page.locator(".react-flow__minimap")).toHaveCount(0)
})
test("节点拖动后撤销恢复原坐标", async ({ page }) => {
  await openCanvas(page)
  const node = page.locator('[data-id="a"].react-flow__node')
  const before = await node.boundingBox()
  await page.mouse.move(before!.x + 50, before!.y + 5)
  await page.mouse.down()
  await page.mouse.move(before!.x + 170, before!.y + 65, { steps: 10 })
  await page.mouse.up()
  await page.getByRole("button", { name: "撤销", exact: true }).click()
  await expect
    .poll(async () => (await node.boundingBox())!.x)
    .toBeCloseTo(before!.x, 0)
})
test("加载失败时不得自动保存空画布", async ({ page }) => {
  await openCanvas(page)
  let writes = 0
  await page.route(`**/api/canvas/${id}`, async (route) => {
    if (route.request().method() === "PUT") {
      writes++
      await route.continue()
    } else await route.fulfill({ status: 500, json: { error: "读取失败" } })
  })
  await page.reload()
  await expect(page.getByRole("button", { name: "重新加载画布" })).toBeVisible()
  await page.waitForTimeout(1800)
  expect(writes).toBe(0)
})

test("右键上传生成正确节点且刷新后素材可读", async ({ page }) => {
  await openCanvas(page)
  await page
    .locator(".react-flow__pane")
    .click({ button: "right", position: { x: 400, y: 400 } })
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: /上传 本地/ }).click()
  await (
    await chooser
  ).setFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  })
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  const image = page.locator(".react-flow__node img")
  await expect(image).toHaveAttribute("src", /\/api\/media\//)
  await page.getByTestId("studio-save").click()
  await expect(page.getByTestId("studio-save")).toHaveText("已保存")
  await page.reload()
  await expect(image).toHaveAttribute("src", /\/api\/media\//)
  expect(
    (await page.request.get((await image.getAttribute("src"))!)).ok(),
  ).toBeTruthy()
})
test("提示词和生成参数在取消选择及重载后保留", async ({ page }) => {
  await openCanvas(page)
  await page
    .locator('[data-id="b"].react-flow__node')
    .click({ position: { x: 30, y: 50 } })
  await page.getByLabel("节点生成提示词").fill("雨夜霓虹下的街道")
  await page.getByLabel("节点画幅").click()
  await page.getByRole("option", { name: "9:16" }).click()
  await page.getByLabel("节点分辨率").click()
  await page.getByRole("option", { name: "2K" }).click()
  await page.getByTestId("studio-save").click()
  await expect(page.getByTestId("studio-save")).toHaveText("已保存")
  await page.reload()
  await page
    .locator('[data-id="b"].react-flow__node')
    .click({ position: { x: 30, y: 50 } })
  await expect(page.getByLabel("节点生成提示词")).toHaveValue(
    "雨夜霓虹下的街道",
  )
  await expect(page.getByLabel("节点画幅")).toContainText("9:16")
  await expect(page.getByLabel("节点分辨率")).toContainText("2K")
})

test("实际拖拽连接成功，选中节点后连线端点仍在卡片边缘", async ({ page }) => {
  await openCanvas(page)
  await page
    .locator('[data-id="a"].react-flow__node')
    .click({ position: { x: 20, y: 8 } })
  const source = page.locator('[data-id="a"] .react-flow__handle-right')
  const target = page.locator('[data-id="b"] .react-flow__handle-left')
  const edge = page.locator(".react-flow__edge-path").first()
  const point = await edge.evaluate((el) => {
    const path = el as SVGPathElement
    return path.getPointAtLength(0).matrixTransform(path.getScreenCTM()!).x
  })
  const card = await page
    .locator('[data-id="a"] textarea')
    .first()
    .evaluate((el) => el.parentElement!.getBoundingClientRect().right)
  expect(Math.abs(point - card)).toBeLessThan(2)
  // Existing connection must not duplicate when dragged again.
  const a = (await source.boundingBox())!,
    b = (await target.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
  await page.mouse.up()
  await expect(page.locator(".react-flow__edge")).toHaveCount(1)
  await page.getByLabel("节点生成提示词").fill("不要删除这个节点")
  await page.getByLabel("节点生成提示词").press("Backspace")
  await expect(page.locator(".react-flow__node")).toHaveCount(2)
})

test("内部返回项目列表前保存最后一次编辑", async ({ page }) => {
  await openCanvas(page)
  await page.locator('[data-id="a"] textarea').fill("离开前最后编辑")
  await page.getByRole("button", { name: "项目操作", exact: true }).click()
  await page.getByRole("menuitem", { name: "全部项目", exact: true }).click()
  await expect(page).toHaveURL(/\/canvas$/)
  const saved = (await (await page.request.get(`/api/canvas/${id}`)).json())
    .data
  expect(
    saved.nodes.find((node: { id: string }) => node.id === "a").data.text,
  ).toBe("离开前最后编辑")
})
test("生成期间拖动，完成后撤销不会恢复永久生成中状态", async ({ page }) => {
  await openCanvas(page)
  await page
    .locator('[data-id="a"].react-flow__node')
    .click({ position: { x: 20, y: 5 } })
  await page.getByLabel("节点生成提示词").fill("写一段雨夜故事")
  await page.route("**/api/ai/generate", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await page.getByTestId("studio-composer-send").click()
  await expect(page.getByTestId("studio-composer-send")).toBeDisabled()
  const node = page.locator('[data-id="a"].react-flow__node')
  const box = (await node.boundingBox())!
  await page.mouse.move(box.x + 50, box.y + 5)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByTestId("studio-composer-send")).toBeEnabled({
    timeout: 15000,
  })
  await page.getByRole("button", { name: "撤销", exact: true }).click()
  await expect(page.getByTestId("studio-composer-send")).toBeEnabled()
})
test("Agent响应不能清空等待期间写的下一条要求", async ({ page }) => {
  await openCanvas(page)
  await page.getByRole("button", { name: /^Agent/ }).click()
  await page.getByLabel("Agent 创作要求").fill("写一段开场")
  await page.getByRole("button", { name: "生成到画布" }).click()
  await page.getByLabel("Agent 创作要求").fill("接下来写追逐戏")
  await expect(page.locator(".react-flow__node")).toHaveCount(3)
  await expect(page.getByLabel("Agent 创作要求")).toHaveValue("接下来写追逐戏")
})

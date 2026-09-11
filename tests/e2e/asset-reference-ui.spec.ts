import { test, expect } from "@playwright/test"
import { loadEnvConfig } from "@next/env"
import { prisma } from "../../src/lib/prisma"
import { login } from "./helpers"
loadEnvConfig(process.cwd())
test("资产场景完整预览支持Esc，批量出图配置复用已保存模型和分辨率", async ({
  page,
}) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@wanmusheng.com" },
  })
  const workspace = await prisma.workspace.create({
    data: {
      name: "asset-ui-test",
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
    },
  })
  const script = await prisma.script.create({
    data: {
      workspaceId: workspace.id,
      title: "资产预览测试",
      content: "主角站在大厅。",
      status: "assets",
      assetGenerationConfig: {
        textModelId: "auto",
        imageModelId: "auto",
        sheetAspect: "16:9",
        resolution: "2K",
      },
      scenes: {
        create: {
          name: "测试大厅",
          description: "大厅",
          imageUrl:
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiIGZpbGw9Im9yYW5nZSIvPjwvc3ZnPg==",
        },
      },
    },
  })
  try {
    await login(page)
    const api = await page.request.get(`/api/scripts/${script.id}`)
    expect((await api.json()).data.assetGenerationConfig?.resolution).toBe("2K")
    await page.goto(`/creation/film-factory/${script.id}`)
    await page.getByRole("tab", { name: /^场景/ }).click()
    await page.getByRole("img", { name: "测试大厅", exact: true }).hover()
    await page.getByRole("button", { name: "查看大图", exact: true }).click()
    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByRole("img", { name: "测试大厅", exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByRole("img", { name: "测试大厅", exact: true }),
    ).toHaveClass(/object-contain/)
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await page
      .getByRole("button", { name: "重新出图", exact: true })
      .first()
      .click()
    await expect(
      page.getByRole("dialog").getByText("生成全剧资产图", { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("dialog").getByText("2K", { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "生成缺少的资产图", exact: true }),
    ).toBeVisible()
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } })
  }
})

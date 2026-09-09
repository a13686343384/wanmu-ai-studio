import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { z } from "zod"

const generateSchema = z.object({
  /** 要生成的条目下标；缺省则生成全部未完成的 */
  itemIndexes: z.array(z.number().int().min(0)).optional(),
  /** 文案条目（type=copy）走文本模型，其余走出图模型 */
  copyModel: z.string().optional(),
})

/**
 * POST /api/ecommerce/projects/[id]/generate
 * 串行生成项目内条目：图条目走 image 模型，copy 条目走文本模型。
 * 逐项更新 items（status/url），失败项标记 failed 可重试。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const project = await prisma.ecomProject.findFirst({
      where: { id: params.id, workspace: { members: { some: { userId: user.id } } } },
    })
    if (!project) return jsonError("项目不存在或无权访问", 404)

    const body = await req.json().catch(() => ({}))
    const { itemIndexes } = generateSchema.parse(body)

    type Item = {
      type: string
      label: string
      prompt: string
      url?: string
      status: "pending" | "generating" | "done" | "failed"
      copy?: string
    }
    const items = project.items as unknown as Item[]
    const targets =
      itemIndexes ?? items.map((_, index) => index).filter((index) => items[index]!.status !== "done")

    if (targets.length === 0) return jsonError("没有需要生成的条目", 400)

    await prisma.ecomProject.update({
      where: { id: project.id },
      data: { status: "generating" },
    })

    const ai = getAIService()
    const config = project.config as {
      imageModel?: string
      textModel?: string
      ratio?: string
      style?: string
      sellingPoints?: string
    }

    let failed = 0
    for (const index of targets) {
      const item = items[index]
      if (!item) continue
      items[index] = { ...item, status: "generating" }
      await prisma.ecomProject.update({
        where: { id: project.id },
        data: { items: items as object[] },
      })

      try {
        if (item.type === "copy") {
          const { data } = await ai.generateText({
            prompt: `为电商商品「${project.name}」撰写${item.label}。卖点：${config.sellingPoints ?? ""}。条目：${item.prompt}`,
            model: config.textModel ?? "ovlm-6",
          })
          items[index] = { ...item, status: "done", copy: data.text }
        } else {
          const prompt = [config.style, item.prompt, item.label].filter(Boolean).join("；")
          const { data } = await ai.generateImage({
            prompt,
            model: config.imageModel ?? "man-image-v2-lite",
            aspectRatio: config.ratio ?? "1:1",
            resolution: "1K",
          })
          items[index] = { ...item, status: "done", url: data.images[0]!.url }
        }
      } catch {
        items[index] = { ...item, status: "failed" }
        failed += 1
      }

      await prisma.ecomProject.update({
        where: { id: project.id },
        data: { items: items as object[] },
      })
    }

    const status = failed === targets.length ? "failed" : "done"
    await prisma.ecomProject.update({
      where: { id: project.id },
      data: { status },
    })

    return jsonOk(
      { generated: targets.length - failed, failed },
      failed > 0 ? `完成，${failed} 项失败可重试` : "全部生成完成",
    )
  },
)

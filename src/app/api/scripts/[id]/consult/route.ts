import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

const consultSchema = z.object({
  /** 只对台词做优化 */
  dialogueOnly: z.boolean().default(false),
  model: z.string().optional(),
})

/**
 * POST /api/scripts/[id]/consult
 * 剧本会诊：AI 出具诊断报告（结构 / 人物 / 节奏 / 台词 / 逻辑），
 * 结果落库为 Consultation，供详情页展示与逐项采纳。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json().catch(() => ({}))
    const input = consultSchema.parse(body)
    const model = input.model ?? script.consultModel ?? script.textModel

    const ai = getAIService()
    const { data, usage } = await ai.consultScript({
      scriptTitle: script.title,
      content: script.content,
      model,
    })

    const consultation = await prisma.consultation.create({
      data: {
        scriptId: script.id,
        type: input.dialogueOnly ? "dialogue_optimization" : "diagnosis",
        input: script.content.slice(0, 8000),
        output: data.summary,
        suggestions: data.suggestions as unknown as Prisma.InputJsonValue,
        model,
        status: "completed",
      },
    })

    const mustFix = data.suggestions.filter((s) => s.mustFix).length

    await prisma.script.update({
      where: { id: script.id },
      data: {
        processingStatus: "completed",
        progressLabel: mustFix > 0 ? `会诊·必改${mustFix}` : "会诊通过",
      },
    })

    return jsonOk({
      consultationId: consultation.id,
      summary: data.summary,
      suggestions: data.suggestions,
      mustFixCount: mustFix,
      usage,
    })
  },
)

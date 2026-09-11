import { z } from "zod"
import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { getAIService } from "@/services/ai"

const chatSchema = z.object({
  /** 正在讨论的诊断建议 */
  suggestion: z.string().trim().min(1).max(600),
  /** 用户这轮想怎么改 */
  message: z.string().trim().min(1, "请输入你的想法").max(600),
  model: z.string().optional(),
})

/**
 * POST /api/scripts/[id]/consult/chat
 * 会诊弹窗内的「对话改法」：针对某条诊断建议，与 AI 往来讨论改法。
 * 对话不落库，仅生成单轮回应。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json()
    const input = chatSchema.parse(body)

    const ai = getAIService(script.workspaceId)
    const { data, usage } = await ai.consultChat({
      scriptTitle: script.title,
      suggestion: input.suggestion,
      message: input.message,
      model: input.model ?? script.consultModel ?? script.textModel,
    })

    return jsonOk({ reply: data.reply, usage })
  },
)

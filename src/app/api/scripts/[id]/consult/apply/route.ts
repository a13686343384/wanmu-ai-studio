import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { z } from "zod"

const schema = z.object({
  suggestionIds: z.array(z.string()).min(1, "请至少勾选一项"),
})

/**
 * POST /api/scripts/[id]/consult/apply
 * 应用用户勾选的会诊建议：对原文做一次台词优化，
 * 并把已采纳的建议标记为 applied。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json()
    const { suggestionIds } = schema.parse(body)

    const consultation = await prisma.consultation.findFirst({
      where: { scriptId: script.id },
      orderBy: { createdAt: "desc" },
    })

    if (!consultation) {
      return jsonError("尚未进行会诊，无法应用修改", 400)
    }

    const suggestions = consultation.suggestions as unknown as {
      id: string
      category: string
      issue: string
      suggestion: string
      mustFix: boolean
    }[]

    const picked = suggestions.filter((item) => suggestionIds.includes(item.id))
    if (picked.length === 0) {
      return jsonError("勾选的建议不存在", 400)
    }

    const ai = getAIService(script.workspaceId)
    const { data } = await ai.optimizeDialogue({
      content: script.content,
      model: script.dialogueModel ?? script.textModel,
    })

    await prisma.$transaction([
      prisma.script.update({
        where: { id: script.id },
        data: {
          content: data.optimized,
          processingStatus: "completed",
          progressLabel: `已应用 ${picked.length} 项修改`,
        },
      }),
      prisma.consultation.update({
        where: { id: consultation.id },
        data: {
          status: "applied",
          suggestions: suggestions.map((item) => ({
            ...item,
            accepted: suggestionIds.includes(item.id),
          })) as never,
        },
      }),
    ])

    return jsonOk({
      appliedCount: picked.length,
      summary: `已应用 ${picked.map((item) => item.category).join("、")} 共 ${picked.length} 项修改`,
      changes: data.changes,
    })
  },
)

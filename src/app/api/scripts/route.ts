import { prisma } from "@/lib/prisma"
import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireDefaultWorkspace, requireUser } from "@/lib/session"
import { createScriptSchema } from "@/lib/validations/generation"
import { toScriptSummary } from "@/lib/serializers/script"
import type { Prisma } from "@prisma/client"

/**
 * GET /api/scripts
 * 查询参数：q（标题搜索）、status（状态筛选）、scope=personal|team|all、workspaceId
 */
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  const status = url.searchParams.get("status")
  const scope = url.searchParams.get("scope") ?? "all"
  const workspaceId = url.searchParams.get("workspaceId")

  const where: Prisma.ScriptWhereInput = {
    workspace: { members: { some: { userId: user.id } } },
  }

  if (workspaceId) where.workspaceId = workspaceId
  else if (scope === "personal")
    where.workspace = { members: { some: { userId: user.id } }, isPersonal: true }
  else if (scope === "team")
    where.workspace = { members: { some: { userId: user.id } }, isPersonal: false }

  if (status) where.status = status
  if (q) where.title = { contains: q, mode: "insensitive" }

  const scripts = await prisma.script.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      workspace: { select: { name: true, isPersonal: true } },
      _count: { select: { episodes: true, characters: true, scenes: true, props: true } },
    },
  })

  return jsonOk(scripts.map(toScriptSummary))
})

/**
 * POST /api/scripts
 * INTAKE 第一步：落库原始剧本与配置，状态为 intake / processing。
 * 后续由 /api/scripts/[id]/analyze 触发 AI 推理。
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const input = createScriptSchema.parse(body)

  const workspace = input.workspaceId
    ? await prisma.workspace.findFirst({
        where: { id: input.workspaceId, members: { some: { userId: user.id } } },
      })
    : await requireDefaultWorkspace(user.id)

  if (!workspace) throw new Error("未找到可用工作区")

  const script = await prisma.script.create({
    data: {
      title: input.title,
      content: input.content,
      workspaceId: workspace.id,
      creatorId: user.id,
      workType: input.workType,
      seriesType: input.seriesType,
      targetAspect: input.targetAspect,
      textModel: input.textModel,
      processingMode: input.processingMode,
      executionMode: input.executionMode,
      consultModel: input.consultModel ?? input.textModel,
      dialogueModel: input.dialogueModel ?? input.textModel,
      status: "intake",
      processingStatus: "processing",
      progress: 10,
      progressLabel: "正在通读剧本…",
    },
    include: {
      workspace: { select: { name: true, isPersonal: true } },
      _count: { select: { episodes: true, characters: true, scenes: true, props: true } },
    },
  })

  return jsonOk(toScriptSummary(script), "剧本已建档，AI 正在分析", 201)
})

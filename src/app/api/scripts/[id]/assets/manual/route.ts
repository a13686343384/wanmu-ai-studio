import { z } from "zod"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("costume"),
    characterId: z.string().min(1),
    name: z.string().trim().min(1, "请输入造型名称").max(40),
    situation: z.string().trim().max(120).optional(),
    description: z.string().trim().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("prop"),
    name: z.string().trim().min(1, "请输入道具名称").max(40),
    description: z.string().trim().max(1000).optional(),
    parentCharacterId: z.string().min(1).optional(),
  }),
  z.object({
    kind: z.literal("scene"),
    name: z.string().trim().min(1, "请输入场景名称").max(40),
    description: z.string().trim().max(1000).optional(),
  }),
])

/**
 * POST /api/scripts/[id]/assets/manual
 * 手动添加资产：妆造（造型，必须挂人物）/ 道具（可关联人物）/ 场景。
 * 角色不支持手动添加，只能从剧本提取。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json()
    const input = schema.parse(body)

    if (input.kind === "costume") {
      const character = await prisma.character.findFirst({
        where: { id: input.characterId, scriptId: script.id },
        select: { id: true },
      })
      if (!character) return jsonError("所属人物不存在", 404)

      const created = await prisma.costume.create({
        data: {
          characterId: character.id,
          name: input.name,
          situation: input.situation || null,
          description: input.description || "暂无描述",
        },
      })
      return jsonOk(created, "造型已创建", 201)
    }

    if (input.kind === "prop") {
      let parentCharacterId: string | null = null
      if (input.parentCharacterId) {
        const parent = await prisma.character.findFirst({
          where: { id: input.parentCharacterId, scriptId: script.id },
          select: { id: true },
        })
        if (!parent) return jsonError("关联人物不存在", 404)
        parentCharacterId = parent.id
      }
      const created = await prisma.prop.create({
        data: {
          scriptId: script.id,
          name: input.name,
          description: input.description || "暂无描述",
          parentCharacterId,
        },
      })
      return jsonOk(created, "道具已创建", 201)
    }

    const created = await prisma.scene.create({
      data: {
        scriptId: script.id,
        name: input.name,
        description: input.description || "暂无描述",
      },
    })
    return jsonOk(created, "场景已创建", 201)
  },
)

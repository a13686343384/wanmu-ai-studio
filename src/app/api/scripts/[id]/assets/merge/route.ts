import { jsonOk, withErrorHandling, AppError } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
})

/**
 * POST /api/scripts/[id]/assets/merge
 * 同人多默认请去重：把 source 合并进 target——
 * 妆造与道具锚点改指过去，别名并入，然后删除 source（连同它的图）。此操作不可撤销。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    const { sourceId, targetId } = schema.parse(await req.json())

    if (sourceId === targetId) throw new AppError("不能合并到它自己", 400)

    const [source, target] = await Promise.all([
      prisma.character.findFirst({ where: { id: sourceId, scriptId: script.id } }),
      prisma.character.findFirst({ where: { id: targetId, scriptId: script.id } }),
    ])
    if (!source || !target) throw new AppError("角色不存在", 404)

    // 妆造与道具锚点改指到保留角色
    await prisma.costume.updateMany({
      where: { characterId: source.id },
      data: { characterId: target.id },
    })
    await prisma.prop.updateMany({
      where: { parentCharacterId: source.id },
      data: { parentCharacterId: target.id },
    })

    // 别名并入（保留角色的名字集合里加入 source 的名字与全部别名）
    const aliases = Array.from(
      new Set([...target.aliases, source.name, ...source.aliases].filter(Boolean)),
    ).slice(0, 20)
    await prisma.character.update({
      where: { id: target.id },
      data: { aliases },
    })

    // 删除 source（级联清掉剩余子数据；imageUrl 随之失效 = 退它的图）
    await prisma.character.delete({ where: { id: source.id } })
    await prisma.script.update({
      where: { id: script.id },
      data: { updatedAt: new Date() },
    })

    return jsonOk(
      { sourceId: source.id, targetId: target.id, aliases },
      `已把「${source.name}」合并进「${target.name}」`,
    )
  },
)

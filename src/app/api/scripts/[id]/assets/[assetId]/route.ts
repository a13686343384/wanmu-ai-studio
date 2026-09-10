import { jsonOk, withErrorHandling, AppError } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  /** 锁定（再生成不覆盖）/ 解锁 */
  locked: z.boolean().optional(),
  /** 清空出图参考图 */
  clearRefs: z.boolean().optional(),
  /** 直接覆写出图参考图列表 */
  refImages: z.array(z.string().trim().max(2000)).max(10).optional(),
  /** 重新出图前置操作：清空参考图并重置状态，下次「一键出全部资产」会重新出 */
  reset: z.boolean().optional(),
  /** 上传图替换：直接把已出图换成新地址 */
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  /** 编辑道具卡：名称 */
  name: z.string().trim().min(1, "请输入道具名称").max(60).optional(),
  /** 编辑道具卡：外观与一致性细节 */
  description: z.string().trim().max(2000).optional(),
  /** 编辑道具卡：关联人物锚点（null = 取消关联） */
  parentCharacterId: z.string().trim().nullable().optional(),
})

async function findAsset(scriptId: string, assetId: string) {
  const character = await prisma.character.findFirst({ where: { id: assetId, scriptId } })
  if (character) return { kind: "character" as const, character }
  const costume = await prisma.costume.findFirst({ where: { id: assetId, character: { scriptId } } })
  if (costume) return { kind: "costume" as const, costume }
  const prop = await prisma.prop.findFirst({ where: { id: assetId, scriptId } })
  if (prop) return { kind: "prop" as const, prop }
  const scene = await prisma.scene.findFirst({ where: { id: assetId, scriptId } })
  if (scene) return { kind: "scene" as const, scene }
  throw new AppError("资产不存在", 404)
}

/**
 * PATCH /api/scripts/[id]/assets/[assetId]
 * 资产卡操作：锁定 / 清空参考图 / 重新出图重置 / 上传图替换。
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string; assetId: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    const found = await findAsset(script.id, params.assetId)
    const input = patchSchema.parse(await req.json())

    if (found.kind === "character") {
      const data: Record<string, unknown> = {}
      if (input.locked !== undefined) data.locked = input.locked
      if (input.clearRefs) data.refImages = []
      if (input.refImages) data.refImages = input.refImages
      if (input.reset) {
        data.refImages = []
        data.status = "pending"
      }
      if (input.imageUrl !== undefined) {
        data.imageUrl = input.imageUrl
        data.status = input.imageUrl ? "completed" : "pending"
      }
      const updated = await prisma.character.update({
        where: { id: found.character.id },
        data,
      })
      await prisma.script.update({
        where: { id: script.id },
        data: { updatedAt: new Date() },
      })
      return jsonOk({
        id: updated.id,
        locked: updated.locked,
        refImages: updated.refImages,
        imageUrl: updated.imageUrl,
        status: updated.status,
      })
    }

    // 妆造 / 道具 / 场景：锁定与换图；道具另支持编辑道具卡
    const data: Record<string, unknown> = {}
    if (input.locked !== undefined) data.locked = input.locked
    if (input.imageUrl !== undefined) {
      data.imageUrl = input.imageUrl
      data.status = input.imageUrl ? "completed" : "pending"
    }
    if (found.kind === "prop") {
      if (input.name !== undefined) data.name = input.name
      if (input.description !== undefined) data.description = input.description
      if (input.parentCharacterId !== undefined) {
        if (input.parentCharacterId) {
          const parent = await prisma.character.findFirst({
            where: { id: input.parentCharacterId, scriptId: script.id },
            select: { id: true },
          })
          if (!parent) throw new AppError("关联的人物不存在", 400)
        }
        data.parentCharacterId = input.parentCharacterId
      }
    }
    if (Object.keys(data).length === 0) throw new AppError("没有需要更新的内容", 400)

    const updated =
      found.kind === "costume"
        ? await prisma.costume.update({ where: { id: found.costume.id }, data })
        : found.kind === "prop"
          ? await prisma.prop.update({ where: { id: found.prop.id }, data })
          : await prisma.scene.update({ where: { id: found.scene.id }, data })

    await prisma.script.update({ where: { id: script.id }, data: { updatedAt: new Date() } })
    return jsonOk({ id: updated.id, locked: updated.locked, imageUrl: updated.imageUrl })
  },
)

/**
 * DELETE /api/scripts/[id]/assets/[assetId]
 * 删除资产（角色会级联删除其妆造；道具的人物锚点置空）。
 */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string; assetId: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    const found = await findAsset(script.id, params.assetId)

    if (found.kind === "character") {
      await prisma.character.delete({ where: { id: found.character.id } })
      return jsonOk({ id: params.assetId, kind: "character" }, "角色已删除")
    }
    if (found.kind === "costume") {
      await prisma.costume.delete({ where: { id: found.costume.id } })
      return jsonOk({ id: params.assetId, kind: "costume" }, "造型已删除")
    }
    if (found.kind === "prop") {
      await prisma.prop.delete({ where: { id: found.prop.id } })
      return jsonOk({ id: params.assetId, kind: "prop" }, "道具已删除")
    }
    await prisma.scene.delete({ where: { id: found.scene.id } })
    return jsonOk({ id: params.assetId, kind: "scene" }, "场景已删除")
  },
)

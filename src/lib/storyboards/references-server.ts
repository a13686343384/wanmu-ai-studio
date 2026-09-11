import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/api"
import {
  getRefsRevision,
  readShotRefs,
  refsPatchSchema,
  type RefsPatch,
  type ShotRefs,
} from "./references"

async function validateRefs(
  tx: Prisma.TransactionClient,
  scriptId: string,
  refs: ShotRefs,
) {
  const [scene, characters, props] = await Promise.all([
    refs.sceneId
      ? tx.scene.findFirst({ where: { id: refs.sceneId, scriptId } })
      : null,
    tx.character.findMany({
      where: { id: { in: refs.cast.map((c) => c.characterId) }, scriptId },
      include: { costumes: true },
    }),
    tx.prop.findMany({ where: { id: { in: refs.propIds }, scriptId } }),
  ])
  if (refs.sceneId && !scene) throw new AppError("引用场景不属于当前剧本", 400)
  if (
    new Set(refs.cast.map((c) => c.characterId)).size !== refs.cast.length ||
    characters.length !== refs.cast.length
  )
    throw new AppError("人物引用无效或重复", 400)
  if (
    new Set(refs.propIds).size !== refs.propIds.length ||
    props.length !== refs.propIds.length
  )
    throw new AppError("道具引用无效或重复", 400)
  for (const c of refs.cast)
    if (
      c.costumeId &&
      !characters
        .find((a) => a.id === c.characterId)
        ?.costumes.some((a) => a.id === c.costumeId)
    )
      throw new AppError("造型不属于所选人物", 400)
  return { scene, characters, props }
}
/** 原子提交，行锁串行化同镜更新；冲突时整个镜组回滚。 */
export async function saveStoryboardRefs(
  userId: string,
  patches: RefsPatch[],
  scope?: { scriptId: string; segmentId: string },
  fields?: Record<string, unknown>,
) {
  const parsed = refsPatchSchema.array().min(1).max(200).parse(patches)
  if (new Set(parsed.map((p) => p.storyboardId)).size !== parsed.length)
    throw new AppError("重复镜头", 400)
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Storyboard" WHERE id IN (${Prisma.join(parsed.map((p) => p.storyboardId).sort())}) ORDER BY id FOR UPDATE`,
    )
    const results = []
    for (const patch of parsed) {
      const shot = await tx.storyboard.findFirst({
        where: {
          id: patch.storyboardId,
          episode: { script: { workspace: { members: { some: { userId } } } } },
        },
        include: { episode: true },
      })
      if (
        !shot ||
        (scope &&
          (shot.episode.scriptId !== scope.scriptId ||
            shot.segmentId !== scope.segmentId))
      )
        throw new AppError("分镜不存在或不属于当前镜组", 404)
      if (getRefsRevision(shot.generationParams) !== patch.revision)
        throw new AppError("引用已被其他操作更新，请重新打开后修改", 409)
      await validateRefs(tx, shot.episode.scriptId, patch.refs)
      const previous = (shot.generationParams ?? {}) as Record<
        string,
        Prisma.InputJsonValue
      >
      const changed =
        JSON.stringify(readShotRefs(shot.generationParams)) !==
        JSON.stringify(patch.refs)
      results.push(
        await tx.storyboard.update({
          where: { id: shot.id },
          data: {
            ...fields,
            generationParams: {
              ...previous,
              refs: patch.refs,
              refsRevision: patch.revision + 1,
              outputsStale: changed
                ? Boolean(shot.imageUrl || shot.videoUrl)
                : Boolean(previous.outputsStale),
            },
          },
        }),
      )
      await tx.script.update({
        where: { id: shot.episode.scriptId },
        data: { updatedAt: new Date() },
      })
    }
    return results
  })
}
export async function resolveStoryboardGenerationInput(
  storyboardId: string,
  userId: string,
) {
  const shot = await prisma.storyboard.findFirst({
    where: {
      id: storyboardId,
      episode: { script: { workspace: { members: { some: { userId } } } } },
    },
    include: { episode: true },
  })
  if (!shot) throw new AppError("分镜不存在或无权访问", 404)
  const refs = readShotRefs(shot.generationParams) ?? {
    sceneId: null,
    cast: [],
    propIds: [],
  }
  const assets = await validateRefs(prisma, shot.episode.scriptId, refs)
  const descriptions: string[] = []
  const urls: string[] = []
  const referenceWarnings: string[] = []
  const add = (url: string | null | undefined) => {
    if (url && /^(https?:\/\/|\/api\/media\/)/.test(url)) urls.push(url)
  }
  if (assets.scene) {
    descriptions.push(
      `场景「${assets.scene.name}」：${assets.scene.description}`,
    )
    add(assets.scene.refImages[0])
    if (!assets.scene.refImages.length)
      referenceWarnings.push(
        `场景「${assets.scene.name}」尚无独立原图，仅使用描述`,
      )
  }
  for (const cast of refs.cast) {
    const c = assets.characters.find((c) => c.id === cast.characterId)!
    const costume = c.costumes.find((v) => v.id === cast.costumeId)
    descriptions.push(
      `人物「${c.name}」：${c.appearance ?? c.description}${costume ? `；造型「${costume.name}」：${costume.description}` : ""}`,
    )
    // imageUrl 当前可能是完整设定卡，只消费明确上传的原始参考。
    add(c.refImages[0])
    if (!c.refImages.length)
      referenceWarnings.push(`人物「${c.name}」尚无独立原图，仅使用描述`)
    if (costume)
      referenceWarnings.push(`造型「${costume.name}」尚无独立原图，仅使用描述`)
  }
  for (const p of assets.props) {
    descriptions.push(`道具「${p.name}」：${p.description}`)
    referenceWarnings.push(`道具「${p.name}」尚无独立原图，仅使用描述`)
  }
  const prompt = [
    shot.prompt || shot.description,
    shot.action && `动作：${shot.action}`,
    shot.camera && `运镜：${shot.camera}`,
    shot.dialogue && `台词：${shot.dialogue}`,
    ...descriptions,
  ]
    .filter(Boolean)
    .join("\n")
  const references = [...new Set(urls)].map((name) => ({
    name,
    kind: "image" as const,
  }))
  return {
    prompt,
    references,
    refsRevision: getRefsRevision(shot.generationParams),
    referenceWarnings,
    firstFrameUrl: shot.imageUrl ?? undefined,
    inputSummary: {
      refs,
      referenceWarnings,
      referenceUrls: references.map((r) => r.name),
      prompt,
    },
  }
}

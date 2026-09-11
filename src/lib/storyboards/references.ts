import { z } from "zod"
export const shotRefsSchema = z.object({
  sceneId: z.string().min(1).nullable(),
  cast: z
    .array(
      z.object({
        characterId: z.string().min(1),
        costumeId: z.string().min(1).nullable(),
      }),
    )
    .max(12),
  propIds: z.array(z.string().min(1)).max(12),
})
export type ShotRefs = z.infer<typeof shotRefsSchema>
export const refsPatchSchema = z.object({
  storyboardId: z.string().min(1),
  revision: z.number().int().min(0),
  refs: shotRefsSchema,
})
export type RefsPatch = z.infer<typeof refsPatchSchema>
export function readShotRefs(params: unknown): ShotRefs | null {
  if (!params || typeof params !== "object" || !("refs" in params)) return null
  const raw = (params as { refs: Partial<ShotRefs> | null }).refs
  if (!raw) return { sceneId: null, cast: [], propIds: [] }
  const result = shotRefsSchema.safeParse({
    sceneId: raw.sceneId ?? null,
    cast: (raw.cast ?? []).map((c) => ({
      ...c,
      costumeId: c.costumeId ?? null,
    })),
    propIds: raw.propIds ?? [],
  })
  return result.success ? result.data : null
}
export function getRefsRevision(params: unknown): number {
  const n = (params as { refsRevision?: unknown } | null)?.refsRevision
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : 0
}
export function replaceScene(
  refs: ShotRefs,
  from: string | null,
  to: string | null,
): ShotRefs {
  return { ...refs, sceneId: refs.sceneId === from ? to : refs.sceneId }
}

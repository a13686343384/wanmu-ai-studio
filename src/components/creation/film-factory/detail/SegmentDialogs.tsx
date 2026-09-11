"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Box,
  Clapperboard,
  Image as ImageIcon,
  Loader2,
  Plus,
  Users,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CardSelect } from "@/components/ui/card-select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  getRefsRevision,
  readShotRefs,
  replaceScene,
  type ShotRefs,
} from "@/lib/storyboards/references"
import { cn } from "@/lib/utils"

export interface SegmentAssetLists {
  characters: {
    id: string
    name: string
    imageUrl: string | null
    costumes: { id: string; name: string }[]
  }[]
  scenes: { id: string; name: string; imageUrl: string | null }[]
  props: { id: string; name: string; imageUrl: string | null }[]
}

export interface SegmentItem {
  id: string
  number: number
  description: string
  dialogue: string | null
  imageUrl: string | null
  duration: number | null
  generationParams?: unknown
  segmentId?: string | null
}

/** 每镜快照是编辑源，整段替换只更新原先使用该资产的镜头。 */
export function SegmentRefsDialog({
  open,
  onOpenChange,
  segmentTitle,
  items,
  assets,
  onSaved,
  scriptId,
  segmentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  segmentTitle: string
  items: SegmentItem[]
  assets: SegmentAssetLists
  onSaved: () => void
  scriptId?: string
  segmentId?: string
}) {
  // Per-shot snapshots (read on open, written back on save)
  const [snapshots, setSnapshots] = useState<Record<string, ShotRefs>>({})
  const [revisions, setRevisions] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  // Aggregated selection state
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set())
  const [costumeSelections, setCostumeSelections] = useState<
    Record<string, string | null>
  >({})
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set())

  // Initialize from per-shot refs on open
  useEffect(() => {
    if (!open) return
    const snaps: Record<string, ShotRefs> = {}
    const sceneVotes = new Map<string, number>()
    const charVotes = new Map<string, number>()
    const propVotes = new Map<string, number>()
    const costumeMap: Record<string, string | null> = {}

    for (const item of items) {
      const text = `${item.description} ${item.dialogue ?? ""}`
      const refs = readShotRefs(item.generationParams) ?? {
        sceneId: assets.scenes.find((a) => text.includes(a.name))?.id ?? null,
        cast: assets.characters
          .filter((a) => text.includes(a.name))
          .map((a) => ({ characterId: a.id, costumeId: null })),
        propIds: assets.props
          .filter((a) => text.includes(a.name))
          .map((a) => a.id),
      }
      snaps[item.id] = refs

      if (refs.sceneId) {
        sceneVotes.set(refs.sceneId, (sceneVotes.get(refs.sceneId) ?? 0) + 1)
      }
      for (const c of refs.cast) {
        charVotes.set(c.characterId, (charVotes.get(c.characterId) ?? 0) + 1)
        // Use first encountered costume as default
        if (!(c.characterId in costumeMap)) {
          costumeMap[c.characterId] = c.costumeId
        }
      }
      for (const pid of refs.propIds) {
        propVotes.set(pid, (propVotes.get(pid) ?? 0) + 1)
      }
    }

    setSnapshots(snaps)
    setRevisions(
      Object.fromEntries(
        items.map((i) => [i.id, getRefsRevision(i.generationParams)]),
      ),
    )

    // Pick majority scene (or null if no consensus)
    let bestScene: string | null = null
    let bestCount = 0
    for (const [id, count] of sceneVotes) {
      if (count > bestCount) {
        bestScene = id
        bestCount = count
      }
    }
    setSelectedSceneId(bestScene)
    setSelectedChars(new Set(charVotes.keys()))
    setCostumeSelections(costumeMap)
    setSelectedProps(new Set(propVotes.keys()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Usage map: asset id → shot numbers that reference it
  const usage = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const item of items) {
      const r = snapshots[item.id]
      if (!r) continue
      for (const id of [
        r.sceneId,
        ...r.cast.map((c) => c.characterId),
        ...r.cast.map((c) => c.costumeId),
        ...r.propIds,
      ]) {
        if (id) map.set(id, [...(map.get(id) ?? []), item.number])
      }
    }
    return map
  }, [snapshots, items])

  // Independent scenes: shots whose sceneId differs from the aggregated selection
  const independentScenes = useMemo(() => {
    const result: { sceneName: string; shots: number[] }[] = []
    const sceneNameMap = new Map(assets.scenes.map((s) => [s.id, s.name]))
    const indMap = new Map<string, number[]>()
    for (const item of items) {
      const r = snapshots[item.id]
      if (!r) continue
      if (r.sceneId && r.sceneId !== selectedSceneId) {
        const arr = indMap.get(r.sceneId) ?? []
        arr.push(item.number)
        indMap.set(r.sceneId, arr)
      }
    }
    for (const [sid, shots] of indMap) {
      result.push({ sceneName: sceneNameMap.get(sid) ?? sid, shots })
    }
    return result
  }, [snapshots, items, selectedSceneId, assets.scenes])

  const toggleChar = (charId: string) => {
    setSelectedChars((prev) => {
      const next = new Set(prev)
      if (next.has(charId)) next.delete(charId)
      else next.add(charId)
      return next
    })
  }

  const setCostume = (charId: string, costumeId: string | null) => {
    setCostumeSelections((prev) => ({ ...prev, [charId]: costumeId }))
  }

  const toggleProp = (propId: string) => {
    setSelectedProps((prev) => {
      const next = new Set(prev)
      if (next.has(propId)) next.delete(propId)
      else next.add(propId)
      return next
    })
  }

  const selectedCharCount = selectedChars.size

  async function save() {
    setSaving(true)
    try {
      // Build new refs for each shot based on aggregated state.
      // Only patch shots whose refs actually changed.
      const patches = items
        .map((item) => {
          const oldRefs = snapshots[item.id]
          // Preserve per-shot independent scenes: if the shot had a different
          // non-null sceneId before editing, keep it instead of overwriting.
          const sceneId =
            oldRefs.sceneId && oldRefs.sceneId !== selectedSceneId
              ? oldRefs.sceneId
              : selectedSceneId
          const newRefs: ShotRefs = {
            sceneId,
            cast: [...selectedChars].map((cid) => ({
              characterId: cid,
              costumeId: costumeSelections[cid] ?? null,
            })),
            propIds: [...selectedProps],
          }
          const changed =
            JSON.stringify(oldRefs) !== JSON.stringify(newRefs)
          return changed
            ? {
                storyboardId: item.id,
                revision: revisions[item.id],
                refs: newRefs,
              }
            : null
        })
        .filter(Boolean) as {
        storyboardId: string
        revision: number
        refs: ShotRefs
      }[]

      if (patches.length) {
        const segment = segmentId ?? items[0]?.segmentId
        const url =
          scriptId && segment
            ? `/api/scripts/${scriptId}/segments/${segment}/refs`
            : items.length === 1
              ? `/api/storyboards/${items[0].id}`
              : null
        if (!url) throw new Error("镜组尚未完成迁移，请刷新后重试")
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            scriptId && segment
              ? { patches }
              : { refs: patches[0].refs, revision: patches[0].revision },
          ),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "保存失败")
      }
      toast.success(`已保存「${segmentTitle}」引用`)
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!saving) onOpenChange(v)
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑整段引用 · {segmentTitle}</DialogTitle>
          <DialogDescription>
            当前展示本段{items.length}个分镜的引用合集；取消错误项并选中新项，只会替换原先用到错误引用的镜头。
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={saving} className="space-y-6">
          {/* ── 场景区 ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>场景</Label>
              <span className="text-[10px] text-zinc-500">
                {selectedSceneId ? "已选择" : "未选择"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {assets.scenes.map((scene) => {
                const usedBy = usage.get(scene.id) ?? []
                const isSelected = selectedSceneId === scene.id
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() =>
                      setSelectedSceneId(isSelected ? null : scene.id)
                    }
                    className={cn(
                      "relative rounded-lg border p-2 text-left transition-colors",
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    {scene.imageUrl ? (
                      <img
                        src={scene.imageUrl}
                        alt={scene.name}
                        className="aspect-video w-full rounded object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center rounded bg-zinc-900">
                        <Box className="h-4 w-4 text-zinc-700" />
                      </div>
                    )}
                    <p className="mt-1 truncate text-[10px] text-zinc-300">
                      {scene.name}
                    </p>
                    {usedBy.length > 0 && (
                      <span className="text-[10px] text-zinc-500">
                        用于 {usedBy.join("/")} 镜
                      </span>
                    )}
                  </button>
                )
              })}
              <button
                type="button"
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 p-2 text-zinc-500 hover:border-zinc-600"
              >
                <Plus className="h-4 w-4" />
                <span className="mt-1 text-[10px]">新增引用</span>
              </button>
            </div>
          </div>

          {/* ── 单镜独立场景提示 ── */}
          {independentScenes.length > 0 && (
            <p className="text-[10px] text-amber-400">
              ⚠ 单镜独立场景：
              {independentScenes
                .map(
                  (s) =>
                    `${s.sceneName} 用于${s.shots.join("/")}镜`,
                )
                .join("；")}
            </p>
          )}

          {/* ── 人物与造型区 ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>人物与造型</Label>
              <span className="text-[10px] text-zinc-500">
                已选 {selectedCharCount}/{assets.characters.length} 人
              </span>
            </div>
            <div className="space-y-2">
              {assets.characters.map((char) => {
                const isSelected = selectedChars.has(char.id)
                const currentCostume = costumeSelections[char.id] ?? null
                return (
                  <div
                    key={char.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-2 transition-colors",
                      isSelected
                        ? "border-orange-500/50 bg-orange-500/5"
                        : "border-zinc-800",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChar(char.id)}
                      className="mt-1"
                    />
                    {char.imageUrl ? (
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                        <Users className="h-4 w-4 text-zinc-700" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-200">
                        {char.name}
                      </p>
                      {isSelected && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setCostume(char.id, null)}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px]",
                              currentCostume === null
                                ? "border-orange-500 bg-orange-500/20 text-orange-300"
                                : "border-zinc-700 text-zinc-400",
                            )}
                          >
                            自动/默认
                          </button>
                          {char.costumes.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCostume(char.id, c.id)}
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px]",
                                currentCostume === c.id
                                  ? "border-orange-500 bg-orange-500/20 text-orange-300"
                                  : "border-zinc-700 text-zinc-400",
                              )}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 道具区 ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>道具</Label>
              <span className="text-[10px] text-zinc-500">
                已选 {selectedProps.size}/{assets.props.length} 个
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {assets.props.map((prop) => {
                const isSelected = selectedProps.has(prop.id)
                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => toggleProp(prop.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    {prop.imageUrl ? (
                      <img
                        src={prop.imageUrl}
                        alt={prop.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-900">
                        <Box className="h-3 w-3 text-zinc-700" />
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-300">
                      {prop.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── 底部说明 ── */}
          <p className="text-[10px] leading-relaxed text-zinc-500">
            整段保存按差异应用：取消的引用会从使用它的镜头移除，新选引用会补到对应镜头；各镜独立设置的插叙场景会保留，旧产物只标记待重生成，不会自动扣费。
          </p>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            variant="inverse"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}保存引用
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { SegmentAssetsDialog } from "./SegmentAssetsDialog"

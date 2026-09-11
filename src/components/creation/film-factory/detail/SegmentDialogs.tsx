"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Box,
  Clapperboard,
  Image as ImageIcon,
  Loader2,
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
  const [drafts, setDrafts] = useState<Record<string, ShotRefs>>({})
  const [initial, setInitial] = useState<Record<string, ShotRefs>>({})
  const [revisions, setRevisions] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [source, setSource] = useState("")
  useEffect(() => {
    if (!open) return
    const next: Record<string, ShotRefs> = {}
    for (const item of items) {
      const text = `${item.description} ${item.dialogue ?? ""}`
      next[item.id] = readShotRefs(item.generationParams) ?? {
        sceneId: assets.scenes.find((a) => text.includes(a.name))?.id ?? null,
        cast: assets.characters
          .filter((a) => text.includes(a.name))
          .map((a) => ({ characterId: a.id, costumeId: null })),
        propIds: assets.props
          .filter((a) => text.includes(a.name))
          .map((a) => a.id),
      }
    }
    setDrafts(next)
    setInitial(next)
    setSource("")
    setRevisions(
      Object.fromEntries(
        items.map((i) => [i.id, getRefsRevision(i.generationParams)]),
      ),
    )
    // 仅打开时取快照，后台刷新不能覆盖正在编辑的内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const usage = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const item of items) {
      const r = drafts[item.id]
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
  }, [drafts, items])
  const label = (id: string) =>
    usage.has(id) ? `用于 ${usage.get(id)!.join("/")} 镜` : "未引用"
  const update = (id: string, r: ShotRefs) =>
    setDrafts((prev) => ({ ...prev, [id]: r }))
  async function save() {
    setSaving(true)
    try {
      // 未保存过默认引用也必须写入；已存且未改的独立镜头不提交。
      const patches = items
        .filter(
          (i) =>
            readShotRefs(i.generationParams) === null ||
            JSON.stringify(drafts[i.id]) !== JSON.stringify(initial[i.id]),
        )
        .map((i) => ({
          storyboardId: i.id,
          revision: revisions[i.id],
          refs: drafts[i.id],
        }))
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
  const selectClass =
    "w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-xs"
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
            逐镜保留场景、人物造型和道具；整段替换仅影响使用原场景的镜头。
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={saving} className="space-y-4">
          <div className="rounded-lg border border-zinc-800 p-3">
            <Label>整段场景替换</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                aria-label="原场景"
                className={selectClass}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">选择要替换的场景</option>
                {assets.scenes
                  .filter((a) => usage.has(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {label(a.id)}
                    </option>
                  ))}
              </select>
              <select
                aria-label="替换为场景"
                className={selectClass}
                value=""
                disabled={!source}
                onChange={(e) => {
                  const target = e.target.value
                  setDrafts((prev) =>
                    Object.fromEntries(
                      Object.entries(prev).map(([id, r]) => [
                        id,
                        replaceScene(r, source, target || null),
                      ]),
                    ),
                  )
                  setSource("")
                }}
              >
                <option value="">选择新场景</option>
                {assets.scenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...assets.scenes, ...assets.characters, ...assets.props]
              .filter((a) => usage.has(a.id))
              .map((a) => (
                <span
                  className="rounded bg-zinc-800 px-2 py-1 text-[11px]"
                  key={a.id}
                >
                  {a.name} · {label(a.id)}
                </span>
              ))}
          </div>
          {items.map((item) => {
            const r = drafts[item.id]
            if (!r) return null
            return (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-zinc-800 p-3"
              >
                <p className="text-sm font-medium">第 {item.number} 镜</p>
                <p className="line-clamp-2 text-xs text-zinc-500">
                  {item.description}
                </p>
                <select
                  aria-label={`第${item.number}镜场景`}
                  className={selectClass}
                  value={r.sceneId ?? ""}
                  onChange={(e) =>
                    update(item.id, { ...r, sceneId: e.target.value || null })
                  }
                >
                  <option value="">无场景引用</option>
                  {assets.scenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <div className="space-y-2">
                  <Label>人物与造型</Label>
                  {assets.characters.map((c) => {
                    const selected = r.cast.find((v) => v.characterId === c.id)
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <label className="flex min-w-24 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() =>
                              update(item.id, {
                                ...r,
                                cast: selected
                                  ? r.cast.filter((v) => v.characterId !== c.id)
                                  : [
                                      ...r.cast,
                                      { characterId: c.id, costumeId: null },
                                    ],
                              })
                            }
                          />
                          {c.name}
                        </label>
                        {selected && (
                          <select
                            aria-label={`第${item.number}镜${c.name}造型`}
                            className={selectClass}
                            value={selected.costumeId ?? ""}
                            onChange={(e) =>
                              update(item.id, {
                                ...r,
                                cast: r.cast.map((v) =>
                                  v.characterId === c.id
                                    ? {
                                        ...v,
                                        costumeId: e.target.value || null,
                                      }
                                    : v,
                                ),
                              })
                            }
                          >
                            <option value="">人物默认造型</option>
                            {c.costumes.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-3">
                  {assets.props.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={r.propIds.includes(p.id)}
                        onChange={() =>
                          update(item.id, {
                            ...r,
                            propIds: r.propIds.includes(p.id)
                              ? r.propIds.filter((v) => v !== p.id)
                              : [...r.propIds, p.id],
                          })
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
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

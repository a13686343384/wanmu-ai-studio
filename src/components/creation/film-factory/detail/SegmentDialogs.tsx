"use client"

import { useEffect, useMemo, useState } from "react"
import { Box, Clapperboard, Image as ImageIcon, Loader2, Users, Wand2 } from "lucide-react"
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
import { cn } from "@/lib/utils"

export interface SegmentAssetLists {
  characters: { id: string; name: string; imageUrl: string | null; costumes: { id: string; name: string }[] }[]
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
}

interface Refs {
  sceneId?: string | null
  cast?: { characterId: string; costumeId?: string | null }[]
  propIds?: string[]
}

function readRefs(item: SegmentItem): Refs {
  const params = (item as unknown as { generationParams?: { refs?: Refs } }).generationParams
  return params?.refs ?? {}
}

function nameHit(text: string, name: string): boolean {
  return text.includes(name)
}

/** 自动匹配：按分镜描述/台词中出现的资产名生成默认引用。 */
function autoRefs(items: SegmentItem[], assets: SegmentAssetLists): Refs {
  const text = items
    .map((item) => `${item.description} ${item.dialogue ?? ""}`)
    .join("\n")
  const scene = assets.scenes.find((s) => nameHit(text, s.name))
  const cast = assets.characters
    .filter((c) => nameHit(text, c.name))
    .map((c) => ({ characterId: c.id, costumeId: null as string | null }))
  const propIds = assets.props.filter((p) => nameHit(text, p.name)).map((p) => p.id)
  return { sceneId: scene?.id ?? null, cast, propIds }
}

/**
 * 编辑整段引用（原型 image10）：
 * 场景网格 / 人物造型 chips / 道具多选，默认按分镜描述自动匹配，可调整；
 * 保存 = 把引用按条应用到该段每个分镜（generationParams.refs）。
 */
export function SegmentRefsDialog({
  open,
  onOpenChange,
  segmentTitle,
  items,
  assets,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  segmentTitle: string
  items: SegmentItem[]
  assets: SegmentAssetLists
  onSaved: () => void
}) {
  const [refs, setRefs] = useState<Refs>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setRefs(autoRefs(items, assets))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const usageCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const r = readRefs(item)
      for (const id of [r.sceneId, ...r.cast?.map((c) => c.characterId) ?? [], ...r.propIds ?? []]) {
        if (id) map.set(id, (map.get(id) ?? 0) + 1)
      }
    }
    return map
  }, [items])

  function toggleScene(id: string) {
    setRefs((r) => ({ ...r, sceneId: r.sceneId === id ? null : id }))
  }
  function toggleCast(id: string) {
    setRefs((r) => {
      const cast = r.cast ?? []
      return {
        ...r,
        cast: cast.some((c) => c.characterId === id)
          ? cast.filter((c) => c.characterId !== id)
          : [...cast, { characterId: id, costumeId: null }],
      }
    })
  }
  function setCostume(characterId: string, costumeId: string | null) {
    setRefs((r) => ({
      ...r,
      cast: (r.cast ?? []).map((c) =>
        c.characterId === characterId ? { ...c, costumeId } : c,
      ),
    }))
  }
  function toggleProp(id: string) {
    setRefs((r) => ({
      ...r,
      propIds: (r.propIds ?? []).includes(id)
        ? (r.propIds ?? []).filter((p) => p !== id)
        : [...(r.propIds ?? []), id],
    }))
  }

  async function save() {
    setSaving(true)
    try {
      for (const item of items) {
        const res = await fetch(`/api/storyboards/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refs }),
        })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.error ?? "保存失败")
        }
      }
      toast.success(`已保存「${segmentTitle}」的引用`, {
        description: `${items.length} 个镜头已按条应用`,
      })
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const costumeOf = (characterId: string) =>
    refs.cast?.find((c) => c.characterId === characterId)?.costumeId ?? ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑整段引用 · {segmentTitle}</DialogTitle>
          <DialogDescription>
            当前展示本段 {items.length} 个分镜的引用合集；取消错误项并选中正确项，保存后应用到本段全部镜头。
          </DialogDescription>
        </DialogHeader>

        {/* 场景 */}
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-zinc-300">
            <Clapperboard className="h-3.5 w-3.5" />
            场景
          </p>
          <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {assets.scenes.map((scene) => {
              const active = refs.sceneId === scene.id
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => toggleScene(scene.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                    active
                      ? "border-orange-500/60 bg-orange-500/[0.06]"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600",
                  )}
                >
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                    {scene.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={scene.imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-zinc-200">{scene.name}</span>
                    <span className="block text-[10px] text-zinc-600">
                      {active ? "本段引用" : "新增引用"}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 人物与造型 */}
        <div>
          <p className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-300">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              人物与造型
            </span>
            <span className="text-[10px] text-zinc-600">
              已选 {(refs.cast?.length ?? 0)}/{assets.characters.length} 人
            </span>
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {assets.characters.map((character) => {
              const selected = refs.cast?.some((c) => c.characterId === character.id)
              return (
                <div
                  key={character.id}
                  className={cn(
                    "rounded-lg border p-2",
                    selected ? "border-orange-500/50 bg-orange-500/[0.05]" : "border-zinc-800 bg-zinc-900/40",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-left"
                    onClick={() => toggleCast(character.id)}
                  >
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                      {character.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={character.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-200">
                      {character.name}
                    </span>
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border",
                        selected ? "border-orange-400 bg-orange-400" : "border-zinc-600",
                      )}
                    />
                  </button>
                  {selected && character.costumes.length > 0 && (
                    <div className="mt-1.5">
                      <p className="text-[10px] text-zinc-600">选择该人物在镜头中的造型</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setCostume(character.id, null)}
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px]",
                            !costumeOf(character.id)
                              ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                              : "border-zinc-800 text-zinc-400",
                          )}
                        >
                          自动/默认
                        </button>
                        {character.costumes.map((costume) => (
                          <button
                            key={costume.id}
                            type="button"
                            onClick={() => setCostume(character.id, costume.id)}
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px]",
                              costumeOf(character.id) === costume.id
                                ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                                : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
                            )}
                          >
                            {costume.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 道具 */}
        <div>
          <p className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-300">
            <span className="flex items-center gap-1">
              <Box className="h-3.5 w-3.5" />
              道具
            </span>
            <span className="text-[10px] text-zinc-600">
              已选 {(refs.propIds?.length ?? 0)}/{assets.props.length} 个
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {assets.props.map((prop) => {
              const selected = refs.propIds?.includes(prop.id)
              return (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => toggleProp(prop.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border p-1.5 text-left transition-colors",
                    selected
                      ? "border-orange-500/60 bg-orange-500/[0.06]"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600",
                  )}
                >
                  <span className="h-7 w-7 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                    {prop.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prop.imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="max-w-28 truncate text-[10px] text-zinc-300">{prop.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-zinc-600">
          整段保存按条应用：取消引用会从使用它的镜头移除，新引用会补到对应镜头；各镜头独立设置的局部引用会保留。
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="inverse" size="sm" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            保存引用
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 段资产弹窗（原型 image9）：本段分镜图批量出图 + 首帧图 / 调度图 / 人群调度卡。
 */
export function SegmentAssetsDialog({
  open,
  onOpenChange,
  segmentTitle,
  items,
  aspectRatio,
  onGenerateImage,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  segmentTitle: string
  items: SegmentItem[]
  aspectRatio: string
  /** 生成某分镜的首帧图（复用父级逐镜出图链路） */
  onGenerateImage: (item: SegmentItem) => Promise<void>
  onDone: () => void
}) {
  const [sequential, setSequential] = useState(true)
  const [safeRewrite, setSafeRewrite] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progressLabel, setProgressLabel] = useState("")

  const missing = items.filter((item) => !item.imageUrl)
  const firstShot = items[0]

  async function fillAll() {
    setBusy(true)
    try {
      if (sequential) {
        for (const [index, item] of missing.entries()) {
          setProgressLabel(`正在出图 ${index + 1}/${missing.length}（分镜 ${item.number}）`)
          await onGenerateImage(item)
        }
      } else {
        for (const [index, item] of missing.entries()) {
          setProgressLabel(`正在出图 ${index + 1}/${missing.length}（分镜 ${item.number}）`)
          await onGenerateImage(item)
        }
      }
      toast.success(`本段分镜图已补全（${missing.length} 张）`)
      onDone()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "出图失败")
    } finally {
      setBusy(false)
      setProgressLabel("")
    }
  }

  async function regenerateAll() {
    setBusy(true)
    try {
      for (const [index, item] of items.entries()) {
        setProgressLabel(`正在重新生成 ${index + 1}/${items.length}（分镜 ${item.number}）`)
        await onGenerateImage(item)
      }
      toast.success("本段分镜图已全部重新生成")
      onDone()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重新生成失败")
    } finally {
      setBusy(false)
      setProgressLabel("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Box className="h-4 w-4" />
            段资产 · {segmentTitle}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          本段建议出首帧：出视频前置，锁住空间 / 调度 / 人群不漂移。
        </DialogDescription>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-400">文本模型（编提示词）</Label>
            <CardSelect
              ariaLabel="段资产文本模型"
              value="auto"
              options={[{ value: "auto", label: "自动（跟随资产设置）" }]}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-400">生图模型（首帧 / 调度图）</Label>
            <CardSelect
              ariaLabel="段资产生图模型"
              value="auto"
              options={[{ value: "auto", label: "自动（跟随资产设置）" }]}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
          <p className="text-[11px] text-zinc-400">
            本段分镜图 共 {items.length} 张 · {missing.length} 张未生成
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-200">同场景逐张出（画面更稳）</span>
            <Switch checked={sequential} onCheckedChange={setSequential} />
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            镜内相邻场景的镜串并行生成后，后一张参考前一张锁住地点 / 光线 —— 所以同一时间只会看到一张在出图，会慢一些。关键段落内并
            张，快但相邻联可能轻微漂移。
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-200">安全改写（防审核拦截）</span>
            <Switch checked={safeRewrite} onCheckedChange={setSafeRewrite} />
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            血腥 / 暴力力自动软化为暗示 + 用电影化隐喻达表达，让严格审核的模型也能过审。默认关（想保留血腥，用宽松模型时关闭）。
          </p>
          <p className="text-[10px] text-zinc-500">
            按左面选定的模型与参数生成【本段】分镜图，不影响同集其它分镜。已绑定的分镜图会被附近。下方三项是出视频的前置资产，各自单独生成。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "first", label: "首帧图" },
            { key: "plan", label: "调度图", note: "本段无需" },
          ].map((tile) => (
            <div
              key={tile.key}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-zinc-200">
                  {tile.key === "first" ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {tile.label}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={busy || !firstShot}
                  onClick={() => firstShot && void onGenerateImage(firstShot)}
                >
                  出图
                </Button>
              </div>
              <div
                className="mt-1.5 flex items-center justify-center rounded border border-zinc-800 bg-zinc-950 text-[10px] text-zinc-600"
                style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
              >
                {tile.key === "plan" ? (tile.note ?? "未生成") : "未出图"}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-zinc-200">
              <Users className="h-3.5 w-3.5" />
              人群调度卡
              <span className="ml-1 text-[10px] text-zinc-600">本段无需</span>
            </span>
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled>
              生成
            </Button>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
            一枝独字方案（不造图）：路人 / 群演的数量、类型、景深层次、移动方向、与主角的遮挡规则，出视频时翻译成「人群密度」与边进提示词，街道 / 商
            场 / 车站 / 餐厅等公共场所类镜头常需要。
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
          {busy && (
            <span className="mr-auto flex items-center gap-1.5 text-[11px] text-orange-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {progressLabel}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {missing.length < items.length && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void regenerateAll()}>
              重新生成全部（{items.length}）
            </Button>
          )}
          <Button
            variant="brand"
            size="sm"
            disabled={busy || missing.length === 0}
            onClick={() => void fillAll()}
          >
            补全所有图片（{missing.length}）
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

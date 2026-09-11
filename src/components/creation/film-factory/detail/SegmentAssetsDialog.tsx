"use client"
import { useEffect, useState, useRef } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAiModels } from "@/hooks/useAiModels"
import type {
  SegmentAssetConfig,
  SegmentAssetAction,
} from "@/lib/storyboards/segment-assets"
import type { SegmentItem } from "./SegmentDialogs"

const ASPECT_RATIOS = [
  "1:1",
  "2:1",
  "1:2",
  "5:4",
  "4:5",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "16:9",
  "9:16",
  "21:9",
] as const

const QUALITY_TIERS = ["低画质", "标准画质", "高画质"] as const

const CROWD_KEYWORDS = ["人群", "群演", "街道", "商场", "车站", "餐厅"]

type Task = {
  id: string
  state: string
  completed: number
  failed: number
  total: number | null
  currentLabel: string
  error?: string | null
  result?: { segment?: { products?: Record<string, unknown> } }
}

export function SegmentAssetsDialog({
  open,
  onOpenChange,
  segmentTitle,
  items,
  aspectRatio,
  onDone,
  scriptId,
  segmentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  segmentTitle: string
  items: SegmentItem[]
  aspectRatio: string
  onGenerateImage?: (item: SegmentItem) => Promise<void>
  onDone: () => void
  scriptId?: string
  segmentId?: string
}) {
  const text = useAiModels("text"),
    image = useAiModels("image")
  const [config, setConfig] = useState<SegmentAssetConfig>({
    textModelId: "auto",
    imageModelId: "auto",
    aspectRatio: (ASPECT_RATIOS.includes(
      aspectRatio as (typeof ASPECT_RATIOS)[number],
    )
      ? aspectRatio
      : "16:9") as SegmentAssetConfig["aspectRatio"],
    resolution: "2K",
    qualityTier: "低画质",
    sequential: true,
    safeRewrite: false,
  })
  const [products, setProducts] = useState<Record<string, unknown>>({}),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("")
  const [task, setTask] = useState<Task | null>(null)
  const requestKey = useRef<{ signature: string; key: string } | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const activeTask = Boolean(
    task && ["queued", "running", "cancel_requested"].includes(task.state),
  )
  const [feedback, setFeedback] = useState("")
  const sid = segmentId ?? items[0]?.segmentId
  const endpoint =
    scriptId && sid ? `/api/scripts/${scriptId}/segments/${sid}/assets` : null

  // Determine if this segment needs blocking/crowd plans
  const allDescriptions = [
    segmentTitle,
    ...items.map((i) => i.description ?? ""),
  ].join(" ")
  const needsCrowdOrBlocking = CROWD_KEYWORDS.some((kw) =>
    allDescriptions.includes(kw),
  )

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError("")
    let active = true
    if (!endpoint) {
      setError("镜组尚未完成迁移，请刷新后重试")
      setLoading(false)
      return
    }
    fetch(endpoint)
      .then(async (res) => {
        const p = await res.json()
        if (!res.ok) throw new Error(p.error ?? "读取失败")
        if (active) {
          if (p.data.config) setConfig(p.data.config)
          setProducts(p.data.products ?? {})
          setTask(p.data.activeTask ?? null)
        }
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, endpoint])
  useEffect(() => {
    if (!open || !task?.id || !activeTask) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks/${task.id}`)
        const p = await res.json()
        if (!res.ok) throw new Error(p.error ?? "任务读取失败")
        if (cancelled) return
        const next = p.data as Task
        setTask(next)
        if (["succeeded", "failed", "cancelled"].includes(next.state)) {
          if (next.result?.segment?.products)
            setProducts(next.result.segment.products)
          setFeedback(
            next.error ??
              `${next.currentLabel}：完成 ${next.completed}/${next.total ?? "未知"}，失败 ${next.failed}`,
          )
          if (next.state === "succeeded") toast.success("段资产任务完成")
          else if (next.state === "failed")
            toast.error(next.error ?? "任务部分失败，已保留成功项")
          doneRef.current()
          return
        }
      } catch (e) {
        if (!cancelled)
          setFeedback(e instanceof Error ? e.message : "任务连接失败，将重试")
      }
      if (!cancelled) timer = setTimeout(poll, 1500)
    }
    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, task?.id, activeTask])
  async function cancel() {
    if (!task) return
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      const p = await res.json()
      if (!res.ok) throw new Error(p.error ?? "请求停止失败")
      setTask(p.data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "请求停止失败")
    }
  }
  async function run(action: SegmentAssetAction) {
    if (!endpoint) return
    const signature = JSON.stringify({ endpoint, action, config })
    if (requestKey.current?.signature !== signature)
      requestKey.current = { signature, key: crypto.randomUUID() }
    setBusy(true)
    setFeedback("请求处理中，等待实际结果")
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": requestKey.current.key,
        },
        body: JSON.stringify({ action, config }),
      })
      const p = await res.json()
      if (!res.ok) throw new Error(p.error ?? "生成失败")
      requestKey.current = null
      if (p.data.task) {
        setTask(p.data.task)
        setFeedback("任务已加入队列，可在任务队列查看进度")
        toast.success("任务已提交")
        onDone()
        return
      }
      setProducts(p.data.segment?.products ?? products)
      setFeedback(
        `完成 ${p.data.completed}/${p.data.total}，失败 ${p.data.failed}`,
      )
      if (p.data.failed)
        toast.error(`部分生成失败（${p.data.failed}项）`, {
          description: p.data.failures?.[0]?.error,
        })
      else toast.success("段资产生成完成")
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败")
      setFeedback("生成失败，请查看错误后重试")
    } finally {
      setBusy(false)
    }
  }
  const missing = items.filter((i) => !i.imageUrl).length
  const field =
    "w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs"
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v)
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>段资产 · {segmentTitle}</DialogTitle>
          <DialogDescription>
            本段建议出首帧 — 出视频前置，锁住空间/调度/人群不漂移。
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p className="flex gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            读取已保存配置
          </p>
        )}
        {(error || text.error || image.error) && (
          <p role="alert" className="text-xs text-red-400">
            {error || text.error || image.error}
          </p>
        )}
        <fieldset
          disabled={busy || activeTask || loading || Boolean(error)}
          className="space-y-4"
        >
          {/* Model selects */}
          <div className="grid grid-cols-2 gap-3">
            {(["text", "image"] as const).map((kind) => (
              <label key={kind} className="space-y-1 text-xs">
                {kind === "text" ? "文本模型（编写提示词）" : "生图模型"}
                <select
                  aria-label={
                    kind === "text" ? "段资产文本模型" : "段资产生图模型"
                  }
                  className={field}
                  value={
                    kind === "text" ? config.textModelId : config.imageModelId
                  }
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      [kind === "text" ? "textModelId" : "imageModelId"]:
                        e.target.value,
                    }))
                  }
                >
                  <option value="auto">自动（当前工作区默认）</option>
                  {(kind === "text" ? text.models : image.models).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {/* Aspect ratio — 12 circular buttons */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">比例</Label>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, aspectRatio: r }))}
                  className={cn(
                    "h-7 min-w-[3rem] rounded-full border px-2 text-[10px] transition-colors",
                    config.aspectRatio === r
                      ? "border-orange-500 bg-orange-500/20 text-orange-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution — 3 circular buttons */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">清晰度</Label>
            <div className="flex gap-1.5">
              {(["1K", "2K", "4K"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, resolution: r }))}
                  className={cn(
                    "h-7 min-w-[2.5rem] rounded-full border px-2 text-[10px] transition-colors",
                    config.resolution === r
                      ? "border-orange-500 bg-orange-500/20 text-orange-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Quality tier — 3 rounded-rect buttons */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">画质档位</Label>
            <div className="flex gap-1.5">
              {QUALITY_TIERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, qualityTier: q }))}
                  className={cn(
                    "rounded-md border px-3 py-1 text-[10px] transition-colors",
                    config.qualityTier === q
                      ? "border-orange-500 bg-orange-500/20 text-orange-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed hint about storyboard/first-frame rendering */}
          <p className="rounded bg-zinc-900/60 px-2 py-1.5 text-[10px] leading-relaxed text-zinc-500">
            💡 影视厂的分镜图 / 首帧图 / 调度图固定按 1K ·
            低渲染出（它们只是视频的参考稿，出大图只会更慢更贵），此处不可调。
          </p>

          {/* Estimated cost hint */}
          <p className="text-[10px] text-zinc-500">
            💰 预计单张约 14 爆米花 ·
            图生图略高。首帧图是成片第 0 帧，默认按全剧交付比例出，跟成片一致。
          </p>

          {/* Toggles */}
          <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
            <div className="flex justify-between text-sm">
              <Label>同场景逐张出图</Label>
              <Switch
                checked={config.sequential}
                onCheckedChange={(sequential) =>
                  setConfig((c) => ({ ...c, sequential }))
                }
              />
            </div>
            <p className="text-xs text-zinc-500">
              段内相邻同场景的镜头串行生成，后一张参考前一张锁住地点/光线——所以同一时间只会看到一张在出图，会慢一些。关掉则段内并发，快但相邻镜可能轻微漂移。
            </p>
            <div className="flex justify-between">
              <Label>安全改写</Label>
              <Switch
                checked={config.safeRewrite}
                onCheckedChange={(safeRewrite) =>
                  setConfig((c) => ({ ...c, safeRewrite }))
                }
              />
            </div>
            <p className="text-xs text-zinc-500">
              血腥/暴力自动软化露骨词 +
              用电影化隐喻表达，让严格审核的模型也能过审。默认关（想保留血腥，用宽松模型时别开）。
            </p>
          </div>

          {/* First frame & blocking plan cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { action: "firstFrame", key: "firstFrameUrl", label: "首帧图" },
                {
                  action: "blockingPlan",
                  key: "blockingPlanUrl",
                  label: "调度图",
                },
              ] as const
            ).map((tile) => {
              const isBlocking = tile.action === "blockingPlan"
              const disabled = isBlocking && !needsCrowdOrBlocking
              return (
                <div
                  key={tile.key}
                  className={cn(
                    "rounded-lg border border-zinc-800 p-3",
                    disabled && "opacity-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>{tile.label}</Label>
                      {disabled && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          本段无需
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => void run(tile.action)}
                    >
                      生成
                    </Button>
                  </div>
                  {typeof products[tile.key] === "string" ? (
                    <a
                      href={products[tile.key] as string}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={products[tile.key] as string}
                        alt={tile.label}
                        className="mt-2 max-h-48 w-full object-contain"
                      />
                    </a>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-xs text-zinc-600">
                      未生成
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Crowd plan card */}
          <div
            className={cn(
              "rounded-lg border border-zinc-800 p-3",
              !needsCrowdOrBlocking && "opacity-50",
            )}
          >
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Label>人群调度卡（文本）</Label>
                {!needsCrowdOrBlocking && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    本段无需
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!needsCrowdOrBlocking}
                onClick={() => void run("crowdPlan")}
              >
                生成
              </Button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-400">
              {typeof products.crowdPlan === "string"
                ? products.crowdPlan
                : "记录群演数量、景深、移动方向与遮挡规则。"}
            </p>
          </div>

          {/* Stats row */}
          <p className="text-xs text-zinc-400">
            本段分镜图：共 {items.length} 张 · {missing} 张未生成
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void run("regenerate")}>
              重新生成全部（{items.length}）
            </Button>
            <Button variant="brand" onClick={() => void run("fill")}>
              补全所有图片 ({items.length})
            </Button>
          </div>
        </fieldset>
        {activeTask && task && (
          <div className="space-y-2 rounded border border-zinc-800 p-3">
            <p role="status" className="flex items-center gap-2 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              {task.currentLabel} · 完成 {task.completed}/
              {task.total ?? "总量未知"} · 失败 {task.failed}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={task.state === "cancel_requested"}
              onClick={() => void cancel()}
            >
              {task.state === "cancel_requested"
                ? "已请求停止，当前任务收尾中"
                : "请求停止"}
            </Button>
          </div>
        )}
        {feedback && (
          <p role="status" className="flex gap-2 text-xs text-orange-300">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {feedback}
          </p>
        )}
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          关闭
        </Button>
      </DialogContent>
    </Dialog>
  )
}

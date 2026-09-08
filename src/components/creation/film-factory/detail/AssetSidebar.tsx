"use client"

import { useState } from "react"
import {
  ChevronDown,
  Loader2,
  Package,
  RefreshCw,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"
import type { AssetDTO } from "@/lib/serializers/script"

type AssetKind = "characters" | "scenes" | "props"

const KIND_META: Record<AssetKind, { label: string; icon: typeof Users; apiKind: string }> = {
  characters: { label: "角色", icon: Users, apiKind: "character" },
  scenes: { label: "场景", icon: Sparkles, apiKind: "scene" },
  props: { label: "道具", icon: Package, apiKind: "prop" },
}

/**
 * 资产侧边栏（右栏）。
 * 角色 / 场景 / 道具三类资产，支持 AI 提取与逐类生成图片，
 * 生成过程中展示独立的 loading 状态。
 */
export function AssetSidebar({
  scriptId,
  characters,
  scenes,
  props,
  onRefresh,
}: {
  scriptId: string
  characters: AssetDTO[]
  scenes: AssetDTO[]
  props: AssetDTO[]
  onRefresh: () => void
}) {
  const [tab, setTab] = useState<AssetKind>("characters")
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState<AssetKind | null>(null)
  const [progress, setProgress] = useState(0)

  const lists: Record<AssetKind, AssetDTO[]> = { characters, scenes, props }

  async function extract() {
    setExtracting(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "提取失败")
      toast.success("资产已提取", {
        description: `角色 ${payload.data.counts.characters} · 场景 ${payload.data.counts.scenes} · 道具 ${payload.data.counts.props}`,
      })
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提取失败")
    } finally {
      setExtracting(false)
    }
  }

  async function generate(kind: AssetKind) {
    const items = lists[kind]
    if (items.length === 0) {
      toast.error("请先提取该类资产")
      return
    }

    setGenerating(kind)
    setProgress(6)

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 7 + Math.random() * 8))
    }, 500)

    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: KIND_META[kind].apiKind }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")

      setProgress(100)
      toast.success(`${KIND_META[kind].label}图已生成`, {
        description: `共 ${payload.data.generated} 个`,
      })
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      window.clearInterval(timer)
      window.setTimeout(() => {
        setGenerating(null)
        setProgress(0)
      }, 400)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          全剧资产
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void extract()}
          disabled={extracting}
          aria-label="重新提取资产"
        >
          {extracting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as AssetKind)} className="flex min-h-0 flex-1 flex-col">
        <div className="px-2.5 pt-2.5">
          <TabsList className="w-full">
            {(Object.keys(KIND_META) as AssetKind[]).map((kind) => {
              const Icon = KIND_META[kind].icon
              return (
                <TabsTrigger key={kind} value={kind} className="flex-1 gap-1 text-[11px]">
                  <Icon className="h-3 w-3" />
                  {KIND_META[kind].label}
                  <span className="text-zinc-500">{lists[kind].length}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {(Object.keys(KIND_META) as AssetKind[]).map((kind) => {
          const items = lists[kind]
          const done = items.filter((i) => i.imageUrl).length
          const isGenerating = generating === kind

          return (
            <TabsContent key={kind} value={kind} className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 py-2">
                  <span className="text-[10px] text-zinc-600">
                    {done}/{items.length} 已出图
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto h-7"
                    onClick={() => void generate(kind)}
                    disabled={isGenerating || items.length === 0}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    生成{KIND_META[kind].label}图
                  </Button>
                </div>

                {isGenerating && (
                  <div className="mb-2 space-y-1 rounded-lg border border-orange-500/30 bg-orange-500/[0.06] p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-orange-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        正在生成{KIND_META[kind].label}…
                      </span>
                      <span className="tabular-nums text-zinc-500">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} indicatorClassName="bg-orange-500" />
                  </div>
                )}

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {items.length === 0 ? (
                    <EmptyState
                      size="compact"
                      icon={KIND_META[kind].icon}
                      title={`还没有${KIND_META[kind].label}`}
                      description="点击右上角刷新按钮从剧本提取"
                      className="border-none bg-transparent"
                    />
                  ) : (
                    items.map((item) => (
                      <AssetCard key={item.id} asset={item} kind={kind} />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

/** 单个资产卡片：缩略图 + 名称 + 描述 + 生成状态。 */
function AssetCard({ asset, kind }: { asset: AssetDTO; kind: AssetKind }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
      <div className="flex gap-2 p-2">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
          {asset.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.imageUrl}
              alt={asset.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {asset.status === "generating" ? (
                <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
              ) : (
                <span className="text-[9px] text-zinc-600">待生成</span>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs text-zinc-200">{asset.name}</span>
            {kind === "characters" && (
              <span title="含妆造">
                <Shirt className="h-3 w-3 shrink-0 text-zinc-600" />
              </span>
            )}
            {asset.imageUrl && (
              <Badge variant="success" className="h-4 px-1 text-[9px]">
                已出图
              </Badge>
            )}
          </div>
          <p className={cn("mt-0.5 text-[10px] leading-relaxed text-zinc-500", !expanded && "line-clamp-2")}>
            {asset.description}
          </p>
          {asset.description.length > 40 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-0.5 flex items-center gap-0.5 text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", expanded && "rotate-180")} />
              {expanded ? "收起" : "展开"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

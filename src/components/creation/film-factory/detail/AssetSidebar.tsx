"use client"

import { useState } from "react"
import {
  ChevronDown,
  ClipboardList,
  Download,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"
import type { AssetDTO, CostumeDTO } from "@/lib/serializers/script"

type AssetKind = "characters" | "outfits" | "props" | "scenes"

/**
 * 资产侧边栏（右栏，需求图 img-05/09/17）。
 * 四类 Tab：角色（仅提取）/ 妆造库（人物子集造型）/ 道具库 / 场景；
 * 标题行按钮排：重新提取 · 打包下载 · 补缺漏（关键词）· 提示词模板 · 添加。
 */
export function AssetSidebar({
  scriptId,
  characters,
  scenes,
  props,
  assetPromptTemplate,
  onRefresh,
}: {
  scriptId: string
  characters: AssetDTO[]
  scenes: AssetDTO[]
  props: AssetDTO[]
  assetPromptTemplate?: string | null
  onRefresh: () => void
}) {
  const [tab, setTab] = useState<AssetKind>("characters")
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const costumes: (CostumeDTO & { characterName: string })[] = characters.flatMap(
    (character) =>
      (character.costumes ?? []).map((costume) => ({
        ...costume,
        characterName: character.name,
      })),
  )

  async function extract(options?: { merge?: boolean; keyword?: string }) {
    setExtracting(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(options?.merge ? { merge: true, keyword: options.keyword } : {}),
        }),
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

  async function generate(kind: string, label: string) {
    setGenerating(kind)
    setProgress(6)

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 7 + Math.random() * 8))
    }, 500)

    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")

      setProgress(100)
      toast.success(`${label}图已生成`, {
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

  function downloadAll() {
    const images = [
      ...characters.filter((c) => c.imageUrl).map((c) => ({ name: c.name, url: c.imageUrl! })),
      ...costumes
        .filter((c) => c.imageUrl)
        .map((c) => ({ name: `${c.characterName}-${c.name}`, url: c.imageUrl! })),
      ...props.filter((p) => p.imageUrl).map((p) => ({ name: p.name, url: p.imageUrl! })),
      ...scenes.filter((s) => s.imageUrl).map((s) => ({ name: s.name, url: s.imageUrl! })),
    ]
    if (images.length === 0) {
      toast.info("还没有已出图的资产")
      return
    }
    for (const image of images) {
      const anchor = document.createElement("a")
      anchor.href = image.url
      anchor.download = image.name
      anchor.click()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 标题 + 按钮排（img-09） */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium tracking-wider text-zinc-500">
          全剧资产
        </span>
        <div className="flex items-center gap-1">
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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={downloadAll}
            aria-label="打包下载全部资产图"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <MissingFillPopover scriptId={scriptId} extracting={extracting} onExtract={extract} />
          <TemplatePopover scriptId={scriptId} initial={assetPromptTemplate ?? ""} onSaved={onRefresh} />
          {tab !== "characters" && (
            <AddAssetButton
              scriptId={scriptId}
              kind={tab}
              characters={characters}
              onDone={onRefresh}
            />
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as AssetKind)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-2.5 pt-2.5">
          <TabsList className="w-full">
            <TabsTrigger value="characters" className="flex-1 gap-1 text-[11px]">
              <Users className="h-3 w-3" />
              角色
              <span className="text-zinc-500">{characters.length}</span>
            </TabsTrigger>
            <TabsTrigger value="outfits" className="flex-1 gap-1 text-[11px]">
              <Shirt className="h-3 w-3" />
              妆造库
              <span className="text-zinc-500">{costumes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="props" className="flex-1 gap-1 text-[11px]">
              <Package className="h-3 w-3" />
              道具库
              <span className="text-zinc-500">{props.length}</span>
            </TabsTrigger>
            <TabsTrigger value="scenes" className="flex-1 gap-1 text-[11px]">
              场景
              <span className="text-zinc-500">{scenes.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {generating && (
          <div className="space-y-1 border-b border-zinc-800/80 px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-orange-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                正在生成…
              </span>
              <span className="tabular-nums text-zinc-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} indicatorClassName="bg-orange-500" />
          </div>
        )}

        {/* 角色 */}
        <TabsContent value="characters" className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 py-2">
              <span className="text-[10px] text-zinc-600">角色只能从剧本提取</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7"
                onClick={() => void generate("characters", "角色")}
                disabled={generating !== null || characters.length === 0}
              >
                {generating === "characters" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                生成角色图
              </Button>
            </div>
            <div className="studio-scroll min-h-0 flex-1 space-y-2 overflow-y-auto">
              {characters.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={Users}
                  title="还没有角色"
                  description="点击左上角刷新按钮从剧本提取"
                  className="border-none bg-transparent"
                />
              ) : (
                characters.map((character) => (
                  <AssetCard key={character.id} asset={character} />
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* 妆造库 */}
        <TabsContent value="outfits" className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
          <OutfitList
            characters={characters}
            costumes={costumes}
            generating={generating === "outfits"}
            onGenerate={() => void generate("outfits", "造型")}
            scriptId={scriptId}
            onDone={onRefresh}
          />
        </TabsContent>

        {/* 道具库 */}
        <TabsContent value="props" className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
          <div className="flex h-full flex-col">
            <Button
              variant="outline"
              size="sm"
              className="mb-2"
              onClick={() => void generate("props", "道具")}
              disabled={generating !== null || props.length === 0}
            >
              {generating === "props" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              生成道具图
            </Button>
            <div className="studio-scroll min-h-0 flex-1 space-y-2 overflow-y-auto">
              {props.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={Package}
                  title="还没有道具"
                  description="点「+ 新建道具」手动添加，或从剧本提取"
                  className="border-none bg-transparent"
                />
              ) : (
                props.map((prop) => <AssetCard key={prop.id} asset={prop} />)
              )}
            </div>
          </div>
        </TabsContent>

        {/* 场景 */}
        <TabsContent value="scenes" className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
          <div className="flex h-full flex-col">
            <Button
              variant="outline"
              size="sm"
              className="mb-2"
              onClick={() => void generate("scenes", "场景")}
              disabled={generating !== null || scenes.length === 0}
            >
              {generating === "scenes" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              生成场景图
            </Button>
            <div className="studio-scroll min-h-0 flex-1 space-y-2 overflow-y-auto">
              {scenes.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={Package}
                  title="还没有场景"
                  description="点「+ 添加场景」手动添加，或从剧本提取"
                  className="border-none bg-transparent"
                />
              ) : (
                scenes.map((scene) => <AssetCard key={scene.id} asset={scene} />)
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const TAB_META: Record<AssetKind, { label: string }> = {
  characters: { label: "角色" },
  outfits: { label: "妆造" },
  props: { label: "道具" },
  scenes: { label: "场景" },
}

/* ---------------------------- 单个资产卡 ---------------------------- */

function AssetCard({ asset }: { asset: AssetDTO }) {
  const [expanded, setExpanded] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
      <div className="flex gap-2 p-2">
        <button
          type="button"
          onClick={() => asset.imageUrl && setPreviewOpen(true)}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950"
        >
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
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs text-zinc-200">{asset.name}</span>
            {asset.imageUrl && (
              <Badge variant="success" className="h-4 px-1 text-[9px]">
                已出图
              </Badge>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 text-[10px] leading-relaxed text-zinc-500",
              !expanded && "line-clamp-2",
            )}
          >
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

      {previewOpen && asset.imageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-8"
          onClick={() => setPreviewOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.imageUrl}
            alt={asset.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </div>
  )
}

/* ---------------------------- 妆造库（按人物分组） ---------------------------- */

function OutfitList({
  characters,
  costumes,
  generating,
  onGenerate,
  scriptId,
  onDone,
}: {
  characters: AssetDTO[]
  costumes: (CostumeDTO & { characterName: string })[]
  generating: boolean
  onGenerate: () => void
  scriptId: string
  onDone: () => void
}) {
  return (
    <div className="studio-scroll min-h-0 flex-1 space-y-3 overflow-y-auto">
      {characters.length === 0 ? (
        <EmptyState
          size="compact"
          icon={Shirt}
          title="还没有角色"
          description="先从剧本提取角色，再为其添加造型"
          className="border-none bg-transparent"
        />
      ) : (
        characters.map((character) => {
          const mine = costumes.filter((costume) => costume.characterId === character.id)
          return (
            <div key={character.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
              <div className="flex items-center gap-1.5 pb-1.5">
                <Shirt className="h-3 w-3 text-zinc-500" />
                <span className="truncate text-xs font-medium text-zinc-300">{character.name}</span>
                <div className="ml-auto">
                  <AddAssetButton
                    scriptId={scriptId}
                    kind="outfits"
                    characters={characters}
                    fixedCharacterId={character.id}
                    onDone={onDone}
                    label="+ 新建造型"
                  />
                </div>
              </div>
              {mine.length === 0 ? (
                <p className="text-[10px] text-zinc-600">暂无造型</p>
              ) : (
                <div className="space-y-1.5">
                  {mine.map((costume) => (
                    <CostumeCard key={costume.id} costume={costume} />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onGenerate}
        disabled={generating || costumes.length === 0}
      >
        {generating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        生成造型图（未出图的）
      </Button>
    </div>
  )
}

function CostumeCard({ costume }: { costume: CostumeDTO & { characterName: string } }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-1.5">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
        {costume.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={costume.imageUrl}
            alt={costume.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[8px] text-zinc-600">
            待出图
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-zinc-200">{costume.name}</p>
        {costume.situation && (
          <p className="truncate text-[9px] text-zinc-600">{costume.situation}</p>
        )}
      </div>
    </div>
  )
}

/* ---------------------------- 手动添加弹窗 ---------------------------- */

function AddAssetButton({
  scriptId,
  kind,
  characters,
  fixedCharacterId,
  onDone,
  label,
}: {
  scriptId: string
  kind: "outfits" | "props" | "scenes"
  characters: AssetDTO[]
  fixedCharacterId?: string
  onDone: () => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [situation, setSituation] = useState("")
  const [description, setDescription] = useState("")
  const [characterId, setCharacterId] = useState(fixedCharacterId ?? "")
  const [saving, setSaving] = useState(false)

  const TITLE =
    kind === "outfits" ? "新建造型" : kind === "props" ? "新建道具" : "添加场景"
  const NOTE =
    kind === "outfits"
      ? "同一角色的多套穿着/形态。人物是父级，造型是其子集；新增后可独立出图并用于分镜引用。"
      : kind === "props"
        ? "道具可独立存在，也可关联人物作为跨造型一致性锚点；新增后可独立出图并用于分镜引用。"
        : "场景可独立出图并用于分镜引用。"

  async function submit() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const body: Record<string, unknown> =
        kind === "outfits"
          ? {
              kind: "costume",
              characterId: fixedCharacterId,
              name: name.trim(),
              situation: situation.trim() || undefined,
              description: description.trim() || undefined,
            }
          : kind === "props"
            ? {
                kind: "prop",
                name: name.trim(),
                description: description.trim() || undefined,
                parentCharacterId: characterId || undefined,
              }
            : { kind: "scene", name: name.trim(), description: description.trim() || undefined }
      const res = await fetch(`/api/scripts/${scriptId}/assets/manual`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "创建失败")
      toast.success(`${TITLE}成功`)
      setName("")
      setSituation("")
      setDescription("")
      onDone()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px]">
          <Plus className="h-3 w-3" />
          {label ?? TITLE}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2.5">
        <p className="text-xs font-medium text-zinc-200">{TITLE}</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">{NOTE}</p>

        {kind === "outfits" && characters.length > 0 && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">所属人物</Label>
            <select
              value={fixedCharacterId ?? characterId}
              onChange={(event) => setCharacterId(event.target.value)}
              disabled={Boolean(fixedCharacterId)}
              className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-2 text-xs text-zinc-300 outline-none"
            >
              {(fixedCharacterId
                ? [
                    {
                      id: fixedCharacterId,
                      name:
                        characters.find((c) => c.id === fixedCharacterId)?.name ?? "当前人物",
                    },
                  ]
                : characters
              ).map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {kind === "props" && characters.length > 0 && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">所属人物（可选）</Label>
            <select
              value={characterId}
              onChange={(event) => setCharacterId(event.target.value)}
              className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-2 text-xs text-zinc-300 outline-none"
            >
              <option value="">不关联人物（独立道具）</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">
            {kind === "outfits" ? "造型名称" : kind === "props" ? "道具名称" : "场景名称"}
          </Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              kind === "outfits" ? "如：夜行战斗装" : kind === "props" ? "如：玄铁长剑" : "如：废土工厂"
            }
            className="h-8 text-xs"
          />
        </div>

        {kind === "outfits" && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">适用情节（可选）</Label>
            <Input
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="如：夜战、潜入"
              className="h-8 text-xs"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">
            {kind === "outfits" ? "服装与发型描述（可选）" : kind === "props" ? "外观一致性细节（可选）" : "场景描述（可选）"}
          </Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="服装版型、材质、颜色、发型及需保持的细节…"
            className="text-xs"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            variant="inverse"
            size="sm"
            onClick={() => void submit()}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            添加
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ---------------------------- 补缺漏 / 提示词模板 ---------------------------- */

function MissingFillPopover({
  scriptId,
  extracting,
  onExtract,
}: {
  scriptId: string
  extracting: boolean
  onExtract: (options: { merge: boolean; keyword?: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="补缺漏提取">
          <Wand2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="text-xs font-medium text-zinc-200">补缺漏提取</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          重新扫一遍全剧正文，把遗漏的角色/场景/妆造/道具自动补上——只补缺失，不动已有的任何内容。
        </p>
        <Textarea
          rows={2}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="捕捉关键词（可选），逗号分隔"
          className="text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={extracting}
          onClick={() => {
            onExtract({ merge: true, keyword: keyword.trim() || undefined })
            setOpen(false)
          }}
        >
          {extracting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          开始补缺漏
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function TemplatePopover({
  scriptId,
  initial,
  onSaved,
}: {
  scriptId: string
  initial: string
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetPromptTemplate: value.trim() || null }),
      })
      if (!res.ok) throw new Error("保存失败")
      toast.success("提示词模板已保存", { description: "所有角色卡将模仿它生成" })
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="设置角色提示词模板">
          <ClipboardList className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2">
        <p className="text-xs font-medium text-zinc-200">设置角色提示词模板</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          给一段示例 prompt，置入内置框架，所有角色模仿它生成
        </p>
        <Textarea
          rows={4}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="text-xs"
        />
        <Button variant="outline" size="sm" className="w-full" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          保存
        </Button>
      </PopoverContent>
    </Popover>
  )
}

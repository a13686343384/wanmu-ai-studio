"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  ClipboardList,
  Download,
  Loader2,
  Lock,
  LockOpen,
  Merge,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { normalizeAssetConfig } from "@/lib/assets/config"
const AssetConfigContext = createContext(normalizeAssetConfig(null))
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/EmptyState"
import { Textarea } from "@/components/ui/textarea"
import { CardSelect } from "@/components/ui/card-select"
import { cn } from "@/lib/utils"
import { useAiModels } from "@/hooks/useAiModels"
import type { AssetDTO, CostumeDTO } from "@/lib/serializers/script"

type AssetKind = "characters" | "outfits" | "props" | "scenes"

const TAB_TITLE: Record<AssetKind, string> = {
  characters: "全剧角色",
  outfits: "妆造库",
  props: "道具库",
  scenes: "全剧场景",
}

/* 按钮排的 tooltip 文案（严格按需求图 img-10~13） */
const TIP = {
  refresh: "把全剧（含已出图的）重新出一遍——删除旧图重出，用最新提示词框架",
  download: "打包下载本剧全部图（角色卡 + 妆造 + 道具）",
  missing:
    "觉得 AI 提取漏了？重新扫一遍全剧正文，把遗漏的角色/场景/妆造/道具自动补上——还能填「捕捉关键词」让它重点找。只补缺失，不动你已有的任何内容",
  template:
    "设置角色提示词模板——给一段示例 prompt，置入内置框架，所有角色模仿它生成",
} as const

/** 带悬停提示的图标按钮（按钮排统一用）。 */
function TipButton({
  label,
  tip,
  onClick,
  disabled,
  children,
  variant = "outline",
}: {
  label: string
  tip: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: "outline" | "inverse" | "ghost"
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-[220px] text-[11px] leading-relaxed"
      >
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * 资产侧边栏（右栏，严格按需求图 img-05/09/17）：
 * 标题行（全剧角色 + 按钮排：重新出一遍 / 打包下载 / 补缺漏 / 提示词模板 / 添加）
 * → Tab（角色 · 妆造库 · 道具库 · 场景）→ 内容。
 */
export function AssetSidebar({
  scriptId,
  characters,
  scenes,
  props,
  assetPromptTemplate,
  outfitPromptTemplate,
  propPromptTemplate,
  scenePromptTemplate,
  assetGenerationConfig,
  onRefresh,
}: {
  scriptId: string
  characters: AssetDTO[]
  scenes: AssetDTO[]
  props: AssetDTO[]
  assetPromptTemplate?: string | null
  outfitPromptTemplate?: string | null
  propPromptTemplate?: string | null
  scenePromptTemplate?: string | null
  assetGenerationConfig?: unknown
  onRefresh: () => void
}) {
  /** 各 Tab 独立的提示词模板（角色 / 妆造 / 道具 / 场景互不相同） */
  const templateByKind: Record<AssetKind, string> = {
    characters: assetPromptTemplate ?? "",
    outfits: outfitPromptTemplate ?? "",
    props: propPromptTemplate ?? "",
    scenes: scenePromptTemplate ?? "",
  }
  const config = normalizeAssetConfig(assetGenerationConfig)
  const { models: batchModels } = useAiModels("image")
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchModel, setBatchModel] = useState(config.imageModelId)
  const [batchResolution, setBatchResolution] = useState(config.resolution)
  const [batchMode, setBatchMode] = useState<"missing" | "all">("missing")
  const batchLock = useRef(false)
  const [batchCounts, setBatchCounts] = useState({
    generated: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  })
  const [tab, setTab] = useState<AssetKind>("characters")
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const costumes: (CostumeDTO & { characterName: string })[] =
    characters.flatMap((character) =>
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
    // 真实进度：单次请求无法量化时展示不确定态（旋转 + 文案），不再用假百分比
    setGenerating(kind)
    setProgress(0)

    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      if (payload.data?.failed)
        throw new Error(
          `成功 ${payload.data.generated}，失败 ${payload.data.failed}：${payload.data.errors?.[0]?.error ?? "请重试"}`,
        )
      if (payload.data?.generated === 0)
        throw new Error("没有生成新图片；请检查资产是否锁定或正在生成")

      toast.success(`${label}图已生成`, {
        description: `共 ${payload.data.generated} 个`,
      })
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setGenerating(null)
      setProgress(0)
    }
  }

  /** 一次性重出全剧资产图（需求3 第二步）：角色 → 场景 → 道具 → 造型，逐类生成 */
  const [regenAll, setRegenAll] = useState(false)
  async function regenerateAllImages() {
    if (batchLock.current) return
    batchLock.current = true
    setRegenAll(true)
    const count = { generated: 0, failed: 0, skipped: 0, total: 0 }
    setBatchCounts({ ...count })
    try {
      for (const kind of ["character", "scene", "prop", "outfit"]) {
        const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind,
            model: batchModel,
            resolution: batchResolution,
            mode: batchMode,
          }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "资产图生成失败")
        for (const key of ["generated", "failed", "skipped", "total"] as const)
          count[key] += payload.data[key] ?? 0
        setBatchCounts({ ...count })
        onRefresh()
      }
      if (count.failed)
        toast.error(
          `出图完成：成功 ${count.generated}，失败 ${count.failed}，跳过 ${count.skipped}。可补缺图重试失败项。`,
        )
      else if (!count.generated)
        toast.info(`没有需要生成的资产，已跳过 ${count.skipped} 项`)
      else
        toast.success(
          `资产出图完成：成功 ${count.generated}，跳过 ${count.skipped}`,
        )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "出图失败")
    } finally {
      setRegenAll(false)
      batchLock.current = false
      onRefresh()
    }
  }

  function downloadAll() {
    const images = [
      ...characters
        .filter((c) => c.imageUrl)
        .map((c) => ({ name: c.name, url: c.imageUrl! })),
      ...costumes
        .filter((c) => c.imageUrl)
        .map((c) => ({
          name: `${c.characterName}-${c.name}`,
          url: c.imageUrl!,
        })),
      ...props
        .filter((p) => p.imageUrl)
        .map((p) => ({ name: p.name, url: p.imageUrl! })),
      ...scenes
        .filter((s) => s.imageUrl)
        .map((s) => ({ name: s.name, url: s.imageUrl! })),
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
    <AssetConfigContext.Provider value={config}>
      <div className="flex h-full flex-col">
        {/* 标题行：全剧角色 + 按钮排（img-09 红框区） */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400">
            {TAB_TITLE[tab]}
          </span>
          <div className="flex items-center gap-1.5">
            <TipButton
              label="重新出图"
              tip={TIP.refresh}
              disabled={extracting || regenAll}
              onClick={() => {
                setBatchModel(config.imageModelId)
                setBatchResolution(config.resolution)
                setBatchOpen(true)
              }}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", regenAll && "animate-spin")}
              />
            </TipButton>
            <TipButton
              label="打包下载"
              tip={TIP.download}
              onClick={downloadAll}
            >
              <Download className="h-3.5 w-3.5" />
            </TipButton>
            <MissingFillPopover
              scriptId={scriptId}
              extracting={extracting}
              onExtract={extract}
            />
            <TemplatePopover
              kind={tab}
              scriptId={scriptId}
              initial={templateByKind[tab]}
              onSaved={onRefresh}
            />
            {tab !== "characters" && (
              <AddAssetButton
                scriptId={scriptId}
                kind={tab}
                characters={characters}
                onDone={onRefresh}
                variant="inverse"
              />
            )}
          </div>
        </div>

        <Dialog
          open={batchOpen}
          onOpenChange={(open) => {
            if (!regenAll) setBatchOpen(open)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>生成全剧资产图</DialogTitle>
              <DialogDescription>
                角色、场景、道具和造型共用保存的配置；锁定项始终保留。设定卡固定横版
                16:9。
              </DialogDescription>
            </DialogHeader>
            <CardSelect
              disabled={regenAll}
              ariaLabel="全剧资产生图模型"
              value={batchModel}
              onValueChange={setBatchModel}
              options={[
                { value: "auto", label: "默认模型" },
                ...batchModels.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
            <CardSelect
              disabled={regenAll}
              ariaLabel="资产出图分辨率"
              value={batchResolution}
              onValueChange={(v) => setBatchResolution(v as "1K" | "2K" | "4K")}
              options={RESOLUTIONS.map((v) => ({ value: v, label: v }))}
            />
            <CardSelect
              disabled={regenAll}
              ariaLabel="资产出图范围"
              value={batchMode}
              onValueChange={(v) => setBatchMode(v as "missing" | "all")}
              options={[
                { value: "missing", label: "补缺图 / 重试失败项" },
                { value: "all", label: "重出全部未锁定资产（覆盖已有图）" },
              ]}
            />
            {regenAll && (
              <p className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                等待当前类别完成 · 已成功 {batchCounts.generated} / 失败{" "}
                {batchCounts.failed} / 跳过 {batchCounts.skipped}
              </p>
            )}
            <Button
              variant="brand"
              disabled={regenAll || !batchModel}
              onClick={() => void regenerateAllImages()}
            >
              {regenAll
                ? "正在生成…"
                : batchMode === "missing"
                  ? "生成缺少的资产图"
                  : "确认重出全部未锁定资产"}
            </Button>
          </DialogContent>
        </Dialog>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as AssetKind)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Tab：角色 N · 妆造库 N · 道具库 N · 场景 N */}
          <div className="px-2.5 pt-2.5">
            <TabsList className="w-full">
              <TabsTrigger
                value="characters"
                className="flex-1 gap-1 text-[11px]"
              >
                角色
                <span className="text-zinc-500">{characters.length}</span>
              </TabsTrigger>
              <TabsTrigger value="outfits" className="flex-1 gap-1 text-[11px]">
                妆造库
                <span className="text-zinc-500">{costumes.length}</span>
              </TabsTrigger>
              <TabsTrigger value="props" className="flex-1 gap-1 text-[11px]">
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
            <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2 text-[11px] text-orange-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在生成{TAB_TITLE[tab]}…（单次请求完成后自动刷新）
            </div>
          )}

          {/* 角色：大图角色卡（img-05/09） */}
          <TabsContent
            value="characters"
            className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 py-2">
                <span className="text-[10px] text-zinc-600">
                  角色只能从剧本提取，不能手动添加
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => void generate("character", "角色")}
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
                    <CharacterCard
                      key={character.id}
                      character={character}
                      characters={characters}
                      scriptId={scriptId}
                      onDone={onRefresh}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* 妆造库：按人物分组，+ 新建造型（生成按钮置顶，与道具/场景一致） */}
          <TabsContent
            value="outfits"
            className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5"
          >
            <div className="flex h-full flex-col">
              <Button
                variant="outline"
                size="sm"
                className="mb-2"
                onClick={() => void generate("outfit", "造型")}
                disabled={generating !== null || costumes.length === 0}
              >
                {generating === "outfits" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                生成造型图（未出图的）
              </Button>
              <OutfitList
                characters={characters}
                costumes={costumes}
                scriptId={scriptId}
                onDone={onRefresh}
              />
            </div>
          </TabsContent>

          {/* 道具库 */}
          <TabsContent
            value="props"
            className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5"
          >
            <div className="flex h-full flex-col">
              <Button
                variant="outline"
                size="sm"
                className="mb-2"
                onClick={() => void generate("prop", "道具")}
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
                    description="点右上角「+」新建道具，或从剧本提取"
                    className="border-none bg-transparent"
                  />
                ) : (
                  props.map((prop) => (
                    <PropCard
                      key={prop.id}
                      prop={prop}
                      characters={characters}
                      scriptId={scriptId}
                      onDone={onRefresh}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* 场景 */}
          <TabsContent
            value="scenes"
            className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5"
          >
            <div className="flex h-full flex-col">
              <Button
                variant="outline"
                size="sm"
                className="mb-2"
                onClick={() => void generate("scene", "场景")}
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
                    description="点右上角「+」添加场景，或从剧本提取"
                    className="border-none bg-transparent"
                  />
                ) : (
                  scenes.map((scene) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      scriptId={scriptId}
                      onDone={onRefresh}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AssetConfigContext.Provider>
  )
}

/* ---------------------------- 资产大图预览（需求4：放大镜查看整图） ---------------------------- */

function AssetImagePreview({
  url,
  alt,
  onClose,
}: {
  url: string
  alt: string
  onClose: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[92vh] w-fit max-w-[92vw] overflow-hidden border-zinc-700 bg-zinc-950 p-1 sm:max-w-[92vw]">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          完整资产图，可使用 Esc 关闭预览。
        </DialogDescription>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="block max-h-[90vh] max-w-[90vw] rounded object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}

/* ---------------------------- 角色大图卡（img-05/09 + 更多菜单） ---------------------------- */

const RESOLUTIONS = ["1K", "2K", "4K"] as const
const QUALITY_TIERS = ["低画质", "标准画质", "高画质"] as const

function CharacterCard({
  character,
  characters,
  scriptId,
  onDone,
}: {
  character: AssetDTO
  characters: AssetDTO[]
  scriptId: string
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [genOpen, setGenOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>, success?: string) {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/scripts/${scriptId}/assets/${character.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      )
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "操作失败")
      if (success) toast.success(success)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally {
      setBusy(false)
    }
  }

  /** 上传本地图片：mode=replace 直接替换已出图；mode=ref 加入出图参考图 */
  async function uploadImage(file: File, mode: "replace" | "ref") {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("图片大小须在 20MB 以内")
      return
    }
    setBusy(true)
    const notice = toast.loading("正在上传图片…")
    try {
      const form = new FormData()
      form.set("scriptId", scriptId)
      form.set("file", file)
      const res = await fetch("/api/media", { method: "POST", body: form })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "上传失败")
      const url = payload.data.url as string
      if (mode === "replace") {
        await patch({ imageUrl: url }, "已替换角色图")
      } else {
        const next = Array.from(
          new Set([...(character.refImages ?? []), url]),
        ).slice(0, 10)
        await patch({ refImages: next }, "参考图已上传")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败")
    } finally {
      toast.dismiss(notice)
      setBusy(false)
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/scripts/${scriptId}/assets/${character.id}`,
        {
          method: "DELETE",
        },
      )
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "删除失败")
      toast.success(`已删除「${character.name}」`)
      onDone()
      setDeleteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  function downloadImage() {
    if (!character.imageUrl) return
    const anchor = document.createElement("a")
    anchor.href = character.imageUrl
    anchor.download = `${character.name}-参考图`
    anchor.click()
  }

  const others = characters.filter((item) => item.id !== character.id)

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50">
      <div className="group relative aspect-[16/10] bg-zinc-900">
        {character.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            role="button"
            tabIndex={0}
            src={character.imageUrl}
            alt={character.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full cursor-zoom-in object-cover"
            onClick={() => !busy && setPreviewUrl(character.imageUrl ?? null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (!busy) setPreviewUrl(character.imageUrl ?? null)
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {character.status === "generating" ? (
              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
            ) : (
              <Users className="h-5 w-5 text-zinc-700" />
            )}
          </div>
        )}

        {/* 状态 + 锁定徽标（右上角） */}
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          {character.locked && (
            <span
              aria-label="已锁定"
              className="flex h-[18px] w-[18px] items-center justify-center rounded bg-zinc-950/85 p-0.5 text-amber-300 ring-1 ring-amber-500/40"
            >
              <Lock className="h-2.5 w-2.5" />
            </span>
          )}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              character.status === "completed"
                ? "bg-emerald-500/20 text-emerald-300"
                : character.status === "generating"
                  ? "bg-orange-500/20 text-orange-300"
                  : "bg-zinc-800 text-zinc-400",
            )}
          >
            {character.status === "completed"
              ? "已完成"
              : character.status === "generating"
                ? "生成中"
                : character.status === "failed"
                  ? "生成失败，可重试"
                  : "待生成"}
          </span>
        </div>

        {/* 悬浮操作条（右下角）：有图=下载/上传/编辑/更多；无图=生成/上传/编辑/删除 */}
        <div className={cn(
          "absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1",
          character.imageUrl ? "opacity-0 transition-opacity duration-150 group-hover:opacity-100" : "opacity-100",
        )}>
          {character.imageUrl ? (
            <ImageActionButton
              label="下载原图"
              disabled={busy}
              onClick={downloadImage}
            >
              <Download className="h-3 w-3" />
            </ImageActionButton>
          ) : (
            <ImageActionButton
              label="生成"
              disabled={busy}
              onClick={() => setGenOpen(true)}
            >
              <Sparkles className="h-3 w-3" />
            </ImageActionButton>
          )}
          <ImageActionButton
            label="上传"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
          </ImageActionButton>
          <ImageActionButton
            label="编辑"
            disabled={busy}
            onClick={() => setGenOpen(true)}
          >
            <Pencil className="h-3 w-3" />
          </ImageActionButton>
          {!character.imageUrl && (
            <ImageActionButton
              label="删除"
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
              className="bg-rose-950/90 text-rose-200 ring-rose-500/40 hover:bg-rose-900"
            >
              <Trash2 className="h-3 w-3" />
            </ImageActionButton>
          )}
          {character.imageUrl && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="更多"
                  disabled={busy}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded bg-rose-950/90 text-rose-200 ring-1 ring-rose-500/40 transition-colors hover:bg-rose-900"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setResetOpen(true)}>
                  <Sparkles />
                  重新出图
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={(character.refImages?.length ?? 0) === 0}
                  onSelect={() =>
                    void patch({ clearRefs: true }, "参考图已清空")
                  }
                >
                  <RefreshCw />
                  清空参考图
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                  <Upload />
                  上传图替换
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    void patch(
                      { locked: !character.locked },
                      character.locked
                        ? "已解锁，可再生成"
                        : "已锁定，再生成不覆盖",
                    )
                  }
                >
                  {character.locked ? <LockOpen /> : <Lock />}
                  {character.locked
                    ? "解锁（恢复再生成）"
                    : "锁定（再生成不覆盖）"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={others.length === 0}
                  onSelect={() => setMergeOpen(true)}
                >
                  <Merge />
                  合并到...（去重）
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  className="text-rose-400 focus:text-rose-300"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        <p className="truncate text-xs font-medium text-zinc-200">
          {character.name}
          {(character.aliases?.length ?? 0) > 0 && (
            <span className="ml-1 text-[10px] font-normal text-zinc-600">
              别名 {character.aliases?.join(" / ")}
            </span>
          )}
        </p>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
          {character.description}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadImage(file, "replace")
          event.target.value = ""
        }}
      />

      {/* 出角色参考图（编辑） */}
      <AssetGenerateDialog
        scriptId={scriptId}
        kind="character"
        asset={character}
        open={genOpen}
        onOpenChange={setGenOpen}
        onDone={onDone}
      />

      {/* 重新出图确认 */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重新出图</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            将清空「{character.name}
            」的参考图并重置状态，下次点「一键出全部资产」会重新出，继续？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => {
                setResetOpen(false)
                void patch(
                  { reset: true },
                  "已重置，下次一键出全部资产会重新出",
                )
              }}
            >
              重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 合并到...（去重） */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Merge className="h-4 w-4" />
              合并「{character.name}」到...
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            选一个保留的角色，把「{character.name}
            」合并进去（同人多默认请去重），它的出场集 /
            九宫格引用会改指过去，别名并入，然后删除「{character.name}」+
            退它的图。此操作不可撤销。
          </p>
          <div className="min-w-0 space-y-1.5">
            {others.map((target) => (
              <button
                key={target.id}
                type="button"
                disabled={busy}
                onClick={() => void mergeInto(target.id)}
                className="flex w-full items-center gap-2.5 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-left transition-colors hover:border-zinc-600 disabled:opacity-50"
              >
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                  {target.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={target.imageUrl}
                      alt={target.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-zinc-200">
                    {target.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                    身份背景：{target.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {previewUrl && (
        <AssetImagePreview
          url={previewUrl}
          alt={character.name}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {/* 删除确认 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>删除「{character.name}」</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            它的妆造、出图与引用关系会一并删除，此操作不可撤销。确定删除？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void doDelete()}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  async function mergeInto(targetId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/merge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: character.id, targetId }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "合并失败")
      toast.success(payload.message ?? "合并完成")
      onDone()
      setMergeOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "合并失败")
    } finally {
      setBusy(false)
    }
  }
}

/** 图片右下角悬浮小按钮（带悬停提示）。 */
function ImageActionButton({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn("flex h-[22px] w-[22px] items-center justify-center rounded bg-zinc-950/85 text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50", className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/* ---------------------------- 出参考图弹窗（角色 / 场景 · 编辑 / 单独出图） ---------------------------- */

function AssetGenerateDialog({
  scriptId,
  kind,
  asset: character,
  open,
  onOpenChange,
  onDone,
}: {
  scriptId: string
  kind: "character" | "scene"
  asset: AssetDTO
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const savedConfig = useContext(AssetConfigContext)
  const { models: imageModels } = useAiModels("image")
  const { models: textModels } = useAiModels("text")
  const [model, setModel] = useState(savedConfig.imageModelId)
  const [promptModel, setPromptModel] = useState(savedConfig.textModelId)
  const [prompt, setPrompt] = useState(character.prompt ?? "")
  const [refs, setRefs] = useState<string[]>(character.refImages ?? [])
  const [resolution, setResolution] = useState<string>(savedConfig.resolution)
  const [quality, setQuality] = useState<string>("标准画质")
  const [starting, setStarting] = useState(false)
  useEffect(() => {
    if (open) {
      setModel(savedConfig.imageModelId)
      setPromptModel(savedConfig.textModelId)
      setResolution(savedConfig.resolution)
    }
  }, [
    open,
    savedConfig.imageModelId,
    savedConfig.textModelId,
    savedConfig.resolution,
  ])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (imageModels.length > 0 && !model) setModel(imageModels[0]!.id)
  }, [imageModels, model])

  useEffect(() => {
    if (textModels.length > 0 && !promptModel) setPromptModel(textModels[0]!.id)
  }, [textModels, promptModel])

  const imageModel =
    imageModels.find((item) => item.id === model) ?? imageModels[0]

  async function uploadRef(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("图片大小须在 20MB 以内")
      return
    }
    const notice = toast.loading("正在上传参考图…")
    try {
      const form = new FormData()
      form.set("scriptId", scriptId)
      form.set("file", file)
      const res = await fetch("/api/media", { method: "POST", body: form })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "上传失败")
      setRefs((current) =>
        Array.from(new Set([...current, payload.data.url])).slice(0, 10),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败")
    } finally {
      toast.dismiss(notice)
    }
  }

  async function start() {
    setStarting(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          ids: [character.id],
          model,
          resolution,
          quality,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          ...(refs.length ? { refImages: refs } : {}),
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      if (payload.data?.failed)
        throw new Error(
          `成功 ${payload.data.generated}，失败 ${payload.data.failed}：${payload.data.errors?.[0]?.error ?? "请重试"}`,
        )
      if (payload.data?.generated === 0)
        throw new Error("没有生成新图片；请检查资产是否锁定或正在生成")
      toast.success(`「${character.name}」出图完成`, {
        description: "已出过会覆盖；确认无误后可继续下一角色",
      })
      onDone()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setStarting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Wand2 className="h-4 w-4" />
            {kind === "character" ? "出角色参考图" : "出场景参考图"}
          </DialogTitle>
        </DialogHeader>
        <p className="-mt-1 text-[11px] leading-relaxed text-zinc-500">
          单独给「{character.name}」出一张参考图，先看看风格效果。已出过会覆盖。
        </p>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">生成模型</Label>
          <CardSelect
            ariaLabel="生成模型"
            value={model}
            onValueChange={setModel}
            options={
              imageModels.length > 0
                ? [
                    { value: "auto", label: "默认模型" },
                    ...imageModels.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]
                : [{ value: "", label: "暂无可用模型，请到「AI 设置」配置" }]
            }
            className="w-full"
          />
        </div>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/[0.06] px-2.5 py-2 text-[10px] leading-relaxed text-orange-200/90">
          <span className="font-medium">
            🌸 模型参考用量 {imageModel?.cost ?? 0} = 1张 x{" "}
            {imageModel?.cost ?? 0}/张
          </span>
          <p className="mt-0.5 text-orange-200/60">
            仅估算出图：提示词编译(文本模型)与实际参数(比例/质量)略有出入。
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            提示词模型
            <span className="ml-1 text-[10px] text-zinc-600">
              （把简介扩写成资产卡 prompt）
            </span>
          </Label>
          <CardSelect
            ariaLabel="提示词模型"
            value={promptModel}
            onValueChange={setPromptModel}
            options={
              textModels.length > 0
                ? textModels.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))
                : [{ value: "", label: "暂无可用模型，请到「AI 设置」配置" }]
            }
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            出图提示词
            <span className="ml-1 text-[10px] text-zinc-600">
              （可改，留空 = AI 按简介自动缩写）
            </span>
          </Label>
          <Textarea
            aria-label="出图提示词"
            rows={6}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="留空则按角色简介自动生成提示词"
            className="font-mono text-[11px] leading-relaxed"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">参考图</Label>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            可选：让 AI 照着这张图出，被造型锚定到它。
            <br />
            文件有效期10分钟，10分钟后会自动清理参考图（不计入容量）。
          </p>
          {refs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {refs.map((url) => (
                <span key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="参考图"
                    className="h-10 w-10 rounded-md border border-zinc-800 object-cover"
                  />
                  <button
                    type="button"
                    aria-label="移除参考图"
                    onClick={() =>
                      setRefs((current) =>
                        current.filter((item) => item !== url),
                      )
                    }
                    className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-950 text-[10px] text-zinc-400 ring-1 ring-zinc-700 hover:text-rose-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            上传参考图
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
          <p className="text-[10px] text-zinc-500">
            生成参数（按模型 capability）
          </p>
          <div>
            <Label className="text-[10px] text-zinc-500">清晰度</Label>
            <div className="mt-1 flex gap-1">
              {RESOLUTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={resolution === item}
                  onClick={() => setResolution(item)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] transition-colors",
                    resolution === item
                      ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40"
                      : "text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500">画质档位</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {QUALITY_TIERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={quality === item}
                  onClick={() => setQuality(item)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] transition-colors",
                    quality === item
                      ? "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40"
                      : "text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-medium text-orange-300/90">
            🌸 预计单张约 {imageModel?.cost ?? 0}{" "}
            樱米花（模型标价，实际以任务记录为准）
          </p>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            比例固定 16:9 多画格资料卡（压框/侧栏/细节），最终视频比例无关 —
            九宫格故事板也固定 16:9，短片视频则按剧集比例出。
          </p>
        </div>

        <p className="text-[10px] text-zinc-600">
          提示：任务会在后台依次完成，本页每 5
          秒自动刷新，关闭页面后任务仍会继续。
        </p>

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={starting}
            onClick={() => void start()}
          >
            {starting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            开始出图
          </Button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void uploadRef(file)
            event.target.value = ""
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/* ---------------------------- 普通资产卡（妆造/道具/场景） ---------------------------- */

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
                <span className="text-[10px] text-zinc-600">待生成</span>
              )}
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs text-zinc-200">{asset.name}</span>
            {asset.imageUrl && (
              <Badge variant="success" className="h-4 px-1 text-[10px]">
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
              <ChevronDown
                className={cn(
                  "h-2.5 w-2.5 transition-transform",
                  expanded && "rotate-180",
                )}
              />
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
  scriptId,
  onDone,
}: {
  characters: AssetDTO[]
  costumes: (CostumeDTO & { characterName: string })[]
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
          const mine = costumes.filter(
            (costume) => costume.characterId === character.id,
          )
          return (
            <div key={character.id} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500">
                  {character.name} · {mine.length}套造型
                </span>
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
                <p className="text-[10px] text-zinc-600">
                  暂无造型，点右上角「+ 新建造型」添加
                </p>
              ) : (
                mine.map((costume) => (
                  <CostumeCard
                    key={costume.id}
                    costume={costume}
                    scriptId={scriptId}
                    onDone={onDone}
                  />
                ))
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

/** 妆造大图卡：悬停图片右下角出「重出 / 替换」。 */
function CostumeCard({
  costume,
  scriptId,
  onDone,
}: {
  costume: CostumeDTO & { characterName: string }
  scriptId: string
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [regenOpen, setRegenOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function deleteCostume() {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/${costume.id}`, { method: "DELETE" })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "删除失败")
      toast.success(`「${costume.name}」已删除`)
      setDeleteOpen(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  /** 替换：唤起系统文件选择框，上传后直接替换已出图 */
  async function uploadReplace(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("图片大小须在 20MB 以内")
      return
    }
    setBusy(true)
    const notice = toast.loading("正在上传图片…")
    try {
      const form = new FormData()
      form.set("scriptId", scriptId)
      form.set("file", file)
      const res = await fetch("/api/media", { method: "POST", body: form })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "上传失败")
      const patch = await fetch(
        `/api/scripts/${scriptId}/assets/${costume.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageUrl: payload.data.url }),
        },
      )
      const patchPayload = await patch.json()
      if (!patch.ok) throw new Error(patchPayload.error ?? "替换失败")
      toast.success("已替换造型图")
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "替换失败")
    } finally {
      toast.dismiss(notice)
      setBusy(false)
    }
  }

  /** 重新出这套造型：删掉当前图重新生成 */
  async function regenerate() {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "outfit",
          ids: [costume.id],

          resolution: "1K",
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      if (payload.data?.failed)
        throw new Error(
          `成功 ${payload.data.generated}，失败 ${payload.data.failed}：${payload.data.errors?.[0]?.error ?? "请重试"}`,
        )
      if (payload.data?.generated === 0)
        throw new Error("没有生成新图片；请检查资产是否锁定或正在生成")
      toast.success(`「${costume.name}」已重新出图`)
      onDone()
      setRegenOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50">
      <div className="group relative aspect-[16/10] bg-zinc-900">
        {costume.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            role="button"
            tabIndex={0}
            src={costume.imageUrl}
            alt={costume.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full cursor-zoom-in object-cover"
            onClick={() => !busy && setPreviewUrl(costume.imageUrl ?? null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (!busy) setPreviewUrl(costume.imageUrl ?? null)
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {costume.status === "generating" ? (
              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
            ) : (
              <Shirt className="h-5 w-5 text-zinc-700" />
            )}
          </div>
        )}

        {/* 名字徽标（左上）+ 状态徽标（右上） */}
        <span className="absolute left-1.5 top-1.5 rounded bg-zinc-950/85 px-1.5 py-0.5 text-[10px] text-zinc-300 ring-1 ring-zinc-800">
          {costume.name}
        </span>
        <span
          className={cn(
            "absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
            costume.status === "completed"
              ? "bg-emerald-500/20 text-emerald-300"
              : costume.status === "generating"
                ? "bg-orange-500/20 text-orange-300"
                : "bg-zinc-800 text-zinc-400",
          )}
        >
          {costume.status === "completed"
            ? "已完成"
            : costume.status === "generating"
              ? "生成中"
              : costume.status === "failed"
                ? "生成失败，可重试"
                : "待生成"}
        </span>

        {/* 悬浮操作条（右下）：有图=重出/替换；无图=生成/上传/编辑/删除 */}
        <div className={cn(
          "absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1",
          costume.imageUrl ? "opacity-0 transition-opacity duration-150 group-hover:opacity-100" : "opacity-100",
        )}>
          {costume.imageUrl ? (
            <>
              <button type="button" aria-label="重出" disabled={busy} onClick={() => setRegenOpen(true)}
                className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
                <RefreshCw className="h-3 w-3" />重出
              </button>
              <button type="button" aria-label="替换" disabled={busy} onClick={() => fileRef.current?.click()}
                className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
                <Upload className="h-3 w-3" />替换
              </button>
            </>
          ) : (
            <>
              <button type="button" aria-label="生成" disabled={busy} onClick={() => setRegenOpen(true)}
                className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
                <Sparkles className="h-3 w-3" />生成
              </button>
              <button type="button" aria-label="上传" disabled={busy} onClick={() => fileRef.current?.click()}
                className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
                <Upload className="h-3 w-3" />上传
              </button>
              <button type="button" aria-label="删除" disabled={busy} onClick={() => setDeleteOpen(true)}
                className="flex h-[22px] items-center gap-1 rounded bg-rose-950/90 px-1.5 text-[10px] text-rose-200 ring-1 ring-rose-500/40 transition-colors hover:bg-rose-900 disabled:opacity-50">
                <Trash2 className="h-3 w-3" />删除
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        <p className="truncate text-xs font-medium text-zinc-200">
          {costume.name}
        </p>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
          {costume.description || "无描述"}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadReplace(file)
          event.target.value = ""
        }}
      />

      {previewUrl && (
        <AssetImagePreview
          url={previewUrl}
          alt={costume.name}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {/* 重新出这套造型（确认） */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重新出这套造型</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            会删掉当前造型图重新生成（清还旧图容量，重新计费），会自动挂默认造型脸
            + 道具图保证一致，继续？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRegenOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void regenerate()}
            >
              重新出图
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除造型（确认） */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>删除造型</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            确定要删除「{costume.name}」吗？此操作不可恢复。
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void deleteCostume()}>删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------------------- 道具大图卡（重出/替换/编辑/删除） ---------------------------- */

function PropCard({
  prop,
  characters,
  scriptId,
  onDone,
}: {
  prop: AssetDTO
  characters: AssetDTO[]
  scriptId: string
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [regenOpen, setRegenOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>, success?: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/${prop.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "操作失败")
      if (success) toast.success(success)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally {
      setBusy(false)
    }
  }

  async function uploadReplace(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("图片大小须在 20MB 以内")
      return
    }
    setBusy(true)
    const notice = toast.loading("正在上传图片…")
    try {
      const form = new FormData()
      form.set("scriptId", scriptId)
      form.set("file", file)
      const res = await fetch("/api/media", { method: "POST", body: form })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "上传失败")
      await patch({ imageUrl: payload.data.url }, "已替换道具图")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "替换失败")
    } finally {
      toast.dismiss(notice)
      setBusy(false)
    }
  }

  async function regenerate() {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "prop",
          ids: [prop.id],

          resolution: "1K",
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      if (payload.data?.failed)
        throw new Error(
          `成功 ${payload.data.generated}，失败 ${payload.data.failed}：${payload.data.errors?.[0]?.error ?? "请重试"}`,
        )
      if (payload.data?.generated === 0)
        throw new Error("没有生成新图片；请检查资产是否锁定或正在生成")
      toast.success(`「${prop.name}」已重新出图`)
      onDone()
      setRegenOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setBusy(false)
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/${prop.id}`, {
        method: "DELETE",
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "删除失败")
      toast.success(`已删除「${prop.name}」`)
      onDone()
      setDeleteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50">
      <div className="group relative aspect-[16/10] bg-zinc-900">
        {prop.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            role="button"
            tabIndex={0}
            src={prop.imageUrl}
            alt={prop.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full cursor-zoom-in object-cover"
            onClick={() => !busy && setPreviewUrl(prop.imageUrl ?? null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (!busy) setPreviewUrl(prop.imageUrl ?? null)
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {prop.status === "generating" ? (
              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
            ) : (
              <Package className="h-5 w-5 text-zinc-700" />
            )}
          </div>
        )}

        {/* 类目徽标（左上橙）+ 状态徽标（右上） */}
        <span className="absolute left-1.5 top-1.5 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-300 ring-1 ring-orange-500/40">
          道具
        </span>
        <span
          className={cn(
            "absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
            prop.status === "completed"
              ? "bg-emerald-500/20 text-emerald-300"
              : prop.status === "generating"
                ? "bg-orange-500/20 text-orange-300"
                : "bg-zinc-800 text-zinc-400",
          )}
        >
          {prop.status === "completed"
            ? "已完成"
            : prop.status === "generating"
              ? "生成中"
              : prop.status === "failed"
                ? "生成失败，可重试"
                : "待生成"}
        </span>

        {/* 悬浮操作条（右下）：有图=重出/替换/编辑/删除；无图=生成/上传/编辑/删除 */}
        <div className={cn(
          "absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1",
          prop.imageUrl ? "opacity-0 transition-opacity duration-150 group-hover:opacity-100" : "opacity-100",
        )}>
          {prop.imageUrl ? (
            <button type="button" aria-label="重出" disabled={busy} onClick={() => setRegenOpen(true)}
              className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
              <RefreshCw className="h-3 w-3" />重出
            </button>
          ) : (
            <button type="button" aria-label="生成" disabled={busy} onClick={() => setRegenOpen(true)}
              className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
              <Sparkles className="h-3 w-3" />生成
            </button>
          )}
          <button type="button" aria-label={prop.imageUrl ? "替换" : "上传"} disabled={busy} onClick={() => fileRef.current?.click()}
            className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
            <Upload className="h-3 w-3" />{prop.imageUrl ? "替换" : "上传"}
          </button>
          <button type="button" aria-label="编辑" disabled={busy} onClick={() => setEditOpen(true)}
            className="flex h-[22px] items-center gap-1 rounded bg-zinc-950/85 px-1.5 text-[10px] text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
            <Pencil className="h-3 w-3" />编辑
          </button>
          <button type="button" aria-label="删除" disabled={busy} onClick={() => setDeleteOpen(true)}
            className="flex h-[22px] items-center gap-1 rounded bg-rose-950/90 px-1.5 text-[10px] text-rose-200 ring-1 ring-rose-500/40 transition-colors hover:bg-rose-900 disabled:opacity-50">
            <Trash2 className="h-3 w-3" />删除
          </button>
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        <p className="truncate text-xs font-medium text-zinc-200">
          {prop.name}
          {prop.parentCharacterId && (
            <span className="ml-1 text-[10px] font-normal text-zinc-600">
              关联{" "}
              {characters.find((c) => c.id === prop.parentCharacterId)?.name ??
                "人物"}
            </span>
          )}
        </p>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
          {prop.description || "无描述"}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadReplace(file)
          event.target.value = ""
        }}
      />

      {/* 重新出这个道具（确认） */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重新出这个道具</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            会删掉当前道具图重新生成（清还旧图容量，重新计费），关联人物时自动挂造型脸保证一致，继续？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRegenOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void regenerate()}
            >
              重新出图
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑道具卡 */}
      <PropEditDialog
        prop={prop}
        characters={characters}
        scriptId={scriptId}
        open={editOpen}
        onOpenChange={setEditOpen}
        busy={busy}
        onSave={(body) => patch(body, "道具卡已保存")}
      />

      {previewUrl && (
        <AssetImagePreview
          url={previewUrl}
          alt={prop.name}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {/* 删除确认 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除道具「{prop.name}」？</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            会同时删掉已出的道具图并退还存储容量。分镜中的旧引用会保留为失效项，方便在
            「编辑引用」中明确替换。
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void doDelete()}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** 编辑道具卡弹窗：所属人物 / 道具名称 / 外观与一致性细节。 */
function PropEditDialog({
  prop,
  characters,
  scriptId,
  open,
  onOpenChange,
  busy,
  onSave,
}: {
  prop: AssetDTO
  characters: AssetDTO[]
  scriptId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  onSave: (body: Record<string, unknown>) => Promise<void>
}) {
  const [name, setName] = useState(prop.name)
  const [description, setDescription] = useState(prop.description)
  const [parentCharacterId, setParentCharacterId] = useState(
    prop.parentCharacterId ?? "",
  )

  async function save() {
    if (!name.trim()) {
      toast.error("请输入道具名称")
      return
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      parentCharacterId: parentCharacterId || null,
    }
    await onSave(body)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            编辑道具卡
          </DialogTitle>
        </DialogHeader>
        <p className="-mt-1 text-[11px] leading-relaxed text-zinc-500">
          道具可独立管理，也可选关联一个人物，作为该人物跨造型的一致性锚点。
        </p>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">所属人物（可选）</Label>
          <CardSelect
            ariaLabel="所属人物"
            value={parentCharacterId}
            onValueChange={setParentCharacterId}
            placeholder="不关联人物（独立道具）"
            options={[
              { value: "", label: "不关联人物（独立道具）" },
              ...characters.map((character) => ({
                value: character.id,
                label: character.name,
              })),
            ]}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">道具名称</Label>
          <Input
            aria-label="道具名称"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：玄铁长剑"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            外观与一致性细节（可选）
          </Label>
          <Textarea
            aria-label="外观与一致性细节"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="例如：电磁手枪：黑色金属材质、枪身带有幽蓝色充能纹路、枪口有轻微磨损，能指示对面明确镜头。"
            className="text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="inverse"
            size="sm"
            disabled={busy}
            onClick={() => void save()}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------------------- 场景大图卡（空间资产 / 更多菜单） ---------------------------- */

const RATIOS = [
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
const SPATIAL_ANGLES = [
  { key: "overhead", label: "俯视布局" },
  { key: "front", label: "正向" },
  { key: "back", label: "反向" },
  { key: "left", label: "左侧" },
  { key: "right", label: "右侧" },
] as const

function SceneCard({
  scene,
  scriptId,
  onDone,
}: {
  scene: AssetDTO
  scriptId: string
  onDone: () => void
}) {
  const [preview, setPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [genOpen, setGenOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [spatialOpen, setSpatialOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>, success?: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/${scene.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "操作失败")
      if (success) toast.success(success)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally {
      setBusy(false)
    }
  }

  async function uploadImage(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("图片大小须在 20MB 以内")
      return
    }
    setBusy(true)
    const notice = toast.loading("正在上传图片…")
    try {
      const form = new FormData()
      form.set("scriptId", scriptId)
      form.set("file", file)
      const res = await fetch("/api/media", { method: "POST", body: form })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "上传失败")
      await patch({ imageUrl: payload.data.url }, "已替换场景图")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败")
    } finally {
      toast.dismiss(notice)
      setBusy(false)
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/${scene.id}`, {
        method: "DELETE",
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "删除失败")
      toast.success(`已删除「${scene.name}」`)
      onDone()
      setDeleteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  function downloadImage() {
    if (!scene.imageUrl) return
    const anchor = document.createElement("a")
    anchor.href = scene.imageUrl
    anchor.download = `${scene.name}-参考图`
    anchor.click()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50">
      {preview && scene.imageUrl && (
        <AssetImagePreview
          url={scene.imageUrl}
          alt={scene.name}
          onClose={() => setPreview(false)}
        />
      )}
      <div className="group relative aspect-[16/10] bg-zinc-900">
        {scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            role="button"
            tabIndex={0}
            src={scene.imageUrl}
            alt={scene.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full cursor-zoom-in object-cover"
            onClick={() => !busy && setPreview(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (!busy) setPreview(true)
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {scene.status === "generating" ? (
              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
            ) : (
              <Package className="h-5 w-5 text-zinc-700" />
            )}
          </div>
        )}

        <span className="absolute left-1.5 top-1.5 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-300 ring-1 ring-orange-500/40">
          场景
        </span>
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          {scene.locked && (
            <span
              aria-label="已锁定"
              className="flex h-[18px] w-[18px] items-center justify-center rounded bg-zinc-950/85 p-0.5 text-amber-300 ring-1 ring-amber-500/40"
            >
              <Lock className="h-2.5 w-2.5" />
            </span>
          )}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              scene.status === "completed"
                ? "bg-emerald-500/20 text-emerald-300"
                : scene.status === "generating"
                  ? "bg-orange-500/20 text-orange-300"
                  : "bg-zinc-800 text-zinc-400",
            )}
          >
            {scene.status === "completed"
              ? "已完成"
              : scene.status === "generating"
                ? "生成中"
                : scene.status === "failed"
                  ? "生成失败，可重试"
                  : "待生成"}
          </span>
        </div>

        {/* 悬浮操作条（右下角）：有图=下载/上传/编辑/更多；无图=生成/上传/编辑/删除 */}
        <div className={cn(
          "absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1",
          scene.imageUrl ? "opacity-0 transition-opacity duration-150 group-hover:opacity-100" : "opacity-100",
        )}>
          {scene.imageUrl ? (
            <>
              <ImageActionButton label="下载原图" disabled={busy} onClick={downloadImage}>
                <Download className="h-3 w-3" />
              </ImageActionButton>
              <ImageActionButton label="上传" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3" />
              </ImageActionButton>
              <ImageActionButton label="编辑" disabled={busy} onClick={() => setGenOpen(true)}>
                <Pencil className="h-3 w-3" />
              </ImageActionButton>
            </>
          ) : (
            <>
              <ImageActionButton label="生成" disabled={busy} onClick={() => setGenOpen(true)}>
                <Sparkles className="h-3 w-3" />
              </ImageActionButton>
              <ImageActionButton label="上传" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3" />
              </ImageActionButton>
              <ImageActionButton label="编辑" disabled={busy} onClick={() => setGenOpen(true)}>
                <Pencil className="h-3 w-3" />
              </ImageActionButton>
              <ImageActionButton label="删除" disabled={busy} onClick={() => setDeleteOpen(true)}
                className="bg-rose-950/90 text-rose-200 ring-rose-500/40 hover:bg-rose-900">
                <Trash2 className="h-3 w-3" />
              </ImageActionButton>
            </>
          )}
          {scene.imageUrl && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="更多"
                  disabled={busy}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded bg-rose-950/90 text-rose-200 ring-1 ring-rose-500/40 transition-colors hover:bg-rose-900"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setResetOpen(true)}>
                  <Sparkles />
                  重新出图
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={(scene.refImages?.length ?? 0) === 0}
                  onSelect={() =>
                    void patch({ clearRefs: true }, "参考图已清空")
                  }
                >
                  <RefreshCw />
                  清空参考图
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                  <Upload />
                  上传图替换
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    void patch(
                      { locked: !scene.locked },
                      scene.locked
                        ? "已解锁，可再生成"
                        : "已锁定，再生成不覆盖",
                    )
                  }
                >
                  {scene.locked ? <LockOpen /> : <Lock />}
                  {scene.locked ? "解锁（恢复再生成）" : "锁定（再生成不覆盖）"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSpatialOpen(true)}>
                  <Merge />
                  空间资产（多角度/侧别/…）
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  className="text-rose-400 focus:text-rose-300"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        <p className="truncate text-xs font-medium text-zinc-200">
          {scene.name}
        </p>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
          {scene.description}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadImage(file)
          event.target.value = ""
        }}
      />

      {/* 出场景参考图（编辑） */}
      <AssetGenerateDialog
        scriptId={scriptId}
        kind="scene"
        asset={scene}
        open={genOpen}
        onOpenChange={setGenOpen}
        onDone={onDone}
      />

      {/* 重新出图确认 */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重新出图</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            将清空「{scene.name}
            」的参考图并重置状态，下次点「一键出全部资产」会重新出，继续？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => {
                setResetOpen(false)
                void patch(
                  { reset: true },
                  "已重置，下次一键出全部资产会重新出",
                )
              }}
            >
              重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 空间资产（多角度 / 侧别 / 光影） */}
      <SpatialDialog
        scriptId={scriptId}
        scene={scene}
        open={spatialOpen}
        onOpenChange={setSpatialOpen}
        onDone={onDone}
      />

      {/* 删除确认 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除场景「{scene.name}」</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-zinc-400">
            会同时删掉已出的场景图与空间资产包，此操作不可撤销。确定删除？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void doDelete()}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** 空间资产弹窗：跨镜空间一致性资产包（多角度 5 张 + 侧别锁定卡 + 光影设计卡）。 */
function SpatialDialog({
  scriptId,
  scene,
  open,
  onOpenChange,
  onDone,
}: {
  scriptId: string
  scene: AssetDTO
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const pack: Record<string, string | undefined> =
    (scene as { spatialPack?: Record<string, string> }).spatialPack ?? {}
  const { models: spatialImageModels } = useAiModels("image")
  const { models: spatialTextModels } = useAiModels("text")
  const [textModel, setTextModel] = useState("")
  const [imageModel, setImageModel] = useState("")
  const [ratio, setRatio] = useState<string>("9:16")
  const [resolution, setResolution] = useState<string>("1K")
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    if (spatialTextModels.length > 0 && !textModel)
      setTextModel(spatialTextModels[0]!.id)
  }, [spatialTextModels, textModel])

  useEffect(() => {
    if (spatialImageModels.length > 0 && !imageModel)
      setImageModel(spatialImageModels[0]!.id)
  }, [spatialImageModels, imageModel])

  const imageModelConfig =
    spatialImageModels.find((item) => item.id === imageModel) ??
    spatialImageModels[0]

  async function generate(target: string) {
    setBusyKey(target)
    try {
      const res = await fetch(
        `/api/scripts/${scriptId}/scenes/${scene.id}/spatial`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            target,
            imageModel,
            resolution,
            aspectRatio: ratio,
          }),
        },
      )
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      if (payload.data?.failed)
        throw new Error(
          `成功 ${payload.data.generated}，失败 ${payload.data.failed}：${payload.data.errors?.[0]?.error ?? "请重试"}`,
        )
      if (payload.data?.generated === 0)
        throw new Error("没有生成新图片；请检查资产是否锁定或正在生成")
      toast.success(`已生成 ${payload.data.generated} 项空间资产`)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setBusyKey(null)
    }
  }

  const missingCount = [
    ...SPATIAL_ANGLES.map((a) => a.key),
    "sideCard",
    "lightCard",
  ].filter((key) => !pack[key]).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Merge className="h-4 w-4" />
            空间资产 · {scene.name}
          </DialogTitle>
        </DialogHeader>
        <p className="-mt-1 text-[11px] leading-relaxed text-zinc-500">
          跨镜空间一致性资产包 — 同场景所有镜头挂它们锁住空间 / 侧别 /
          光影，防穿帮。每种单独出，互不影响。
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">
              文本模型（绥提示词）
            </Label>
            <CardSelect
              ariaLabel="文本模型"
              value={textModel}
              onValueChange={setTextModel}
              options={
                spatialTextModels.length > 0
                  ? spatialTextModels.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))
                  : [{ value: "", label: "暂无可用模型，请到「AI 设置」配置" }]
              }
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">
              生图模型（多角度图）
            </Label>
            <CardSelect
              ariaLabel="生图模型"
              value={imageModel}
              onValueChange={setImageModel}
              options={
                spatialImageModels.length > 0
                  ? spatialImageModels.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))
                  : [{ value: "", label: "暂无可用模型，请到「AI 设置」配置" }]
              }
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
          <p className="text-[10px] text-zinc-500">
            出图参数（多角度包共 5 张，下方为单张消耗）
          </p>
          <div>
            <Label className="text-[10px] text-zinc-500">比例</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {RATIOS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={ratio === item}
                  onClick={() => setRatio(item)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] transition-colors",
                    ratio === item
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500">清晰度</Label>
            <div className="mt-1 flex gap-1">
              {(["1K", "2K", "4K"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={resolution === item}
                  onClick={() => setResolution(item)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] transition-colors",
                    resolution === item
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-zinc-500">画质档位</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {(
                [
                  "低画质",
                  "标准画质",
                  "高画质",
                  "超高清画质",
                  "最高画质",
                ] as const
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  aria-pressed={item === "低画质"}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px]",
                    item === "低画质"
                      ? "bg-zinc-700 text-zinc-100"
                      : "cursor-not-allowed text-zinc-600 ring-1 ring-zinc-800 opacity-50",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
              📌 影视厂的分镜图 / 首帧图 / 调度图固定按
              1K、低渲染出（它们只是视频帧的参考稿，出大图只会更难更像）。此处不可调。
            </p>
          </div>
          <p className="text-[10px] font-medium text-orange-300/90">
            🌸 预计单张约 {imageModelConfig?.cost ?? 0}{" "}
            樱米花（模型标价，实际以任务记录为准）
          </p>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            套图默认按低渲染档 {ratio} 出，一次出 5 张（俯视 + 四向）。
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Merge className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-200">
              多角度空间包
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="全部重出"
                disabled={busyKey !== null}
                onClick={() => void generate("all")}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    busyKey === "all" && "animate-spin",
                  )}
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={busyKey !== null || missingCount === 0}
                onClick={() => void generate("missing")}
              >
                {busyKey === "missing" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                出图
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {SPATIAL_ANGLES.map((angle) => {
              const url = pack[angle.key]
              return (
                <button
                  key={angle.key}
                  type="button"
                  disabled={busyKey !== null}
                  title={url ? "点击重出这一视角" : `生成${angle.label}`}
                  onClick={() => void generate(angle.key)}
                  className="group/tile flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 transition-colors hover:border-zinc-600 disabled:opacity-60"
                >
                  <span className="flex aspect-[3/4] w-full items-center justify-center bg-zinc-950">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={angle.label}
                        className="h-full w-full object-cover"
                      />
                    ) : busyKey === angle.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </span>
                  <span className="py-1 text-center text-[10px] text-zinc-500">
                    {angle.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: "sideCard", title: "侧别锁定卡" },
              { key: "lightCard", title: "光影设计卡" },
            ] as const
          ).map((cardItem) => {
            const url = pack[cardItem.key]
            return (
              <div
                key={cardItem.key}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={cardItem.title}
                    className="h-9 w-9 rounded-md border border-zinc-800 object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-zinc-200">
                    {cardItem.title}
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    {url ? "已生成" : "未生成"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={busyKey !== null}
                  onClick={() => void generate(cardItem.key)}
                >
                  {busyKey === cardItem.key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "生成"
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
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
  variant = "outline",
}: {
  scriptId: string
  kind: "outfits" | "props" | "scenes"
  characters: AssetDTO[]
  fixedCharacterId?: string
  onDone: () => void
  label?: string
  variant?: "outline" | "inverse"
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
            : {
                kind: "scene",
                name: name.trim(),
                description: description.trim() || undefined,
              }
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
        {label ? (
          <Button
            variant={variant}
            size="sm"
            className="h-6 px-1.5 text-[10px]"
          >
            <Plus className="h-3 w-3" />
            {label}
          </Button>
        ) : (
          <Button variant="inverse" size="icon-sm" aria-label={TITLE}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2.5">
        <p className="text-xs font-medium text-zinc-200">{TITLE}</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">{NOTE}</p>

        {kind === "outfits" && characters.length > 0 && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">所属人物</Label>
            <CardSelect
              ariaLabel="所属人物"
              value={fixedCharacterId ?? characterId}
              onValueChange={setCharacterId}
              disabled={Boolean(fixedCharacterId)}
              options={
                fixedCharacterId
                  ? [
                      {
                        value: fixedCharacterId,
                        label:
                          characters.find((c) => c.id === fixedCharacterId)
                            ?.name ?? "当前人物",
                      },
                    ]
                  : characters.map((character) => ({
                      value: character.id,
                      label: character.name,
                    }))
              }
            />
          </div>
        )}

        {kind === "props" && characters.length > 0 && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">
              所属人物（可选）
            </Label>
            <CardSelect
              ariaLabel="所属人物（可选）"
              value={characterId}
              onValueChange={setCharacterId}
              options={[
                { value: "", label: "不关联人物（独立道具）" },
                ...characters.map((character) => ({
                  value: character.id,
                  label: character.name,
                })),
              ]}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">
            {kind === "outfits"
              ? "造型名称"
              : kind === "props"
                ? "道具名称"
                : "场景名称"}
          </Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              kind === "outfits"
                ? "如：夜行战斗装"
                : kind === "props"
                  ? "如：玄铁长剑"
                  : "如：废土工厂"
            }
            className="h-8 text-xs"
          />
        </div>

        {kind === "outfits" && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">
              适用情节（可选）
            </Label>
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
            {kind === "outfits"
              ? "服装与发型描述（可选）"
              : kind === "props"
                ? "外观一致性细节（可选）"
                : "场景描述（可选）"}
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
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverAnchor asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="补缺漏提取"
              disabled={extracting}
              onClick={() => setOpen((value) => !value)}
            >
              <Wand2
                className={cn("h-3.5 w-3.5", extracting && "animate-spin")}
              />
            </Button>
          </PopoverAnchor>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-[11px] leading-relaxed"
        >
          {TIP_MISSING}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="text-xs font-medium text-zinc-200">补缺漏提取</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          {TIP_MISSING}
        </p>
        <Textarea
          rows={2}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="捕捉关键词（可选），逗号分隔，让它重点找"
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

const TIP_MISSING =
  "觉得 AI 提取漏了？重新扫一遍全剧正文，把遗漏的角色/场景/妆造/道具自动补上——还能填「捕捉关键词」让它重点找。只补缺失，不动你已有的任何内容"

const TEMPLATE_CONFIG: Record<
  AssetKind,
  { field: string; label: string; title: string; desc: string; toast: string }
> = {
  characters: {
    field: "assetPromptTemplate",
    label: "设置角色提示词模板",
    title: "角色提示词模板",
    desc: "给一段示例 prompt，置入内置框架，所有角色模仿它生成",
    toast: "所有角色卡将模仿它生成",
  },
  outfits: {
    field: "outfitPromptTemplate",
    label: "设置妆造提示词模板",
    title: "妆造提示词模板",
    desc: "给一段示例 prompt，置入内置框架，所有造型模仿它生成",
    toast: "所有造型卡将模仿它生成",
  },
  props: {
    field: "propPromptTemplate",
    label: "设置道具提示词模板",
    title: "道具提示词模板",
    desc: "给一段示例 prompt，置入内置框架，所有道具模仿它生成",
    toast: "所有道具卡将模仿它生成",
  },
  scenes: {
    field: "scenePromptTemplate",
    label: "设置场景提示词模板",
    title: "场景提示词模板",
    desc: "给一段示例 prompt，置入内置框架，所有场景模仿它生成",
    toast: "所有场景卡将模仿它生成",
  },
}

function TemplatePopover({
  kind,
  scriptId,
  initial,
  onSaved,
}: {
  kind: AssetKind
  scriptId: string
  initial: string
  onSaved: () => void
}) {
  const config = TEMPLATE_CONFIG[kind]
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [config.field]: value.trim() || null }),
      })
      if (!res.ok) throw new Error("保存失败")
      toast.success("提示词模板已保存", { description: config.toast })
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverAnchor asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={config.label}
              disabled={saving}
              onClick={() => setOpen((value) => !value)}
            >
              <ClipboardList
                className={cn("h-3.5 w-3.5", saving && "animate-spin")}
              />
            </Button>
          </PopoverAnchor>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-[11px] leading-relaxed"
        >
          {config.label}——给一段示例 prompt，置入内置框架，
          {config.desc.slice(11)}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 space-y-2">
        <p className="text-xs font-medium text-zinc-200">{config.title}</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          {config.desc}
        </p>
        <Textarea
          rows={4}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          保存
        </Button>
      </PopoverContent>
    </Popover>
  )
}

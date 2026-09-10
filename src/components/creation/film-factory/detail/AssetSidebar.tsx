"use client"

import { useRef, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import { IMAGE_MODELS, TEXT_MODELS } from "@/lib/constants"
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
      <TooltipContent side="bottom" className="max-w-[220px] text-[11px] leading-relaxed">
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
      {/* 标题行：全剧角色 + 按钮排（img-09 红框区） */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium tracking-wider text-zinc-400">
          {TAB_TITLE[tab]}
        </span>
        <div className="flex items-center gap-1.5">
          <TipButton label="重新出一遍" tip={TIP.refresh} disabled={extracting} onClick={() => void extract()}>
            <RefreshCw className={cn("h-3.5 w-3.5", extracting && "animate-spin")} />
          </TipButton>
          <TipButton label="打包下载" tip={TIP.download} onClick={downloadAll}>
            <Download className="h-3.5 w-3.5" />
          </TipButton>
          <MissingFillPopover scriptId={scriptId} extracting={extracting} onExtract={extract} />
          <TemplatePopover scriptId={scriptId} initial={assetPromptTemplate ?? ""} onSaved={onRefresh} />
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

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as AssetKind)}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Tab：角色 N · 妆造库 N · 道具库 N · 场景 N */}
        <div className="px-2.5 pt-2.5">
          <TabsList className="w-full">
            <TabsTrigger value="characters" className="flex-1 gap-1 text-[11px]">
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

        {/* 角色：大图角色卡（img-05/09） */}
        <TabsContent value="characters" className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 py-2">
              <span className="text-[10px] text-zinc-600">角色只能从剧本提取，不能手动添加</span>
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
        <TabsContent value="outfits" className="min-h-0 flex-1 overflow-hidden px-2.5 pb-2.5">
          <div className="flex h-full flex-col">
            <Button
              variant="outline"
              size="sm"
              className="mb-2"
              onClick={() => void generate("outfits", "造型")}
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
                  description="点右上角「+」新建道具，或从剧本提取"
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
                  description="点右上角「+」添加场景，或从剧本提取"
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

/* ---------------------------- 角色大图卡（img-05/09 + 更多菜单） ---------------------------- */

const RESOLUTIONS = ["1K", "2K", "4K"] as const
const QUALITY_TIERS = ["低画质", "标准画质", "高画质", "超高清画质", "最高画质"] as const

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
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>, success?: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/assets/${character.id}`, {
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
      const res = await fetch(`/api/scripts/${scriptId}/assets/${character.id}`, {
        method: "DELETE",
      })
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
            src={character.imageUrl}
            alt={character.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
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
              "rounded px-1.5 py-0.5 text-[9px] font-medium",
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
                : "待生成"}
          </span>
        </div>

        {/* 悬浮操作条（图片右下角）：下载原图 / 上传本地替换 / 编辑 / 更多 */}
        {character.imageUrl && (
          <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <ImageActionButton label="下载原图" disabled={busy} onClick={downloadImage}>
              <Download className="h-3 w-3" />
            </ImageActionButton>
            <ImageActionButton
              label="上传本地替换参考图"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
            </ImageActionButton>
            <ImageActionButton label="编辑" disabled={busy} onClick={() => setGenOpen(true)}>
              <Pencil className="h-3 w-3" />
            </ImageActionButton>
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
                  onSelect={() => void patch({ clearRefs: true }, "参考图已清空")}
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
                      character.locked ? "已解锁，可再生成" : "已锁定，再生成不覆盖",
                    )
                  }
                >
                  {character.locked ? <LockOpen /> : <Lock />}
                  {character.locked ? "解锁（恢复再生成）" : "锁定（再生成不覆盖）"}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={others.length === 0} onSelect={() => setMergeOpen(true)}>
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
          </div>
        )}
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
      <CharacterGenerateDialog
        scriptId={scriptId}
        character={character}
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
            将清空「{character.name}」的参考图并重置状态，下次点「一键出全部资产」会重新出，继续？
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => {
                setResetOpen(false)
                void patch({ reset: true }, "已重置，下次一键出全部资产会重新出")
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
            选一个保留的角色，把「{character.name}」合并进去（同人多默认请去重），它的出场集 /
            九宫格引用会改指过去，别名并入，然后删除「{character.name}」+ 退它的图。此操作不可撤销。
          </p>
          <div className="space-y-1.5">
            {others.map((target) => (
              <button
                key={target.id}
                type="button"
                disabled={busy}
                onClick={() => void mergeInto(target.id)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-left transition-colors hover:border-zinc-600 disabled:opacity-50"
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
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void doDelete()}>
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
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="flex h-[22px] w-[22px] items-center justify-center rounded bg-zinc-950/85 text-zinc-300 ring-1 ring-zinc-700/70 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
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

/* ---------------------------- 出角色参考图弹窗（编辑 / 单独出图） ---------------------------- */

function CharacterGenerateDialog({
  scriptId,
  character,
  open,
  onOpenChange,
  onDone,
}: {
  scriptId: string
  character: AssetDTO
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [model, setModel] = useState(IMAGE_MODELS[0].id)
  const [promptModel, setPromptModel] = useState(TEXT_MODELS[0].id)
  const [prompt, setPrompt] = useState(character.prompt ?? "")
  const [refs, setRefs] = useState<string[]>(character.refImages ?? [])
  const [resolution, setResolution] = useState<string>("1K")
  const [quality, setQuality] = useState<string>("标准画质")
  const [starting, setStarting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const imageModel = IMAGE_MODELS.find((item) => item.id === model) ?? IMAGE_MODELS[0]

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
      setRefs((current) => Array.from(new Set([...current, payload.data.url])).slice(0, 10))
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
          kind: "character",
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
            出角色参考图
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
            options={IMAGE_MODELS.map((item) => ({ value: item.id, label: item.name }))}
            className="w-full"
          />
        </div>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/[0.06] px-2.5 py-2 text-[10px] leading-relaxed text-orange-200/90">
          <span className="font-medium">🌸 预计单用量 {imageModel.cost} = 1张 x {imageModel.cost}/张</span>
          <p className="mt-0.5 text-orange-200/60">
            仅估算出图：提示词编译(文本模型)与实际参数(比例/质量)略有出入。
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            提示词模型
            <span className="ml-1 text-[10px] text-zinc-600">（把简介扩写成资产卡 prompt）</span>
          </Label>
          <CardSelect
            ariaLabel="提示词模型"
            value={promptModel}
            onValueChange={setPromptModel}
            options={TEXT_MODELS.map((item) => ({ value: item.id, label: item.name }))}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            出图提示词
            <span className="ml-1 text-[10px] text-zinc-600">（可改，留空 = AI 按简介自动缩写）</span>
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
                    onClick={() => setRefs((current) => current.filter((item) => item !== url))}
                    className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-950 text-[9px] text-zinc-400 ring-1 ring-zinc-700 hover:text-rose-300"
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
          <p className="text-[10px] text-zinc-500">生成参数（按模型 capability）</p>
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
            🌸 预计单张约 {imageModel.cost} 樱米花 · 出图时扣除
          </p>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            比例固定 16:9 多画格资料卡（压框/侧栏/细节），最终视频比例无关 —
            九宫格故事板也固定 16:9，短片视频则按剧集比例出。
          </p>
        </div>

        <p className="text-[10px] text-zinc-600">
          提示：任务会在后台依次完成，本页每 5 秒自动刷新，关闭页面后任务仍会继续。
        </p>

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="brand" size="sm" disabled={starting} onClick={() => void start()}>
            {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
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
        {label ? (
          <Button variant={variant} size="sm" className="h-6 px-1.5 text-[10px]">
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
                          characters.find((c) => c.id === fixedCharacterId)?.name ?? "当前人物",
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
            <Label className="text-[10px] text-zinc-500">所属人物（可选）</Label>
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
              <Wand2 className={cn("h-3.5 w-3.5", extracting && "animate-spin")} />
            </Button>
          </PopoverAnchor>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-[11px] leading-relaxed">
          {TIP_MISSING}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="text-xs font-medium text-zinc-200">补缺漏提取</p>
        <p className="text-[10px] leading-relaxed text-zinc-500">{TIP_MISSING}</p>
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
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverAnchor asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="设置角色提示词模板"
              disabled={saving}
              onClick={() => setOpen((value) => !value)}
            >
              <ClipboardList className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
            </Button>
          </PopoverAnchor>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-[11px] leading-relaxed">
          设置角色提示词模板——给一段示例 prompt，置入内置框架，所有角色模仿它生成
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 space-y-2">
        <p className="text-xs font-medium text-zinc-200">角色提示词模板</p>
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

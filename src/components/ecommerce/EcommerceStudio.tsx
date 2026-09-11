"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  ImagePlus,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAiModels } from "@/hooks/useAiModels"
import { cn } from "@/lib/utils"

const PLATFORMS = ["亚马逊", "独立站", "Temu", "Shopee", "速卖通", "Lazada", "TikTok Shop", "天猫 / 淘宝"]
const REGIONS = ["美国", "中国", "欧洲", "东南亚", "日本", "中东", "拉美"]
const LANGS = ["英文", "中文", "俄语", "西语", "德语", "日语", "韩语", "葡萄牙语", "印尼语"]
const RATIOS = ["1:1 (方图)", "4:5 (竖版)", "3:4 (竖版)", "16:9 (横版)", "9:16 (长竖版)"]
const STRUCTURE = [
  { type: "main", label: "白底图", count: 1, hint: "主图完整呈现商品细节" },
  { type: "scene", label: "场景图", count: 2, hint: "常和商品出让使用场景" },
  { type: "sellpoint", label: "卖点图", count: 2, hint: "展示商品的核心卖点" },
  { type: "other", label: "其他", count: 2, hint: "对比图 / 尺寸图 / 商品细节图" },
]
const STYLE_OPTIONS = ["复古田园美学", "温馨治愈角落", "现代优雅轻奢", "灵动自然生机"]

interface EcomItem {
  type: string
  label: string
  prompt: string
  url?: string
  copy?: string
  status: "pending" | "generating" | "done" | "failed"
}

interface EcomProject {
  id: string
  module: string
  name: string
  config: Record<string, unknown>
  items: EcomItem[]
  status: string
  updatedAt: string
}

export function EcommerceStudio() {
  const [module, setModule] = useState<"set" | "aplus">("set")
  const [projects, setProjects] = useState<EcomProject[]>([])
  const [project, setProject] = useState<EcomProject | null>(null)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewList, setPreviewList] = useState<string[]>([])

  // 动态模型列表
  const { models: imageModels } = useAiModels("image")
  const { models: textModels } = useAiModels("text")

  // 共享表单状态
  const [imageModel, setImageModel] = useState("")
  const [planModel, setPlanModel] = useState("")

  // 模型加载完成后设置默认值
  useEffect(() => {
    if (imageModels.length > 0 && !imageModels.some(m => m.id === imageModel)) {
      setImageModel(imageModels[0]!.id)
    }
  }, [imageModels, imageModel])

  useEffect(() => {
    if (textModels.length > 0 && !planModel) {
      setPlanModel(textModels[0]!.id)
    }
  }, [textModels, planModel])

  const [platform, setPlatform] = useState(PLATFORMS[0]!)
  const [region, setRegion] = useState(REGIONS[0]!)
  const [lang, setLang] = useState(LANGS[0]!)
  const [ratio, setRatio] = useState(RATIOS[0]!)
  const [points, setPoints] = useState("")
  const [styleAnalysis, setStyleAnalysis] = useState(true)
  const [copyToggle, setCopyToggle] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [styles, setStyles] = useState<string[]>([])
  const [activeStyle, setActiveStyle] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const reloadRecords = useCallback(async () => {
    const res = await fetch(`/api/ecommerce/projects?module=${module}`)
    const payload = await res.json()
    if (res.ok) setProjects(payload.data ?? [])
  }, [module])

  useEffect(() => {
    void reloadRecords()
  }, [reloadRecords, module])

  const doneImages = (project?.items ?? [])
    .filter((item) => item.url)
    .map((item) => item.url!)

  const showRecords = projects.length > 0

  /* ---------- AI 帮写 ---------- */
  const [helpRunning, setHelpRunning] = useState(false)

  async function runHelp() {
    setHelpRunning(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "text",
          modelId: planModel,
          prompt: `帮写电商商品卖点，包含：产品名称 / 核心卖点 / 适用人群 / 期望场景 / 关键参数。当前草稿：${points || "（空）"}`,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "帮写失败")
      setPoints(payload.data.text)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "帮写失败")
    } finally {
      setHelpRunning(false)
    }
  }

  /* ---------- 爆款风格分析 ---------- */
  async function analyzeStyles() {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "text",
          modelId: planModel,
          prompt: `看商品图与卖点（${points || project?.name || "商品"}），推荐 4 个爆款风格方向，每行一个，只输出名称与一句描述，用「｜」分隔名称与描述。`,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "分析失败")
      const text = String(payload.data.text)
      const parsed = text
        .split("\n")
        .map((line) => line.replace(/^[-\d.\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 4)
      const names = parsed.map((line) => line.split("｜")[0] ?? line.split("：")[0] ?? line)
      setStyles(names.length ? names : STYLE_OPTIONS.slice(0, 4))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析失败")
    } finally {
      setAnalyzing(false)
    }
  }

  /* ---------- 一键生成 ---------- */
  async function generateAll() {
    setGenerating(true)
    try {
      const structure = STRUCTURE.flatMap((group) =>
        Array.from({ length: group.count }, (_, index) => ({
          type: "image",
          label: `${group.label}${group.count > 1 ? ` ${index + 1}` : ""}`,
          prompt: `${group.label}：${points || project?.name || "商品"}${activeStyle ? `，风格：${activeStyle}` : ""}`,
          status: "pending" as const,
        })),
      )
      const items: EcomItem[] = copyToggle
        ? [...structure, { type: "copy", label: "上架文案", prompt: "标题/五点描述/关键词", status: "pending" as const }]
        : structure

      const res = await fetch("/api/ecommerce/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          module,
          name: points.slice(0, 20) || `${module === "set" ? "商品套图" : "A+ 详情页"} ${new Date().toLocaleDateString("zh-CN")}`,
          config: { imageModel, textModel: planModel, platform, region, lang, ratio, points, style: activeStyle },
          items,
        }),
      })
      const created = await res.json()
      if (!res.ok) throw new Error(created.error ?? "创建失败")

      setProject(created.data)
      const genRes = await fetch(`/api/ecommerce/projects/${created.data.id}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const genPayload = await genRes.json()
      if (!genRes.ok) throw new Error(genPayload.error ?? "生成失败")

      const finalRes = await fetch(`/api/ecommerce/projects/${created.data.id}`)
      const finalPayload = await finalRes.json()
      if (finalRes.ok) {
        setProject(finalPayload.data as EcomProject)
        setPreviewList([])
      }
      void reloadRecords()
      toast.success(genPayload.message ?? "生成完成")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">E-Commerce Studio</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">电商设计室</h1>
        </div>
        {showRecords && (
          <Button variant="outline" size="sm" onClick={() => setRecordsOpen(true)}>
            生成记录
          </Button>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {(
          [
            { key: "set", label: "商品套图" },
            { key: "aplus", label: "A+详情" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setModule(item.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
              module === item.key
                ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {module === "aplus" ? (
        <AplusPanel
          imageModel={imageModel}
          planModel={planModel}
          onRefresh={reloadRecords}
        />
      ) : (
      <div className="mt-4 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* 左栏表单 */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">出图模型</Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageModels.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.cost} 起
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">规划模型</Label>
              <Select value={planModel} onValueChange={setPlanModel}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {textModels.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.cost} 起
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 上传商品图 */}
          <UploadImage value={uploadUrl} onChange={setUploadUrl} />

          {/* 生成设置 */}
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs font-medium text-zinc-300">生成设置</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">平台</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">地区</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">语言</Label>
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">比例</Label>
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATIOS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 卖点 + AI 帮写 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">商品卖点 & 要求</Label>
              <button
                type="button"
                onClick={() => void runHelp()}
                className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300"
              >
                <Sparkles className="h-3 w-3" />
                AI 帮写
              </button>
            </div>
            <Textarea
              rows={4}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              placeholder={"建议包含以下信息生成更精准：\n1.产品名称\n2.核心卖点\n3.适用人群\n4.期望场景\n5.具体参数"}
              className="text-xs"
            />
          </div>

          {/* 套图结构配置 */}
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs font-medium text-zinc-300">套图结构配置</p>
            <div className="space-y-1.5">
              {STRUCTURE.map((group) => (
                <div
                  key={group.type}
                  className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/50 px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">{group.label}</span>
                  <span className="truncate text-[10px] text-zinc-600">{group.hint}</span>
                  <span className="rounded bg-zinc-800 px-1.5 text-[10px] tabular-nums text-zinc-300">
                    {group.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 附加功能 */}
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-zinc-200">爆款风格分析</p>
                <p className="text-[10px] text-zinc-500">看商品图+卖点，推荐爆款风格方向</p>
              </div>
              <Switch
                checked={styleAnalysis}
                onCheckedChange={(value) => {
                  setStyleAnalysis(value)
                  if (value) void analyzeStyles()
                }}
              />
            </div>
            {styleAnalysis && (
              <div className="space-y-1.5">
                {analyzing ? (
                  <p className="flex items-center justify-center gap-1.5 py-3 text-[11px] text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    分析商品中…
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(styles.length ? styles : STYLE_OPTIONS).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setActiveStyle(style)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-left text-[11px] leading-snug transition-colors",
                            activeStyle === style
                              ? "border-orange-500/60 bg-orange-500/10 text-orange-200"
                              : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200",
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => void analyzeStyles()}
                      className="w-full rounded-lg border border-zinc-800 py-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                    >
                      换一批风格
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="flex items-start justify-between gap-2 border-t border-zinc-800/60 pt-2">
              <div>
                <p className="text-xs text-zinc-200">商品上架文案生成</p>
                <p className="text-[10px] text-zinc-500">同步产出标题 / 五点描述 / 关键词</p>
              </div>
              <Switch checked={copyToggle} onCheckedChange={setCopyToggle} />
            </div>
          </div>

          <Button
            variant="brand"
            className="w-full"
            disabled={generating}
            onClick={() => void generateAll()}
          >
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            一键生成套图与上架文案
          </Button>
        </div>

        {/* 右栏结果 */}
        <ResultPanel
          project={project}
          generating={generating}
          onPreview={(url, list) => {
            setPreviewUrl(url)
            setPreviewList(list)
          }}
          onRetry={generateAll}
        />
      </div>
      )}

      {/* 大图预览 */}
      <Dialog open={Boolean(previewUrl)} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="预览" className="w-full rounded-lg" />
          )}
          {previewList.length > 1 && (
            <div className="flex justify-center gap-1.5">
              {previewList.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPreviewUrl(url)}
                  className={cn(
                    "h-12 w-16 overflow-hidden rounded border",
                    url === previewUrl ? "border-orange-500" : "border-zinc-700",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 生成记录 */}
      <Dialog open={recordsOpen} onOpenChange={setRecordsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>生成记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {projects.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setProject(item)
                  setRecordsOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 p-2.5 text-left hover:border-zinc-600"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{item.name}</span>
                <span className="text-[10px] text-zinc-600">
                  {item.updatedAt.slice(5, 16).replace("T", " ")}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}


/* ---------------------------- 右栏结果面板 ---------------------------- */

function ResultPanel({
  project,
  generating,
  onPreview,
  onRetry,
}: {
  project: EcomProject | null
  generating: boolean
  onPreview: (url: string, list: string[]) => void
  onRetry?: () => void
}) {
  const items = (project?.items ?? []) as EcomItem[]
  const doneImages = items.filter((item) => item.url).map((item) => item.url!)
  const copyItem = items.find((item) => item.type === "copy")

  if (generating || items.some((item) => item.status === "generating")) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex aspect-square items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40"
          >
            {item.status === "generating" ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            ) : item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-zinc-600">{item.label}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-zinc-800">
        <div className="text-center">
          <Sparkles className="mx-auto h-6 w-6 text-zinc-700" />
          <p className="mt-2 text-sm text-zinc-500">AI 商品套图</p>
          <p className="mt-1 text-xs text-zinc-600">填好左侧参数，一键生成商品套图与上架文案</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {copyItem?.copy && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="mb-1 text-[11px] font-medium text-zinc-400">上架文案</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{copyItem.copy}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {items
          .filter((item) => item.type !== "copy")
          .map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                item.url ? onPreview(item.url, doneImages) : (item.status === "failed" || item.status === "pending") && onRetry?.()
              }
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl border",
                item.status === "failed"
                  ? "border-rose-500/50"
                  : "border-zinc-800 hover:border-zinc-600",
              )}
            >
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  {item.status === "failed" ? (
                    <>
                      <span className="text-[10px] text-rose-300">生成失败</span>
                      <span className="text-[10px] text-zinc-600">点此重试</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-600">{item.label}</span>
                  )}
                </div>
              )}
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[10px] text-zinc-200">
                {item.label}
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}


/* ---------------------------- 上传商品图 ---------------------------- */

function UploadImage({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] text-zinc-500">上传商品图</Label>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="商品图" className="aspect-video w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-zinc-200"
            aria-label="移除商品图"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-orange-500/60 hover:text-orange-400"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[11px]">上传商品图（未生成前可替换）</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          onChange(URL.createObjectURL(file))
          event.target.value = ""
        }}
      />
    </div>
  )
}


/* ---------------------------- A+ 详情页 ---------------------------- */

const APLUS_RATIOS = [
  { label: "高级A+ (Web端)", value: "premium-web", ratio: "16:9" },
  { label: "高级A+ (移动端)", value: "premium-mobile", ratio: "4:3" },
  { label: "普通A+", value: "basic", ratio: "3.2" },
  { label: "1:1", value: "1-1", ratio: "1:1" },
  { label: "3:4", value: "3-4", ratio: "3:4" },
  { label: "9:16", value: "9-16", ratio: "9:16" },
]

const APLUS_MODULES = [
  { label: "使用场景图", hint: "呈现真实使用场景" },
  { label: "多角度图", hint: "多角度呈现外观" },
  { label: "场景氛围图", hint: "氛围与情绪渲染" },
  { label: "商品细节图", hint: "细节特写" },
]

function AplusPanel({
  imageModel,
  planModel,
  onRefresh,
}: {
  imageModel: string
  planModel: string
  onRefresh: () => void
}) {
  const [platform, setPlatform] = useState(PLATFORMS[0]!)
  const [region, setRegion] = useState(REGIONS[0]!)
  const [lang, setLang] = useState(LANGS[0]!)
  const [ratio, setRatio] = useState(APLUS_RATIOS[0]!.value)
  const [modules, setModules] = useState<string[]>(APLUS_MODULES.map((item) => item.label))
  const [points, setPoints] = useState("")
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [sections, setSections] = useState<EcomItem[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const dragIndex = useRef<number | null>(null)

  async function generate() {
    setRunning(true)
    try {
      const selected = APLUS_MODULES.filter((item) => modules.includes(item.label))
      const items: EcomItem[] = selected.map((item) => ({
        type: "image",
        label: item.label,
        prompt: `${item.label}：${item.hint}。商品：${points || "商品"}。A+ 版式：${ratio}`,
        status: "pending",
      }))

      let pid = projectId
      if (!pid) {
        const res = await fetch("/api/ecommerce/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            module: "aplus",
            name: `A+ 详情页 ${new Date().toLocaleDateString("zh-CN")}`,
            config: { imageModel, planModel, platform, region, lang, ratio },
            items,
          }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "创建失败")
        pid = payload.data.id
        setProjectId(pid)
      } else {
        await fetch(`/api/ecommerce/projects/${pid}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items, status: "generating" }),
        })
      }

      setSections(items.map((item) => ({ ...item, status: "generating" as const })))

      const genRes = await fetch(`/api/ecommerce/projects/${pid}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const genPayload = await genRes.json()
      if (!genRes.ok) throw new Error(genPayload.error ?? "生成失败")

      const finalRes = await fetch(`/api/ecommerce/projects/${pid}`)
      const finalPayload = await finalRes.json()
      if (finalRes.ok) {
        setSections((finalPayload.data.items as EcomItem[]).map((item) => ({ ...item })))
      }
      toast.success(genPayload.message ?? "A+ 详情页生成完成")
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setRunning(false)
    }
  }

  function reorder(from: number, to: number) {
    setSections((current) => {
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved!)
      return next
    })
  }

  async function persistOrder() {
    if (!projectId) return
    await fetch(`/api/ecommerce/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: sections as unknown as Record<string, unknown>[] }),
    })
  }

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* 左栏 */}
      <div className="space-y-3">
        <UploadImage value={uploadUrl} onChange={setUploadUrl} />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">平台</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">地区</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">语言</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">A+ 版式</Label>
          <div className="space-y-1">
            {APLUS_RATIOS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRatio(item.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  ratio === item.value
                    ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                    : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border",
                      ratio === item.value ? "border-orange-500 bg-orange-500" : "border-zinc-600",
                    )}
                  />
                  {item.label}
                </span>
                <span className="text-[10px] text-zinc-600">{item.ratio}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">卖点 & 描述</Label>
          <Textarea
            rows={3}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            placeholder="商品卖点与 A+ 内容要点"
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">内容模块</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {APLUS_MODULES.map((item) => {
              const active = modules.includes(item.label)
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    setModules((current) =>
                      active ? current.filter((name) => name !== item.label) : [...current, item.label],
                    )
                  }
                  className={cn(
                    "rounded-lg border px-2 py-2 text-left text-[11px] leading-snug transition-colors",
                    active
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-200"
                      : "border-zinc-800 text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <Button variant="brand" className="w-full" onClick={() => void generate()} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
          生成 A+ 详情
        </Button>
      </div>

      {/* 右栏段落 */}
      <div className="space-y-3">
        {sections.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-zinc-800">
            <div className="text-center">
              <p className="text-sm text-zinc-500">A+ / 详情页</p>
              <p className="mt-1 text-xs text-zinc-600">
                填好左侧配置，生成 A+ 详情页；可拖动调整段落顺序
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={`${section.label}-${index}`}
                draggable
                onDragStart={() => (dragIndex.current = index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const from = dragIndex.current
                  if (from === null || from === index) return
                  reorder(from, index)
                  dragIndex.current = null
                }}
                className={cn(
                  "cursor-grab rounded-xl border bg-zinc-900/50 p-3",
                  section.status === "failed"
                    ? "border-rose-500/50"
                    : "border-zinc-800",
                )}
              >
                <div className="flex items-center gap-2 pb-1.5">
                  <span className="text-[11px] font-medium text-zinc-200">{section.label}</span>
                  {section.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => void generate()}
                      className="ml-auto text-[10px] text-rose-300 hover:text-rose-200"
                    >
                      重试
                    </button>
                  )}
                </div>
                {section.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={section.url} alt={section.label} className="w-full rounded-lg" />
                ) : section.copy ? (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{section.copy}</p>
                ) : section.status === "generating" ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    生成中…
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-600">待生成</p>
                )}
              </div>
            ))}
            {projectId && (
              <button
                type="button"
                onClick={() => void persistOrder()}
                className="w-full rounded-lg border border-zinc-800 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-200"
              >
                保存当前排序
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import {
  ImageIcon,
  Loader2,
  Music,
  Scissors,
  Sparkles,
  Video,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { RESOLUTIONS } from "@/lib/constants"
import { useAiModels } from "@/hooks/useAiModels"
import { cn } from "@/lib/utils"

type Mode = "image" | "text" | "video" | "bgm"

const TABS: { value: Mode; label: string; description: string; icon: typeof Scissors }[] = [
  { value: "text", label: "仅拆分镜", description: "只拆镜切，不出图/视频", icon: Scissors },
  { value: "image", label: "出图", description: "拆镜组 + 每镜出一张分镜图", icon: ImageIcon },
  { value: "video", label: "出视频", description: "为镜串出视频（方式下面选）", icon: Video },
  { value: "bgm", label: "后期 BGM", description: "本集一整轨 BGM / 配音", icon: Music },
]

/**
 * 拆分镜弹窗（4 个 Tab）。
 * - 出图：拆分镜后逐镜生成分镜图
 * - 仅拆分镜：只做镜头切分
 * - 出视频：拆分镜后逐镜出视频（可免分镜图直出）
 * - 后期 BGM：为整集生成 BGM / 配音轨道
 */
export function SplitStoryboardDialog({
  open,
  onOpenChange,
  scriptId,
  episodeId,
  episodeTitle,
  initialMode,
  onDone,
  onSplitPhase,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string
  episodeId: string
  episodeTitle: string
  /** 打开时定位到的 Tab（如「下一步 · 出视频」直开出视频） */
  initialMode?: Mode
  onDone: () => void
  /** 拆分/生成阶段上报：分镜区据此展示「AI 正在拆分镜…」等居中状态 */
  onSplitPhase?: (info: { active: boolean; label: string; mode: Mode } | null) => void
}) {
  const { models: textModels } = useAiModels("text")
  const { models: imageModels } = useAiModels("image")
  const { models: videoModels } = useAiModels("video")
  const { models: audioModels } = useAiModels("audio")

  const [tab, setTab] = useState<Mode>(initialMode ?? "image")
  useEffect(() => {
    if (open && initialMode) setTab(initialMode)
  }, [open, initialMode])
  const [textModel, setTextModel] = useState("")
  const [imageModel, setImageModel] = useState("")
  const [videoModel, setVideoModel] = useState("")
  const [audioModel, setAudioModel] = useState("")

  useEffect(() => {
    if (textModels.length > 0 && !textModels.some(m => m.id === textModel)) setTextModel(textModels[0]!.id)
  }, [textModels, textModel])

  useEffect(() => {
    if (imageModels.length > 0 && !imageModels.some(m => m.id === imageModel)) setImageModel(imageModels[0]!.id)
  }, [imageModels, imageModel])

  useEffect(() => {
    if (videoModels.length > 0 && !videoModels.some(m => m.id === videoModel)) setVideoModel(videoModels[0]!.id)
  }, [videoModels, videoModel])

  useEffect(() => {
    if (audioModels.length > 0 && !audioModels.some(m => m.id === audioModel)) setAudioModel(audioModels[0]!.id)
  }, [audioModels, audioModel])
  const [resolution, setResolution] = useState("1080p")
  const [quality, setQuality] = useState("low")
  const [skipImage, setSkipImage] = useState(false)
  const [regenerateDone, setRegenerateDone] = useState(false)
  const [safeRewrite, setSafeRewrite] = useState(false)
  const [segmentConsistent, setSegmentConsistent] = useState(true)
  const [enhanceVideo, setEnhanceVideo] = useState(true)
  const [negativePrompt, setNegativePrompt] = useState("")
  const [bgmPrompt, setBgmPrompt] = useState("沉稳大气的纪录片解说氛围，低频铺底，渐强收尾")
  const [smartLyrics, setSmartLyrics] = useState(true)
  const [bgmDuration, setBgmDuration] = useState("")
  const [bgmCount, setBgmCount] = useState(1)
  const [bgmStyle, setBgmStyle] = useState("")
  const [bgmExtra, setBgmExtra] = useState("")
  const [bgmRegenerate, setBgmRegenerate] = useState(false)

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState("")

  async function run() {
    setRunning(true)
    setProgress(4)
    setStep("正在拆分镜头…")

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 94 ? value : value + 5 + Math.random() * 7))
    }, 520)

    try {
      if (tab === "bgm") {
        const res = await fetch(`/api/scripts/${scriptId}/episodes/${episodeId}/bgm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: bgmPrompt,
            model: audioModel,
            duration: "15s",
            smartLyrics,
          }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "BGM 生成失败")
        setStep("混音完成")
        toast.success("BGM 已生成")
      } else {
        // 1) 拆分镜
        onSplitPhase?.({ active: true, label: "AI 正在拆分镜…", mode: tab })
        const splitRes = await fetch(
          `/api/scripts/${scriptId}/episodes/${episodeId}/storyboards`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mode: tab === "text" ? "text" : tab, model: textModel, regenerate: true }),
          },
        )
        const splitPayload = await splitRes.json()
        if (!splitRes.ok) throw new Error(splitPayload.error ?? "拆分镜失败")

        const storyboards = splitPayload.data.storyboards as { id: string; number: number }[]

        if (tab === "text") {
          setStep(`已拆出 ${storyboards.length} 个镜头`)
          toast.success(`整剧拆分镜完成 (1 集)`, {
            description: `共 ${storyboards.length} 个镜头`,
          })
        } else {
          // 2) 逐镜生成产物
          for (let index = 0; index < storyboards.length; index++) {
            const storyboard = storyboards[index]!
            setStep(
              `${tab === "image" ? "生成分镜图" : "生成视频"} ${index + 1}/${storyboards.length}（分镜 ${storyboard.number}）`,
            )
            onSplitPhase?.({
              active: true,
              label: `${tab === "image" ? "正在生成分镜图" : "正在生成视频"} ${index + 1}/${storyboards.length}`,
              mode: tab,
            })
            setProgress(Math.round(((index + 1) / storyboards.length) * 90) + 5)

            const genRes = await fetch(`/api/storyboards/${storyboard.id}/generate`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                kind: tab,
                model: tab === "image" ? imageModel : videoModel,
                prompt: "按分镜描述生成",
                negativePrompt: negativePrompt || undefined,
                aspectRatio: "9:16",
                resolution,
                duration: "5s",
                skipStoryboardImage: skipImage,
              }),
            })
            const genPayload = await genRes.json()
            if (!genRes.ok) {
              toast.error(`分镜 ${storyboard.number} 生成失败`, {
                description: genPayload.error,
              })
            }
          }
          toast.success(tab === "image" ? "分镜图已全部生成" : "视频已全部生成")
        }
      }

      setProgress(100)
      setStep("完成")
      onDone()
      window.setTimeout(() => onOpenChange(false), 500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "执行失败")
    } finally {
      onSplitPhase?.(null)
      window.clearInterval(timer)
      window.setTimeout(() => {
        setRunning(false)
        setProgress(0)
        setStep("")
      }, 600)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !running && onOpenChange(value)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-orange-400" />
            批量生成 · {episodeTitle}
          </DialogTitle>
          <DialogDescription>
            只对【{episodeTitle}】：拆分镜 → 按下面选的范围出分镜图 / 视频。人物/场景资产沿用全剧、已完成的步骤自动跳过；过程可随时点「停」。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as Mode)}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-none border-0 bg-transparent p-0 sm:grid-cols-4">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  aria-label={item.label}
                  className={cn(
                    "h-auto flex-col items-start gap-1 rounded-xl border p-2.5 text-left",
                    tab === item.value
                      ? "border-zinc-500 bg-zinc-800"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-100">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  <span className="block text-left text-[10px] leading-snug text-zinc-500">
                    {item.description}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* 出图（原型图22） */}
          <TabsContent value="image" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">文本模型（拆分镜 / 提示词编译）</Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {textModels.length > 0 ? textModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">生图模型（出人物/场景图 + 分镜图）</Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {imageModels.length > 0 ? imageModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-500">清晰度</Label>
                <OptionPills options={["1K","2K","4K"].map(r => ({ value: r, label: r }))} value={resolution} onChange={setResolution} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-500">画质档位</Label>
                <OptionPills options={[{ value: "low", label: "低画质" },{ value: "standard", label: "标准画质" },{ value: "high", label: "高画质" }]} value={quality} onChange={setQuality} />
              </div>
              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-zinc-600">
                🔒 影视厂的分镜图 / 首帧图 / 调度图固定按 1K · 低渲染出（它们只是视频的参考帧，出大图只会更慢更贵），此处不可调。
              </p>
            </div>

            {/* 确保分镜图一致(段内) + 增强视频效果 */}
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">确保分镜图一致（段内）</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                    开：同一大分镜内的相邻分镜逐张出（后一张参考前一张），锁住地点 / 环境 / 光线一致 —— 慢一点但同段画面衔接。不同大分镜之间「照常并发」，互不影响。关：段内也并发，最快，但同段相邻分镜可能有轻微漂移。
                  </p>
                </div>
                <Switch checked={segmentConsistent} onCheckedChange={setSegmentConsistent} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    增强视频效果 · <span className="text-orange-400">额外收费</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                    对系统建议、且还没出的大分镜顺带生成首帧图 / 调度图 / 人群卡 等增强资产，一起排队跑。图按生图另计 ，人群卡按文字。
                  </p>
                </div>
                <Switch checked={enhanceVideo} onCheckedChange={setEnhanceVideo} />
              </div>
            </div>

            {/* 重出已生成的 + 安全改写 */}
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">重出已生成的</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                    默认只补未出/失败的；勾选则连已生成的也覆盖重出（旧图/视频保留到新的出好为止）。
                  </p>
                </div>
                <Switch checked={regenerateDone} onCheckedChange={setRegenerateDone} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">安全改写（防审核拦截）</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                    血腥/暴力自动软化露骨词 + 用电影化隐喻表达，让严格审核的模型也能过审。默认关（想保留血腥、用宽松模型时别开）。
                  </p>
                </div>
                <Switch checked={safeRewrite} onCheckedChange={setSafeRewrite} />
              </div>
            </div>

            {/* 费用预估 */}
            <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5 text-[11px] leading-relaxed text-amber-300/90">
              <p>分镜图: 14 / 个 × 实际镜组数（拆分镜后结算）</p>
              <p>增强资产（首帧/清晰度/人群卡）: 14 / 个 × 实际镜组数（拆分镜后结算）</p>
              <p className="text-amber-400/60">
                数值仅预估，实际消耗会因参考图数量、各段时长、模型参数(比例/清晰度)等浮动，拆分镜后按实际镜组数 / 时长结算。
              </p>
            </div>
          </TabsContent>

          {/* 仅拆分镜 */}
          <TabsContent value="text" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">拆分用文本模型</Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {textModels.length > 0 ? textModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} · {model.cost} 积分/次
                    </SelectItem>
                  )) : <SelectItem value="" disabled>暂无可用模型，请到「AI 设置」配置</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
              只做镜头切分，不消耗生图额度。适合先确认镜头结构，再决定是否出图。
            </p>
          </TabsContent>

          {/* 出视频（原型图24/26） */}
          <TabsContent value="video" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">文本模型（现编本段视频提示词）</Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {textModels.length > 0 ? textModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* 出视频方式：卡片式选择 */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">出视频方式</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSkipImage(false)}
                  className={cn("rounded-xl border p-3 text-left transition-colors",
                    !skipImage ? "border-orange-500 bg-orange-500/10" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700")}>
                  <p className="text-xs font-medium text-zinc-100">分镜驱动</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">先出分镜图，再挂图出视频（稳定）</p>
                </button>
                <button type="button" onClick={() => setSkipImage(true)}
                  className={cn("rounded-xl border p-3 text-left transition-colors",
                    skipImage ? "border-orange-500 bg-orange-500/10" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700")}>
                  <p className="text-xs font-medium text-zinc-100">直出 · 免分镜图</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">仍会拆分镜，只是跳过分镜故事板图，直接挂角色/场景参考图出视频</p>
                </button>
              </div>
            </div>

            {/* 生图模型+清晰度+画质（用于分镜图，直出模式隐藏） */}
            {!skipImage && (
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-zinc-400">生图模型（出人物/场景图 + 分镜图）</Label>
                  <Select value={imageModel} onValueChange={setImageModel}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {imageModels.length > 0 ? imageModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-zinc-500">清晰度</Label>
                  <OptionPills options={["1K","2K","4K"].map(r => ({ value: r, label: r }))} value={resolution} onChange={setResolution} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-zinc-500">画质档位</Label>
                  <OptionPills options={[{ value: "low", label: "低画质" },{ value: "standard", label: "标准画质" },{ value: "high", label: "高画质" }]} value={quality} onChange={setQuality} />
                </div>
                <p className="text-[10px] leading-relaxed text-zinc-600">
                  🔒 影视厂的分镜图 / 首帧图 / 调度图固定按 1K · 低渲染出，此处不可调。
                </p>
              </div>
            )}

            {/* 生视频模型 + 清晰度 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">生视频模型</Label>
                <Select value={videoModel} onValueChange={setVideoModel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {videoModels.length > 0 ? videoModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} · {m.cost}</SelectItem>
                    )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">视频清晰度</Label>
                <OptionPills options={[{ value: "480p", label: "480p" },{ value: "720p", label: "720p" }]} value={resolution} onChange={setResolution} />
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-zinc-600">
              视频时长由 AI 拆解时按剧情节奏决定，此处不手动指定。
            </p>

            {/* 确保一致 + 增强效果 */}
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">确保分镜图一致（段内）</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">同段相邻分镜逐张出，锁住地点/光线一致。</p>
                </div>
                <Switch checked={segmentConsistent} onCheckedChange={setSegmentConsistent} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">增强视频效果 · <span className="text-orange-400">额外收费</span></p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">顺带生成首帧图/调度图/人群卡等增强资产。</p>
                </div>
                <Switch checked={enhanceVideo} onCheckedChange={setEnhanceVideo} />
              </div>
            </div>

            {/* 重出 + 安全改写 */}
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">重出已生成的</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">默认只补未出/失败的；勾选则连已生成的也覆盖重出。</p>
                </div>
                <Switch checked={regenerateDone} onCheckedChange={setRegenerateDone} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-200">安全改写（防审核拦截）</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">血腥/暴力自动软化露骨词 + 电影化隐喻表达。默认关。</p>
                </div>
                <Switch checked={safeRewrite} onCheckedChange={setSafeRewrite} />
              </div>
            </div>

            {/* 费用预估 */}
            <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5 text-[11px] leading-relaxed text-amber-300/90">
              <p>大分镜视频: 120 / 个 × 实际镜组数（拆分镜后结算）</p>
              <p className="text-amber-400/60">数值仅预估，实际消耗会因参考图数量、各段时长、模型参数等浮动。</p>
            </div>
          </TabsContent>

          {/* 后期 BGM（原型图25） */}
          <TabsContent value="bgm" className="space-y-4 pt-3">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              后期 BGM 是本集一整轨：按本集剧情自动编一条整集 BGM 提示词（纯音乐无人声）→ 交音频模型生成候选；同时自动产出本集配乐/音效方案。
            </p>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">音频模型（出 BGM）</Label>
              <Select value={audioModel} onValueChange={setAudioModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {audioModels.length > 0 ? audioModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} · {m.cost} 起</SelectItem>
                  )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">文本模型（读本集剧情，编 BGM 提示词）</Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {textModels.length > 0 ? textModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  )) : <SelectItem value="" disabled>暂无可用模型</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">时长意向</Label>
                <Input value={bgmDuration} onChange={(e) => setBgmDuration(e.target.value)}
                  placeholder="自动（或填秒数）" className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">生成次数（每集）</Label>
                <Input type="number" min={1} max={5} value={bgmCount} onChange={(e) => setBgmCount(Number(e.target.value) || 1)}
                  placeholder="1" className="h-8 text-xs" />
                <p className="text-[10px] text-zinc-600">每次约 2 段候选</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">风格</Label>
              <Input value={bgmStyle} onChange={(e) => setBgmStyle(e.target.value)}
                placeholder="自动（按剧情判断）；也可填如 克制悲伤 / 悬疑压迫 / 温暖治愈" className="h-8 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">额外提示词（可选）</Label>
              <Input value={bgmExtra} onChange={(e) => setBgmExtra(e.target.value)}
                placeholder="其他补充要求" className="h-8 text-xs" />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div>
                <p className="text-xs font-medium text-zinc-200">重新生成（清空已有候选）</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">勾选则清空本集已有的 BGM 候选重新生成；不勾则在已有基础上追加。</p>
              </div>
              <Switch checked={bgmRegenerate} onCheckedChange={setBgmRegenerate} />
            </div>

            <p className="text-[10px] text-zinc-600">🎵 音频钱包计费 · 纯音乐无人声</p>
          </TabsContent>
        </Tabs>

        {running && (
          <div className="space-y-1.5 rounded-lg border border-orange-500/30 bg-orange-500/[0.06] p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-orange-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                {step || "处理中…"}
              </span>
              <span className="tabular-nums text-zinc-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} indicatorClassName="bg-orange-500" />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-600">
            共 {textModels.length + imageModels.length + videoModels.length + audioModels.length} 个模型可选
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
              取消
            </Button>
            <Button
              variant="brand"
              onClick={() => void run()}
              disabled={running || (tab === "bgm" && bgmPrompt.trim().length < 2)}
              className={cn(running && "opacity-90")}
            >
              {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
              开始
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

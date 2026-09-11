"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Loader2,
  Palette,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ScriptAnalysis } from "@/services/ai/types"
import { FinalizeProgress } from "@/components/creation/film-factory/intake/FinalizeProgress"

export interface ReviewValues {
  title: string
  genre: string
  narrativeStyle: string
  visualStyle: string
  costumeStyle: string
  era: string
  totalEpisodes: number
  episodeDuration: number
  targetAspect: AspectRatio
}

/** 快捷预设：点选即填入输入框；「自定义」表示不套预设。 */
const GENRE_PRESETS = [
  "都市言情",
  "古风仙侠",
  "悬疑推理",
  "玄幻奇幻",
  "甜宠虐恋",
  "霸总",
  "逆袭爽文",
  "末世",
  "校园",
  "历史",
]
const VISUAL_PRESETS = [
  "写实电影感",
  "电影感 3D CG",
  "二次元动漫",
  "国风水墨",
  "美漫风格",
  "厚涂插画",
]
const COSTUME_PRESETS = [
  "现代",
  "古装（中国古代）",
  "民国",
  "玄幻仙侠",
  "末世/废土",
  "未来/赛博朋克",
  "西方魔幻",
]

function QuickPicks({
  options,
  value,
  onPick,
}: {
  options: readonly string[]
  value: string
  onPick: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className={cn(
            "rounded-md border px-2 py-1 text-xs transition-colors",
            value === option
              ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
          )}
        >
          {option}
        </button>
      ))}
      <span
        className={cn(
          "rounded-md border px-2 py-1 text-xs",
          options.includes(value)
            ? "border-zinc-800 bg-zinc-900/40 text-zinc-500"
            : "border-orange-500/60 bg-orange-500/10 text-orange-300",
        )}
      >
        自定义
      </span>
    </div>
  )
}

/**
 * 审阅并创建剧本弹窗。
 * 展示 AI 推理结果（允许 / 禁止内容、立项方案、分集灵感），
 * 并允许用户微调元信息（题材 / 叙事 / 视觉 / 服化道可调）后正式创建剧本。
 */
export function ReviewDialog({
  open,
  onOpenChange,
  analysis,
  scriptId,
  initialTitle,
  initialAspect,
  markedEpisodes,
  onBack,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: ScriptAnalysis
  scriptId: string
  initialTitle: string
  initialAspect: AspectRatio
  /** 用户在剧本里标记的分集数；有标记时集数以标记为准 */
  markedEpisodes?: number | null
  onBack: () => void
}) {
  const [values, setValues] = useState<ReviewValues>({
    title: initialTitle,
    genre: analysis.genre,
    narrativeStyle: analysis.narrativeStyle,
    visualStyle: analysis.visualStyle,
    costumeStyle: analysis.costumeStyle,
    era: analysis.era,
    totalEpisodes: markedEpisodes || analysis.recommendedEpisodes,
    episodeDuration: analysis.recommendedDuration,
    targetAspect: initialAspect,
  })
  const [submitting, setSubmitting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    setValues((current) => ({
      ...current,
      title: initialTitle,
      genre: analysis.genre,
      narrativeStyle: analysis.narrativeStyle,
      visualStyle: analysis.visualStyle,
      costumeStyle: analysis.costumeStyle,
      era: analysis.era,
      totalEpisodes: markedEpisodes || analysis.recommendedEpisodes,
      episodeDuration: analysis.recommendedDuration,
      targetAspect: initialAspect,
    }))
  }, [analysis, initialTitle, initialAspect, markedEpisodes])

  function patch(next: Partial<ReviewValues>) {
    setValues((current) => ({ ...current, ...next }))
  }

  function create() {
    setFinalizing(true)
  }

  function handleFinalizeComplete(_id: string) {
    setFinalizing(false)
    onOpenChange(false)
    window.location.href = `/creation/film-factory/${scriptId}`
  }

  function handleFinalizeBackground() {
    setFinalizing(false)
    onOpenChange(false)
    window.location.href = "/creation/film-factory"
  }

  const totalMinutes = Math.round((values.totalEpisodes * values.episodeDuration) / 60)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            审阅并创建剧本
          </DialogTitle>
          <DialogDescription>
            审阅 AI 推理的元信息，题材 / 叙事 / 视觉 / 服化道可调；不满意可返回修改剧本。
          </DialogDescription>
        </DialogHeader>

        {/* AI 推理结果 */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              AI 推理结果
            </h3>
            <Badge variant="brand" className="ml-auto font-normal">
              {analysis.genre}
            </Badge>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{analysis.audienceNotes}</p>

          {/* 时代 + 基调 */}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] text-zinc-500">时代</p>
              <p className="text-xs text-zinc-300">{analysis.era}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] text-zinc-500">基调</p>
              <p className="text-xs text-zinc-300">{analysis.tone}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-emerald-400">允许内容</p>
              <ul className="space-y-1">
                {analysis.allowed.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-zinc-400">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-rose-400">禁止内容</p>
              <ul className="space-y-1">
                {analysis.forbidden.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-zinc-400">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-3 border-t border-zinc-800/70 pt-2 text-[10px] leading-relaxed text-zinc-600">
            高级项（era / 允许 / 禁止 / 基调）由 AI 自动推理，暂不可编辑，下方 4 项可调
          </p>
        </section>

        <Separator />

        {/* 可编辑元信息 */}
        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="review-title">剧本标题</Label>
            <Input
              id="review-title"
              value={values.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-genre">题材</Label>
            <QuickPicks
              options={GENRE_PRESETS}
              value={values.genre}
              onPick={(genre) => patch({ genre })}
            />
            <Input
              id="review-genre"
              value={values.genre}
              onChange={(event) => patch({ genre: event.target.value })}
            />
          </div>

          {/* AI 立项方案 */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-3.5 w-3.5 text-sky-400" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                AI 立项方案
              </h3>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{analysis.treatment}</p>
            <p className="mt-2 text-[11px] text-zinc-500">基调：{analysis.tone}</p>
          </section>

          <div className="space-y-1.5">
            <Label htmlFor="review-narrative">叙事风格（节奏调性，非规范）</Label>
            <Textarea
              id="review-narrative"
              rows={2}
              value={values.narrativeStyle}
              onChange={(event) => patch({ narrativeStyle: event.target.value })}
            />
            <p className="text-[10px] text-zinc-600">基础风格，至少：视角设定 / 核心冲突 / 故事走向</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-visual">视觉风格（影响全剧出图）</Label>
            <QuickPicks
              options={VISUAL_PRESETS}
              value={values.visualStyle}
              onPick={(visualStyle) => patch({ visualStyle })}
            />
            <Input
              id="review-visual"
              value={values.visualStyle}
              onChange={(event) => patch({ visualStyle: event.target.value })}
            />
            <p className="text-[10px] leading-relaxed text-zinc-600">
              全剧角色 / 场景描述会自动按这个风格出图，出图视觉统一；不选 = AI 根据剧目自定
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-costume">服化道风格（时代背景，决定角色服饰 + 场景类型）</Label>
            <QuickPicks
              options={COSTUME_PRESETS}
              value={values.costumeStyle}
              onPick={(costumeStyle) => patch({ costumeStyle })}
            />
            <Input
              id="review-costume"
              value={values.costumeStyle}
              onChange={(event) => patch({ costumeStyle: event.target.value })}
            />
            <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-2 py-1.5 text-[10px] leading-relaxed text-amber-300/90">
              ⚠ 这条比「视觉风格」优先级更高 —— 它告诉 AI 这是哪个时代 / 角色穿什么 / 场景长啥样，
              选错了会出现「都市言情变古装宫廷」这类穿帮。
            </p>
            {!COSTUME_PRESETS.includes(values.costumeStyle) && values.costumeStyle.trim() && (
              <p className="rounded-md border border-sky-500/30 bg-sky-500/[0.06] px-2 py-1.5 text-[10px] leading-relaxed text-sky-300/90">
                💡 你选择了自定义风格「{values.costumeStyle}」。AI 将使用默认万能模板提取资产描述词和生成参考图。
                如需为该风格配置专属模板，请前往{" "}
                <a href="/ai-settings" target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-200">
                  配置 → 风格模板
                </a>{" "}
                新建并命名一致。
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-era">时代背景</Label>
            <Input
              id="review-era"
              value={values.era}
              onChange={(event) => patch({ era: event.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="review-episodes">
                集数{" "}
                {markedEpisodes ? (
                  <span className="text-[10px] font-normal text-emerald-400">按你的标记</span>
                ) : (
                  <span className="text-[10px] font-normal text-zinc-500">按你的标记</span>
                )}
              </Label>
              <Input
                id="review-episodes"
                type="number"
                min={1}
                max={500}
                value={values.totalEpisodes}
                onChange={(event) => patch({ totalEpisodes: Number(event.target.value) || 1 })}
              />
              <p className="text-[10px] text-zinc-600">
                你标的 {values.totalEpisodes} 集分集（照标记切，AI 推荐仅参考）
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-duration">单集时长（秒）</Label>
              <Input
                id="review-duration"
                type="number"
                min={5}
                max={3600}
                value={values.episodeDuration}
                onChange={(event) => patch({ episodeDuration: Number(event.target.value) || 90 })}
              />
              <p className="text-[10px] text-zinc-600">
                全部 {values.totalEpisodes} 集总时长约 {totalMinutes} 分 {values.episodeDuration % 60} 秒
              </p>
            </div>
          </div>

          {markedEpisodes ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-xs leading-relaxed text-emerald-300">
              ✓ 检测到你标了 {markedEpisodes} 集分集 → 创建后严格切成 {markedEpisodes}{" "}
              集，一集不多一集不少（集数以你的标记为准，上面 AI 推荐的数仅参考）。
            </p>
          ) : null}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>目标画幅（全剧统一）</Label>
            <OptionPills
              options={ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
              value={values.targetAspect}
              onChange={(value) => patch({ targetAspect: value })}
            />
            <p className="text-[10px] leading-relaxed text-zinc-600">
              提示只 / 视频统一按此比例出；角色形卡、九宫格故事版固定 16:9，不受影响（九宫格只作分镜参考，
              视频仍按此比例出）。
            </p>
          </div>
        </section>

        {/* 分集灵感 */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-violet-400" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              剧情灵感
            </h3>
            <span className="text-[11px] text-zinc-600">
              AI 生成大纲的根基 · 共 {values.totalEpisodes} 集
            </span>
          </div>

          <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
            {analysis.episodeIdeas.map((idea) => (
              <div
                key={idea.number}
                className="flex gap-2.5 rounded-lg border border-zinc-800/70 bg-zinc-900/40 p-2.5"
              >
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-orange-400">
                  第{idea.number}集 {idea.title}
                </span>
                <span className="min-w-0">
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">
                    {idea.summary}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[10px] leading-relaxed text-zinc-500">
          建档只做会诊 6（出诊断报告，暂不改正文）；进详情页确认后的一键修改/台词按实际生成步数另计。余额不足会拦。
        </p>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            ‹ 修改剧本
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              取消
            </Button>
            <Button variant="inverse" onClick={() => void create()} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Check />}
              创建剧本
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <FinalizeProgress
      open={finalizing}
      scriptId={scriptId}
      values={values as unknown as Record<string, unknown>}
      onComplete={handleFinalizeComplete}
      onBackground={handleFinalizeBackground}
    />
    </>
  )
}

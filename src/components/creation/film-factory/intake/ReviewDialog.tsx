"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Loader2,
  Palette,
  Sparkles,
  UserRound,
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
import type { ScriptAnalysis } from "@/services/ai/types"

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

/**
 * 审阅并创建剧本弹窗。
 * 展示 AI 推理结果（允许 / 禁止内容、立项方案、分集灵感），
 * 并允许用户微调元信息后正式创建剧本。
 */
export function ReviewDialog({
  open,
  onOpenChange,
  analysis,
  scriptId,
  initialTitle,
  initialAspect,
  onBack,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: ScriptAnalysis
  scriptId: string
  initialTitle: string
  initialAspect: AspectRatio
  onBack: () => void
}) {
  const [values, setValues] = useState<ReviewValues>({
    title: initialTitle,
    genre: analysis.genre,
    narrativeStyle: analysis.narrativeStyle,
    visualStyle: analysis.visualStyle,
    costumeStyle: analysis.costumeStyle,
    era: analysis.era,
    totalEpisodes: analysis.recommendedEpisodes,
    episodeDuration: analysis.recommendedDuration,
    targetAspect: initialAspect,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues((current) => ({
      ...current,
      title: initialTitle,
      genre: analysis.genre,
      narrativeStyle: analysis.narrativeStyle,
      visualStyle: analysis.visualStyle,
      costumeStyle: analysis.costumeStyle,
      era: analysis.era,
      totalEpisodes: analysis.recommendedEpisodes,
      episodeDuration: analysis.recommendedDuration,
      targetAspect: initialAspect,
    }))
  }, [analysis, initialTitle, initialAspect])

  function patch(next: Partial<ReviewValues>) {
    setValues((current) => ({ ...current, ...next }))
  }

  async function create() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/finalize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "创建剧本失败")

      toast.success("剧本已创建", {
        description: `共 ${payload.data.totalEpisodes} 集，已生成分集大纲`,
      })
      onOpenChange(false)
      window.location.href = `/creation/film-factory/${scriptId}`
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建剧本失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            审阅并创建剧本
          </DialogTitle>
          <DialogDescription>
            以下为 AI 推理的元信息（题材 / 叙事 / 视觉 / 服化道可调），确认后创建；也可返回修改剧本原文。
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
        </section>

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

        <Separator />

        {/* 可编辑元信息 */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="review-title">剧本标题</Label>
            <Input
              id="review-title"
              value={values.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-genre">题材</Label>
            <Input
              id="review-genre"
              value={values.genre}
              onChange={(event) => patch({ genre: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-era">时代背景</Label>
            <Input
              id="review-era"
              value={values.era}
              onChange={(event) => patch({ era: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-narrative">叙事风格</Label>
            <Input
              id="review-narrative"
              value={values.narrativeStyle}
              onChange={(event) => patch({ narrativeStyle: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-visual">视觉风格</Label>
            <Input
              id="review-visual"
              value={values.visualStyle}
              onChange={(event) => patch({ visualStyle: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-costume">服化道风格</Label>
            <Input
              id="review-costume"
              value={values.costumeStyle}
              onChange={(event) => patch({ costumeStyle: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-episodes">集数</Label>
            <Input
              id="review-episodes"
              type="number"
              min={1}
              max={500}
              value={values.totalEpisodes}
              onChange={(event) => patch({ totalEpisodes: Number(event.target.value) || 1 })}
            />
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
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>目标画幅</Label>
            <OptionPills
              options={ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
              value={values.targetAspect}
              onChange={(value) => patch({ targetAspect: value })}
            />
          </div>
        </section>

        {/* 分集灵感 */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-violet-400" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              分集灵感
            </h3>
            <span className="text-[11px] text-zinc-600">
              共 {values.totalEpisodes} 集 · {values.episodeDuration}s/集
            </span>
          </div>

          <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
            {analysis.episodeIdeas.map((idea) => (
              <div
                key={idea.number}
                className="flex gap-2.5 rounded-lg border border-zinc-800/70 bg-zinc-900/40 p-2.5"
              >
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-orange-400">
                  EP{String(idea.number).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-zinc-200">{idea.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">
                    {idea.summary}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            <UserRound />
            返回修改剧本
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              取消
            </Button>
            <Button variant="inverse" onClick={() => void create()} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Clapperboard />}
              创建剧本
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

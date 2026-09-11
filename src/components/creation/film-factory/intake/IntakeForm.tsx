"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScriptMaterialPanel } from "@/components/creation/film-factory/intake/ScriptMaterialPanel"
import {
  ConfigPanel,
  type IntakeConfig,
} from "@/components/creation/film-factory/intake/ConfigPanel"
import { AnalysisLoading } from "@/components/creation/film-factory/intake/AnalysisLoading"
import { ReviewDialog } from "@/components/creation/film-factory/intake/ReviewDialog"
import type { ScriptAnalysis } from "@/services/ai/types"

const DEFAULT_CONFIG: IntakeConfig = {
  workType: "vertical_short",
  seriesType: "limited",
  targetAspect: "9:16",
  textModel: "ovlm-6",
  processingMode: "consult_optimize",
  executionMode: "step_by_step",
  consultModel: "ovlm-6",
  dialogueModel: "ovlm-6",
}

/**
 * 新建剧本（INTAKE）主表单。
 *
 * 三步流程：
 * 1. POST /api/scripts 落库（processing）
 * 2. POST /api/scripts/[id]/analyze AI 通读
 * 3. ReviewDialog → POST /api/scripts/[id]/finalize 生成分集大纲
 */
export function IntakeForm({
  embedded = false,
  onFinished,
}: {
  /** embedded：在弹窗中渲染，隐藏外层留白与返回按钮 */
  embedded?: boolean
  /** 创建完成后回调（弹窗模式用于关闭弹窗） */
  onFinished?: () => void
} = {}) {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [config, setConfig] = useState<IntakeConfig>(DEFAULT_CONFIG)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})

  const [analyzing, setAnalyzing] = useState(false)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)

  const [scriptId, setScriptId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  // 统计正文里的分集标记（【第N集 …】），供审阅弹窗按标记切集
  const markedEpisodes = (() => {
    const matches = content.match(/【第\s*\d+\s*集[^】]*】/g)
    return matches ? new Set(matches).size : 0
  })()

  function patchConfig(patch: Partial<IntakeConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function validate() {
    const next: typeof errors = {}
    if (!title.trim()) next.title = "请输入剧本标题"
    if (content.trim().length < 20) next.content = "剧本内容太短，至少 20 字"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function startAnalysis() {
    if (!validate()) return

    setAnalyzing(true)
    setProgressLabel("正在保存剧本建档信息…")

    try {
      // 1) 落库
      const createRes = await fetch("/api/scripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          workType: config.workType,
          seriesType: config.seriesType,
          targetAspect: config.targetAspect,
          textModel: config.textModel,
          processingMode: config.processingMode,
          executionMode: config.executionMode,
          consultModel: config.consultModel,
          dialogueModel: config.dialogueModel,
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) throw new Error(created.error ?? "建档失败")

      const id: string = created.data.id
      setScriptId(id)
      setProgressLabel("正在通读全本，理解剧情脉络…")

      // 2) AI 分析
      const analyzeRes = await fetch(`/api/scripts/${id}/analyze`, {
        method: "POST",
      })
      const analyzed = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzed.error ?? "AI 分析失败")

      setProgressLabel("分析完成")
      setAnalysis(analyzed.data.analysis as ScriptAnalysis)
      setReviewOpen(true)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI 立项失败，请重试",
      )
    } finally {
      setAnalyzing(false)
      setProgressLabel(null)
    }
  }

  return (
    <>
      <main
        className={embedded ? "" : "mx-auto w-full max-w-6xl px-4 py-6 lg:px-6"}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {!embedded && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  asChild
                  aria-label="返回影视工厂"
                >
                  <Link href="/creation/film-factory">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
                新建剧本
              </h1>
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Intake
              </span>
              <span className="text-[11px] text-zinc-600">· 立项台</span>
            </div>

            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-zinc-500">
              粘贴你的剧本（或文案），点「AI 智能立项」—— AI 通读全本后推荐集数
              / 单集时长 / 三幕结构 / 题材 / 视觉风格 /
              服化道，审阅微调后再创建。
            </p>
          </div>

          {!embedded && (
            <Button variant="ghost" size="icon-sm" asChild aria-label="关闭">
              <Link href="/creation/film-factory">
                <X className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* 双栏 */}
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
            <ScriptMaterialPanel
              title={title}
              content={content}
              onTitleChange={setTitle}
              onContentChange={setContent}
              errors={errors}
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
            <ConfigPanel config={config} onChange={patchConfig} />
          </div>
        </div>

        {/* 底部操作栏 */}
        <div
          className={
            embedded
              ? "mt-5 flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4"
              : "sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-zinc-800/80 bg-zinc-950/85 py-3 backdrop-blur"
          }
        >
          {!embedded && (
            <Button
              variant="ghost"
              onClick={() => router.push("/creation/film-factory")}
            >
              关闭
            </Button>
          )}

          <div
            className={
              embedded
                ? "ml-auto flex items-center gap-3"
                : "flex items-center gap-3"
            }
          >
            <span className="hidden text-[11px] text-zinc-600 sm:block">
              预计消耗{" "}
              {config.processingMode === "consult_optimize" ? "5" : "5"} 积分 ·
              按实际步数累计
            </span>
            <Button
              variant="inverse"
              onClick={() => void startAnalysis()}
              disabled={analyzing}
            >
              <Sparkles />
              AI 智能立项
            </Button>
          </div>
        </div>
      </main>

      <AnalysisLoading active={analyzing} label={progressLabel} />

      {analysis && scriptId && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          analysis={analysis}
          scriptId={scriptId}
          initialTitle={title}
          initialAspect={config.targetAspect}
          markedEpisodes={markedEpisodes || null}
          onBack={() => setReviewOpen(false)}
        />
      )}
    </>
  )
}

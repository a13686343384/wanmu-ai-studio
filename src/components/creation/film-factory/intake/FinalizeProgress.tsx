"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STEPS = [
  { label: "拆分集数 · 生成大纲", desc: "AI 通读剧本，按内容拆分集数并生成每集大纲" },
  { label: "提取角色 / 场景 / 道具", desc: "从剧本中提取全部角色、场景、道具的描述词" },
] as const

/**
 * 创建剧本解析进度弹窗（原型图6/7）。
 * 两步真实进度：拆分集数+生成大纲 → 提取资产。
 * finalize API 同步执行两步，返回后即为完成。
 */
export function FinalizeProgress({
  open,
  scriptId,
  values,
  onComplete,
  onBackground,
}: {
  open: boolean
  scriptId: string
  values: Record<string, unknown>
  onComplete: (id: string) => void
  onBackground: () => void
}) {
  const [step, setStep] = useState(-1) // -1=未开始, 0=拆分集数, 1=提取资产
  const [statusText, setStatusText] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState("")
  const cancelledRef = useRef(false)

  // 实时计时
  useEffect(() => {
    if (step < 0 || error) return
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [step, error])

  useEffect(() => {
    if (!open) {
      setStep(-1)
      setError(null)
      setElapsed(0)
      setResultMsg("")
      cancelledRef.current = false
      return
    }
    cancelledRef.current = false

    async function run() {
      try {
        // Step 0: 拆分集数 + 生成大纲 + 提取资产（finalize API 同步完成所有步骤）
        setStep(0)
        setStatusText("正在按分集标记切剧本，生成每集大纲…")

        // 模拟第一步完成后切换到第二步（实际 API 是同步的，这里用定时器给用户视觉反馈）
        const stepTimer = setTimeout(() => {
          if (!cancelledRef.current) {
            setStep(1)
            setStatusText("正在从剧本中提取角色 / 场景 / 道具描述词…")
          }
        }, 8000) // 8秒后切换到第二步提示（大纲生成通常需要这么久）

        const res = await fetch(`/api/scripts/${scriptId}/finalize`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        })
        clearTimeout(stepTimer)
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "创建剧本失败")
        if (cancelledRef.current) return

        // API 返回 = 两步都完成了
        setStep(2) // 超过最后一步 = 全部完成
        const counts = payload.data?.assetCounts
        const msg = counts
          ? `完成 · ${counts.characters} 个角色 · ${counts.scenes} 个场景 · ${counts.props} 个道具`
          : "完成"
        setResultMsg(msg)
        setStatusText(msg)

        // 短暂展示完成状态后跳转
        await new Promise(r => setTimeout(r, 1200))
        if (cancelledRef.current) return
        onComplete(scriptId)
      } catch (e) {
        if (cancelledRef.current) return
        setError(e instanceof Error ? e.message : "解析失败")
      }
    }

    void run()
    return () => {
      cancelledRef.current = true
    }
  }, [open, scriptId, values, onComplete])

  const isComplete = step >= STEPS.length

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            AI 正在解析剧本
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            把你的完整剧本拆成集 / 角色 / 场景。通常需要 1-3 分钟，剧本越长越慢。可以关闭此窗，后台会继续。
          </DialogDescription>
        </DialogHeader>

        {/* 两步进度 */}
        <div className="space-y-3 py-1">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-start gap-3">
              {i < step || isComplete ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : i === step && !error ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-orange-400" />
              ) : (
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] text-zinc-500">
                  {i + 1}
                </span>
              )}
              <div>
                <span className={i <= step || isComplete ? "text-sm text-zinc-200" : "text-sm text-zinc-500"}>
                  {s.label}
                </span>
                <p className="text-[10px] text-zinc-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 状态文案 + 计时 */}
        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <p className="text-xs text-zinc-400">{statusText}</p>
            {!isComplete && !error && (
              <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
                已用 {elapsed}s
              </p>
            )}
            {isComplete && resultMsg && (
              <p className="mt-1 text-[10px] text-emerald-400">✓ {resultMsg}</p>
            )}
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-zinc-200"
            onClick={onBackground}
          >
            后台运行
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

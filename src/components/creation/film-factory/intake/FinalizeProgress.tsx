"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STEPS = ["拆分集数", "整理入库", "剧本医生会诊"] as const

/**
 * 创建剧本解析进度弹窗（原型图6/7）。
 * 三步进度：拆分集数 → 整理入库 → 剧本医生会诊。
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
  const [step, setStep] = useState(-1) // -1=未开始, 0=拆分集数, 1=整理入库, 2=会诊
  const [statusText, setStatusText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setStep(-1)
      setError(null)
      cancelledRef.current = false
      return
    }
    cancelledRef.current = false

    async function run() {
      try {
        // Step 0: 拆分集数（调用 finalize API）
        setStep(0)
        setStatusText("正在按分集标记切剧本…")

        const res = await fetch(`/api/scripts/${scriptId}/finalize`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "创建剧本失败")
        if (cancelledRef.current) return

        // Step 1: 整理入库（finalize 内部已完成，视觉过渡）
        setStep(1)
        setStatusText("正在整理入库…")
        await new Promise((r) => setTimeout(r, 600))
        if (cancelledRef.current) return

        // Step 2: 剧本医生会诊（当前跳过，直接进入详情页）
        setStep(2)
        setStatusText("剧本医生正在通读全剧会诊…")
        await new Promise((r) => setTimeout(r, 400))
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

  return (
    <Dialog
      open={open}
      onOpenChange={() => {}}
    >
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
            把你的完整剧本拆成集 / 角色 / 场景。原样保留通常 5~10 分钟；若选了「会诊＋台词优化」会更久（逐步确认档几分钟出会诊报告即可；选了全自动则逐集改写＋台词都在跑，20
            分钟以上），剧本越长越慢。可以关闭此窗，后台会继续，稍后在列表点开即可。
          </DialogDescription>
        </DialogHeader>

        {/* 三步进度 */}
        <div className="space-y-3 py-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i < step ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : i === step && !error ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-400" />
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] text-zinc-500">
                  {i + 1}
                </span>
              )}
              <span
                className={
                  i <= step && !error
                    ? "text-sm text-zinc-200"
                    : "text-sm text-zinc-500"
                }
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* 状态文案 */}
        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
            {error}
          </p>
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
            {statusText}
          </p>
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

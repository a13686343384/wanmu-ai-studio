"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface RecapResult {
  recap: string
  beats: string[]
}

/**
 * 「先让 AI 复述理解本集」弹窗。
 * 拆分镜前先确认 AI 的理解与创作者一致，降低后续返工。
 */
export function RecapDialog({
  open,
  onOpenChange,
  scriptId,
  episodeId,
  episodeTitle,
  result,
  onLoaded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string
  episodeId: string
  episodeTitle: string
  result: RecapResult | null
  onLoaded: (result: RecapResult) => void
}) {
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/episodes/${episodeId}/recap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "复述失败")
      onLoaded({ recap: payload.data.recap, beats: payload.data.beats })
      toast.success("AI 已复述本集")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "复述失败")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            先让 AI 复述理解本集
          </DialogTitle>
          <DialogDescription>
            {episodeTitle} —— AI 用自己的话复述本集，并给出镜组节奏建议。理解一致后再拆分镜，返工更少。
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-400">还没有复述结果</p>
            <Button variant="brand" className="mt-4" onClick={() => void run()} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
              让 AI 复述理解
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                AI 的理解
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{result.recap}</p>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                建议镜组节奏
              </p>
              <ol className="mt-2 space-y-1.5">
                {result.beats.map((beat, index) => (
                  <li key={beat} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
                    <span className="shrink-0 font-medium tabular-nums text-orange-400">
                      {index + 1}.
                    </span>
                    {beat}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => void run()} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
            重新复述
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

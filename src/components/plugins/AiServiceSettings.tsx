"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, PlugZap } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

/**
 * 设置页「AI 服务」卡片：仅保留 MOCK 开关。
 * 所有模型配置已统一到「AI 设置 → 模型」Tab。
 */
export function AiServiceSettings() {
  const [mode, setMode] = useState<"mock" | "live">("mock")
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/ai")
      const payload = await res.json()
      if (res.ok) setMode(payload.data.mode)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function switchMode(live: boolean) {
    setSwitching(true)
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: live ? "live" : "mock" }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "切换失败")
      toast.success(payload.message ?? "已切换", {
        description: live
          ? "所有模型从「AI 设置 → 模型」读取"
          : "全部能力恢复为内置 Mock 数据",
      })
      setMode(live ? "live" : "mock")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "切换失败")
    } finally {
      setSwitching(false)
    }
  }

  const live = mode === "live"

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <PlugZap className="h-4 w-4 text-orange-400" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-zinc-100">AI 服务</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {live
              ? "真实模式：所有模型从「AI 设置 → 模型」读取"
              : "MOCK 模式：使用内置假数据，无需任何 API 配置"}
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              {live ? "真实服务" : "MOCK 数据"}
            </span>
            <Switch
              aria-label="MOCK 数据开关"
              checked={live}
              disabled={switching}
              onCheckedChange={(checked) => void switchMode(checked)}
            />
            {switching && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
          </div>
        )}
      </div>
    </section>
  )
}

"use client"

import { useEffect } from "react"
import { Coins, Crown, Loader2, Sparkles } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAiModels } from "@/hooks/useAiModels"
import { cn } from "@/lib/utils"

/** 文本推理模型选择（INTAKE / 大纲 / 会诊 / 台词通用）。 */
export function ModelPicker({
  value,
  onChange,
  label,
  hint,
  compact,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  hint?: string
  compact?: boolean
}) {
  const { models, loading } = useAiModels("text")

  // 自动选中第一个可用模型
  useEffect(() => {
    if (models.length > 0 && !models.find((m) => m.id === value)) {
      onChange(models[0]!.id)
    }
  }, [models]) // eslint-disable-line react-hooks/exhaustive-deps

  if (compact) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={loading ? "加载中…" : "选择模型"} />
        </SelectTrigger>
        <SelectContent>
          {models.length === 0 && !loading && (
            <SelectItem value="__empty" disabled>暂无可用模型，请到「AI 设置」配置</SelectItem>
          )}
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name} · {model.cost} 积分/次
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 加载模型列表…
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 py-4 text-center text-xs text-zinc-500">
          暂无可用模型，
          <a href="/ai-settings" className="text-orange-400 hover:text-orange-300 underline">前往配置</a>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {models.map((model) => {
            const selected = model.id === value
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onChange(model.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-orange-500/60 bg-orange-500/[0.07]"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Crown className="h-3 w-3 text-amber-400" />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      selected ? "text-orange-200" : "text-zinc-200",
                    )}
                  >
                    {model.name}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <Coins className="h-3 w-3 text-amber-400/80" />
                  {model.cost} 积分/次
                </span>
              </button>
            )
          })}
        </div>
      )}
      {hint && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-orange-400/70" />
          {hint}
        </p>
      )}
    </div>
  )
}

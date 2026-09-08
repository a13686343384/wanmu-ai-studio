"use client"

import { Check, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 可选项卡片：用于「作品类型 / 剧集类型 / 加工方式 / 执行方式」等单选场景。
 * 支持标题、描述、推荐标记与选中态。
 */
export function OptionCard({
  label,
  description,
  selected,
  onSelect,
  recommended,
  icon: Icon,
  compact,
  className,
}: {
  label: string
  description?: string
  selected: boolean
  onSelect: () => void
  recommended?: boolean
  icon?: LucideIcon
  compact?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-lg border text-left transition-colors",
        compact ? "px-3 py-2" : "px-3.5 py-3",
        selected
          ? "border-orange-500/60 bg-orange-500/[0.07]"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded",
              selected ? "bg-orange-500/20 text-orange-300" : "bg-zinc-800 text-zinc-400",
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "text-sm font-medium",
                selected ? "text-orange-200" : "text-zinc-200",
              )}
            >
              {label}
            </span>
            {recommended && (
              <span className="rounded border border-orange-500/40 bg-orange-500/10 px-1 py-0.5 text-[10px] font-normal text-orange-300">
                推荐
              </span>
            )}
          </span>

          {description && (
            <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span>
          )}
        </span>

        {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />}
      </div>
    </button>
  )
}

/** 一组紧凑的单选按钮（用于作品类型 / 目标画幅等短标签场景）。 */
export function OptionPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string; note?: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
              selected
                ? "border-orange-500/60 bg-orange-500/10 text-orange-200"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            {option.label}
            {option.note && (
              <span className="ml-1.5 text-[10px] text-zinc-500">{option.note}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

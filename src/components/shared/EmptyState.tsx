"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  /** CTA 按钮 / 按钮组 */
  action?: React.ReactNode
  /** compact 用于侧栏、弹窗内的小型空态 */
  size?: "default" | "compact"
  className?: string
}

/** 统一空状态：插画位（图标）+ 标题 + 描述 + CTA，挂载时轻微上浮淡入。 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: EmptyStateProps) {
  const compact = size === "compact"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center",
        compact ? "gap-1 px-4 py-6" : "gap-1.5 px-6 py-16",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-1 flex items-center justify-center rounded-full bg-zinc-800/60 text-zinc-500",
            compact ? "h-8 w-8" : "h-11 w-11",
          )}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} aria-hidden />
        </span>
      )}
      <p className={cn("font-medium text-zinc-300", compact ? "text-xs" : "text-sm")}>{title}</p>
      {description && (
        <p
          className={cn(
            "leading-relaxed text-zinc-600",
            compact ? "text-[11px]" : "mt-0.5 max-w-md text-xs",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className={cn(compact ? "mt-2" : "mt-4")}>{action}</div>}
    </motion.div>
  )
}

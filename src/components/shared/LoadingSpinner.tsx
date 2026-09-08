import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const SIZE_CLASS = {
  sm: "h-3.5 w-3.5",
  default: "h-5 w-5",
  lg: "h-8 w-8",
} as const

interface LoadingSpinnerProps {
  /** 旋转图标的尺寸 */
  size?: keyof typeof SIZE_CLASS
  /** 随旋转图标展示的文案 */
  label?: string
  className?: string
  /** 图标颜色类，默认品牌橙 */
  iconClassName?: string
}

/** 品牌色加载指示器：橙色旋转 + 可选文案，用于区块级 / 页面级等待态。 */
export function LoadingSpinner({
  size = "default",
  label = "加载中…",
  className,
  iconClassName,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-2 text-zinc-400", className)}
    >
      <Loader2
        className={cn("animate-spin text-orange-500", SIZE_CLASS[size], iconClassName)}
        aria-hidden
      />
      {label && <span className="text-xs text-zinc-500">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  )
}

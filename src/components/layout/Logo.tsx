import Link from "next/link"
import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

/**
 * 品牌标识：橙色渐变方块 + 文字。
 * 与设计稿一致，`Manvo TV` 中 `TV` 用品牌色。
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group flex shrink-0 items-center gap-2", className)}
      aria-label={`${APP_NAME} 首页`}
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-[0_0_18px_-4px_rgba(249,115,22,0.7)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden>
          <path
            d="M4 6.5 12 3l8 3.5v5.2c0 4.6-3.2 8.4-8 9.8-4.8-1.4-8-5.2-8-9.8V6.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 12.5 11.2 15 15.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Manvo<span className="text-orange-500"> TV</span>
        </span>
      )}
    </Link>
  )
}

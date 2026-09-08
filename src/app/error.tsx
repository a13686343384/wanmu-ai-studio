"use client"

import { useEffect } from "react"
import { ErrorFallback } from "@/components/shared/ErrorBoundary"

/**
 * App Router 路由级错误兜底：
 * 任意服务端 / 客户端渲染异常都会落到这里，提供「重试」（重渲染当前路由段）。
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[route error]", error)
  }, [error])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <ErrorFallback onRetry={reset} />
    </main>
  )
}

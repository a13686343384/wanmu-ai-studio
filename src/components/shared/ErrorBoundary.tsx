"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorFallbackProps {
  /** 面向用户的中性描述；原始错误信息只打印到控制台 */
  title?: string
  description?: string
  onRetry: () => void
  className?: string
}

/** 错误兜底 UI：图标 + 文案 + 重试按钮，供 ErrorBoundary 与路由 error.tsx 共用。 */
export function ErrorFallback({
  title = "页面出错了",
  description = "渲染时发生异常，重试通常可以解决。若反复出现，请刷新页面或联系支持。",
  onRetry,
  className,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
        <AlertTriangle className="h-5 w-5 text-rose-400" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw className="h-3.5 w-3.5" />
        重试
      </Button>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  /** 自定义兜底 UI；不传时使用内置的默认样式 */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * 通用错误边界：捕获子树渲染期异常，展示友好提示 + 重试按钮。
 * 路由级兜底见 `src/app/error.tsx`；本组件用于包裹易出错的局部子树。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset)
    }

    return <ErrorFallback onRetry={this.reset} />
  }
}

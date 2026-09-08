"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * 全局 Toast 容器（深色主题，仅深色模式）。
 * 在根布局中挂载一次，业务代码用 `toast.success(...)` 调用。
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-400",
          actionButton: "group-[.toast]:bg-orange-500 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-300",
          error: "group-[.toaster]:border-rose-500/40",
          success: "group-[.toaster]:border-emerald-500/40",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

"use client"

import { SessionProvider } from "next-auth/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

/**
 * 全局客户端 Provider 集合：
 * - SessionProvider：NextAuth 会话
 * - TooltipProvider：Radix 提示
 * - Toaster：全局 Toast
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster />
      </TooltipProvider>
    </SessionProvider>
  )
}

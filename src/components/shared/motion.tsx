"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface FadeInProps {
  children: React.ReactNode
  className?: string
  /** 入场延迟（秒），用于列表交错入场 */
  delay?: number
}

/** 内容块入场：轻微上浮淡入，用于列表 / 卡片区切换时的过渡。 */
export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** 页面级转场：按路由 key 重新挂载并淡入，包裹在 (dashboard) 布局的 children 上。 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={cn("flex-1")}
    >
      {children}
    </motion.div>
  )
}

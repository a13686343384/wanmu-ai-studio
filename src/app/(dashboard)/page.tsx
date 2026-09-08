import type { Metadata } from "next"
import { HeroSection } from "@/components/workbench/HeroSection"

export const metadata: Metadata = {
  title: "工作台",
}

/** 工作台首页：生成输入区（任务 5）+ 精选作品画廊（任务 6）。 */
export default function WorkbenchPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <HeroSection />
    </main>
  )
}

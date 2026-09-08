import type { Metadata } from "next"
import { HeroSection } from "@/components/workbench/HeroSection"
import { FeaturedGallery } from "@/components/workbench/FeaturedGallery"

export const metadata: Metadata = {
  title: "工作台",
}

/** 工作台首页：生成输入区 + 精选作品画廊。 */
export default function WorkbenchPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <HeroSection />
      <FeaturedGallery />
    </main>
  )
}

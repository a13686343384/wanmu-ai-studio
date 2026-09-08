"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { WorkCard } from "@/components/workbench/WorkCard"
import { FEATURED_WORKS } from "@/lib/mock-data/featured-works"

/**
 * 精选作品画廊：横向滚动卡片列表。
 * 左侧为标题区，右侧为作品卡片，支持左右翻页。
 */
export function FeaturedGallery() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function scrollBy(direction: 1 | -1) {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({ left: direction * 360, behavior: "smooth" })
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 lg:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[28px]">
            让作品，成为最有力的表达
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            精选真实成片与创作者作品，悬停预览片段，点击播放完整内容。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] tracking-[0.2em] text-zinc-600 sm:block">
            {String(FEATURED_WORKS.length).padStart(2, "0")} SELECTED WORKS
          </span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon-sm" onClick={() => scrollBy(-1)} aria-label="向左滚动">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => scrollBy(1)} aria-label="向右滚动">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
      >
        {FEATURED_WORKS.map((work, index) => (
          <motion.div
            key={work.id}
            className="snap-start"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 }}
          >
            <WorkCard work={work} total={FEATURED_WORKS.length} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

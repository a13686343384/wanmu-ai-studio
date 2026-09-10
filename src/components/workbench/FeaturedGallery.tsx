"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { WorkCard } from "@/components/workbench/WorkCard"
import { FEATURED_WORKS } from "@/lib/mock-data/featured-works"

/**
 * 精选作品画廊：左侧品牌面板 + 右侧两行网格横向滚动。
 * 左面板含 Manvo TV 标识、主标语、作品数与翻页按钮（与设计稿一致）。
 */
export function FeaturedGallery() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function scrollBy(direction: 1 | -1) {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({ left: direction * 720, behavior: "smooth" })
  }

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-2 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* 左侧品牌面板 */}
        <div className="relative flex w-full shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-7 lg:w-[340px]">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-zinc-50">
              Manvo <span className="italic text-orange-500">TV</span>
              <span className="ml-0.5 align-super text-[10px] text-orange-400">✦</span>
            </p>

            <p className="mt-8 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-orange-500/90">
              <span className="h-px w-5 bg-orange-500/60" aria-hidden />
              Created on Manvo TV
            </p>

            <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-zinc-50">
              让作品，成为最有力的表达
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              精选真实成片与创作者作品，悬停预览片段，点击播放完整内容。
            </p>
          </div>

          <div className="mt-10 flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold tabular-nums text-zinc-100">
                {String(FEATURED_WORKS.length).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-zinc-600">
                Selected Works
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => scrollBy(-1)}
                aria-label="向左滚动"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => scrollBy(1)}
                aria-label="向右滚动"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧两行网格，横向滚动翻页 */}
        <div
          ref={scrollerRef}
          className="scrollbar-hide -mx-1 grid flex-1 snap-x grid-flow-col grid-rows-2 gap-4 overflow-x-auto px-1 pb-2"
        >
          {FEATURED_WORKS.map((work, index) => (
            <motion.div
              key={work.id}
              className="snap-start"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index * 0.05, 0.4) }}
            >
              <WorkCard work={work} total={FEATURED_WORKS.length} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

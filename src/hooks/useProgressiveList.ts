"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 长列表渐进渲染：先渲染前 initialCount 项，滚动接近末尾时按 step 追加。
 * 用于分集数 > 100 等长列表场景，避免一次性挂载全部 DOM；
 * 效果等同「虚拟化」，但无需第三方依赖、对不定高行安全。
 */
export function useProgressiveList(total: number, options?: { initialCount?: number; step?: number; rootMargin?: string }) {
  const { initialCount = 30, step = 30, rootMargin = "400px" } = options ?? {}
  const [visibleCount, setVisibleCount] = useState(Math.min(initialCount, total))
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(Math.min(initialCount, total))
  }, [total, initialCount])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || visibleCount >= total) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + step, total))
        }
      },
      { rootMargin },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, total, step, rootMargin])

  const getVisible = useCallback(
    <T,>(items: T[]) => items.slice(0, visibleCount),
    [visibleCount],
  )

  return {
    visibleCount,
    hasMore: visibleCount < total,
    sentinelRef,
    getVisible,
  }
}

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** 卡片网格骨架：画布项目网格、分镜网格等 aspect-video 卡片场景。 */
export function CardGridSkeleton({
  count = 8,
  className,
  itemClassName,
}: {
  count?: number
  className?: string
  itemClassName?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("aspect-video rounded-xl", itemClassName)} />
      ))}
    </div>
  )
}

/** 行列表骨架：影视工厂剧本列表（h-[118px] 行）、画布列表视图（h-16 行）等场景。 */
export function RowListSkeleton({
  count = 4,
  rowClassName = "h-[118px]",
  className,
}: {
  count?: number
  rowClassName?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-2.5", className)} aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("rounded-xl", rowClassName)} />
      ))}
    </div>
  )
}

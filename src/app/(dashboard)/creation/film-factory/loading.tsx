import { Skeleton } from "@/components/ui/skeleton"
import { RowListSkeleton } from "@/components/shared/skeletons"

/** /creation/film-factory 路由级骨架屏：客户端数据加载前的首屏占位。 */
export default function FilmFactoryLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      {/* 头部：标题块 + 右侧统计小卡 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-3 w-72 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[58px] w-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* 提示条 + 工具条 */}
      <Skeleton className="mt-5 h-8 w-full rounded-lg" />
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="ml-auto h-8 w-64 rounded-md" />
      </div>

      <div className="mt-6">
        <RowListSkeleton count={3} />
      </div>
    </main>
  )
}

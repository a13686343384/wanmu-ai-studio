import { Skeleton } from "@/components/ui/skeleton"
import { CardGridSkeleton } from "@/components/shared/skeletons"

/** /canvas 路由级骨架屏：客户端数据加载前的首屏占位。 */
export default function CanvasLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="ml-auto h-8 w-56 rounded-md" />
      </div>
      <div className="mt-6">
        <CardGridSkeleton />
      </div>
    </main>
  )
}

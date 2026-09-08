import { Skeleton } from "@/components/ui/skeleton"

/** /creation/film-factory/[scriptId] 路由级骨架屏：服务端取数期间的三栏占位。 */
export default function ScriptDetailLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* 头部 */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5">
        <Skeleton className="h-7 w-7 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-64 rounded-full" />
        </div>
      </div>

      {/* 工作流标签 */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-4 py-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-16 rounded-full" />
        ))}
      </div>

      {/* 三栏 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden border-r border-zinc-800/80 p-3 lg:block">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <main className="grid grid-rows-2">
          <div className="space-y-3 border-b border-zinc-800/80 p-4">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-3 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-video rounded-xl" />
            ))}
          </div>
        </main>
        <aside className="hidden border-l border-zinc-800/80 p-3 lg:block">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

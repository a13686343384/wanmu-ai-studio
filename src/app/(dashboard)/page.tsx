import { APP_NAME, APP_NAME_CN } from "@/lib/constants"

/**
 * 任务 1 阶段的最小占位首页。
 * 任务 5 会将其替换为完整的工作台（Workbench）页面。
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="brand-gradient-text text-4xl font-bold tracking-tight">
        {APP_NAME_CN} · {APP_NAME}
      </h1>
      <p className="text-sm text-muted-foreground">
        项目脚手架就绪 —— 任务 1 完成，等待 Phase 1 构建工作台。
      </p>
    </main>
  )
}

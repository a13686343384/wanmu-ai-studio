import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AppProviders } from "@/components/providers/AppProviders"
import { NavBar } from "@/components/layout/NavBar"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { PageTransition } from "@/components/shared/motion"

/**
 * 已登录应用区布局。
 * 服务端校验会话：未登录直接跳转 /login，并带上 callbackUrl。
 * ErrorBoundary 兜底子树渲染异常；PageTransition 提供路由切换淡入。
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <AppProviders>
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <NavBar />
        <ErrorBoundary>
          <PageTransition>{children}</PageTransition>
        </ErrorBoundary>
      </div>
    </AppProviders>
  )
}

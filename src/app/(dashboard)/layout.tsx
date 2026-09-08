import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AppProviders } from "@/components/providers/AppProviders"
import { NavBar } from "@/components/layout/NavBar"

/**
 * 已登录应用区布局。
 * 服务端校验会话：未登录直接跳转 /login，并带上 callbackUrl。
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
        <div className="flex-1">{children}</div>
      </div>
    </AppProviders>
  )
}

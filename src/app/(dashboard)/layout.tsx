import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AppProviders } from "@/components/providers/AppProviders"

/**
 * 已登录应用区布局。
 * 服务端校验会话：未登录直接跳转 /login，并带上 callbackUrl。
 * 任务 4 会在此布局内加入 NavBar。
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
      <div className="min-h-screen bg-zinc-950">{children}</div>
    </AppProviders>
  )
}

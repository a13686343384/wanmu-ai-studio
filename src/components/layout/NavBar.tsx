"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, HelpCircle, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/layout/Logo"
import { CreationCenterDropdown } from "@/components/layout/CreationCenterDropdown"
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher"
import { TapiesBadge, UpgradeButton } from "@/components/layout/TapiesBadge"
import { UserMenu } from "@/components/layout/UserMenu"
import { CreateTeamDialog } from "@/components/layout/CreateTeamDialog"
import { JoinTeamDialog } from "@/components/layout/JoinTeamDialog"
import { useSyncAuth } from "@/hooks/useSyncAuth"
import { NAV_ITEMS } from "@/lib/constants"
import { resolveIcon } from "@/lib/icon-map"
import { cn } from "@/lib/utils"

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * 全局顶部导航栏。
 * 左侧：品牌 + 主导航（工作台 / 画布 / 创作中心 / AI 设置 / 联系我们）
 * 右侧：工作区切换、积分、会员升级、帮助、通知、头像
 * 影视工厂详情页为沉浸式全屏布局，此导航自动隐藏。
 */
export function NavBar() {
  useSyncAuth()
  const pathname = usePathname()
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [joinTeamOpen, setJoinTeamOpen] = useState(false)

  const immersive =
    /^(\/creation\/film-factory\/[^/]+|\/canvas\/[^/]+|\/creation\/script-writing\/[^/]+)$/.test(
      pathname,
    )
  if (immersive) return null

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <Logo />

          {/* 桌面端导航 */}
          <nav className="ml-4 hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => {
              if (item.hasDropdown) {
                return <CreationCenterDropdown key={item.href} />
              }

              const Icon = resolveIcon(item.icon)
              const active = isNavActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <WorkspaceSwitcher
              onCreateTeam={() => setCreateTeamOpen(true)}
              onJoinTeam={() => setJoinTeamOpen(true)}
            />

            <div className="hidden sm:flex sm:items-center sm:gap-1.5">
              <TapiesBadge />
              <UpgradeButton />
            </div>

            <div className="hidden items-center gap-0.5 lg:flex">
              <Button variant="ghost" size="icon-sm" aria-label="帮助">
                <HelpCircle className="h-4 w-4 text-zinc-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="通知"
                className="relative"
              >
                <Bell className="h-4 w-4 text-zinc-400" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-500" />
              </Button>
            </div>

            <UserMenu />

            {/* 移动端抽屉导航 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="打开菜单"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-4">
                <nav className="mt-6 flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = resolveIcon(item.icon)
                    const active = isNavActive(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                          active
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>

                <div className="mt-6 flex items-center gap-2 border-t border-zinc-800 pt-4">
                  <TapiesBadge />
                  <UpgradeButton />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
      />
      <JoinTeamDialog open={joinTeamOpen} onOpenChange={setJoinTeamOpen} />
    </>
  )
}

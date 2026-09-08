"use client"

import { signOut } from "next-auth/react"
import { CreditCard, LogOut, Settings, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/useAuthStore"
import { formatNumber } from "@/lib/utils"

/** 用户头像下拉菜单：账号信息、设置、退出登录。 */
export function UserMenu() {
  const { userName, userEmail, userImage, membership, tapies } = useAuthStore()

  const initial = (userName ?? userEmail ?? "U").slice(0, 1).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full ring-offset-zinc-950 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          aria-label="账号菜单"
        >
          <Avatar>
            {userImage ? <AvatarImage src={userImage} alt={userName ?? ""} /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="py-2">
          <span className="block truncate text-sm font-medium text-zinc-100">
            {userName ?? "未设置昵称"}
          </span>
          <span className="block truncate text-xs font-normal text-zinc-500">
            {userEmail ?? ""}
          </span>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
            {membership === "free" ? "免费版" : membership.toUpperCase()}
            <span className="text-amber-500/60">·</span>
            {formatNumber(tapies)} Tapies
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <User />
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard />
          订阅与账单
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings />
          设置
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          destructive
          onSelect={(event) => {
            event.preventDefault()
            void signOut({ callbackUrl: "/login" })
          }}
        >
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

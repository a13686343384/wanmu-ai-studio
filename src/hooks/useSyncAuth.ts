"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useAuthStore } from "@/stores/useAuthStore"

/**
 * 将会话同步进 useAuthStore。
 * 在 (dashboard) 布局或 NavBar 中调用一次即可。
 */
export function useSyncAuth() {
  const { data: session, status } = useSession()
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (status === "loading") return

    if (status === "authenticated" && session?.user) {
      setAuth({
        isAuthenticated: true,
        userId: session.user.id,
        userName: session.user.name ?? null,
        userEmail: session.user.email ?? null,
        userImage: session.user.image ?? null,
        tapies: session.user.tapies ?? 0,
        membership: session.user.membership ?? "free",
      })
    } else {
      logout()
    }
  }, [status, session, setAuth, logout])
}

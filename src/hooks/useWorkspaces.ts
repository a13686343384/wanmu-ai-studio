"use client"

import { useCallback, useEffect, useState } from "react"
import type { WorkspaceSummary } from "@/components/layout/WorkspaceSwitcher"

/**
 * 加载当前用户的工作区列表。
 * 供 NavBar 工作区切换器、新建项目弹窗、画布团队页共用。
 */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/workspaces")
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载工作区失败")
      setWorkspaces(payload.data ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载工作区失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { workspaces, loading, error, reload }
}

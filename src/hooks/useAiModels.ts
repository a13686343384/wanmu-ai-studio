"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { currentModelScope } from "@/lib/ai/client-scope"
import type { AIModel } from "@/lib/constants"

export type ModelKind = "text" | "image" | "video" | "audio" | "subtitle"

/**
 * 获取当前模式下的可用模型列表。
 * - mock 模式 → 内置模型清单
 * - live 模式 → CustomModel 表中 enabled=true 的记录
 *
 * 返回 { models, loading, error }。
 */
export function useAiModels(kind: ModelKind, scope?: string | {workspaceId?:string;scriptId?:string;projectId?:string;writingProjectId?:string}) {
  const pathname=usePathname()
  const [workspaceVersion,setWorkspaceVersion]=useState(0)
  const explicitScope=JSON.stringify(typeof scope === "string"?{workspaceId:scope}:scope)
  useEffect(()=>{
    const changed=()=>setWorkspaceVersion(n=>n+1)
    window.addEventListener("wanmusheng:workspace-change",changed)
    window.addEventListener("storage",changed)
    return ()=>{window.removeEventListener("wanmusheng:workspace-change",changed);window.removeEventListener("storage",changed)}
  },[])
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const scoped = explicitScope ? JSON.parse(explicitScope) : currentModelScope(pathname)
    const query = new URLSearchParams({kind,...scoped})
    fetch(`/api/ai/models?${query}`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return
        if (payload.error) {
          setError(payload.error)
          setModels([])
        } else {
          setModels(payload.data ?? [])
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "获取模型列表失败")
        setModels([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [kind,pathname,workspaceVersion,explicitScope])

  return { models, loading, error }
}

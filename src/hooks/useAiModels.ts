"use client"

import { useEffect, useState } from "react"
import type { AIModel } from "@/lib/constants"

export type ModelKind = "text" | "image" | "video" | "audio" | "subtitle"

/**
 * 获取当前模式下的可用模型列表。
 * - mock 模式 → 内置模型清单
 * - live 模式 → CustomModel 表中 enabled=true 的记录
 *
 * 返回 { models, loading, error }。
 */
export function useAiModels(kind: ModelKind) {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/ai/models?kind=${kind}`)
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
  }, [kind])

  return { models, loading, error }
}

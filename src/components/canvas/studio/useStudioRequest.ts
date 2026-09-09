"use client"
import { useSyncExternalStore } from "react"
import { useStudio } from "./types"

// Request lifetime is independent of selection, persisted nodes and undo history.
const requests = new Map<string, symbol>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const notify = () => listeners.forEach((listener) => listener())

export function useStudioRequest(nodeId: string) {
  const { projectId } = useStudio()
  const key = `${projectId}:${nodeId}`
  const running = useSyncExternalStore(
    subscribe,
    () => requests.has(key),
    () => false,
  )
  return {
    running,
    begin() {
      if (requests.has(key)) return null
      const token = Symbol(key)
      requests.set(key, token)
      notify()
      return token
    },
    end(token: symbol) {
      if (requests.get(key) === token) {
        requests.delete(key)
        notify()
      }
    },
  }
}

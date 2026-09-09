"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

const MSG_READY = "storyai:director-desk-ready"
const MSG_CLOSE = "storyai:director-desk-close"
const MSG_CAPTURES = "storyai:director-desk-captures-sent"
const MSG_SESSION = "storyai:director-desk-session"

export interface DirectorDeskCapture {
  dataUrl: string
  fileName: string
}

/**
 * 全屏 iframe 嵌入开源 3D 导演台（public/director-desk 静态包）。
 * 协议：iframe ready → host 发 session(instanceId)；iframe 发 close / captures。
 * portal 到 body：画布在 transform 坐标系内，fixed 会被困住。
 */
export function DirectorDeskDialog({
  open,
  instanceId,
  onClose,
  onCaptures,
}: {
  open: boolean
  instanceId: string
  onClose: () => void
  onCaptures: (captures: DirectorDeskCapture[]) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const src = useMemo(() => "/director-desk/index.html?theme=dark", [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      readyRef.current = false
      return
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const type = event.data?.type
      if (type === MSG_READY) {
        readyRef.current = true
        iframeRef.current?.contentWindow?.postMessage(
          { type: MSG_SESSION, payload: { instanceId, theme: "dark" } },
          window.location.origin,
        )
        return
      }
      if (type === MSG_CLOSE) {
        onClose()
        return
      }
      if (type === MSG_CAPTURES) {
        const raw = event.data?.payload?.captures
        if (!Array.isArray(raw)) return
        const captures = raw
          .map((item: { dataUrl?: unknown; fileName?: unknown }) => ({
            dataUrl: typeof item?.dataUrl === "string" ? item.dataUrl : "",
            fileName: typeof item?.fileName === "string" ? item.fileName : "capture.png",
          }))
          .filter((item: DirectorDeskCapture) => Boolean(item.dataUrl))
        if (captures.length) onCaptures(captures)
      }
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [open, instanceId, onClose, onCaptures])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label="3D 导演台"
    >
      <iframe
        ref={iframeRef}
        title="3D 导演台"
        src={src}
        className="min-h-0 w-full flex-1 border-0"
        allow="fullscreen"
      />
    </div>,
    document.body,
  )
}

"use client"

import { useReactFlow } from "@xyflow/react"
import {
  LayoutDashboard,
  Maximize2,
  Redo2,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCanvasStore } from "@/stores/useCanvasStore"
import { cn } from "@/lib/utils"

/** 画布工具栏：缩放、适应视图、撤销/重做、自动布局、保存。 */
export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const autoLayout = useCanvasStore((s) => s.autoLayout)
  const save = useCanvasStore((s) => s.save)
  const dirty = useCanvasStore((s) => s.dirty)
  const saving = useCanvasStore((s) => s.saving)
  const canUndo = useCanvasStore((s) => s.past.length > 0)
  const canRedo = useCanvasStore((s) => s.future.length > 0)

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1 shadow-lg backdrop-blur">
      <Button variant="ghost" size="icon-sm" onClick={() => zoomOut()} aria-label="缩小">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => zoomIn()} aria-label="放大">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => fitView({ padding: 0.2 })} aria-label="适应视图">
        <Maximize2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!canUndo} aria-label="撤销">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={redo} disabled={!canRedo} aria-label="重做">
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={autoLayout} aria-label="自动布局">
        <LayoutDashboard className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-5" />

      <Button
        variant={dirty ? "brand" : "ghost"}
        size="sm"
        className="h-7"
        onClick={() => void save()}
        disabled={saving}
      >
        <Save className={cn("h-3.5 w-3.5", saving && "animate-pulse")} />
        {dirty ? "保存" : "已保存"}
      </Button>
    </div>
  )
}

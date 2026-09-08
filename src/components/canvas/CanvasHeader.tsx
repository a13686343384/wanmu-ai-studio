"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Crown, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RenameDialog } from "@/components/canvas/RenameDialog"
import { useCanvasStore } from "@/stores/useCanvasStore"

/** 画布顶部条：返回、项目名（可重命名）、工作区标识。 */
export function CanvasHeader({
  projectId,
  projectName,
  workspaceName,
  isPersonal,
}: {
  projectId: string
  projectName: string
  workspaceName: string
  isPersonal: boolean
}) {
  const [name, setName] = useState(projectName)
  const [renameOpen, setRenameOpen] = useState(false)
  const projectId2 = useCanvasStore((s) => s.projectId)
  const setProjectName = useCanvasStore((s) => s.load)

  async function rename(next: string) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "重命名失败")
      return
    }
    setName(next)
    toast.success("已重命名")
    // 若画布已加载，同步 store 中的项目名
    if (projectId2 === projectId) void setProjectName(projectId)
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800/80 bg-zinc-950 px-4">
      <Button variant="ghost" size="icon-sm" asChild aria-label="返回画布列表">
        <Link href="/canvas">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-zinc-100">{name}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRenameOpen(true)}
          aria-label="重命名项目"
        >
          <Pencil className="h-3 w-3 text-zinc-500" />
        </Button>
      </div>

      <Badge variant="muted" className="hidden sm:inline-flex">
        <Crown className="mr-1 h-3 w-3 text-amber-400" />
        {workspaceName}
        {isPersonal ? "" : " · 团队"}
      </Badge>

      <span className="ml-auto hidden text-[11px] text-zinc-600 lg:block">
        ⌘S 保存 · 拖拽节点库到画布添加节点 · Delete 删除选中
      </span>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={name}
        title="重命名项目"
        onSubmit={rename}
      />
    </div>
  )
}

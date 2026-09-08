"use client"

import { useRouter } from "next/navigation"
import {
  CheckSquare,
  ExternalLink,
  FolderInput,
  Link2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { makePoster } from "@/services/ai/mock-media"
import { relativeTime } from "@/lib/utils"
import type { ProjectSummary } from "@/app/api/projects/route"

export interface ProjectCardActions {
  onOpen: (project: ProjectSummary) => void
  onRename: (project: ProjectSummary) => void
  onShare: (project: ProjectSummary) => void
  onMove: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}

interface MenuItemsProps extends ProjectCardActions {
  project: ProjectSummary
}

/** 右键菜单与「更多」菜单共用的条目。 */
function MenuItems({ project, onOpen, onRename, onShare, onMove, onDelete }: MenuItemsProps) {
  return (
    <>
      <ContextMenuItem onSelect={() => onOpen(project)}>
        <ExternalLink />
        打开
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onRename(project)}>
        <Pencil />
        重命名
      </ContextMenuItem>
      <ContextMenuItem>
        <CheckSquare />
        选择
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => onMove(project)}>
        <FolderInput />
        移动至…
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onShare(project)}>
        <Link2 />
        分享链接
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem destructive onSelect={() => onDelete(project)}>
        <Trash2 />
        删除
      </ContextMenuItem>
    </>
  )
}

/**
 * 画布项目卡片。
 * 支持右键菜单与右上角「更多」菜单，两种入口操作一致。
 */
export function ProjectCard({
  project,
  actions,
  view = "grid",
}: {
  project: ProjectSummary
  actions: ProjectCardActions
  view?: "grid" | "list"
}) {
  const router = useRouter()
  const cover = makePoster(project.name, `${project.name}-${project.id}`, "16:9")

  const handleOpen = () => {
    actions.onOpen(project)
    router.push(`/canvas/${project.id}`)
  }

  const menu = <MenuItems project={project} {...actions} />

  if (view === "list") {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 transition-colors hover:border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={project.name}
              className="h-12 w-20 shrink-0 cursor-pointer rounded-md object-cover"
              onClick={handleOpen}
            />
            <div className="min-w-0 flex-1 cursor-pointer" onClick={handleOpen}>
              <p className="truncate text-sm text-zinc-100">{project.name}</p>
              <p className="truncate text-xs text-zinc-500">
                编辑于 {relativeTime(project.updatedAt)} · {project.itemCount} 个节点
              </p>
            </div>
            {project.folder && <Badge variant="muted">{project.folder}</Badge>}
            <span className="hidden text-xs text-zinc-600 sm:block">{project.workspaceName}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>{menu}</ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700">
          <div className="relative aspect-video cursor-pointer overflow-hidden bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={project.name}
              className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
              onClick={handleOpen}
            />
            {project.itemCount > 0 && (
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-300 backdrop-blur">
                {project.itemCount} 节点
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 p-3">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={handleOpen}>
              <p className="truncate text-sm font-medium text-zinc-100">{project.name}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                编辑于 {relativeTime(project.updatedAt)}
                {project.folder ? ` · ${project.folder}` : ""}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                  aria-label="更多操作"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  )
}

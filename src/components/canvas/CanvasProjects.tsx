"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  ChevronDown,
  FolderOpen,
  LayoutGrid,
  List,
  Plus,
  Search,
  Settings2,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ProjectCard } from "@/components/canvas/ProjectCard"
import { NewProjectCard } from "@/components/canvas/NewProjectCard"
import { NewProjectDialog } from "@/components/canvas/NewProjectDialog"
import { RenameDialog } from "@/components/canvas/RenameDialog"
import { CreateTeamDialog } from "@/components/layout/CreateTeamDialog"
import { JoinTeamDialog } from "@/components/layout/JoinTeamDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { FadeIn } from "@/components/shared/motion"
import { CardGridSkeleton, RowListSkeleton } from "@/components/shared/skeletons"
import { useWorkspaces } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import type { ProjectSummary } from "@/app/api/projects/route"

type Scope = "personal" | "team"
type ViewMode = "grid" | "list"
type FilterMode = "all" | "folder" | "project"
type SortField = "updated" | "created"
type SortOrder = "desc" | "asc"

const FILTER_LABEL: Record<FilterMode, string> = {
  all: "显示全部",
  folder: "仅文件夹",
  project: "仅项目",
}

/**
 * 画布项目列表页。
 * 个人 / 团队项目切换、搜索、筛选、排序、网格 / 列表视图、项目 CRUD。
 */
export function CanvasProjects() {
  const router = useRouter()
  const { workspaces, reload: reloadWorkspaces } = useWorkspaces()

  const [scope, setScope] = useState<Scope>("personal")
  const [view, setView] = useState<ViewMode>("grid")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [sort, setSort] = useState<SortField>("updated")
  const [order, setOrder] = useState<SortOrder>("desc")
  const [query, setQuery] = useState("")

  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [newOpen, setNewOpen] = useState(false)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [joinTeamOpen, setJoinTeamOpen] = useState(false)

  const [renaming, setRenaming] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const [moving, setMoving] = useState<ProjectSummary | null>(null)
  const [moveTarget, setMoveTarget] = useState("")

  const personalWorkspace = useMemo(
    () => workspaces.find((w) => w.isPersonal),
    [workspaces],
  )
  const teamWorkspaces = useMemo(() => workspaces.filter((w) => !w.isPersonal), [workspaces])

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ scope, filter, sort, order })
    if (query.trim()) params.set("q", query.trim())

    try {
      const res = await fetch(`/api/projects?${params.toString()}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载项目失败")
      setProjects(payload.data ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载项目失败")
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [scope, filter, sort, order, query])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProjects(), query ? 260 : 0)
    return () => window.clearTimeout(timer)
  }, [loadProjects, query])

  /* ---------------------------- 操作 ---------------------------- */

  const shareLink = useCallback(async (project: ProjectSummary) => {
    const url = `${window.location.origin}/canvas/${project.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("分享链接已复制", { description: url })
    } catch {
      toast.info("分享链接", { description: url })
    }
  }, [])

  async function confirmDelete() {
    if (!deleting) return
    const res = await fetch(`/api/projects/${deleting.id}`, { method: "DELETE" })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "删除失败")
      return
    }
    toast.success("已删除", { description: `「${deleting.name}」已移入回收站` })
    setDeleting(null)
    void loadProjects()
  }

  async function confirmMove() {
    if (!moving || !moveTarget) return
    const res = await fetch(`/api/projects/${moving.id}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetWorkspaceId: moveTarget }),
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "转移失败")
      return
    }
    toast.success("已转移", { description: `「${moving.name}」已移动到新工作区` })
    setMoving(null)
    setMoveTarget("")
    void loadProjects()
  }

  async function rename(name: string) {
    if (!renaming) return
    const res = await fetch(`/api/projects/${renaming.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "重命名失败")
      return
    }
    toast.success("已重命名")
    void loadProjects()
  }

  // 稳定引用：ProjectCard 已用 React.memo 包裹，避免父组件重渲染导致全列表失效
  const actions = useMemo(
    () => ({
      onOpen: () => {},
      onRename: (project: ProjectSummary) => setRenaming(project),
      onShare: (project: ProjectSummary) => void shareLink(project),
      onMove: (project: ProjectSummary) => {
        setMoving(project)
        setMoveTarget(workspaces.find((w) => w.id !== project.workspaceId)?.id ?? "")
      },
      onDelete: (project: ProjectSummary) => setDeleting(project),
    }),
    [shareLink, workspaces],
  )

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
      {/* 顶部：Tab + 团队操作 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800/80 pb-3">
        <Tabs value={scope} onValueChange={(value) => setScope(value as Scope)}>
          <TabsList className="bg-transparent p-0">
            <TabsTrigger
              value="personal"
              className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-1.5 data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              个人
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-1.5 data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              团队项目
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {scope === "team" && (
          <div className="flex flex-wrap items-center gap-2">
            {teamWorkspaces.map((team) => (
              <span
                key={team.id}
                className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300"
              >
                <span className="font-medium">{team.name}</span>
                <span className="text-violet-400/70">{team.memberCount} 人</span>
              </span>
            ))}

            <button
              type="button"
              onClick={() => setCreateTeamOpen(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-orange-500/60 hover:text-orange-400"
            >
              <Plus className="h-3 w-3" />
              新建团队
            </button>

            <button
              type="button"
              onClick={() => setJoinTeamOpen(true)}
              className="flex items-center gap-1 px-1 text-xs text-zinc-400 transition-colors hover:text-orange-400"
            >
              <UserPlus className="h-3 w-3" />
              加入团队
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索"
              className="h-8 w-40 pl-8 text-xs"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {FILTER_LABEL[filter]}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>筛选</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => setFilter(value as FilterMode)}
              >
                <DropdownMenuRadioItem value="all">显示全部</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="folder">仅文件夹</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="project">仅项目</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>排序方式</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as SortField)}
              >
                <DropdownMenuRadioItem value="updated">按最近修改</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created">按创建日期</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>顺序</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={order}
                onValueChange={(value) => setOrder(value as SortOrder)}
              >
                <DropdownMenuRadioItem value="desc">最新优先</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="asc">最早优先</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex rounded-md border border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded p-1.5 transition-colors",
                view === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
              )}
              aria-label="网格视图"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded p-1.5 transition-colors",
                view === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
              )}
              aria-label="列表视图"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button variant="ghost" size="icon-sm" aria-label="归档">
            <Archive className="h-4 w-4 text-zinc-400" />
          </Button>

          <Button variant="inverse" size="sm" className="h-8" onClick={() => setNewOpen(true)}>
            <Plus />
            新建项目
          </Button>

          {scope === "team" && (
            <Button variant="ghost" size="sm" className="h-8">
              <Settings2 className="h-4 w-4 text-zinc-400" />
              团队管理
            </Button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="mt-6">
        {loading ? (
          view === "grid" ? (
            <CardGridSkeleton count={8} />
          ) : (
            <RowListSkeleton count={6} rowClassName="h-16" />
          )
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="还没有项目"
            description="点击「新建项目」创建第一个画布，或从影视工厂「打通到画布」自动生成"
            action={
              <Button variant="inverse" size="sm" onClick={() => setNewOpen(true)}>
                <Plus />
                新建项目
              </Button>
            }
          />
        ) : (
          <FadeIn key={`${scope}-${view}`}>
            <div
              className={cn(
                view === "grid"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-2",
              )}
            >
              <NewProjectCard view={view} onClick={() => setNewOpen(true)} />
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} actions={actions} view={view} />
              ))}
            </div>
          </FadeIn>
        )}
      </div>

      {/* 弹窗 */}
      <NewProjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        workspaces={workspaces}
        defaultWorkspaceId={
          scope === "personal" ? personalWorkspace?.id : teamWorkspaces[0]?.id
        }
        onCreated={(id) => router.push(`/canvas/${id}`)}
      />

      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={(open) => {
          setCreateTeamOpen(open)
          if (!open) void reloadWorkspaces()
        }}
      />
      <JoinTeamDialog open={joinTeamOpen} onOpenChange={setJoinTeamOpen} />

      <RenameDialog
        open={Boolean(renaming)}
        onOpenChange={(open) => !open && setRenaming(null)}
        currentName={renaming?.name ?? ""}
        title="重命名项目"
        onSubmit={rename}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleting?.name}」吗？该项目会移入回收站，画布内容不会立即清除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(moving)} onOpenChange={(open) => !open && setMoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>移动到其它工作区</DialogTitle>
            <DialogDescription>项目及其画布内容会一起迁移。</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>目标工作区</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue placeholder="选择工作区" />
              </SelectTrigger>
              <SelectContent>
                {workspaces
                  .filter((w) => w.id !== moving?.workspaceId)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                      {w.isPersonal ? "（个人）" : "（团队）"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoving(null)}>
              取消
            </Button>
            <Button variant="inverse" onClick={() => void confirmMove()} disabled={!moveTarget}>
              确认转移
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

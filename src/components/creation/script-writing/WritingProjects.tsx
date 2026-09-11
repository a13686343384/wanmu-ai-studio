"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  Clapperboard,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  WRITING_GENRES,
  WRITING_EPISODE_PRESETS,
  WRITING_DURATION_PRESETS,
} from "@/lib/constants"
import type { WritingProjectDTO } from "@/lib/writing/types"

type SortKey = "updated" | "created" | "title"

const SORT_LABEL: Record<SortKey, string> = {
  updated: "最近修改",
  created: "创建时间",
  title: "标题",
}

/** 顶部场记板斜纹：与影视工厂剧本卡一致（有蓝图琥珀、待推进天蓝）。 */
function ClapperStripe({ tone }: { tone: "processing" | "ready" }) {
  const color = tone === "processing" ? "#f59e0b" : "#38bdf8"
  return (
    <div
      aria-hidden
      className={`h-2.5 w-full ${tone === "processing" ? "animate-pulse" : ""}`}
      style={{
        backgroundImage: `repeating-linear-gradient(-45deg, ${color} 0 9px, transparent 9px 18px)`,
        opacity: 0.75,
      }}
    />
  )
}

/** 剧本创作卡片：结构与影视工厂剧本卡一致（斜纹 + 编号日期 + 标题状态菜单 + 简介 + 集数）。 */
function WritingCard({
  project,
  pinned,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  project: WritingProjectDTO
  pinned: boolean
  onTogglePin: (project: WritingProjectDTO) => void
  onEdit: (project: WritingProjectDTO) => void
  onDelete: (project: WritingProjectDTO) => void
}) {
  const router = useRouter()
  const hasBlueprint = Boolean(project.document.blueprint)

  // 整卡可点：点在按钮/链接/菜单上不触发进入详情
  function openDetail(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest("button, a, [role='menuitem']")) return
    router.push(`/creation/script-writing/${project.id}`)
  }

  return (
    <div
      onClick={openDetail}
      className="group cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.85)]"
    >
      <ClapperStripe tone={hasBlueprint ? "processing" : "ready"} />

      <div className="space-y-2.5 p-3.5">
        {/* 编号 + 日期 */}
        <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-zinc-500">
          <span>SC-{project.id.slice(-4).toUpperCase()}</span>
          <span>{project.createdAt.slice(0, 10)}</span>
        </div>

        {/* 标题 + 状态 + 操作 */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/creation/script-writing/${project.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100 hover:text-orange-300"
          >
            {project.title}
          </Link>

          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              hasBlueprint
                ? "bg-amber-500/15 text-amber-300"
                : "bg-sky-500/15 text-sky-300"
            }`}
          >
            {hasBlueprint ? "大纲就绪" : "草稿"}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="更多操作"
                className="-mr-1.5 -mt-1 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onTogglePin(project)}>
                {pinned ? <PinOff /> : <Pin />}
                {pinned ? "取消置顶" : "置顶"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(project)}>
                <Pencil />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => onDelete(project)}>
                <Trash2 />
                删除剧本
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 简介 */}
        <p className="line-clamp-1 text-xs text-zinc-500">{project.idea || "暂无简介"}</p>

        {/* 题材 + 正文进度 */}
        <div className="space-y-1.5 border-t border-zinc-800/80 pt-2.5">
          <span className="text-[10px] text-zinc-600">
            {project.genre} · 正文{" "}
            {project.document.episodes.filter((item) => item.content).length} 集
          </span>
        </div>

        {/* 集数 + 时长 */}
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-semibold leading-none tabular-nums text-zinc-100">
              {project.totalEpisodes}
            </span>
            <span className="text-xs text-zinc-500">集</span>
          </div>
          <span className="text-[11px] text-zinc-500">{project.episodeDuration}s/集</span>
        </div>
      </div>
    </div>
  )
}

export function WritingProjects() {
  const router = useRouter()
  const [projects, setProjects] = useState<WritingProjectDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("updated")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [idea, setIdea] = useState("")
  const [genre, setGenre] = useState("悬疑")
  const [count, setCount] = useState(30)
  const [duration, setDuration] = useState(90)
  const [editing, setEditing] = useState<WritingProjectDTO | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deleting, setDeleting] = useState<WritingProjectDTO | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("wanmusheng.pinnedWritingProjects") ?? "[]")
    } catch {
      return []
    }
  })

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/writing-projects")
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载失败")
      setProjects(payload.data)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/writing-projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          genre,
          idea,
          totalEpisodes: count,
          episodeDuration: duration,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "创建失败")
      toast.success("剧本已创建")
      router.push(`/creation/script-writing/${payload.data.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败")
      setCreating(false)
    }
  }

  function togglePin(project: WritingProjectDTO) {
    setPinnedIds((current) => {
      const next = current.includes(project.id)
        ? current.filter((id) => id !== project.id)
        : [...current, project.id]
      localStorage.setItem("wanmusheng.pinnedWritingProjects", JSON.stringify(next))
      return next
    })
    toast.success("已更新置顶")
  }

  async function confirmRename() {
    if (!editing || !editTitle.trim()) return
    const res = await fetch(`/api/writing-projects/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() }),
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "重命名失败")
      return
    }
    toast.success("已重命名")
    setEditing(null)
    void reload()
  }

  async function confirmDelete() {
    if (!deleting) return
    const res = await fetch(`/api/writing-projects/${deleting.id}`, { method: "DELETE" })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "删除失败")
      return
    }
    toast.success("已删除剧本")
    setDeleting(null)
    void reload()
  }

  const visible = projects
    .filter((item) => item.title.includes(query) || item.idea.includes(query))
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "zh-CN")
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  const sorted = [
    ...visible.filter((item) => pinnedIds.includes(item.id)),
    ...visible.filter((item) => !pinnedIds.includes(item.id)),
  ]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      {/* 标题三行结构，与影视工厂一致 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
              SCREENWRITING DESK
            </span>
            <Badge variant="brand" className="font-normal">
              编剧车间
            </Badge>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">剧本创作</h1>
          <p className="mt-1 text-xs text-zinc-500">
            选一套爆款配方，跟编剧 Agent 对话打磨大纲，再逐集展开成品级正文。
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { label: "剧本", value: projects.length, color: "text-zinc-100" },
              {
                label: "创作中",
                value: projects.filter((item) => item.document.blueprint && !item.importedScriptId).length,
                color: "text-amber-300",
              },
              {
                label: "已完成",
                value: projects.filter((item) => item.importedScriptId).length,
                color: "text-emerald-300",
              },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              className="min-w-[64px] rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-center"
            >
              <p className="text-[10px] text-zinc-500">{stat.label}</p>
              <p className={`mt-0.5 text-lg font-semibold tabular-nums ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 工具条 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索剧名 / 题材 / 灵感…"
            aria-label="搜索剧本"
            className="h-8 w-56 pl-8 text-xs"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <ArrowDown className="h-3.5 w-3.5" />
              {SORT_LABEL[sort]}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3 w-3"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>排序方式</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <DropdownMenuRadioItem value="updated">最近修改</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">创建时间</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">标题</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <Button variant="inverse" size="sm" className="h-8" onClick={() => setOpen(true)}>
            <Plus />
            新建剧本
          </Button>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy="true"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[212px] rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-400">
          <p>{error}</p>
          <Button className="mt-3" onClick={() => void reload()}>
            重新加载
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={FileText}
            title={query ? "没有匹配的剧本" : "还没有剧本"}
            description={
              query
                ? "试试其他关键词，或清空搜索查看全部"
                : "从一个让你想讲下去的故事开始，和编剧 Agent 一起把大纲磨成好故事。"
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((project) => (
            <WritingCard
              key={project.id}
              project={project}
              pinned={pinnedIds.includes(project.id)}
              onTogglePin={togglePin}
              onEdit={(item) => {
                setEditing(item)
                setEditTitle(item.title)
              }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {/* 新建剧本 */}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!creating) setOpen(value)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建剧本</DialogTitle>
            <DialogDescription>
              选题材配方，写一句话灵感，然后和编剧 Agent 一起完善。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3.5">
            <label className="block space-y-1 text-xs text-zinc-400">
              题材配方
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WRITING_GENRES.map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-1 text-xs text-zinc-400">
              剧名
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
                placeholder="例：最后一班地铁"
                className="h-8 text-sm"
              />
            </label>
            <label className="block space-y-1 text-xs text-zinc-400">
              一句话灵感 / 故事核心
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                minLength={5}
                maxLength={5000}
                required
                rows={4}
                placeholder="谁遇到了什么困境，又将作出怎样的选择？"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
            <div>
              <label className="text-xs text-zinc-400">目标集数</label>
              <Input
                aria-label="目标集数"
                type="number"
                value={count}
                min={1}
                max={100}
                onChange={(e) => setCount(Number(e.target.value))}
                required
                className="h-8 text-sm"
              />
              <div className="mt-1.5 flex gap-1.5">
                {WRITING_EPISODE_PRESETS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={n === count ? "brand" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCount(n)}
                  >
                    {n}集
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400">单集时长</label>
              <Input
                aria-label="单集时长"
                type="number"
                value={duration}
                min={15}
                max={600}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
                className="h-8 text-sm"
              />
              <div className="mt-1.5 flex gap-1.5">
                {WRITING_DURATION_PRESETS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={n === duration ? "brand" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setDuration(n)}
                  >
                    {n}秒
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={creating}
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" variant="inverse" size="sm" disabled={creating}>
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}创建并进入
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 重命名 */}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(value) => !value && setEditing(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重命名剧本</DialogTitle>
            <DialogDescription>修改剧名不会影响已写的大纲与正文。</DialogDescription>
          </DialogHeader>
          <Input
            aria-label="剧名"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            maxLength={60}
            className="h-8 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button variant="inverse" size="sm" disabled={!editTitle.trim()} onClick={() => void confirmRename()}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认（与影视工厂一致） */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除剧本</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleting?.title}」吗？大纲、分集正文与版本历史会一并删除，且不可恢复。
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
    </main>
  )
}

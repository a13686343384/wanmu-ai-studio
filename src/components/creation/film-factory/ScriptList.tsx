"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  Bot,
  ChevronDown,
  Clapperboard,
  ListChecks,
  Plus,
  Search,
  Square,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { ScriptCard } from "@/components/creation/film-factory/ScriptCard"
import {
  TaskQueueDialog,
  StopAllDialog,
} from "@/components/creation/film-factory/TaskQueueDialog"
import { RenameDialog } from "@/components/canvas/RenameDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FactoryHeader } from "@/components/creation/film-factory/FactoryHeader"
import { IntakeForm } from "@/components/creation/film-factory/intake/IntakeForm"
import { EmptyState } from "@/components/shared/EmptyState"
import { FadeIn } from "@/components/shared/motion"
import { Skeleton } from "@/components/ui/skeleton"
import type { ScriptSummary } from "@/lib/serializers/script"

type SortKey = "updated" | "created" | "title"

const SORT_LABEL: Record<SortKey, string> = {
  updated: "最近修改",
  created: "创建时间",
  title: "标题",
}

/**
 * 影视工厂剧本列表。
 * 包含状态统计、搜索、排序、任务队列、停止全部与分组列表。
 */
export function ScriptList() {
  const router = useRouter()
  const [scripts, setScripts] = useState<ScriptSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("created")
  const [deleting, setDeleting] = useState<ScriptSummary | null>(null)
  const [editing, setEditing] = useState<ScriptSummary | null>(null)
  const [hintOpen, setHintOpen] = useState(true)
  const [queueOpen, setQueueOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [stopAllOpen, setStopAllOpen] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(
        localStorage.getItem("wanmusheng.pinnedScripts") ?? "[]",
      )
    } catch {
      return []
    }
  })

  function togglePin(script: ScriptSummary) {
    setPinnedIds((current) => {
      const next = current.includes(script.id)
        ? current.filter((id) => id !== script.id)
        : [...current, script.id]
      localStorage.setItem("wanmusheng.pinnedScripts", JSON.stringify(next))
      return next
    })
    toast.success("已更新置顶")
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      const res = await fetch(`/api/scripts?${params.toString()}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载剧本失败")
      setScripts(payload.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载剧本失败")
      setScripts([])
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 260 : 0)
    return () => window.clearTimeout(timer)
  }, [load, query])

  const sorted = useMemo(() => {
    const list = [...scripts]
    list.sort((a, b) => {
      const pa = pinnedIds.includes(a.id) ? 0 : 1
      const pb = pinnedIds.includes(b.id) ? 0 : 1
      if (pa !== pb) return pa - pb
      if (sort === "title") return a.title.localeCompare(b.title, "zh-CN")
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return list
  }, [scripts, sort, pinnedIds])

  const inProduction = sorted.filter((s) => s.processingStatus === "processing")
  const ready = sorted.filter(
    (s) => s.processingStatus !== "processing" && s.status !== "completed",
  )
  const completed = sorted.filter((s) => s.status === "completed")

  const counts = {
    inProduction: inProduction.length,
    ready: ready.length,
    completed: completed.length,
    total: sorted.length,
  }

  async function stopAll(): Promise<boolean> {
    try {
      const res = await fetch("/api/tasks?active=1", { cache: "no-store" })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "读取任务失败")
      const tasks = (payload.data as { id: string; state: string }[]).filter(
        (task) => ["queued", "running"].includes(task.state),
      )
      if (!tasks.length) {
        toast.info("当前没有可请求停止的后台任务")
        return true
      }
      const outcomes = await Promise.allSettled(
        tasks.map(async (task) => {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? "请求停止失败")
          return result.data.state as string
        }),
      )
      const failed = outcomes.filter(
        (result) => result.status === "rejected",
      ).length
      const pending = outcomes.filter(
        (result) =>
          result.status === "fulfilled" && result.value === "cancel_requested",
      ).length
      const stopped = outcomes.filter(
        (result) =>
          result.status === "fulfilled" && result.value === "cancelled",
      ).length
      if (failed)
        toast.error(
          `停止请求失败 ${failed} 项；已停止 ${stopped} 项，收尾中 ${pending} 项，请到任务队列重试`,
        )
      else
        toast.info(
          `已停止 ${stopped} 项，收尾中 ${pending} 项；最终结果请查看任务队列`,
        )
      void load()
      return failed === 0
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "请求全部停止失败")
      return false
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const res = await fetch(`/api/scripts/${deleting.id}`, { method: "DELETE" })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "删除失败")
      return
    }
    toast.success("已删除剧本")
    setDeleting(null)
    void load()
  }

  function Section({
    title,
    tag,
    count,
    hint,
    items,
    dot,
  }: {
    title: string
    tag: string
    count: number
    hint: string
    items: ScriptSummary[]
    dot: string
  }) {
    if (items.length === 0) return null

    return (
      <section className="mt-6">
        <div className="mb-2.5 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <h2 className="text-xs font-medium tracking-wider text-zinc-300">
            {title}
          </h2>
          <span className="text-xs font-medium tabular-nums text-zinc-400">
            {String(count).padStart(2, "0")}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {tag}
          </span>
          <span className="text-[11px] text-zinc-600">· {hint}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              pinned={pinnedIds.includes(script.id)}
              onTogglePin={togglePin}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      <FactoryHeader counts={counts} />

      {/* 提示条（可折叠） */}
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
        <Bot className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        {hintOpen && (
          <span>
            这是「专业影视级」创作线，和剧本工厂不是一回事
            ——影视工厂按分集逐步打磨，适合正式成片。
          </span>
        )}
        <button
          type="button"
          onClick={() => setHintOpen((value) => !value)}
          className="ml-auto rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-200"
          aria-label={hintOpen ? "收起提示" : "展开提示"}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${hintOpen ? "" : "-rotate-90"}`}
          />
        </button>
      </div>

      {/* 工具条 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索剧本标题…"
            className="h-8 w-56 pl-8 text-xs"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <ArrowDown className="h-3.5 w-3.5" />
              {SORT_LABEL[sort]}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>排序方式</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(v) => setSort(v as SortKey)}
            >
              <DropdownMenuRadioItem value="updated">
                最近修改
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">
                创建时间
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">标题</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setQueueOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5" />
            任务队列
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-rose-300"
            onClick={() => setStopAllOpen(true)}
          >
            <Square className="h-3.5 w-3.5 fill-current text-rose-400" />
            停止全部
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() =>
              toast.info("导入剧本", {
                description: "支持 txt / docx，即将上线",
              })
            }
          >
            <Upload className="h-3.5 w-3.5" />
            导入
          </Button>
          <Button
            variant="inverse"
            size="sm"
            className="h-8"
            onClick={() => setCreateOpen(true)}
          >
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
      ) : sorted.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Clapperboard}
            title="还没有剧本"
            description="点击「新建剧本」粘贴你的剧本，AI 会通读全本并推荐集数 / 时长 / 三幕结构"
            action={
              <Button variant="inverse" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                新建剧本
              </Button>
            }
          />
        </div>
      ) : (
        <FadeIn key={query}>
          <Section
            title="制作中"
            tag="RUNNING"
            count={inProduction.length}
            hint="机器在跑"
            items={inProduction}
            dot="bg-amber-400 animate-pulse"
          />
          <Section
            title="待推进"
            tag="READY"
            count={ready.length}
            hint="等你下一步"
            items={ready}
            dot="bg-sky-400"
          />
          <Section
            title="已完成"
            tag="DONE"
            count={completed.length}
            hint="已交付"
            items={completed}
            dot="bg-emerald-400"
          />
        </FadeIn>
      )}

      <TaskQueueDialog
        open={queueOpen}
        onOpenChange={setQueueOpen}
        scripts={scripts}
        onChanged={() => void load()}
      />

      <StopAllDialog
        open={stopAllOpen}
        onOpenChange={setStopAllOpen}
        runningCount={inProduction.length}
        onConfirm={stopAll}
      />

      <RenameDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        currentName={editing?.title ?? ""}
        title="编辑剧本"
        onSubmit={async (name) => {
          if (!editing) return
          const res = await fetch(`/api/scripts/${editing.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: name }),
          })
          const payload = await res.json()
          if (!res.ok) {
            toast.error(payload.error ?? "修改失败")
            return
          }
          toast.success("已修改")
          void load()
        }}
      />

      {/* 新建剧本（INTAKE 弹窗） */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-4xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>新建剧本</DialogTitle>
          </DialogHeader>
          <IntakeForm embedded />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除剧本</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleting?.title}
              」吗？分集、资产与分镜数据会一并删除，且不可恢复。
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

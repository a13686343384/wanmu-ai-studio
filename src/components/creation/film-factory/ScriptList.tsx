"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  Info,
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
import { FactoryHeader } from "@/components/creation/film-factory/FactoryHeader"
import type { ScriptSummary } from "@/app/api/scripts/route"

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
  const [sort, setSort] = useState<SortKey>("updated")
  const [deleting, setDeleting] = useState<ScriptSummary | null>(null)

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
      if (sort === "title") return a.title.localeCompare(b.title, "zh-CN")
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return list
  }, [scripts, sort])

  const inProduction = sorted.filter((s) => s.processingStatus === "processing")
  const ready = sorted.filter((s) => s.processingStatus !== "processing" && s.status !== "completed")
  const completed = sorted.filter((s) => s.status === "completed")

  const counts = {
    inProduction: inProduction.length,
    ready: ready.length,
    completed: completed.length,
    total: sorted.length,
  }

  async function stopAll() {
    const running = inProduction
    if (running.length === 0) {
      toast.info("当前没有正在运行的任务")
      return
    }

    await Promise.all(
      running.map((script) =>
        fetch(`/api/scripts/${script.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ processingStatus: "idle", progressLabel: "已手动停止" }),
        }),
      ),
    )

    toast.success(`已停止 ${running.length} 个任务`)
    void load()
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
    count,
    hint,
    items,
    dot,
  }: {
    title: string
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
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
            {String(count).padStart(2, "0")} {title}
          </h2>
          <span className="text-[11px] text-zinc-500">{hint}</span>
        </div>
        <div className="space-y-2.5">
          {items.map((script) => (
            <ScriptCard key={script.id} script={script} onDelete={setDeleting} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      <FactoryHeader counts={counts} />

      {/* 提示条 */}
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
        <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />
        这是「专业影视级」创作线，和剧本工厂不是一回事 —— 影视工厂按分集逐步打磨，适合正式成片。
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
              {SORT_LABEL[sort]}
              <ChevronDown className="h-3 w-3" />
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

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => toast.info("任务队列", { description: "当前无排队任务" })}
          >
            <ListChecks className="h-3.5 w-3.5" />
            任务队列
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => void stopAll()}>
            <Square className="h-3.5 w-3.5" />
            停止全部
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => toast.info("导入剧本", { description: "支持 txt / docx，即将上线" })}>
            <Upload className="h-3.5 w-3.5" />
            导入
          </Button>
          <Button variant="inverse" size="sm" className="h-8" asChild>
            <Link href="/creation/film-factory/new">
              <Plus />
              新建剧本
            </Link>
          </Button>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-[118px] animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <p className="text-sm text-zinc-400">还没有剧本</p>
          <p className="mt-1 text-xs text-zinc-600">
            点击「新建剧本」粘贴你的剧本，AI 会通读全本并推荐集数 / 时长 / 三幕结构
          </p>
          <Button variant="inverse" size="sm" className="mt-4" asChild>
            <Link href="/creation/film-factory/new">
              <Plus />
              新建剧本
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <Section
            title="In Production"
            count={inProduction.length}
            hint="机器在跑"
            items={inProduction}
            dot="bg-amber-400 animate-pulse"
          />
          <Section
            title="Ready"
            count={ready.length}
            hint="等你下一步"
            items={ready}
            dot="bg-sky-400"
          />
          <Section
            title="Completed"
            count={completed.length}
            hint="已交付"
            items={completed}
            dot="bg-emerald-400"
          />
        </>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除剧本</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleting?.title}」吗？分集、资产与分镜数据会一并删除，且不可恢复。
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

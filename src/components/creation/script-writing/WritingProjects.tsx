"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export function WritingProjects() {
  const router = useRouter()
  const [projects, setProjects] = useState<WritingProjectDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [idea, setIdea] = useState("")
  const [genre, setGenre] = useState("悬疑")
  const [count, setCount] = useState(30)
  const [duration, setDuration] = useState(90)
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
  async function remove(id: string) {
    if (!confirm("删除此剧本创作项目？已导入影视工厂的剧本会保留。")) return
    try {
      const res = await fetch(`/api/writing-projects/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("删除失败")
      setProjects((items) => items.filter((item) => item.id !== id))
      toast.success("剧本已删除")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败")
    }
  }
  const visible = projects.filter(
    (item) => item.title.includes(query) || item.idea.includes(query),
  )
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">剧本创作</h1>
          <p className="mt-2 text-sm text-zinc-500">
            从一句灵感开始，和编剧 Agent 一起把大纲磨成好故事。
          </p>
        </div>
        <div className="flex gap-7 text-center text-xs text-zinc-500">
          <div>
            <strong className="mb-1 block text-xl text-zinc-200">
              {projects.length}
            </strong>
            剧本
          </div>
          <div>
            <strong className="mb-1 block text-xl text-orange-400">
              {projects.filter((item) => item.document.blueprint).length}
            </strong>
            已有蓝图
          </div>
          <div>
            <strong className="mb-1 block text-xl text-zinc-200">
              {projects.filter((item) => item.importedScriptId).length}
            </strong>
            已导入
          </div>
        </div>
      </div>
      <div className="mb-5 mt-8 flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <Input
            aria-label="搜索剧本"
            placeholder="搜索剧名或故事核心"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="inverse" onClick={() => setOpen(true)}>
          <Plus />
          新建剧本
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
          <Loader2 className="animate-spin" />
          正在加载剧本…
        </div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-400">
          <p>{error}</p>
          <Button className="mt-3" onClick={() => void reload()}>
            重新加载
          </Button>
        </div>
      ) : visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <article
              key={project.id}
              className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40"
            >
              <div
                className={`h-1 ${project.document.blueprint ? "bg-orange-500/60" : "bg-zinc-700"}`}
              />
              <Link
                href={`/creation/script-writing/${project.id}`}
                className="block p-5"
              >
                <p className="text-xs text-zinc-500">
                  {project.genre} ·{" "}
                  {project.document.blueprint ? "创作中" : "待构思"}
                </p>
                <h2 className="mb-2 mt-3 truncate pr-4 font-medium text-zinc-100">
                  {project.title}
                </h2>
                <p className="line-clamp-2 h-10 text-xs leading-5 text-zinc-500">
                  {project.idea}
                </p>
                <div className="mt-6 flex items-end justify-between">
                  <span className="text-xs text-zinc-500">
                    <strong className="mr-1 text-xl text-zinc-200">
                      {project.totalEpisodes}
                    </strong>
                    集 · {project.episodeDuration}秒/集
                  </span>
                  <span className="text-xs text-zinc-600">
                    正文{" "}
                    {
                      project.document.episodes.filter((item) => item.content)
                        .length
                    }{" "}
                    集
                  </span>
                </div>
              </Link>
              <button
                aria-label={`删除${project.title}`}
                onClick={() => void remove(project.id)}
                className="absolute right-3 top-4 p-1 text-zinc-600 hover:text-orange-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <FileText className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">
            {query
              ? "没有匹配的剧本，试试其他关键词"
              : "还没有剧本，从一个让你想讲下去的故事开始。"}
          </p>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!creating) setOpen(value)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建剧本</DialogTitle>
            <DialogDescription>
              选题材配方，写一句话灵感，然后和编剧 Agent 一起完善。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <label className="block space-y-2 text-sm text-zinc-400">
              题材配方
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-zinc-200"
              >
                {WRITING_GENRES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm text-zinc-400">
              剧名
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
                placeholder="例：最后一班地铁"
              />
            </label>
            <label className="block space-y-2 text-sm text-zinc-400">
              一句话灵感 / 故事核心
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                minLength={5}
                maxLength={5000}
                required
                rows={4}
                placeholder="谁遇到了什么困境，又将作出怎样的选择？"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 text-zinc-200"
              />
            </label>
            <div>
              <label className="text-sm text-zinc-400">
                目标集数
                <Input
                  aria-label="目标集数"
                  type="number"
                  value={count}
                  min={1}
                  max={100}
                  onChange={(e) => setCount(Number(e.target.value))}
                  required
                />
              </label>
              <div className="mt-2 flex gap-2">
                {WRITING_EPISODE_PRESETS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={n === count ? "brand" : "outline"}
                    size="sm"
                    onClick={() => setCount(n)}
                  >
                    {n}集
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400">
                单集时长
                <Input
                  aria-label="单集时长"
                  type="number"
                  value={duration}
                  min={15}
                  max={600}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  required
                />
              </label>
              <div className="mt-2 flex gap-2">
                {WRITING_DURATION_PRESETS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={n === duration ? "brand" : "outline"}
                    size="sm"
                    onClick={() => setDuration(n)}
                  >
                    {n}秒
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={creating}
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" variant="inverse" disabled={creating}>
                {creating && <Loader2 className="animate-spin" />}创建并进入
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

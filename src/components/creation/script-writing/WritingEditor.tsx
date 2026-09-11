"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  History,
  Loader2,
  Send,
  Sparkles,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RequestPending } from "@/components/shared/RequestPending"
import { useAiModels } from "@/hooks/useAiModels"
import type { WritingProjectDTO } from "@/lib/writing/types"
import { cn } from "@/lib/utils"

/** 轻量 Markdown → HTML（加粗、标题、列表、换行） */
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-medium text-zinc-100 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold text-zinc-100 mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-semibold text-zinc-50 mt-3 mb-1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-400">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-zinc-400">$1</li>')
    .replace(/\n/g, "<br/>")
}

type Panel = "blueprint" | "characters" | "history" | "generate" | null
export function WritingEditor({
  initialProject,
}: {
  initialProject: WritingProjectDTO
}) {
  const [project, setProject] = useState(initialProject)
  const [number, setNumber] = useState(1)
  const [draft, setDraft] = useState(
    initialProject.document.episodes[0]?.content ?? "",
  )
  const [message, setMessage] = useState("")
  const [panel, setPanel] = useState<Panel>(null)
  const [generation, setGeneration] = useState<"blueprint" | "episode">(
    "blueprint",
  )
  const { models: textModels } = useAiModels("text")
  const [model, setModel] = useState("")
  useEffect(() => {
    if (textModels.length && !model) setModel(textModels[0]!.id)
  }, [textModels, model])
  const [busy, setBusy] = useState("")
  const lock = useRef(false)
  const router = useRouter()
  const { update } = useSession()
  const episode = project.document.episodes.find(
    (item) => item.number === number,
  )
  const dirty = draft !== (episode?.content ?? "")
  const draftKey = `writing-draft:${project.id}:${number}`
  const [recovery, setRecovery] = useState<string | null>(null)
  useEffect(() => {
    setRecovery(null)
    try {
      const raw = sessionStorage.getItem(draftKey)
      if (!raw) return
      const cached = JSON.parse(raw) as { revision: number; content: string }
      if (typeof cached.content !== "string") return
      if (cached.revision === project.revision) setDraft(cached.content)
      else setRecovery(cached.content)
    } catch {
      /* Storage may be unavailable; explicit saving remains available. */
    }
  }, [draftKey, project.revision])
  function changeDraft(value: string) {
    setDraft(value)
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ revision: project.revision, content: value }),
      )
    } catch {
      /* Keep editor usable. */
    }
  }
  function discardRecovery() {
    setRecovery(null)
    try {
      sessionStorage.removeItem(draftKey)
    } catch {
      /* Storage unavailable. */
    }
  }
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty, busy])
  async function action(
    actionName: string,
    extra: Record<string, unknown> = {},
  ) {
    if (lock.current) return
    if (recovery !== null) {
      toast.error("请先处理待恢复的本地草稿")
      return
    }
    lock.current = true
    setBusy(actionName)
    try {
      const res = await fetch(`/api/writing-projects/${project.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: actionName,
          revision: project.revision,
          model,
          episodeNumber: number,
          ...extra,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "操作失败")
      try {
        sessionStorage.removeItem(draftKey)
      } catch {
        /* Storage unavailable. */
      }
      const next = payload.data as WritingProjectDTO
      setProject(next)
      setDraft(
        next.document.episodes.find((item) => item.number === number)
          ?.content ?? "",
      )
      void update()
      toast.success(
        actionName === "save"
          ? "正文已保存"
          : actionName === "restore"
            ? "历史版本已恢复"
            : actionName === "import"
              ? "已导入影视工厂"
              : "生成完成",
      )
      if (actionName === "chat") setMessage("")
      if (actionName === "import")
        router.push(`/creation/film-factory/${next.importedScriptId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败")
    } finally {
      lock.current = false
      setBusy("")
    }
  }
  function openGeneration(kind: "blueprint" | "episode") {
    if (dirty) {
      toast.error("请先保存正文，再进行生成")
      return
    }
    setGeneration(kind)
    setPanel("generate")
  }
  function download(text: string, name: string) {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制")
    } catch {
      toast.error("复制失败，请选择文本复制")
    }
  }
  const hasBlueprint = Boolean(project.document.blueprint)
  const ready = project.document.episodes.filter((item) => item.content).length
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2">
        <Link
          href="/creation/script-writing"
          onClick={(event) => {
            if (dirty && !confirm("正文尚未保存，仍要离开吗？"))
              event.preventDefault()
          }}
          className="mr-2 flex items-center gap-1 text-xs text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          全部剧本
        </Link>
        <h1 className="max-w-xs truncate text-sm text-zinc-100">
          {project.title}
        </h1>
        <span className="text-[10px] text-zinc-500">{project.genre}</span>
        <span className="text-[10px] text-zinc-500">{project.totalEpisodes} 集目标</span>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px]", project.document.blueprint ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-400")}>
          {project.document.blueprint ? "大纲就绪" : "待构思"}
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPanel("blueprint")}>
            <FileText />大纲
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPanel("characters")}>
            <Users />角色
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast.info("质检功能即将上线")}>
            <Sparkles />质检全剧
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy || ready >= project.totalEpisodes}
            onClick={() => toast.info("批量生成功能即将上线")}>
            批量生成剩余 {Math.max(0, project.totalEpisodes - ready)} 集
          </Button>
          <Button size="sm" variant="inverse" disabled={!!busy || dirty || !ready}
            onClick={() => void action("import")}>
            {project.importedScriptId ? "打开影视工厂" : "导入影视工厂"}
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>
              {project.genre} · {project.totalEpisodes}集 ·{" "}
              {project.episodeDuration}秒/集
            </span>
            <span className="ml-auto">{ready}集正文已完成</span>
            <Button
              size="sm"
              variant="outline"
              disabled={!!busy}
              onClick={() => openGeneration("blueprint")}
            >
              生成项目蓝图
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!ready}
              onClick={() =>
                download(
                  project.document.episodes
                    .map((item) => item.content)
                    .filter(Boolean)
                    .join("\n\n"),
                  `${project.title}.txt`,
                )
              }
            >
              <Download />
              下载全剧
            </Button>
          </div>
          {hasBlueprint ? (
            <>
              <div
                className="mb-3 flex shrink-0 gap-2 overflow-x-auto rounded-lg border-y-4 border-dotted border-zinc-800 bg-zinc-900/50 p-2"
                aria-label="分集列表"
              >
                {project.document.episodes.map((item) => (
                  <button
                    key={item.number}
                    disabled={!!busy}
                    onClick={() => {
                      if (dirty) {
                        toast.error("请先保存本集正文")
                        return
                      }
                      setNumber(item.number)
                      setDraft(item.content)
                    }}
                    className={cn(
                      "min-w-28 rounded-md border px-3 py-2 text-left",
                      item.number === number
                        ? "border-orange-500/60 bg-orange-500/10"
                        : "border-zinc-800 hover:border-zinc-600",
                    )}
                  >
                    <span className="block text-[10px] text-zinc-500">
                      第{item.number}集 {item.content ? "●" : "○"}
                    </span>
                    <span className="mt-1 block max-w-36 truncate text-xs text-zinc-200">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2">
                  <h2 className="text-sm text-zinc-200">
                    第{number}集 · {episode?.title}
                  </h2>
                  <span className="text-xs text-zinc-500">
                    {dirty ? "未保存" : "已保存"}
                  </span>
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="sm" disabled={number <= 1 || !!busy}
                      onClick={() => { const prev = project.document.episodes.find(e => e.number === number - 1); if (prev) { setNumber(prev.number); setDraft(prev.content) } }}>
                      ‹ 上一集
                    </Button>
                    <Button variant="ghost" size="sm" disabled={number >= project.totalEpisodes || !!busy}
                      onClick={() => { const next = project.document.episodes.find(e => e.number === number + 1); if (next) { setNumber(next.number); setDraft(next.content) } }}>
                      下一集 ›
                    </Button>
                    <Button variant="ghost" size="sm" disabled={!draft} onClick={() => void copy(draft)}>
                      <Copy />复制
                    </Button>
                    <Button variant="outline" size="sm" disabled={!!busy || !dirty}
                      onClick={() => void action("save", { content: draft })}>
                      保存正文
                    </Button>
                    <Button variant="ghost" size="sm" disabled={!!busy || !episode?.content}
                      onClick={() => { if (confirm("确定要重写本集正文？当前内容将被覆盖。")) openGeneration("episode") }}>
                      重写正文
                    </Button>
                    <Button variant="inverse" size="sm" disabled={!!busy}
                      onClick={() => openGeneration("episode")}>
                      生成本集正文
                    </Button>
                  </div>
                </div>
                {recovery !== null && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-200">
                    <span>发现其他版本的未保存草稿。当前显示服务器正文。</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        changeDraft(recovery)
                        setRecovery(null)
                      }}
                    >
                      恢复本地草稿
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        download(
                          recovery,
                          `${project.title}-第${number}集-本地草稿.txt`,
                        )
                      }
                    >
                      下载草稿
                    </Button>
                    <Button size="sm" variant="ghost" onClick={discardRecovery}>
                      丢弃草稿
                    </Button>
                  </div>
                )}
                {busy === "episode" ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-zinc-400">
                    <Loader2 className="animate-spin" />
                    本集正文生成中…
                  </div>
                ) : (
                  <textarea
                    aria-label="本集正文"
                    value={draft}
                    disabled={!!busy || recovery !== null}
                    onChange={(e) => changeDraft(e.target.value)}
                    placeholder={`本集还没有正文。\n\n${episode?.summary ?? ""}\n\n点击「生成本集正文」开始，也可以直接写作。`}
                    className="min-h-40 flex-1 resize-none bg-transparent p-5 text-sm leading-8 text-zinc-300 outline-none placeholder:text-zinc-600"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
              <Sparkles className="mb-4 h-6 w-6 text-orange-500" />
              <h2 className="text-base text-zinc-200">
                从故事核心搭建全剧蓝图
              </h2>
              <p className="mb-6 mt-3 max-w-lg text-sm leading-7 text-zinc-500">
                {project.idea}
              </p>
              <Button
                variant="inverse"
                disabled={!!busy}
                onClick={() => openGeneration("blueprint")}
              >
                {busy ? <Loader2 className="animate-spin" /> : <FileText />}
                选内置模型生成蓝图
              </Button>
            </div>
          )}
          {busy && (
            <div className="mt-3">
              <RequestPending
                label={
                  busy === "save"
                    ? "正在保存正文"
                    : busy === "import"
                      ? "正在导入剧本"
                      : "正在等待创作结果"
                }
              />
              <p role="status" className="mt-1 text-xs text-zinc-500">
                正在
                {busy === "save"
                  ? "保存正文"
                  : busy === "import"
                    ? "导入剧本"
                    : "处理创作内容"}
                …
              </p>
            </div>
          )}
        </section>
        <aside className="flex h-64 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/30 md:h-auto md:w-80 xl:w-96">
          <div className="flex items-center gap-2 border-b border-zinc-800 p-3 text-sm text-zinc-200">
            <Sparkles className="h-4 w-4 text-orange-500" />
            编剧 Agent
            <span className="ml-auto text-[10px] text-zinc-500">
              对话打磨大纲 · 查一致性 · 定稿
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {project.document.messages.length ? (
              project.document.messages.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl p-3 text-xs leading-6",
                    item.role === "user"
                      ? "ml-6 bg-orange-500/15 text-orange-200 whitespace-pre-wrap"
                      : "mr-3 bg-zinc-800/60 text-zinc-300",
                  )}
                  {...(item.role !== "user" ? { dangerouslySetInnerHTML: { __html: simpleMarkdown(item.text) } } : {})}
                >
                  {item.role === "user" ? item.text : null}
                </div>
              ))
            ) : (
              <div className="space-y-4 py-4">
                <p className="text-sm leading-7 text-zinc-400">
                  和编剧 Agent 一起打磨大纲
                </p>
                <div className="grid gap-2">
                  {[
                    "先取配方，给我一版大纲初稿",
                    "前3集节奏帮我加强钩子",
                    "通读已生成的正文，查一下有没有漏洞",
                    "我满意了，定稿吧",
                  ].map((prompt) => (
                    <button key={prompt} type="button"
                      onClick={() => { setMessage(prompt); void action("chat", { instruction: prompt }) }}
                      disabled={!!busy}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-orange-500/40 hover:text-orange-300 disabled:opacity-50">
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <form
            className="space-y-2 border-t border-zinc-800 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (dirty) {
                toast.error("请先保存正文")
                return
              }
              void action("chat", { instruction: message })
            }}
          >
            <textarea
              aria-label="编剧调整要求"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              disabled={!!busy}
              rows={3}
              placeholder="和编剧 Agent 聊聊这部剧的大纲…"
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-7 min-w-0 gap-1 text-xs" aria-label="编剧模型">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {textModels.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} · {item.cost}积分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" variant="brand" disabled={!!busy || !message.trim()}>
                {busy === "chat" ? <Loader2 className="animate-spin" /> : <Send />}
                发送
              </Button>
            </div>
            <p className="text-[10px] text-zinc-600">每次对话消耗 🎫2 · 失败自动退还</p>
          </form>
        </aside>
      </div>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {panel === "blueprint"
                ? "剧本大纲"
                : panel === "characters"
                  ? "角色档案"
                  : panel === "history"
                    ? "大纲版本历史"
                    : generation === "blueprint"
                      ? "生成项目蓝图"
                      : "生成本集正文"}
            </DialogTitle>
            <DialogDescription>
              {panel === "history"
                ? "保存和生成前自动留档，保留最近20版；恢复前也会留档。"
                : panel === "characters"
                  ? "全剧人物设定。每集正文生成都会参考这些档案。"
                  : panel === "generate"
                    ? "选择文本模型开始生成，已有正文会保留在版本历史中。"
                    : "全剧的故事核心、叙事结构与创作方向。"}
            </DialogDescription>
          </DialogHeader>
          {panel === "blueprint" && (
            <>
              <pre className="whitespace-pre-wrap text-sm leading-8 text-zinc-300">
                {project.document.blueprint || "还没有大纲，请先生成项目蓝图。"}
              </pre>
              {hasBlueprint && (
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      project.document.blueprint,
                      `${project.title}-大纲.txt`,
                    )
                  }
                >
                  <Download />
                  下载大纲
                </Button>
              )}
            </>
          )}
          {panel === "characters" &&
            (project.document.characters.length ? (
              project.document.characters.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <h3 className="mb-2 text-sm text-zinc-100">{item.name}</h3>
                  <p className="text-sm leading-7 text-zinc-400">
                    {item.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-zinc-500">
                蓝图生成后，这里会显示主要角色档案。
              </p>
            ))}
          {panel === "history" &&
            (project.document.history.length ? (
              project.document.history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-zinc-300">
                      {item.label}
                      <span className="ml-3 text-xs text-zinc-500">
                        {new Date(item.date).toLocaleString("zh-CN")}
                      </span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!busy || dirty}
                      onClick={() => {
                        void action("restore", { historyId: item.id })
                        setPanel(null)
                      }}
                    >
                      恢复此版本
                    </Button>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-zinc-500">
                    {item.blueprint}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-zinc-500">
                还没有历史版本，首次修改后自动留档。
              </p>
            ))}
          {panel === "generate" && (
            <div className="space-y-5">
              <label className="block space-y-2 text-sm text-zinc-400">
                文本模型
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger
                    className="h-10 w-full text-sm"
                    aria-label="生成文本模型"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {textModels.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {item.cost} 积分/次
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPanel(null)}>
                  取消
                </Button>
                <Button
                  variant="inverse"
                  disabled={!!busy}
                  onClick={() => {
                    setPanel(null)
                    void action(generation)
                  }}
                >
                  开始生成
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}

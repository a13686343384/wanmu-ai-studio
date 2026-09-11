"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  Download,
  Loader2,
  Pencil,
  Play,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { MODEL_TEMPLATES, type ModelKind } from "@/lib/plugins/templates"
import { AiServiceSettings } from "@/components/plugins/AiServiceSettings"
import { cn } from "@/lib/utils"

/* ── 目录项定义 ── */
const NAV_ITEMS = [
  { id: "ai-service", label: "AI 服务", icon: "⚡" },
  { id: "models", label: "模型配置", icon: "🤖" },
  { id: "credentials", label: "凭据管理", icon: "🔑" },
  { id: "style-templates", label: "风格模板", icon: "🎨" },
] as const

interface ModelRow {
  id: string; name: string; kind: ModelKind; lifecycle: string
  baseUrl: string; templateKey: string | null; enabled: boolean
  constraints: Record<string, unknown>; submit: Record<string, unknown>
  extract: Record<string, unknown>; auth: Record<string, unknown>
  poll: Record<string, unknown> | null; edits: Record<string, unknown> | null
  firstLast: Record<string, unknown> | null; refRegister: Record<string, unknown> | null
  result: Record<string, unknown>
}
interface CredentialRow { id: string; name: string; baseUrl: string | null; keyMask: string | null }

const KIND_LABEL: Record<ModelKind, string> = { text: "文本", image: "图片", video: "视频", audio: "音频", subtitle: "字幕" }
const EMPTY_CONFIG = {
  auth: { header: "Authorization", scheme: "Bearer" },
  constraints: { prompt_max_chars: 0 },
  submit: { method: "POST", path: "/v1/chat/completions", timeout_sec: 300, body: {} },
  extract: { text: ["choices.0.message.content"], error: ["error.message"] },
  result: {},
}
interface ConfigDraft {
  name: string; kind: ModelKind; lifecycle: "sync" | "async"; baseUrl: string
  apiKey: string; upstreamModelId: string; timeoutSec: number; path: string
  templateKey: string | null; enabled: boolean; json: string
}

/** /ai-settings 页面：配置中心 — 左侧目录导航 + 右侧内容区 */
export function PluginSettings() {
  const [activeSection, setActiveSection] = useState("ai-service")
  const [models, setModels] = useState<ModelRow[]>([])
  const [credentials, setCredentials] = useState<CredentialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ id: string | null; draft: ConfigDraft } | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [modelsRes, credRes] = await Promise.all([
        fetch("/api/plugins/models"), fetch("/api/plugins/credentials"),
      ])
      const [mp, cp] = await Promise.all([modelsRes.json(), credRes.json()])
      if (modelsRes.ok) setModels(mp.data ?? [])
      if (credRes.ok) setCredentials(cp.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void reload() }, [reload])

  function scrollTo(id: string) {
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function removeModel(id: string) {
    if (!window.confirm("确定删除该模型配置吗？")) return
    const res = await fetch(`/api/plugins/models/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("已删除"); void reload() }
  }

  async function toggleModel(model: ModelRow) {
    const res = await fetch(`/api/plugins/models/${model.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: model.name, kind: model.kind, lifecycle: model.lifecycle === "async" ? "async" : "sync", baseUrl: model.baseUrl, enabled: !model.enabled, auth: model.auth, constraints: model.constraints, submit: model.submit, extract: model.extract, result: model.result }),
    })
    if (res.ok) void reload()
  }

  async function testModel(id: string) {
    setTestingId(id)
    try {
      const res = await fetch(`/api/plugins/models/${id}/test`, { method: "POST" })
      const payload = await res.json()
      toast[payload.data?.ok ? "success" : "warning"](payload.data?.message ?? "测试完成")
    } catch (e) { toast.error(e instanceof Error ? e.message : "测试失败") }
    finally { setTestingId(null) }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 lg:px-6">
      {/* ── 左侧目录导航 ── */}
      <nav className="hidden w-48 shrink-0 lg:block">
        <div className="sticky top-6 space-y-1">
          <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">配置目录</p>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)}
              className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                activeSection === item.id ? "bg-orange-500/10 text-orange-300" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200")}>
              <span>{item.icon}</span>
              {item.label}
              {item.id === "models" && <span className="ml-auto text-[10px] text-zinc-600">{models.length}</span>}
              {item.id === "credentials" && <span className="ml-auto text-[10px] text-zinc-600">{credentials.length}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* ── 右侧内容区 ── */}
      <div className="min-w-0 flex-1 space-y-6">
        {/* 页头 */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">Settings</p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-50">配置</h1>
          <p className="mt-1 text-xs text-zinc-500">AI 服务 · 模型接入 · 凭据管理 · 风格模板</p>
        </div>

        {/* § AI 服务 */}
        <section ref={el => { sectionRefs.current["ai-service"] = el as HTMLDivElement }} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
            <span>⚡</span> AI 服务
          </h2>
          <AiServiceSettings />
        </section>

        {/* § 模型配置 */}
        <section ref={el => { sectionRefs.current["models"] = el as HTMLDivElement }} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <span>🤖</span> 模型配置 <span className="text-[10px] text-zinc-600">({models.length})</span>
            </h2>
            <Button variant="inverse" size="sm" onClick={() => setEditing({ id: null, draft: { name: "", kind: "text", lifecycle: "sync", baseUrl: "", apiKey: "", upstreamModelId: "", timeoutSec: 300, path: "/v1/chat/completions", templateKey: null, enabled: true, json: JSON.stringify(EMPTY_CONFIG, null, 2) } })}>
              <Plus /> 新建模型
            </Button>
          </div>
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
          ) : models.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 py-10 text-center">
              <p className="text-sm text-zinc-400">还没有接入自定义模型</p>
              <p className="mt-1 text-xs text-zinc-600">点「新建模型」，从 16 种模板导入配置</p>
            </div>
          ) : (
            <div className="space-y-2">
              {models.map(model => (
                <div key={model.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-100">{model.name}</span>
                      <Badge variant="muted" className="font-normal">{KIND_LABEL[model.kind]}</Badge>
                      <Badge variant="muted" className="font-normal">{model.lifecycle === "async" ? "轮询" : "同步"}</Badge>
                      {!model.enabled && <Badge variant="muted">已停用</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{model.baseUrl}</p>
                  </div>
                  <Switch checked={model.enabled} onCheckedChange={() => void toggleModel(model)} />
                  <Button variant="ghost" size="icon-sm" disabled={testingId === model.id} onClick={() => void testModel(model.id)}>
                    {testingId === model.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ id: model.id, draft: { name: model.name, kind: model.kind, lifecycle: model.lifecycle === "async" ? "async" : "sync", baseUrl: model.baseUrl, apiKey: "", upstreamModelId: String((model.constraints as Record<string, unknown>).model_id ?? ""), timeoutSec: Number((model.submit as Record<string, unknown>).timeout_sec ?? 300) || 300, path: String((model.submit as Record<string, unknown>).path ?? ""), templateKey: model.templateKey, enabled: model.enabled, json: JSON.stringify({ auth: model.auth, constraints: model.constraints, submit: model.submit, ...(model.edits ? { edits: model.edits } : {}), ...(model.poll ? { poll: model.poll } : {}), ...(model.firstLast ? { first_last: model.firstLast } : {}), extract: model.extract, result: model.result }, null, 2) } })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => void removeModel(model.id)} className="hover:text-rose-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* § 凭据管理 */}
        <section ref={el => { sectionRefs.current["credentials"] = el as HTMLDivElement }} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
            <span>🔑</span> 凭据管理 <span className="text-[10px] text-zinc-600">({credentials.length})</span>
          </h2>
          <CredentialPanel credentials={credentials} onChanged={reload} />
        </section>

        {/* § 风格模板 */}
        <section ref={el => { sectionRefs.current["style-templates"] = el as HTMLDivElement }} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
            <span>🎨</span> 风格模板
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            每个服化道风格类型对应一套提取模板 + 出图提示词模板。创建剧本时 AI 按所选风格使用对应模板提取角色/场景/道具/妆造描述词并生成参考图。
          </p>
          <StyleTemplatePlaceholder />
        </section>
      </div>

      {editing && (
        <ModelConfigDialog editing={editing} credentials={credentials} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload() }} />
      )}
    </main>
  )
}

/* ── 风格模板占位（后续任务实现完整 CRUD） ── */
function StyleTemplatePlaceholder() {
  const presets = [
    { name: "默认万能", desc: "适用于所有题材的通用模板", isDefault: true },
    { name: "赛博废土", desc: "赛博朋克 + 废土美学，暗色调、数据纹路、锈蚀金属" },
    { name: "古风仙侠", desc: "东方古典美学，水墨意境、飘逸服饰、仙气光影" },
    { name: "都市现代", desc: "当代都市写实风，通勤服饰、玻璃幕墙、自然光" },
    { name: "末世科幻", desc: "后启示录风格，破败建筑、防护装备、冷峻色调" },
  ]
  return (
    <div className="space-y-2">
      {presets.map(p => (
        <div key={p.name} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-100">{p.name}</span>
              {p.isDefault && <Badge variant="brand" className="text-[10px]">默认</Badge>}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">{p.desc}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => toast.info("模板编辑功能即将上线")}>
            <Pencil className="mr-1 h-3 w-3" />编辑
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info("自定义模板功能即将上线")}>
        <Plus className="mr-1 h-3 w-3" />新建风格模板
      </Button>
    </div>
  )
}

/* ── 凭据面板 ── */
function CredentialPanel({ credentials, onChanged }: { credentials: CredentialRow[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState(""); const [baseUrl, setBaseUrl] = useState(""); const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      const res = editingId
        ? await fetch(`/api/plugins/credentials?id=${editingId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, baseUrl, apiKey: apiKey || undefined }) })
        : await fetch("/api/plugins/credentials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, baseUrl, apiKey }) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "保存失败")
      toast.success(editingId ? "凭据已更新" : "凭据已创建")
      setOpen(false); onChanged()
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-2">
      <Button variant="inverse" size="sm" onClick={() => { setEditingId(null); setName(""); setBaseUrl(""); setApiKey(""); setOpen(true) }}>
        <Plus /> 新建凭据
      </Button>
      {credentials.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-600">
          还没有凭据。凭据 = 一份接口地址 + API Key，配置模型时直接选用。
        </div>
      ) : credentials.map(c => (
        <div key={c.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-100">{c.name}</p>
            <p className="truncate text-[11px] text-zinc-500">{c.baseUrl ?? "—"}</p>
          </div>
          <span className="text-[11px] text-zinc-600">{c.keyMask}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => { setEditingId(c.id); setName(c.name); setBaseUrl(c.baseUrl ?? ""); setApiKey(""); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" className="hover:text-rose-300" onClick={async () => { if (!window.confirm(`删除凭据「${c.name}」？`)) return; const r = await fetch(`/api/plugins/credentials?id=${c.id}`, { method: "DELETE" }); if (r.ok) { toast.success("已删除"); onChanged() } }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑凭据" : "新建凭据"}</DialogTitle>
            <DialogDescription>{editingId ? "密钥不会回显。要换 Key 就重新粘贴一次，留空表示保持不变。" : "存一份接口地址 + API Key，之后配模型时直接选它。"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>名字</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="给自己看的，比如「我的中转」" /></div>
            <div className="space-y-1.5"><Label>接口地址</Label><Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="留空则用模板默认地址" /></div>
            <div className="space-y-1.5"><Label>API Key {editingId && "（留空 = 保持不变）"}</Label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingId ? "保持不变" : "sk-…"} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button variant="inverse" onClick={() => void submit()} disabled={saving || !name.trim() || (!editingId && !apiKey.trim())}>
              {saving ? <Loader2 className="animate-spin" /> : <Check />}保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── 模型配置弹窗 ── */
function ModelConfigDialog({ editing, credentials, onClose, onSaved }: { editing: { id: string | null; draft: ConfigDraft }; credentials: CredentialRow[]; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<ConfigDraft>(editing.draft)
  const [saving, setSaving] = useState(false)
  function patch(next: Partial<ConfigDraft>) { setDraft(c => ({ ...c, ...next })) }
  function importTemplate(key: string) {
    const t = MODEL_TEMPLATES.find(i => i.key === key); if (!t) return
    patch({ kind: t.kind, lifecycle: t.lifecycle, templateKey: t.key, path: String((t.config.submit as Record<string, unknown>).path ?? "/v1/chat/completions"), timeoutSec: Number((t.config.submit as Record<string, unknown>).timeout_sec ?? 300), json: JSON.stringify(t.config, null, 2) })
  }
  async function save() {
    let config: Record<string, unknown>; try { config = JSON.parse(draft.json) } catch { toast.error("JSON 格式不合法"); return }
    setSaving(true)
    try {
      const payload = { name: draft.name, kind: draft.kind, lifecycle: draft.lifecycle, baseUrl: draft.baseUrl, apiKey: draft.apiKey || undefined, upstreamModelId: draft.upstreamModelId || undefined, templateKey: draft.templateKey ?? undefined, enabled: draft.enabled, ...config, constraints: { ...(config.constraints as Record<string, unknown>), model_id: draft.upstreamModelId || draft.name }, submit: { ...(config.submit as Record<string, unknown>), path: draft.path || (config.submit as Record<string, unknown>).path, timeout_sec: draft.timeoutSec } }
      const res = await fetch(editing.id ? `/api/plugins/models/${editing.id}` : "/api/plugins/models", { method: editing.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      const p = await res.json(); if (!res.ok) throw new Error(p.error ?? "保存失败")
      toast.success(editing.id ? "模型已更新" : "模型已创建"); onSaved()
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败") } finally { setSaving(false) }
  }
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>模型配置</DialogTitle><DialogDescription>可视化配置，或直接粘贴 JSON；也可以从模板一键导入。</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" /><span className="text-xs text-zinc-300">模板化配置</span>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7">选择模板<ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              {MODEL_TEMPLATES.map(t => (<DropdownMenuItem key={t.key} onSelect={() => importTemplate(t.key)}><span className="min-w-0 flex-1 truncate">{t.title}</span><span className="text-[10px] text-zinc-600">{KIND_LABEL[t.kind]}</span></DropdownMenuItem>))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>模型名称</Label><Input value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder="我的文本模型" /></div>
            <div className="space-y-1.5"><Label>类型</Label><div className="flex gap-1">{(Object.keys(KIND_LABEL) as ModelKind[]).map(k => (<button key={k} type="button" onClick={() => patch({ kind: k })} className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors", draft.kind === k ? "border-orange-500/60 bg-orange-500/10 text-orange-300" : "border-zinc-800 text-zinc-400 hover:text-zinc-200")}>{KIND_LABEL[k]}</button>))}</div></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>生成模板</Label><Select value={draft.lifecycle} onValueChange={v => patch({ lifecycle: v === "async" ? "async" : "sync" })}><SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sync">同步 · 一次返回</SelectItem><SelectItem value="async">异步 · 提交后轮询</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>接口地址</Label><Input value={draft.baseUrl} onChange={e => patch({ baseUrl: e.target.value })} placeholder="https://你的接口地址" className="h-9 text-xs" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>API Key</Label><Input type="password" value={draft.apiKey} onChange={e => patch({ apiKey: e.target.value })} placeholder={editing.id ? "留空 = 保持不变" : "sk-…"} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label>上游模型 ID</Label><Input value={draft.upstreamModelId} onChange={e => patch({ upstreamModelId: e.target.value })} placeholder="如 gpt-image-2" className="h-9 text-xs" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>请求路径</Label><Input value={draft.path} onChange={e => patch({ path: e.target.value })} placeholder="/v1/chat/completions" className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label>超时 (秒)</Label><Input type="number" value={draft.timeoutSec} onChange={e => patch({ timeoutSec: Number(e.target.value) || 300 })} className="h-9 text-xs" /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"><span className="text-xs text-zinc-300">启用</span><Switch checked={draft.enabled} onCheckedChange={v => patch({ enabled: v })} /></div>
          <div className="space-y-1.5"><Label>高级 JSON</Label><Textarea rows={10} value={draft.json} onChange={e => patch({ json: e.target.value })} className="font-mono text-[11px] leading-relaxed" /></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>取消</Button><Button variant="inverse" onClick={() => void save()} disabled={saving || !draft.name.trim() || !draft.baseUrl.trim()}>{saving ? <Loader2 className="animate-spin" /> : <Check />}保存</Button></div>
      </DialogContent>
    </Dialog>
  )
}

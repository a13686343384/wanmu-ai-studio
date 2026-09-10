"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Check,
  ChevronDown,
  Download,
  Loader2,
  Pencil,
  Play,
  Plus,
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

interface ModelRow {
  id: string
  name: string
  kind: ModelKind
  lifecycle: string
  baseUrl: string
  templateKey: string | null
  enabled: boolean
  constraints: Record<string, unknown>
  submit: Record<string, unknown>
  extract: Record<string, unknown>
  auth: Record<string, unknown>
  poll: Record<string, unknown> | null
  edits: Record<string, unknown> | null
  firstLast: Record<string, unknown> | null
  refRegister: Record<string, unknown> | null
  result: Record<string, unknown>
}

interface CredentialRow {
  id: string
  name: string
  baseUrl: string | null
  keyMask: string | null
}

const KIND_LABEL: Record<ModelKind, string> = {
  text: "文本",
  image: "图片",
  video: "视频",
  audio: "音频",
  subtitle: "字幕",
}

const EMPTY_CONFIG = {
  auth: { header: "Authorization", scheme: "Bearer" },
  constraints: { prompt_max_chars: 0 },
  submit: { method: "POST", path: "/v1/chat/completions", timeout_sec: 300, body: {} },
  extract: { text: ["choices.0.message.content"], error: ["error.message"] },
  result: {},
}

interface ConfigDraft {
  name: string
  kind: ModelKind
  lifecycle: "sync" | "async"
  baseUrl: string
  apiKey: string
  upstreamModelId: string
  timeoutSec: number
  path: string
  templateKey: string | null
  enabled: boolean
  json: string
}

/** /ai-settings 页面：AI 模型接入配置 + 凭据管理。 */
export function PluginSettings() {
  const [tab, setTab] = useState("models")
  const [models, setModels] = useState<ModelRow[]>([])
  const [credentials, setCredentials] = useState<CredentialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ id: string | null; draft: ConfigDraft } | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [modelsRes, credRes] = await Promise.all([
        fetch("/api/plugins/models"),
        fetch("/api/plugins/credentials"),
      ])
      const [modelsPayload, credPayload] = await Promise.all([modelsRes.json(), credRes.json()])
      if (modelsRes.ok) setModels(modelsPayload.data ?? [])
      if (credRes.ok) setCredentials(credPayload.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function removeModel(id: string) {
    if (!window.confirm("确定删除该模型配置吗？")) return
    const res = await fetch(`/api/plugins/models/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("已删除")
      void reload()
    }
  }

  async function toggleModel(model: ModelRow) {
    const res = await fetch(`/api/plugins/models/${model.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: model.name,
        kind: model.kind,
        lifecycle: model.lifecycle === "async" ? "async" : "sync",
        baseUrl: model.baseUrl,
        enabled: !model.enabled,
        auth: model.auth,
        constraints: model.constraints,
        submit: model.submit,
        extract: model.extract,
        result: model.result,
      }),
    })
    if (res.ok) void reload()
  }

  async function testModel(id: string) {
    setTestingId(id)
    try {
      const res = await fetch(`/api/plugins/models/${id}/test`, { method: "POST" })
      const payload = await res.json()
      toast[payload.data?.ok ? "success" : "warning"](payload.data?.message ?? "测试完成")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "测试失败")
    } finally {
      setTestingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">Plugins</p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-50">AI 设置</h1>
          <p className="mt-1 text-xs text-zinc-500">
            接入自定义模型（16 种模板）· 管理 API 凭据
          </p>
        </div>
        <Button
          variant="inverse"
          size="sm"
          onClick={() =>
            setEditing({
              id: null,
              draft: {
                name: "",
                kind: "text",
                lifecycle: "sync",
                baseUrl: "",
                apiKey: "",
                upstreamModelId: "",
                timeoutSec: 300,
                path: "/v1/chat/completions",
                templateKey: null,
                enabled: true,
                json: JSON.stringify(EMPTY_CONFIG, null, 2),
              },
            })
          }
        >
          <Plus />
          新建模型
        </Button>
      </div>

      {/* AI 服务：MOCK 开关 + 凭据 + ComfyUI */}
      <div className="mt-5">
        <AiServiceSettings />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="models">模型 ({models.length})</TabsTrigger>
          <TabsTrigger value="credentials">凭据 ({credentials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-4 space-y-2">
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
          ) : models.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 py-14 text-center">
              <p className="text-sm text-zinc-400">还没有接入自定义模型</p>
              <p className="mt-1 text-xs text-zinc-600">
                点「新建模型」，从 16 种模板导入配置，填入接口地址与 Key 即可
              </p>
            </div>
          ) : (
            models.map((model) => (
              <div
                key={model.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-100">{model.name}</span>
                    <Badge variant="muted" className="font-normal">
                      {KIND_LABEL[model.kind]}
                    </Badge>
                    <Badge variant="muted" className="font-normal">
                      {model.lifecycle === "async" ? "轮询" : "同步"}
                    </Badge>
                    {!model.enabled && <Badge variant="muted">已停用</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">{model.baseUrl}</p>
                </div>
                <Switch checked={model.enabled} onCheckedChange={() => void toggleModel(model)} />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`测试 ${model.name}`}
                  disabled={testingId === model.id}
                  onClick={() => void testModel(model.id)}
                >
                  {testingId === model.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`编辑 ${model.name}`}
                  onClick={() =>
                    setEditing({
                      id: model.id,
                      draft: {
                        name: model.name,
                        kind: model.kind,
                        lifecycle: model.lifecycle === "async" ? "async" : "sync",
                        baseUrl: model.baseUrl,
                        apiKey: "",
                        upstreamModelId: String(
                          (model.constraints as Record<string, unknown>).model_id ?? "",
                        ),
                        timeoutSec:
                          Number(
                            (model.submit as Record<string, unknown>).timeout_sec ?? 300,
                          ) || 300,
                        path: String((model.submit as Record<string, unknown>).path ?? ""),
                        templateKey: model.templateKey,
                        enabled: model.enabled,
                        json: JSON.stringify(
                          {
                            auth: model.auth,
                            constraints: model.constraints,
                            submit: model.submit,
                            ...(model.edits ? { edits: model.edits } : {}),
                            ...(model.poll ? { poll: model.poll } : {}),
                            ...(model.firstLast ? { first_last: model.firstLast } : {}),
                            extract: model.extract,
                            result: model.result,
                          },
                          null,
                          2,
                        ),
                      },
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`删除 ${model.name}`}
                  onClick={() => void removeModel(model.id)}
                  className="hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="credentials" className="mt-4">
          <CredentialPanel credentials={credentials} onChanged={reload} />
        </TabsContent>
      </Tabs>

      {editing && (
        <ModelConfigDialog
          editing={editing}
          credentials={credentials}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
    </main>
  )
}

/* ---------------------------- 凭据面板 ---------------------------- */

function CredentialPanel({
  credentials,
  onChanged,
}: {
  credentials: CredentialRow[]
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      const res = editingId
        ? await fetch(`/api/plugins/credentials?id=${editingId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, baseUrl, apiKey: apiKey || undefined }),
          })
        : await fetch("/api/plugins/credentials", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, baseUrl, apiKey }),
          })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "保存失败")
      toast.success(editingId ? "凭据已更新" : "凭据已创建")
      setOpen(false)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="inverse"
        size="sm"
        onClick={() => {
          setEditingId(null)
          setName("")
          setBaseUrl("")
          setApiKey("")
          setOpen(true)
        }}
      >
        <Plus />
        新建凭据
      </Button>

      {credentials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center text-xs text-zinc-600">
          还没有凭据。凭据 = 一份接口地址 + API Key，配置模型时直接选用。
        </div>
      ) : (
        credentials.map((credential) => (
          <div
            key={credential.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-100">{credential.name}</p>
              <p className="truncate text-[11px] text-zinc-500">{credential.baseUrl ?? "—"}</p>
            </div>
            <span className="text-[11px] text-zinc-600">{credential.keyMask}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`编辑 ${credential.name}`}
              onClick={() => {
                setEditingId(credential.id)
                setName(credential.name)
                setBaseUrl(credential.baseUrl ?? "")
                setApiKey("")
                setOpen(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`删除 ${credential.name}`}
              onClick={async () => {
                if (!window.confirm(`删除凭据「${credential.name}」？`)) return
                const res = await fetch(`/api/plugins/credentials?id=${credential.id}`, {
                  method: "DELETE",
                })
                if (res.ok) {
                  toast.success("已删除")
                  onChanged()
                }
              }}
              className="hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑凭据" : "新建凭据"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "密钥不会回显。要换 Key 就重新粘贴一次，留空表示保持不变。"
                : "存一份接口地址 + API Key，之后配模型时直接选它。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>名字</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="给自己看的，比如「我的中转」「公司账号」"
              />
            </div>
            <div className="space-y-1.5">
              <Label>接口地址</Label>
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="留空则用模板默认地址"
              />
            </div>
            <div className="space-y-1.5">
              <Label>API Key {editingId && "（留空 = 保持不变）"}</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={editingId ? "保持不变" : "sk-…"}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              variant="inverse"
              onClick={() => void submit()}
              disabled={saving || !name.trim() || (!editingId && !apiKey.trim())}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Check />}
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------------------- 模型配置弹窗 ---------------------------- */

function ModelConfigDialog({
  editing,
  credentials,
  onClose,
  onSaved,
}: {
  editing: { id: string | null; draft: ConfigDraft }
  credentials: CredentialRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<ConfigDraft>(editing.draft)
  const [mode, setMode] = useState<"form" | "json">("form")
  const [saving, setSaving] = useState(false)

  function patch(next: Partial<ConfigDraft>) {
    setDraft((current) => ({ ...current, ...next }))
  }

  function importTemplate(key: string) {
    const template = MODEL_TEMPLATES.find((item) => item.key === key)
    if (!template) return
    patch({
      kind: template.kind,
      lifecycle: template.lifecycle,
      templateKey: template.key,
      path: String(
        (template.config.submit as Record<string, unknown>).path ?? "/v1/chat/completions",
      ),
      timeoutSec: Number(
        (template.config.submit as Record<string, unknown>).timeout_sec ?? 300,
      ),
      json: JSON.stringify(template.config, null, 2),
    })
  }

  async function save() {
    let config: Record<string, unknown>
    try {
      config = JSON.parse(draft.json)
    } catch {
      toast.error("JSON 配置格式不合法")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name,
        kind: draft.kind,
        lifecycle: draft.lifecycle,
        baseUrl: draft.baseUrl,
        apiKey: draft.apiKey || undefined,
        upstreamModelId: draft.upstreamModelId || undefined,
        templateKey: draft.templateKey ?? undefined,
        enabled: draft.enabled,
        ...config,
        constraints: {
          ...(config.constraints as Record<string, unknown>),
          model_id: draft.upstreamModelId || draft.name,
        },
        submit: {
          ...(config.submit as Record<string, unknown>),
          path: draft.path || (config.submit as Record<string, unknown>).path,
          timeout_sec: draft.timeoutSec,
        },
      }
      const res = await fetch(
        editing.id ? `/api/plugins/models/${editing.id}` : "/api/plugins/models",
        {
          method: editing.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const payload2 = await res.json()
      if (!res.ok) throw new Error(payload2.error ?? "保存失败")
      toast.success(editing.id ? "模型已更新" : "模型已创建")
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>模型配置</DialogTitle>
          <DialogDescription>
            可视化配置，或直接粘贴 JSON；也可以从模板一键导入。
          </DialogDescription>
        </DialogHeader>

        {/* 模板导入 */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-xs text-zinc-300">模板化配置</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7">
                选择模板
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              {MODEL_TEMPLATES.map((template) => (
                <DropdownMenuItem key={template.key} onSelect={() => importTemplate(template.key)}>
                  <span className="min-w-0 flex-1 truncate">{template.title}</span>
                  <span className="text-[10px] text-zinc-600">{KIND_LABEL[template.kind]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="form">
          <TabsList>
            <TabsTrigger value="form">可视化</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-3 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>模型名称</Label>
                <Input
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder="我的文本模型"
                />
              </div>
              <div className="space-y-1.5">
                <Label>类型</Label>
                <div className="flex gap-1">
                  {(Object.keys(KIND_LABEL) as ModelKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => patch({ kind })}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                        draft.kind === kind
                          ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                          : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
                      )}
                    >
                      {KIND_LABEL[kind]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>生成模板 (lifecycle)</Label>
                <Select
                  value={draft.lifecycle}
                  onValueChange={(value) =>
                    patch({ lifecycle: value === "async" ? "async" : "sync" })
                  }
                >
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sync">同步 · 一次返回</SelectItem>
                    <SelectItem value="async">异步 · 提交后轮询</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>接口地址 (base_url)</Label>
                <Input
                  value={draft.baseUrl}
                  onChange={(event) => patch({ baseUrl: event.target.value })}
                  placeholder="https://你的接口地址"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={draft.apiKey}
                  onChange={(event) => patch({ apiKey: event.target.value })}
                  placeholder={editing.id ? "留空 = 保持不变" : "sk-…"}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>上游模型 ID</Label>
                <Input
                  value={draft.upstreamModelId}
                  onChange={(event) => patch({ upstreamModelId: event.target.value })}
                  placeholder="如 gpt-image-2"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>请求路径 (path)</Label>
                <Input
                  value={draft.path}
                  onChange={(event) => patch({ path: event.target.value })}
                  placeholder="/v1/chat/completions"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>超时 (秒)</Label>
                <Input
                  type="number"
                  value={draft.timeoutSec}
                  onChange={(event) =>
                    patch({ timeoutSec: Number(event.target.value) || 300 })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <span className="text-xs text-zinc-300">启用</span>
              <Switch checked={draft.enabled} onCheckedChange={(value) => patch({ enabled: value })} />
            </div>
          </TabsContent>

          <TabsContent value="json" className="pt-3">
            <Textarea
              rows={16}
              value={draft.json}
              onChange={(event) => patch({ json: event.target.value })}
              className="font-mono text-[11px] leading-relaxed"
            />
            <p className="mt-1 text-[10px] text-zinc-600">
              完整配置（auth / constraints / submit / poll / extract / result）。保存时以此为准。
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="inverse"
            onClick={() => void save()}
            disabled={saving || !draft.name.trim() || !draft.baseUrl.trim()}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, PlugZap, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface CredentialStatus {
  key: string
  name: string
  ready: boolean
  baseUrl: string | null
  model: string | null
  updatedAt: string | null
}

interface AiSettingsPayload {
  mode: "mock" | "live"
  providers: {
    qwen: { baseUrl: string; model: string; credentialName: string }
    deepseek: { baseUrl: string; model: string; credentialName: string }
    comfyui: { baseUrl: string }
  }
  credentials: CredentialStatus[]
}

/**
 * 设置页「AI 服务」卡片：
 * - MOCK 开关：开（默认）= 内置 Mock；关 = 全部走真实接口
 *   （文本 Qwen 主力 / DeepSeek 辅助；图片视频 = 线上自定义模型 → 本地 ComfyUI）
 * - ComfyUI 连通性测试
 */
export function AiServiceSettings() {
  const [data, setData] = useState<AiSettingsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [testing, setTesting] = useState(false)
  const [comfyUrl, setComfyUrl] = useState("")
  const [keys, setKeys] = useState({ qwen: "", deepseek: "" })
  const [savingKeys, setSavingKeys] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/ai")
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载失败")
      setData(payload.data)
      setComfyUrl(payload.data.providers.comfyui.baseUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function switchMode(live: boolean) {
    setSwitching(true)
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: live ? "live" : "mock" }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "切换失败")
      toast.success(payload.message ?? "已切换", {
        description: live
          ? "文本走 Qwen/DeepSeek，图片视频走线上模型或本地 ComfyUI"
          : "全部能力恢复为内置 Mock 数据",
      })
      setData((current) => (current ? { ...current, mode: payload.data.mode } : current))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "切换失败")
    } finally {
      setSwitching(false)
    }
  }

  async function testComfy() {
    setTesting(true)
    try {
      if (comfyUrl && comfyUrl !== data?.providers.comfyui.baseUrl) {
        await fetch("/api/settings/ai", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ providers: { comfyui: { baseUrl: comfyUrl } } }),
        })
      }
      const res = await fetch("/api/settings/ai?action=test-comfyui", { method: "POST" })
      const payload = await res.json()
      toast[payload.data.ok ? "success" : "warning"](payload.data.message)
      void load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "测试失败")
    } finally {
      setTesting(false)
    }
  }

  async function saveKeys() {
    setSavingKeys(true)
    try {
      const credentials = [
        { name: data?.providers.qwen.credentialName ?? "阿里云 Qwen（token-plan）", apiKey: keys.qwen || undefined },
        { name: data?.providers.deepseek.credentialName ?? "DeepSeek", apiKey: keys.deepseek || undefined },
      ].filter((item) => Boolean(item.apiKey))
      if (credentials.length === 0) {
        toast.info("请先填写要更新的 Key")
        return
      }
      const res = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credentials }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "保存失败")
      toast.success("API Key 已保存")
      setKeys({ qwen: "", deepseek: "" })
      void load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSavingKeys(false)
    }
  }

  const live = data?.mode === "live"

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <PlugZap className="h-4 w-4 text-orange-400" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-zinc-100">AI 服务</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            开关关闭 MOCK 后：文本理解走 Qwen（主力）/ DeepSeek（辅助），图片视频优先线上自定义模型、其次本地 ComfyUI。
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              {live ? "真实服务" : "MOCK 数据"}
            </span>
            <Switch
              aria-label="MOCK 数据开关"
              checked={live}
              disabled={switching}
              onCheckedChange={(checked) => void switchMode(checked)}
            />
            {switching && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
          </div>
        )}
      </div>

      {/* 凭据状态 + Key 更新 */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(data?.credentials ?? []).map((credential) => (
          <div
            key={credential.key}
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-medium text-zinc-200">{credential.name}</span>
              {credential.key === "comfyui" ? (
                <Badge variant="muted" className="font-normal">
                  本地
                </Badge>
              ) : credential.ready ? (
                <Badge variant="success" className="h-4 px-1 text-[10px]">
                  已配置
                </Badge>
              ) : (
                <Badge variant="muted" className="h-4 px-1 text-[10px]">
                  未配置
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate text-[10px] text-zinc-600">
              {credential.baseUrl}
              {credential.model ? ` · ${credential.model}` : ""}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-500">Qwen API Key</Label>
          <Input
            type="password"
            value={keys.qwen}
            onChange={(event) => setKeys((current) => ({ ...current, qwen: event.target.value }))}
            placeholder="sk-sp-…（留空则不更新）"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-500">DeepSeek API Key</Label>
          <Input
            type="password"
            value={keys.deepseek}
            onChange={(event) => setKeys((current) => ({ ...current, deepseek: event.target.value }))}
            placeholder="sk-…（留空则不更新）"
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="outline" size="sm" className="h-7" disabled={savingKeys} onClick={() => void saveKeys()}>
          {savingKeys && <Loader2 className="h-3 w-3 animate-spin" />}
          保存 Key
        </Button>
      </div>

      {/* ComfyUI */}
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-800 pt-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-[11px] text-zinc-500">ComfyUI 地址（本地图片/视频辅助通道）</Label>
          <Input
            value={comfyUrl}
            onChange={(event) => setComfyUrl(event.target.value)}
            placeholder="http://192.168.1.12:8118"
            className="h-8 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8" disabled={testing} onClick={() => void testComfy()}>
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          测试连接
        </Button>
      </div>
    </section>
  )
}

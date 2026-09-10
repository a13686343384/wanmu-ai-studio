import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import {
  getAiMode,
  getAiProviders,
  setAiMode,
  setAiProviders,
  DEFAULT_PROVIDERS,
} from "@/lib/settings"
import { prisma } from "@/lib/prisma"
import { comfyPing } from "@/services/ai/comfy/client"
import { z } from "zod"

/** GET /api/settings/ai — 当前 AI 模式、提供方配置与凭据状态。 */
export const GET = withErrorHandling(async () => {
  await requireUser()
  const [mode, providers] = await Promise.all([getAiMode(), getAiProviders()])
  const credentials = await prisma.credential.findMany({
    select: { name: true, baseUrl: true, updatedAt: true },
  })
  const configured = new Map(credentials.map((c) => [c.name, c]))
  const providerKeys = ["qwen", "deepseek", "comfyui"] as const
  return jsonOk({
    mode,
    providers,
    credentials: providerKeys.map((key) => {
      const provider = providers[key]
      const credentialName = "credentialName" in provider ? provider.credentialName : undefined
      const record = credentialName ? configured.get(credentialName) : undefined
      return {
        key,
        name: credentialName ?? key,
        ready:
          key === "comfyui"
            ? Boolean(providers.comfyui.baseUrl)
            : Boolean(record),
        baseUrl: provider.baseUrl,
        model: "model" in provider ? provider.model : null,
        updatedAt: record?.updatedAt?.toISOString() ?? null,
      }
    }),
  })
})

const patchSchema = z.object({
  mode: z.enum(["mock", "live"]).optional(),
  providers: z
    .object({
      qwen: z
        .object({
          baseUrl: z.string().trim().min(1).optional(),
          model: z.string().trim().min(1).optional(),
          credentialName: z.string().trim().min(1).optional(),
        })
        .optional(),
      deepseek: z
        .object({
          baseUrl: z.string().trim().min(1).optional(),
          model: z.string().trim().min(1).optional(),
          credentialName: z.string().trim().min(1).optional(),
        })
        .optional(),
      comfyui: z.object({ baseUrl: z.string().trim().min(1).optional() }).optional(),
    })
    .optional(),
  /** 凭据（apiKey 变更时更新对应 Credential；缺省名用 providers 里的 credentialName） */
  credentials: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        apiKey: z.string().trim().min(1).optional(),
        baseUrl: z.string().trim().optional(),
      }),
    )
    .optional(),
})

/** PATCH /api/settings/ai — 切换 MOCK 开关 / 更新提供方与凭据。 */
export const PATCH = withErrorHandling(
  async (req: Request) => {
    await requireUser()
    const input = patchSchema.parse(await req.json())

    if (input.providers) {
      const current = await getAiProviders()
      await setAiProviders({
        qwen: { ...current.qwen, ...input.providers.qwen },
        deepseek: { ...current.deepseek, ...input.providers.deepseek },
        comfyui: { ...current.comfyui, ...input.providers.comfyui },
      })
    }

    if (input.credentials?.length) {
      const providers = await getAiProviders()
      const workspace = await prisma.workspace.findFirst()
      for (const credential of input.credentials) {
        const target =
          credential.name ||
          Object.values(providers).find((p) => "credentialName" in p)?.credentialName
        if (!target) continue
        const existing = await prisma.credential.findFirst({ where: { name: target } })
        if (existing) {
          await prisma.credential.update({
            where: { id: existing.id },
            data: {
              ...(credential.apiKey ? { apiKey: credential.apiKey } : {}),
              ...(credential.baseUrl ? { baseUrl: credential.baseUrl } : {}),
            },
          })
        } else if (credential.apiKey && workspace) {
          await prisma.credential.create({
            data: {
              workspaceId: workspace.id,
              name: target,
              apiKey: credential.apiKey,
              baseUrl:
                credential.baseUrl ??
                (target === providers.qwen.credentialName
                  ? DEFAULT_PROVIDERS.qwen.baseUrl
                  : DEFAULT_PROVIDERS.deepseek.baseUrl),
            },
          })
        }
      }
    }

    if (input.mode) await setAiMode(input.mode)

    const mode = await getAiMode()
    const providers = await getAiProviders()
    return jsonOk({ mode, providers }, `AI 模式已切换为 ${mode === "live" ? "真实服务" : "Mock"}`)
  },
)

/** POST /api/settings/ai?action=test-comfyui — ComfyUI 连通性测试。 */
export const POST = withErrorHandling(async (req: Request) => {
  await requireUser()
  const action = new URL(req.url).searchParams.get("action")
  if (action !== "test-comfyui") return jsonOk({ ok: false, message: "未知操作" })
  const providers = await getAiProviders()
  const ok = await comfyPing(providers.comfyui.baseUrl)
  return jsonOk({
    ok,
    message: ok
      ? `ComfyUI（${providers.comfyui.baseUrl}）连接正常`
      : `ComfyUI（${providers.comfyui.baseUrl}）不可达：请确认服务已启动且 8118 端口对局域网开放`,
  })
})

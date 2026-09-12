import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/api"
import type { InvokeConfig } from "@/lib/plugins/invoke"

export type GenerationKind = "text" | "image" | "video" | "audio" | "subtitle"

/** Scope must already have been authorized by the calling route/worker. */
export async function resolveGenerationModel(
  id: string,
  kind: GenerationKind,
  workspaceId?: string,
) {
  if (!workspaceId)
    throw new AppError("模型调用缺少工作区，请重新打开项目", 400)
  console.log(`[model-resolver] 解析模型 | id=${id} kind=${kind} ws=${workspaceId.slice(-8)}`)
  const where = { workspaceId, kind, enabled: true }
  const models =
    id === "auto"
      ? await prisma.customModel.findMany({
          where,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: { credential: true },
        })
      : await prisma.customModel.findMany({
          where: { ...where, id },
          include: { credential: true },
        })
  console.log(`[model-resolver] 查询结果 | 找到 ${models.length} 个模型: [${models.map(m => m.name).join(", ")}]`)
  let model =
    models.find(
      (m) => (m.constraints as Record<string, unknown>)?.isDefault === true,
    ) ?? models[0]
  // 指定 ID 查不到时，回退到该 kind 的第一个 enabled 模型（兼容前端传入 mock 模型 ID 的情况）
  if (!model && id !== "auto") {
    console.log(`[model-resolver] 指定模型 "${id}" 未找到，回退到同 kind 第一个 enabled 模型`)
    const fallback = await prisma.customModel.findMany({
      where: { workspaceId, kind, enabled: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { credential: true },
    })
    model = fallback.find(
      (m) => (m.constraints as Record<string, unknown>)?.isDefault === true,
    ) ?? fallback[0]
    if (model) console.log(`[model-resolver] 回退命中 | ${model.name}(${model.id})`)
  }
  if (!model) {
    console.error(`[model-resolver] ✗ 无可用 ${kind} 模型 | ws=${workspaceId.slice(-8)}`)
    throw new AppError(
      `当前工作区未配置启用的 ${kind} 模型，请到插件页配置`,
      400,
    )
  }
  console.log(`[model-resolver] ✓ 选中 | ${model.name}(${model.id}) provider=${(model.constraints as any)?.model_id ?? model.name} baseUrl=${(model.baseUrl || model.credential?.baseUrl || "").slice(0, 40)}`)
  const constraints = (model.constraints ?? {}) as Record<string, unknown>
  // A credential is only reusable within its own workspace.
  if (model.credential && model.credential.workspaceId !== workspaceId)
    throw new AppError("模型凭据不属于当前工作区", 400)
  const config: InvokeConfig = {
    lifecycle: model.lifecycle === "async" ? "async" : "sync",
    baseUrl: model.baseUrl || model.credential?.baseUrl || "",
    apiKey: model.credential?.apiKey ?? model.apiKey,
    auth: model.auth as InvokeConfig["auth"],
    constraints,
    submit: model.submit as unknown as InvokeConfig["submit"],
    edits: model.edits as InvokeConfig["edits"],
    refRegister: model.refRegister as InvokeConfig["refRegister"],
    poll: model.poll as InvokeConfig["poll"],
    firstLast: model.firstLast as InvokeConfig["firstLast"],
    extract: model.extract as Record<string, unknown>,
    transformBody: model.transformBody,
  }
  return {
    id: model.id,
    name: model.name,
    kind,
    providerModel: String(constraints.model_id ?? model.name),
    supportsReferenceImages: Number(constraints.max_references ?? 0) > 0,
    config,
    providerType: model.providerType,
    cost: model.cost,
  }
}

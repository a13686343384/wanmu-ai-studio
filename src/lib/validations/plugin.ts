import { z } from "zod"

/** 自定义模型 CRUD / 配置校验（结构参照备忘录 16 个模板的 JSON）。 */
export const pluginModelSchema = z.object({
  name: z.string().trim().min(1, "请输入模型名称").max(60),
  kind: z.enum(["text", "image", "video", "audio"]),
  lifecycle: z.enum(["sync", "async"]).default("sync"),
  baseUrl: z.string().trim().url("接口地址不合法"),
  apiKey: z.string().max(500).optional(),
  credentialId: z.string().optional(),
  templateKey: z.string().max(60).optional(),
  enabled: z.boolean().optional(),
  auth: z.record(z.unknown()).default({}),
  constraints: z.record(z.unknown()).default({}),
  submit: z.record(z.unknown()).default({}),
  edits: z.record(z.unknown()).nullable().optional(),
  firstLast: z.record(z.unknown()).nullable().optional(),
  refRegister: z.record(z.unknown()).nullable().optional(),
  poll: z.record(z.unknown()).nullable().optional(),
  extract: z.record(z.unknown()).default({}),
  result: z.record(z.unknown()).default({}),
})

export const invokeSchema = z.object({
  prompt: z.string().trim().min(1, "请输入提示词").max(2000),
  refs: z.array(z.string()).max(9).optional(),
  refsB64: z.array(z.string()).max(9).optional(),
  count: z.number().int().min(1).max(4).optional(),
  ratio: z.string().optional(),
  resolution: z.string().optional(),
  duration: z.number().int().min(1).max(60).optional(),
  quality: z.string().optional(),
  upstreamModelId: z.string().optional(),
})

export const credentialSchema = z.object({
  name: z.string().trim().min(1, "请输入凭据名称").max(60),
  baseUrl: z.string().trim().url("接口地址不合法").or(z.literal("")).optional(),
  apiKey: z.string().trim().min(1, "请输入 API Key").max(500),
})

export const credentialUpdateSchema = credentialSchema.extend({
  apiKey: z.string().trim().max(500).optional(),
})

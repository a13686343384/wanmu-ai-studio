/**
 * 幂等写入 live 模式所需配置：
 * - Credential：阿里云 Qwen（token-plan）/ DeepSeek / ComfyUI 本地
 * - SystemSetting.ai_providers 默认值
 *
 * 用法：node scripts/setup-live-ai.mjs
 * 不改变 ai_mode（开关由设置页控制）。
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const CREDENTIALS = [
  {
    name: "阿里云 Qwen（token-plan）",
    baseUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    apiKey: "sk-sp-H.DHREIE.qnO1.MEUCIQDOKNb8lQc9FPvLiOCucBYDBIcgn0eNRXnmTjklm3C03gIgKS4VoZZC3qEHPtApFRzzPudU-VKbRuaAAS23zSWSx0U",
  },
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-9a64f818ac1f42918fa3d6e944f23c53",
  },
]

const PROVIDERS = {
  qwen: {
    baseUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.7-plus",
    credentialName: "阿里云 Qwen（token-plan）",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    credentialName: "DeepSeek",
  },
  comfyui: { baseUrl: "http://192.168.1.12:8118" },
}

async function main() {
  const workspace = await prisma.workspace.findFirst()
  if (!workspace) throw new Error("没有可用工作区，请先运行种子数据")

  for (const credential of CREDENTIALS) {
    const existing = await prisma.credential.findFirst({
      where: { workspaceId: workspace.id, name: credential.name },
    })
    if (existing) {
      await prisma.credential.update({
        where: { id: existing.id },
        data: { baseUrl: credential.baseUrl, apiKey: credential.apiKey },
      })
      console.log(`凭据已更新：${credential.name}`)
    } else {
      await prisma.credential.create({
        data: { workspaceId: workspace.id, ...credential },
      })
      console.log(`凭据已创建：${credential.name}`)
    }
  }

  await prisma.systemSetting.upsert({
    where: { key: "ai_providers" },
    create: { key: "ai_providers", value: PROVIDERS },
    update: { value: PROVIDERS },
  })
  console.log("ai_providers 默认值已写入")

  const mode = await prisma.systemSetting.findUnique({ where: { key: "ai_mode" } })
  console.log(`当前 ai_mode：${mode?.value ?? "mock（默认）"}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

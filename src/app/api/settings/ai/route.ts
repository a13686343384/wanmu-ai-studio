import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { getAiMode, setAiMode } from "@/lib/settings"
import { z } from "zod"

/** GET /api/settings/ai — 当前 AI 模式。 */
export const GET = withErrorHandling(async () => {
  await requireUser()
  const mode = await getAiMode()
  return jsonOk({ mode })
})

const patchSchema = z.object({
  mode: z.enum(["mock", "live"]).optional(),
})

/** PATCH /api/settings/ai — 切换 MOCK 开关（仅管理员）。 */
export const PATCH = withErrorHandling(async (req: Request) => {
  await requireUser()
  const input = patchSchema.parse(await req.json())

  if (input.mode) await setAiMode(input.mode)

  const mode = await getAiMode()
  return jsonOk({ mode }, `AI 模式已切换为 ${mode === "live" ? "真实服务" : "Mock"}`)
})

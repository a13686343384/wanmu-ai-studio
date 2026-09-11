import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { saveStoryboardRefs } from "@/lib/storyboards/references-server"
import { refsPatchSchema } from "@/lib/storyboards/references"
import { z } from "zod"
export const PATCH = withErrorHandling(
  async (
    req: Request,
    { params }: { params: { id: string; segmentId: string } },
  ) => {
    const user = await requireUser()
    const { patches } = z
      .object({ patches: refsPatchSchema.array().min(1).max(200) })
      .parse(await req.json())
    return jsonOk(
      await saveStoryboardRefs(user.id, patches, {
        scriptId: params.id,
        segmentId: params.segmentId,
      }),
      "镜组引用已保存",
    )
  },
)

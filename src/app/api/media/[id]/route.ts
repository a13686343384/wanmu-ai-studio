import { prisma } from "@/lib/prisma"
import { AppError, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const file = await prisma.mediaFile.findFirst({
      where: {
        id: params.id,
        workspace: { members: { some: { userId: user.id } } },
      },
    })
    if (!file) throw new AppError("素材不存在或无权访问", 404)
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "content-type": file.mimeType,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    })
  },
)

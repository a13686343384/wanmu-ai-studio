import { z } from "zod"
import { AppError, jsonOk, withErrorHandling } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/session"
import { requireWritingProject } from "@/lib/writing/access"
import { readWritingDocument } from "@/lib/writing/types"
import { writingActionSchema } from "@/lib/writing/validation"
import { getAIService } from "@/services/ai"
import type { Prisma } from "@prisma/client"
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const project = await requireWritingProject(params.id, user.id)
    return jsonOk({
      ...project,
      document: readWritingDocument(project.document),
    })
  },
)
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const project = await requireWritingProject(params.id, user.id)
    await prisma.writingProject.delete({ where: { id: project.id } })
    return jsonOk({ id: project.id })
  },
)
const renameSchema = z.object({ title: z.string().trim().min(1, "请输入剧名").max(60) })

/** PATCH /api/writing-projects/[id] — 重命名剧本 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const project = await requireWritingProject(params.id, user.id)
    const { title } = renameSchema.parse(await req.json())
    const updated = await prisma.writingProject.update({
      where: { id: project.id },
      data: { title },
      select: { id: true, title: true },
    })
    return jsonOk(updated, "已重命名")
  },
)
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const project = await requireWritingProject(params.id, user.id)
    const input = writingActionSchema.parse(await req.json())
    if (input.revision !== project.revision)
      throw new AppError("剧本已有更新，请刷新后重试", 409)
    const doc = readWritingDocument(project.document)
    const snapshot = {
      blueprint: doc.blueprint,
      characters: doc.characters,
      episodes: doc.episodes,
    }
    let cost = 0
    let importedScriptId = project.importedScriptId
    if (input.action === "save") {
      if (
        input.content === undefined ||
        !doc.episodes.some((item) => item.number === input.episodeNumber)
      )
        throw new AppError("请选择需要保存的分集")
      doc.episodes = doc.episodes.map((item) =>
        item.number === input.episodeNumber
          ? { ...item, content: input.content! }
          : item,
      )
    } else if (input.action === "restore") {
      const old = doc.history.find((item) => item.id === input.historyId)
      if (!old) throw new AppError("历史版本不存在", 404)
      doc.blueprint = old.blueprint
      doc.characters = old.characters
      doc.episodes = old.episodes
    } else if (input.action !== "import") {
      if (
        input.action === "episode" &&
        !doc.episodes.some((item) => item.number === input.episodeNumber)
      )
        throw new AppError("请先生成蓝图并选择分集")
      if (input.action === "chat" && !input.instruction)
        throw new AppError("请输入调整要求")
      const result = await getAIService().writeScript({
        ...project,
        ...snapshot,
        model: input.model,
        episodeNumber:
          input.action === "episode" ? input.episodeNumber : undefined,
        instruction: input.instruction,
      })
      cost = result.usage.tapies
      doc.blueprint = result.data.blueprint
      doc.characters = result.data.characters
      doc.episodes = result.data.episodes
      doc.messages = [
        ...doc.messages,
        {
          role: "user" as const,
          text:
            input.instruction ??
            (input.action === "episode"
              ? `生成第${input.episodeNumber}集正文`
              : "生成项目蓝图"),
        },
        { role: "assistant" as const, text: result.data.reply },
      ].slice(-60)
    }
    if (
      input.action !== "import" &&
      (snapshot.blueprint || snapshot.episodes.length)
    )
      doc.history = [
        {
          ...snapshot,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          label:
            input.action === "restore"
              ? "恢复前版本"
              : input.action === "save"
                ? "正文编辑前"
                : "生成前版本",
        },
        ...doc.history,
      ].slice(0, 20)
    const updated = await prisma.$transaction(async (tx) => {
      // 版本 CAS 与扣费在同一事务中，冲突/余额不足时所有写入回滚。
      const lock = await tx.writingProject.updateMany({
        where: { id: project.id, revision: input.revision },
        data: { revision: { increment: 1 } },
      })
      if (!lock.count) throw new AppError("剧本已有更新，请刷新后重试", 409)
      if (cost) {
        const charged = await tx.user.updateMany({
          where: { id: user.id, tapies: { gte: cost } },
          data: { tapies: { decrement: cost } },
        })
        if (!charged.count) throw new AppError("积分不足", 402)
      }
      if (input.action === "import") {
        const episodes = doc.episodes.filter((item) => item.content.trim())
        if (!episodes.length) throw new AppError("请先生成至少一集正文")
        if (
          importedScriptId &&
          !(await tx.script.findUnique({ where: { id: importedScriptId } }))
        )
          importedScriptId = null
        if (!importedScriptId) {
          const script = await tx.script.create({
            data: {
              workspaceId: project.workspaceId,
              creatorId: user.id,
              title: project.title,
              genre: project.genre,
              content: episodes.map((item) => item.content).join("\n\n---\n\n"),
              synopsis: project.idea,
              totalEpisodes: episodes.length,
              episodeDuration: project.episodeDuration,
              status: "outlining",
              processingStatus: "completed",
              progress: 100,
              progressLabel: "剧本创作导入完成",
              textModel: input.model,
              episodes: {
                create: episodes.map((item) => ({
                  number: item.number,
                  title: item.title,
                  summary: item.summary,
                  content: item.content,
                  duration: project.episodeDuration,
                  status: "outlined",
                })),
              },
              characters: {
                create: doc.characters.map((item) => ({
                  name: item.name,
                  description: item.description,
                })),
              },
            },
          })
          importedScriptId = script.id
        }
      }
      return tx.writingProject.update({
        where: { id: project.id },
        data: {
          document: doc as unknown as Prisma.InputJsonValue,
          importedScriptId,
        },
      })
    })
    return jsonOk({ ...updated, document: doc, cost })
  },
)

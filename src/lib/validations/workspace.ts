import { z } from "zod"

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "团队名称至少 2 个字符")
    .max(24, "团队名称最多 24 个字符"),
  description: z.string().trim().max(120, "团队简介最多 120 个字符").optional().or(z.literal("")),
})

export const joinTeamSchema = z.object({
  teamId: z
    .string()
    .trim()
    .length(32, "Team ID 必须为 32 位字符串")
    .regex(/^[A-Za-z0-9]+$/, "Team ID 只能包含字母和数字"),
  message: z.string().trim().max(120, "申请留言最多 120 个字符").optional().or(z.literal("")),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type JoinTeamInput = z.infer<typeof joinTeamSchema>

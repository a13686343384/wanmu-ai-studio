import { z } from "zod"

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "请输入项目名称").max(60, "名称最多 60 字"),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  folder: z.string().trim().max(40).optional().or(z.literal("")),
  workspaceId: z.string().optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(60).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  folder: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
  coverImage: z.string().nullable().optional(),
})

export const moveProjectSchema = z.object({
  targetWorkspaceId: z.string().min(1, "请选择目标工作区"),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "请输入邮箱").email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, "昵称至少 2 个字符").max(24, "昵称最多 24 个字符"),
    email: z.string().min(1, "请输入邮箱").email("邮箱格式不正确"),
    password: z
      .string()
      .min(8, "密码至少 8 位")
      .max(72, "密码最多 72 位")
      .regex(/[a-zA-Z]/, "密码需包含字母")
      .regex(/[0-9]/, "密码需包含数字"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

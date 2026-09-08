import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/auth"

/**
 * POST /api/auth/register
 * 注册新用户，并自动创建其个人工作区。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数校验失败", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { name, email, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // 先建用户，再建个人工作区（工作区成员需要 userId，无法在同一次嵌套写入中完成）
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true },
    })

    await prisma.workspace.create({
      data: {
        name: `${name} 的工作区`,
        isPersonal: true,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "owner" } },
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    console.error("[register] 注册失败:", error)
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 })
  }
}

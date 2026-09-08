import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

/**
 * NextAuth 配置。
 * - 采用 JWT 会话策略，便于在中间件中做轻量校验
 * - 凭据登录：邮箱 + 密码（bcrypt 校验）
 * - 会话中附带 userId / tapies / membership，避免每页重复查询
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "you@example.com" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })
        if (!user?.password) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // 登录时补齐积分/会员信息
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tapies: true, membership: true },
        })
        token.tapies = dbUser?.tapies ?? 0
        token.membership = dbUser?.membership ?? "free"
      }
      // 前端调用 session.update() 时刷新积分
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tapies: true, membership: true },
        })
        token.tapies = dbUser?.tapies ?? token.tapies
        token.membership = dbUser?.membership ?? token.membership
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.tapies = (token.tapies as number) ?? 0
        session.user.membership = (token.membership as string) ?? "free"
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

import type { DefaultSession } from "next-auth"

/** 扩展 NextAuth 会话与 JWT 的类型，附带业务字段。 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      tapies: number
      membership: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    tapies?: number
    membership?: string
  }
}

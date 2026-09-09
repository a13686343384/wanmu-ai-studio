import { withAuth } from "next-auth/middleware"

/**
 * 路由守卫：除登录/注册/认证接口外的页面均需登录。
 * 使用 NextAuth 的 JWT 校验，无需访问数据库。
 */
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
})

export const config = {
  matcher: [
    /*
     * 匹配除以下路径外的所有请求：
     * - /login, /register（认证页）
     * - /api/auth/*（NextAuth 接口）
     * - Next.js 静态资源
     */
    "/((?!login|register|api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}

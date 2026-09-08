# 万幕生 (Manvo TV) AI影视创作平台 — 详细执行计划

> **面向 Agent 执行者：** 必需子技能：使用 superpower-subagent-driven-development（推荐）或 superpower-executing-plans 按任务逐项执行本计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 构建完整的万幕生AI影视创作平台，包含首页/工作台、画布编辑器、创作中心（影视工厂）三大核心模块的全栈实现。

**架构：** Next.js 14 App Router + PostgreSQL/Prisma + NextAuth.js + React Flow + shadcn/ui。AI服务采用抽象接口层+Mock优先策略，全栈TypeScript严格模式。

**技术栈：** TypeScript, Next.js 14, React 18, Tailwind CSS, shadcn/ui, React Flow (@xyflow/react), Prisma, PostgreSQL, NextAuth.js, Zustand, React Hook Form, Zod, Lucide React, Framer Motion

**规格：** `docs/superpowers/specs/2025-09-08-wanmusheng-platform-design.md`

## 全局约束

- Node.js >= 20, TypeScript strict mode
- Next.js 14 App Router, 不使用Pages Router
- Tailwind CSS v3, 不使用CSS Modules
- shadcn/ui组件按需安装, 不fork源码
- React Flow v11, 使用@xyflow/react包
- Prisma schema同步迁移, 不使用db push生产
- 所有API返回统一格式 `{ data?, error?, message? }`
- 错误处理使用自定义AppError类
- 组件文件PascalCase, 工具文件camelCase
- 测试文件 `*.test.ts` / `*.test.tsx` 与源文件同目录
- Git提交遵循Conventional Commits规范
- 深色模式only, 不支持亮色切换

---

## 📅 总体时间线概览

| 阶段 | 周次 | 天数 | 核心交付物 |
|------|------|------|-----------|
| **Phase 0: 项目初始化** | Week 1 | Day 1-2 | 项目脚手架、数据库、认证系统 |
| **Phase 1: 全局框架+首页** | Week 1 | Day 3-5 | NavBar、布局、首页/工作台完整UI+功能 |
| **Phase 2: 画布基础** | Week 2 | Day 6-10 | 画布项目管理、React Flow编辑器、团队系统 |
| **Phase 3: 影视工厂-建档** | Week 3 | Day 11-15 | INTAKE流程、AI分析、审阅创建、剧本详情 |
| **Phase 4: 影视工厂-资产** | Week 4 | Day 16-18 | 角色/场景/道具提取与生成 |
| **Phase 5: 影视工厂-分镜** | Week 4 | Day 19-22 | 拆分镜、分镜编辑、图片生成 |
| **Phase 6: 影视工厂-视频后期** | Week 5 | Day 23-26 | 视频生成、音频/BGM、后期合成 |
| **Phase 7: 集成测试与优化** | Week 6 | Day 27-30 | E2E测试、性能优化、UI打磨、文档 |

---

## Phase 0: 项目初始化 (Week 1, Day 1-2)

### 任务 1：Next.js项目初始化与基础配置

**文件：**
- 新建：`package.json`, `tsconfig.json`, `next.config.mjs`, `.env.local`, `.gitignore`
- 新建：`tailwind.config.ts`, `postcss.config.js`, `src/styles/globals.css`
- 新建：`src/lib/utils.ts`, `src/lib/constants.ts`

**接口：**
- 对外产出：可运行的Next.js空项目，Tailwind CSS已配置，深色主题就绪

- [ ] **步骤 1：创建Next.js项目**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **步骤 2：安装核心依赖**

```bash
npm install @xyflow/react zustand react-hook-form @hookform/resolvers zod lucide-react framer-motion clsx tailwind-merge class-variance-authority
npm install -D @types/node prisma @prisma/client next-auth @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **步骤 3：初始化shadcn/ui**

```bash
npx shadcn@latest init
# 选择: New York style, Zinc base color, CSS variables yes
```

- [ ] **步骤 4：安装常用shadcn组件**

```bash
npx shadcn@latest add button input textarea select dialog dropdown-menu tabs card badge avatar separator tooltip scroll-area sheet popover command label checkbox radio-group switch slider progress toast sonner alert skeleton
```

- [ ] **步骤 5：配置Tailwind深色主题**

修改 `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#f97316", // orange-500
          hover: "#ea580c",   // orange-600
          light: "#fb923c",   // orange-400
        },
      },
    },
  },
  plugins: [],
}
export default config
```

修改 `src/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 24 95% 53%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 24 95% 53%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **步骤 6：创建工具函数**

`src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("zh-CN").format(num)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function relativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "刚刚"
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 30) return `${diffDay}天前`
  return formatDate(date)
}
```

`src/lib/constants.ts`:
```typescript
export const APP_NAME = "Manvo TV"
export const APP_NAME_CN = "万幕生"

export const NAV_ITEMS = [
  { label: "工作台", href: "/", icon: "Home" },
  { label: "画布", href: "/canvas", icon: "LayoutGrid" },
  { label: "创作中心", href: "/creation", icon: "Sparkles", hasDropdown: true },
  { label: "插件", href: "/plugins", icon: "Puzzle" },
  { label: "联系我们", href: "/contact", icon: "MessageSquare" },
] as const

export const CREATION_CENTER_ITEMS = [
  { label: "剧本工厂", href: "/creation/script-factory", icon: "FolderOpen", badge: "new" },
  { label: "影视工厂", href: "/creation/film-factory", icon: "Film" },
  { label: "剧本创作", href: "/creation/script-writing", icon: "PenTool" },
  { label: "电商设计室", href: "/creation/ecommerce", icon: "ShoppingBag" },
] as const

export const WORK_TYPES = [
  { value: "vertical_short", label: "竖屏短剧" },
  { value: "horizontal_short", label: "横屏短剧" },
  { value: "micro_film", label: "微电影" },
  { value: "anime", label: "动漫" },
] as const

export const SERIES_TYPES = [
  { value: "limited", label: "限定剧", description: "固定集数，拍完即完结" },
  { value: "serial", label: "连载剧", description: "可持续更新" },
] as const

export const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 竖屏" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "1:1", label: "1:1 方屏" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
] as const

export const AI_MODELS = [
  { id: "ovlm-6", name: "OVLM 6", cost: 5, tier: "premium" },
  { id: "ovlm-5.6", name: "OVLM 5.6", cost: 3, tier: "premium" },
  { id: "gvlm-3.1-pro", name: "GVLM 3.1 Pro", cost: 3, tier: "premium" },
] as const

export const IMAGE_MODELS = [
  { id: "all-in-one", name: "全能图片", cost: 14, tier: "built-in" },
  { id: "all-in-one-low", name: "全能图片 (低画质)", cost: 2, tier: "built-in" },
  { id: "seedream-5.0-pro", name: "Seedream 5.0 Pro", cost: 4, tier: "built-in" },
  { id: "man-image-pro", name: "Man Image Pro", cost: 20, tier: "built-in" },
  { id: "man-image-v2", name: "Man Image V2", cost: 10, tier: "built-in" },
  { id: "man-image-v2-lite", name: "Man Image V2 Lite", cost: 2, tier: "built-in" },
] as const

export const VIDEO_MODELS = [
  { id: "seedance-2.0", name: "Seedance 2.0 (HuoShan)", cost: 50, tier: "built-in" },
] as const

export const AUDIO_MODELS = [
  { id: "mv-audio-5.5", name: "MV Audio 5.5", cost: 50, tier: "built-in" },
] as const

export const SCRIPT_STATUS = {
  INTAKE: "intake",
  OUTLINING: "outlining",
  ASSETS: "assets",
  STORYBOARDING: "storyboarding",
  VIDEO: "video",
  POST_PRODUCTION: "post_production",
  COMPLETED: "completed",
} as const

export const PROCESSING_STATUS = {
  IDLE: "idle",
  PROCESSING: "processing",
  COMPLETED: "completed",
  ERROR: "error",
} as const
```

- [ ] **步骤 7：验证项目启动**

运行：`npm run dev`
预期：访问 http://localhost:3000 看到Next.js默认页面，深色背景生效

- [ ] **步骤 8：提交**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Tailwind CSS and shadcn/ui"
```

---

### 任务 2：Prisma数据库配置与Schema定义

**文件：**
- 新建：`prisma/schema.prisma`
- 新建：`src/lib/prisma.ts`
- 新建：`.env.local` (追加DATABASE_URL)

**接口：**
- 依赖输入：任务1的Next.js项目
- 对外产出：Prisma客户端单例、完整数据模型、数据库迁移就绪

- [ ] **步骤 1：初始化Prisma**

```bash
npx prisma init
```

- [ ] **步骤 2：编写完整Schema**

将规格文档第3节的完整Prisma Schema写入 `prisma/schema.prisma`，包含User、Workspace、WorkspaceMember、Project、Canvas、Script、Episode、Character、Costume、Scene、Prop、Storyboard、Consultation全部模型。

添加NextAuth所需模型：
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

- [ ] **步骤 3：创建Prisma客户端单例**

`src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **步骤 4：配置环境变量**

`.env.local` 追加：
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/wanmusheng?schema=public"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **步骤 5：运行迁移**

```bash
npx prisma migrate dev --name init
```

预期：迁移成功，生成Prisma Client

- [ ] **步骤 6：提交**

```bash
git add -A
git commit -m "feat: add Prisma schema with all domain models and NextAuth tables"
```

---

### 任务 3：NextAuth.js认证系统集成

**文件：**
- 新建：`src/lib/auth.ts`
- 新建：`src/app/api/auth/[...nextauth]/route.ts`
- 新建：`src/app/(auth)/login/page.tsx`
- 新建：`src/app/(auth)/register/page.tsx`
- 新建：`src/app/(auth)/layout.tsx`
- 新建：`src/stores/useAuthStore.ts`

**接口：**
- 依赖输入：任务2的Prisma配置
- 对外产出：邮箱/密码登录注册、会话管理、认证守卫

- [ ] **步骤 1：配置NextAuth**

`src/lib/auth.ts`:
```typescript
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user?.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}
```

- [ ] **步骤 2：创建API Route**

`src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **步骤 3：创建登录页面**

`src/app/(auth)/login/page.tsx` — 深色主题登录表单，邮箱+密码输入，登录按钮(orange-500)，底部注册链接。使用React Hook Form + Zod验证。

- [ ] **步骤 4：创建注册页面**

`src/app/(auth)/register/page.tsx` — 深色主题注册表单，用户名+邮箱+密码+确认密码，注册后自动登录跳转首页。

- [ ] **步骤 5：创建Auth Layout**

`src/app/(auth)/layout.tsx` — 居中布局，无NavBar，深色全屏背景。

- [ ] **步骤 6：创建Auth Store**

`src/stores/useAuthStore.ts`:
```typescript
import { create } from "zustand"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  userName: string | null
  userEmail: string | null
  tapies: number
  membership: string
  setAuth: (data: Partial<AuthState>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  userName: null,
  userEmail: null,
  tapies: 0,
  membership: "free",
  setAuth: (data) => set((state) => ({ ...state, ...data })),
  logout: () => set({
    isAuthenticated: false,
    userId: null,
    userName: null,
    userEmail: null,
    tapies: 0,
    membership: "free",
  }),
}))
```

- [ ] **步骤 7：创建注册API**

`src/app/api/auth/register/route.ts`:
```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码为必填项" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    })

    return NextResponse.json({ data: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    return NextResponse.json({ error: "注册失败" }, { status: 500 })
  }
}
```

- [ ] **步骤 8：验证认证流程**

运行：`npm run dev` → 访问 /login → 注册新用户 → 登录 → 验证session

- [ ] **步骤 9：提交**

```bash
git add -A
git commit -m "feat: implement NextAuth.js authentication with credentials provider"
```

---

## Phase 1: 全局框架 + 首页 (Week 1, Day 3-5)

### 任务 4：全局布局与NavBar组件

**文件：**
- 新建：`src/components/layout/NavBar.tsx`
- 新建：`src/components/layout/ThemeProvider.tsx`
- 新建：`src/app/(dashboard)/layout.tsx`
- 新建：`src/components/layout/UserMenu.tsx`
- 新建：`src/components/layout/CreationCenterDropdown.tsx`

**接口：**
- 依赖输入：任务3的认证系统
- 对外产出：全局导航栏、用户菜单、创作中心下拉菜单、Dashboard布局

- [ ] **步骤 1：创建ThemeProvider**

`src/components/layout/ThemeProvider.tsx` — 强制深色模式的wrapper，设置`class="dark"`在html元素上。

- [ ] **步骤 2：创建NavBar**

`src/components/layout/NavBar.tsx` — 按照规格4.1节实现完整导航栏：
- Logo区 (橙色渐变图标 + "Manvo TV")
- 导航菜单 (5项，当前激活高亮)
- 创作中心下拉菜单 (4个子项，带图标和描述)
- 右侧用户区 (工作区选择器/积分/会员升级/帮助/通知/头像)
- 响应式适配

- [ ] **步骤 3：创建UserMenu**

`src/components/layout/UserMenu.tsx` — 用户头像下拉菜单，显示个人信息、工作区切换、退出登录。

- [ ] **步骤 4：创建CreationCenterDropdown**

`src/components/layout/CreationCenterDropdown.tsx` — 创作中心下拉菜单组件，4个子项带图标、描述和新标记。

- [ ] **步骤 5：创建Dashboard Layout**

`src/app/(dashboard)/layout.tsx` — 包含NavBar + SessionProvider + Toaster的主布局，未登录重定向到/login。

- [ ] **步骤 6：验证布局**

访问任意dashboard页面，确认NavBar渲染正确、导航跳转正常、下拉菜单交互流畅。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement global layout with NavBar and creation center dropdown"
```

---

### 任务 5：首页/工作台 — AI生成输入区

**文件：**
- 新建：`src/app/(dashboard)/page.tsx`
- 新建：`src/components/workbench/GenerationInput.tsx`
- 新建：`src/components/workbench/ModelSelector.tsx`
- 新建：`src/components/workbench/ReferenceUpload.tsx`
- 新建：`src/components/workbench/ParameterBar.tsx`

**接口：**
- 依赖输入：任务4的全局布局
- 对外产出：完整的AI生成输入区，支持媒体类型切换、模型选择、参数配置

- [ ] **步骤 1：创建首页骨架**

`src/app/(dashboard)/page.tsx` — 欢迎语 + GenerationInput + FeaturedGallery三段式布局。

- [ ] **步骤 2：创建ReferenceUpload组件**

`src/components/workbench/ReferenceUpload.tsx` — 虚线边框上传区，支持拖拽上传、点击选择、@引用弹出列表。

- [ ] **步骤 3：创建ModelSelector组件**

`src/components/workbench/ModelSelector.tsx` — 模型选择下拉菜单，显示模型名+积分消耗+内置标签+选中状态。根据媒体类型(视频/图片/音频)切换不同模型列表。

- [ ] **步骤 4：创建ParameterBar组件**

`src/components/workbench/ParameterBar.tsx` — 参数控制栏：比例/分辨率/时长/数量/风格选择器，积分显示，生成按钮。

- [ ] **步骤 5：组装GenerationInput**

`src/components/workbench/GenerationInput.tsx` — 组合ReferenceUpload + ModelSelector + ParameterBar，管理整体状态。

- [ ] **步骤 6：验证交互**

测试媒体类型切换、模型选择、参数调整、@引用功能的交互效果。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement workbench generation input with model selector and parameters"
```

---

### 任务 6：首页/工作台 — 精选作品画廊

**文件：**
- 新建：`src/components/workbench/FeaturedGallery.tsx`
- 新建：`src/components/workbench/WorkCard.tsx`
- 新建：`src/lib/mock-data/featured-works.ts`

**接口：**
- 依赖输入：任务5的首页骨架
- 对外产出：横向滚动的精选作品展示区，卡片hover效果

- [ ] **步骤 1：创建Mock数据**

`src/lib/mock-data/featured-works.ts` — 9个精选作品数据，包含标题、描述、类型标签、缩略图URL。

- [ ] **步骤 2：创建WorkCard组件**

`src/components/workbench/WorkCard.tsx` — 作品卡片：缩略图(320x480)+类型标签+标题+描述+播放按钮。Hover缩放+阴影效果。

- [ ] **步骤 3：创建FeaturedGallery组件**

`src/components/workbench/FeaturedGallery.tsx` — 标题区("让作品，成为最有力的表达") + 横向滚动卡片列表 + 作品计数。

- [ ] **步骤 4：集成到首页**

将FeaturedGallery添加到首页page.tsx底部。

- [ ] **步骤 5：验证视觉效果**

确认卡片样式、滚动交互、hover效果符合设计稿。

- [ ] **步骤 6：提交**

```bash
git add -A
git commit -m "feat: implement featured works gallery with horizontal scroll cards"
```

---

### 任务 7：首页API — AI生成代理接口

**文件：**
- 新建：`src/app/api/ai/generate/route.ts`
- 新建：`src/services/ai/types.ts`
- 新建：`src/services/ai/mock-ai.service.ts`
- 新建：`src/services/ai/ai.service.ts`

**接口：**
- 依赖输入：任务5的GenerationInput组件
- 对外产出：AI服务抽象层、Mock实现、生成API端点

- [ ] **步骤 1：定义AI服务接口**

`src/services/ai/types.ts` — 按照规格第5节定义完整的AIService接口和所有Input/Result类型。

- [ ] **步骤 2：实现Mock AI服务**

`src/services/ai/mock-ai.service.ts` — 所有方法返回预设合理数据，模拟500-3000ms延迟。

- [ ] **步骤 3：创建AI服务工厂**

`src/services/ai/ai.service.ts` — 根据环境变量`NEXT_PUBLIC_AI_MODE`返回Mock或真实实现。

- [ ] **步骤 4：创建生成API**

`src/app/api/ai/generate/route.ts` — POST端点，接收生成请求，调用AI服务，返回结果。

- [ ] **步骤 5：前端对接**

在GenerationInput中调用生成API，显示loading状态和结果预览。

- [ ] **步骤 6：提交**

```bash
git add -A
git commit -m "feat: implement AI service abstraction layer with mock implementation"
```

---

## Phase 2: 画布基础 (Week 2, Day 6-10)

### 任务 8：画布项目管理页面

**文件：**
- 新建：`src/app/(dashboard)/canvas/page.tsx`
- 新建：`src/components/canvas/ProjectGrid.tsx`
- 新建：`src/components/canvas/ProjectCard.tsx`
- 新建：`src/components/canvas/CreateTeamDialog.tsx`
- 新建：`src/components/canvas/JoinTeamDialog.tsx`
- 新建：`src/components/canvas/ProjectContextMenu.tsx`
- 新建：`src/app/api/projects/route.ts`
- 新建：`src/app/api/projects/[id]/route.ts`

**接口：**
- 依赖输入：任务4的全局布局
- 对外产出：画布项目列表页，支持个人/团队Tab、搜索筛选、CRUD操作、团队管理弹窗

- [ ] **步骤 1：创建项目API**

实现GET/POST `/api/projects` 和 GET/PATCH/DELETE `/api/projects/[id]`，包含权限校验。

- [ ] **步骤 2：创建ProjectCard组件**

缩略图+标题+编辑时间+项目数+右键菜单触发器。

- [ ] **步骤 3：创建ProjectContextMenu组件**

打开/重命名/选择/移动至/分享链接/转移工作区/删除(红色)。

- [ ] **步骤 4：创建ProjectGrid组件**

网格/列表视图切换、搜索、筛选(全部/文件夹/项目)、排序(最近修改/创建日期)。

- [ ] **步骤 5：创建CreateTeamDialog**

团队名称输入 + 说明文字 + 取消/创建按钮。

- [ ] **步骤 6：创建JoinTeamDialog**

32位Team ID输入 + 申请留言(可选) + 取消/提交申请按钮。

- [ ] **步骤 7：组装画布首页**

Tab切换(个人/团队项目) + ProjectGrid + 新建项目按钮 + 团队管理入口。

- [ ] **步骤 8：验证完整交互**

测试项目CRUD、搜索筛选、团队弹窗、右键菜单。

- [ ] **步骤 9：提交**

```bash
git add -A
git commit -m "feat: implement canvas project management with CRUD and team dialogs"
```

---

### 任务 9：React Flow画布编辑器

**文件：**
- 新建：`src/app/(dashboard)/canvas/[projectId]/page.tsx`
- 新建：`src/components/canvas/CanvasEditor.tsx`
- 新建：`src/components/canvas/nodes/TextNode.tsx`
- 新建：`src/components/canvas/nodes/ImageNode.tsx`
- 新建：`src/components/canvas/nodes/VideoNode.tsx`
- 新建：`src/components/canvas/nodes/AudioNode.tsx`
- 新建：`src/components/canvas/nodes/AINode.tsx`
- 新建：`src/components/canvas/nodes/ScriptNode.tsx`
- 新建：`src/components/canvas/nodes/StoryboardNode.tsx`
- 新建：`src/components/canvas/edges/AnimatedEdge.tsx`
- 新建：`src/components/canvas/panels/NodePanel.tsx`
- 新建：`src/components/canvas/panels/PropertiesPanel.tsx`
- 新建：`src/components/canvas/CanvasToolbar.tsx`
- 新建：`src/stores/useCanvasStore.ts`
- 新建：`src/app/api/canvas/[projectId]/route.ts`

**接口：**
- 依赖输入：任务8的项目管理
- 对外产出：完整的React Flow节点编辑器，支持7种节点类型、自定义边、工具栏、属性面板

- [ ] **步骤 1：创建Canvas Store**

`src/stores/useCanvasStore.ts` — Zustand store管理nodes/edges/viewport/selectedNode等状态。

- [ ] **步骤 2：创建Canvas API**

GET/PUT `/api/canvas/[projectId]` — 读写画布JSON数据。

- [ ] **步骤 3：创建自定义节点组件**

每种节点类型独立组件，统一的handle样式、选中高亮、深色主题。
- TextNode: 文本输入/展示，可编辑
- ImageNode: 图片预览，支持上传/AI生成
- VideoNode: 视频预览播放器
- AudioNode: 音频波形+播放控制
- AINode: 模型选择+参数配置+生成按钮
- ScriptNode: 剧本内容展示/编辑
- StoryboardNode: 分镜缩略图+镜头信息

- [ ] **步骤 4：创建自定义边**

AnimatedEdge: 带流动动画的贝塞尔曲线边。

- [ ] **步骤 5：创建工具栏**

CanvasToolbar: 缩放/适应/撤销/重做/添加节点面板切换。

- [ ] **步骤 6：创建侧边面板**

NodePanel: 节点库，拖拽添加。
PropertiesPanel: 选中节点的属性编辑表单。

- [ ] **步骤 7：组装CanvasEditor**

React Flow容器 + 工具栏 + 侧边面板 + 自动保存。

- [ ] **步骤 8：集成到项目详情页**

`src/app/(dashboard)/canvas/[projectId]/page.tsx` — 加载画布数据，渲染编辑器。

- [ ] **步骤 9：验证编辑器功能**

测试节点拖拽、连线、缩放、平移、属性编辑、自动保存。

- [ ] **步骤 10：提交**

```bash
git add -A
git commit -m "feat: implement React Flow canvas editor with custom nodes and panels"
```

---

## Phase 3: 影视工厂 — 建档流程 (Week 3, Day 11-15)

### 任务 10：影视工厂首页

**文件：**
- 新建：`src/app/(dashboard)/creation/film-factory/page.tsx`
- 新建：`src/components/creation/film-factory/FactoryHeader.tsx`
- 新建：`src/components/creation/film-factory/ScriptList.tsx`
- 新建：`src/components/creation/film-factory/ScriptCard.tsx`
- 新建：`src/components/creation/film-factory/StatusBadge.tsx`
- 新建：`src/app/api/scripts/route.ts`

**接口：**
- 依赖输入：任务4的全局布局
- 对外产出：影视工厂首页，状态统计、项目卡片列表、分组展示

- [ ] **步骤 1：创建剧本列表API**

GET/POST `/api/scripts` — 获取剧本列表(支持状态筛选)、创建新剧本。

- [ ] **步骤 2：创建StatusBadge组件**

根据状态显示不同颜色：处理中(橙)/大纲就绪(蓝)/已完成(绿)。

- [ ] **步骤 3：创建ScriptCard组件**

黄色虚线边框(制作中)/蓝色虚线边框(待推进)，显示标题/状态/类型/简介/进度条/集数/时长。

- [ ] **步骤 4：创建FactoryHeader**

"CINEMA FLOOR · 影视制片"标题 + 流程说明 + 状态统计(在产/就绪/已完成/总计)。

- [ ] **步骤 5：创建ScriptList**

搜索框 + 排序 + 任务队列 + 停止全部 + 新建剧本按钮 + 分组标签(制作中/待推进) + ScriptCard列表。

- [ ] **步骤 6：组装影视工厂首页**

FactoryHeader + ScriptList，加载数据并渲染。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement film factory homepage with script list and status tracking"
```

---

### 任务 11：新建剧本 (INTAKE) 页面

**文件：**
- 新建：`src/app/(dashboard)/creation/film-factory/new/page.tsx`
- 新建：`src/components/creation/film-factory/intake/IntakeForm.tsx`
- 新建：`src/components/creation/film-factory/intake/ScriptMaterialPanel.tsx`
- 新建：`src/components/creation/film-factory/intake/ConfigPanel.tsx`
- 新建：`src/components/creation/film-factory/intake/WorkTypeSelector.tsx`
- 新建：`src/components/creation/film-factory/intake/ModelSelector.tsx`
- 新建：`src/components/creation/film-factory/intake/ProcessingModeSelector.tsx`

**接口：**
- 依赖输入：任务10的影视工厂首页
- 对外产出：完整的INTAKE表单，左侧剧本原料+右侧参数配置

- [ ] **步骤 1：创建ScriptMaterialPanel**

剧本标题输入 + 剧本内容大文本框(支持分集标记提示) + 蓝色提示框。

- [ ] **步骤 2：创建WorkTypeSelector**

竖屏短剧/横屏短剧/微电影/动漫按钮组。

- [ ] **步骤 3：创建ModelSelector (INTAKE版)**

AI模型选择：OVLM 6/OVLM 5.6/GVLM 3.1 Pro，带积分消耗和皇冠图标。

- [ ] **步骤 4：创建ProcessingModeSelector**

剧本加工方式：会诊+台词优化(推荐)/原样保留。
执行方式：逐步确认(推荐)/全自动一步到位。
模型细分：会诊模型/台词模型下拉。

- [ ] **步骤 5：创建ConfigPanel**

组合WorkTypeSelector + 剧集类型 + 目标画幅 + ModelSelector + ProcessingModeSelector。

- [ ] **步骤 6：创建IntakeForm**

左右两栏布局：ScriptMaterialPanel + ConfigPanel + 底部操作栏(关闭/AI智能立项)。
使用React Hook Form + Zod验证。

- [ ] **步骤 7：创建INTAKE页面**

`src/app/(dashboard)/creation/film-factory/new/page.tsx` — 全屏弹窗式布局，标题"新建剧本 · INTAKE · 立项台"。

- [ ] **步骤 8：创建INTAKE API**

POST `/api/scripts` — 接收INTAKE表单数据，创建Script记录，触发AI分析。

- [ ] **步骤 9：提交**

```bash
git add -A
git commit -m "feat: implement film factory INTAKE form with script material and config panels"
```

---

### 任务 12：AI分析与审阅创建流程

**文件：**
- 新建：`src/components/creation/film-factory/intake/AnalysisLoading.tsx`
- 新建：`src/components/creation/film-factory/intake/ReviewDialog.tsx`
- 新建：`src/app/api/scripts/[id]/analyze/route.ts`
- 新建：`src/services/ai/mock-data/script-analysis.ts`

**接口：**
- 依赖输入：任务11的INTAKE表单
- 对外产出：AI分析loading、审阅弹窗、创建剧本完整流程

- [ ] **步骤 1：创建Mock分析数据**

`src/services/ai/mock-data/script-analysis.ts` — 预设的AI推理结果：题材/叙事/视觉/服化道/允许禁止内容/立项方案。

- [ ] **步骤 2：创建AnalysisLoading组件**

Loading动画 + 进度步骤(通读剧本→分析结构→推断题材→生成方案) + 预计时间。

- [ ] **步骤 3：创建分析API**

POST `/api/scripts/[id]/analyze` — 调用AI服务分析剧本，返回推理结果。

- [ ] **步骤 4：创建ReviewDialog组件**

审阅弹窗：AI推理结果展示 + 剧本标题编辑 + 题材选择 + AI立项方案 + 集数/时长设置 + 叙事/视觉/服化道风格选择 + 目标画幅 + 底部(修改剧本/取消/创建剧本)。

- [ ] **步骤 5：串联INTAKE流程**

INTAKE表单提交 → AnalysisLoading → ReviewDialog → 创建剧本 → 跳转到影视工厂首页。

- [ ] **步骤 6：提交**

```bash
git add -A
git commit -m "feat: implement AI script analysis and review-create workflow"
```

---

### 任务 13：剧本详情页

**文件：**
- 新建：`src/app/(dashboard)/creation/film-factory/[scriptId]/page.tsx`
- 新建：`src/components/creation/film-factory/detail/ScriptDetailHeader.tsx`
- 新建：`src/components/creation/film-factory/detail/WorkflowTabs.tsx`
- 新建：`src/components/creation/film-factory/detail/EpisodeList.tsx`
- 新建：`src/components/creation/film-factory/detail/ScriptContent.tsx`
- 新建：`src/components/creation/film-factory/detail/AssetSidebar.tsx`
- 新建：`src/components/creation/film-factory/detail/StoryboardSection.tsx`
- 新建：`src/app/api/scripts/[id]/route.ts`
- 新建：`src/app/api/scripts/[id]/episodes/route.ts`

**接口：**
- 依赖输入：任务12的创建流程
- 对外产出：完整的剧本详情页，工作流程标签栏、分集列表、剧本内容、资产侧边栏

- [ ] **步骤 1：创建剧本详情API**

GET `/api/scripts/[id]` — 获取剧本详情含关联数据。
GET `/api/scripts/[id]/episodes` — 获取分集列表。

- [ ] **步骤 2：创建WorkflowTabs**

限定剧→建档→剧本大纲→人物/场景→拆分镜→视频→后期，当前阶段高亮，历史阶段显示时间。

- [ ] **步骤 3：创建ScriptDetailHeader**

返回按钮 + 项目标题 + 状态标签(会诊·必改1/生成封面/大纲就绪) + 更多操作。

- [ ] **步骤 4：创建EpisodeList**

分集卡片列表：EP编号+标题+简述+时长+状态。点击切换当前分集。

- [ ] **步骤 5：创建ScriptContent**

大纲摘要 + 剧本内容分段展示(闪回/现实标记) + 编辑能力。

- [ ] **步骤 6：创建AssetSidebar**

全局角色库/妆造库/道具库，显示数量+缩略图列表+添加按钮。

- [ ] **步骤 7：创建StoryboardSection**

分镜区域：尚未拆分镜提示 + 批量生成按钮 + AI复述理解按钮。

- [ ] **步骤 8：组装剧本详情页**

三栏布局：左侧EpisodeList + 中间ScriptContent+StoryboardSection + 右侧AssetSidebar。

- [ ] **步骤 9：提交**

```bash
git add -A
git commit -m "feat: implement script detail page with workflow tabs and episode list"
```

---

## Phase 4: 影视工厂 — 资产管理 (Week 4, Day 16-18)

### 任务 14：角色/场景/道具提取与生成

**文件：**
- 新建：`src/app/api/scripts/[id]/characters/route.ts`
- 新建：`src/app/api/scripts/[id]/scenes/route.ts`
- 新建：`src/app/api/scripts/[id]/props/route.ts`
- 新建：`src/app/api/ai/generate-image/route.ts`
- 新建：`src/components/creation/film-factory/assets/CharacterCard.tsx`
- 新建：`src/components/creation/film-factory/assets/SceneCard.tsx`
- 新建：`src/components/creation/film-factory/assets/PropCard.tsx`
- 新建：`src/components/creation/film-factory/assets/AssetGenerationLoading.tsx`
- 新建：`src/services/ai/mock-data/characters.ts`
- 新建：`src/services/ai/mock-data/scenes.ts`
- 新建：`src/services/ai/mock-data/props.ts`

**接口：**
- 依赖输入：任务13的剧本详情页
- 对外产出：角色/场景/道具的AI提取、图片生成、Loading状态展示

- [ ] **步骤 1：创建Mock资产数据**

预设角色/场景/道具数据，包含名称、描述、外貌/环境描述。

- [ ] **步骤 2：创建资产提取API**

POST `/api/scripts/[id]/characters` — AI提取角色列表。
POST `/api/scripts/[id]/scenes` — AI提取场景列表。
POST `/api/scripts/[id]/props` — AI提取道具列表。

- [ ] **步骤 3：创建图片生成API**

POST `/api/ai/generate-image` — 调用AI服务生成角色/场景/道具图片。

- [ ] **步骤 4：创建资产卡片组件**

CharacterCard/SceneCard/PropCard: 缩略图+名称+描述+重新生成按钮+loading状态。

- [ ] **步骤 5：创建AssetGenerationLoading**

独立的loading动画组件，进度百分比+当前步骤描述。

- [ ] **步骤 6：集成到AssetSidebar**

点击生成按钮 → Loading → 完成后刷新列表 → 图片展示。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement character/scene/prop extraction and image generation"
```

---

## Phase 5: 影视工厂 — 分镜系统 (Week 4, Day 19-22)

### 任务 15：拆分镜功能

**文件：**
- 新建：`src/components/creation/film-factory/storyboard/SplitStoryboardDialog.tsx`
- 新建：`src/components/creation/film-factory/storyboard/StoryboardTabImage.tsx`
- 新建：`src/components/creation/film-factory/storyboard/StoryboardTabText.tsx`
- 新建：`src/components/creation/film-factory/storyboard/StoryboardTabVideo.tsx`
- 新建：`src/components/creation/film-factory/storyboard/StoryboardTabBGM.tsx`
- 新建：`src/components/creation/film-factory/storyboard/StoryboardCard.tsx`
- 新建：`src/app/api/scripts/[id]/episodes/[episodeId]/storyboards/route.ts`
- 新建：`src/services/ai/mock-data/storyboards.ts`

**接口：**
- 依赖输入：任务13的剧本详情页
- 对外产出：4Tab拆分镜弹窗、分镜卡片列表、分镜生成API

- [ ] **步骤 1：创建Mock分镜数据**

预设分镜数据：镜号/镜头类型/描述/台词/动作/运镜/时长。

- [ ] **步骤 2：创建拆分镜API**

POST `/api/scripts/[id]/episodes/[episodeId]/storyboards` — AI拆分镜，返回分镜列表。

- [ ] **步骤 3：创建4个Tab组件**

StoryboardTabImage: 出图配置(模型/比例/风格)。
StoryboardTabText: 纯文本分镜拆分配置。
StoryboardTabVideo: 视频生成配置(模型/时长/分辨率)。
StoryboardTabBGM: BGM配置(风格/时长/音量)。

- [ ] **步骤 4：创建SplitStoryboardDialog**

4Tab弹窗：出图/仅拆分镜/出视频/后期BGM，每个Tab独立配置+开始按钮。

- [ ] **步骤 5：创建StoryboardCard**

分镜卡片：镜号+镜头类型标签+分镜图+描述+台词+编辑按钮+状态指示。

- [ ] **步骤 6：集成到剧本详情页**

点击"批量生成" → SplitStoryboardDialog → 生成完成 → StoryboardCard列表渲染。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement storyboard splitting with 4-tab dialog and card display"
```

---

### 任务 16：分镜编辑与图片生成

**文件：**
- 新建：`src/components/creation/film-factory/storyboard/StoryboardEditor.tsx`
- 新建：`src/components/creation/film-factory/storyboard/ImageGenerationDialog.tsx`
- 新建：`src/components/creation/film-factory/storyboard/NegativePromptDialog.tsx`
- 新建：`src/app/api/scripts/[id]/episodes/[episodeId]/storyboards/[sbId]/generate/route.ts`

**接口：**
- 依赖输入：任务15的分镜系统
- 对外产出：分镜编辑、图片生成、反向提示词配置

- [ ] **步骤 1：创建StoryboardEditor**

分镜编辑面板：镜头类型/描述/台词/动作/运镜/时长编辑表单。

- [ ] **步骤 2：创建NegativePromptDialog**

反向提示词弹窗：文本输入+预设标签快捷添加。

- [ ] **步骤 3：创建ImageGenerationDialog**

图片生成配置弹窗：模型选择+比例+风格+正向prompt+反向prompt+生成按钮。

- [ ] **步骤 4：创建分镜生成API**

POST `/api/scripts/[id]/episodes/[episodeId]/storyboards/[sbId]/generate` — 生成分镜图/视频。

- [ ] **步骤 5：集成到StoryboardCard**

点击生成 → ImageGenerationDialog → Loading → 图片展示。
点击编辑 → StoryboardEditor侧边面板。

- [ ] **步骤 6：提交**

```bash
git add -A
git commit -m "feat: implement storyboard editing and image generation with negative prompts"
```

---

## Phase 6: 影视工厂 — 视频与后期 (Week 5, Day 23-26)

### 任务 17：视频生成系统

**文件：**
- 新建：`src/components/creation/film-factory/video/VideoGenerationDialog.tsx`
- 新建：`src/components/creation/film-factory/video/VideoPreview.tsx`
- 新建：`src/components/creation/film-factory/video/VideoProgressBar.tsx`
- 新建：`src/app/api/ai/generate-video/route.ts`
- 新建：`src/services/ai/mock-data/videos.ts`

**接口：**
- 依赖输入：任务16的分镜系统
- 对外产出：视频生成配置、进度展示、预览播放

- [ ] **步骤 1：创建Mock视频数据**

预设视频生成结果数据。

- [ ] **步骤 2：创建视频生成API**

POST `/api/ai/generate-video` — 调用AI服务生成视频片段。

- [ ] **步骤 3：创建VideoGenerationDialog**

视频生成配置：模型选择+分辨率+时长+是否免分镜图+反向提示词+开始按钮。

- [ ] **步骤 4：创建VideoProgressBar**

视频生成进度：百分比+当前步骤(排队/生成中/后处理/完成)+预计剩余时间。

- [ ] **步骤 5：创建VideoPreview**

视频预览播放器：播放/暂停/进度条/音量/全屏。

- [ ] **步骤 6：集成到分镜卡片**

生成完成 → VideoPreview替换静态图 → 支持重新生成。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement video generation system with progress tracking and preview"
```

---

### 任务 18：音频/BGM与后期合成

**文件：**
- 新建：`src/components/creation/film-factory/post/AudioGenerator.tsx`
- 新建：`src/components/creation/film-factory/post/BGMSelector.tsx`
- 新建：`src/components/creation/film-factory/post/PostProductionPanel.tsx`
- 新建：`src/app/api/ai/generate-audio/route.ts`
- 新建：`src/services/ai/mock-data/audio.ts`

**接口：**
- 依赖输入：任务17的视频系统
- 对外产出：配音生成、BGM选择、后期合成面板

- [ ] **步骤 1：创建Mock音频数据**

预设音频/BGM数据。

- [ ] **步骤 2：创建音频生成API**

POST `/api/ai/generate-audio` — 调用AI服务生成配音/BGM。

- [ ] **步骤 3：创建AudioGenerator**

配音生成：风格描述输入+模型选择(MV Audio 5.5)+智能歌词开关+生成按钮。

- [ ] **步骤 4：创建BGMSelector**

BGM选择：风格标签+试听+音量调节+选择确认。

- [ ] **步骤 5：创建PostProductionPanel**

后期面板：配音轨道+BGM轨道+混音预览+导出按钮。

- [ ] **步骤 6：集成到工作流程**

后期Tab → PostProductionPanel → 音频生成/选择 → 混音预览。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "feat: implement audio generation, BGM selection and post-production panel"
```

---

## Phase 7: 集成测试与优化 (Week 6, Day 27-30)

### 任务 19：E2E测试与全流程验证

**文件：**
- 新建：`tests/e2e/workbench.spec.ts`
- 新建：`tests/e2e/canvas.spec.ts`
- 新建：`tests/e2e/film-factory.spec.ts`
- 新建：`playwright.config.ts`

**接口：**
- 依赖输入：所有前置任务
- 对外产出：完整的E2E测试覆盖

- [ ] **步骤 1：安装Playwright**

```bash
npm install -D @playwright/test
npx playwright install
```

- [ ] **步骤 2：编写工作台E2E测试**

登录 → 首页渲染 → AI生成输入 → 模型选择 → 生成 → 结果展示。

- [ ] **步骤 3：编写画布E2E测试**

创建项目 → 打开编辑器 → 添加节点 → 连线 → 保存 → 重新加载验证。

- [ ] **步骤 4：编写影视工厂E2E测试**

新建剧本 → INTAKE填写 → AI分析 → 审阅创建 → 剧本详情 → 资产生成 → 拆分镜 → 视频生成。

- [ ] **步骤 5：运行全部测试**

```bash
npx playwright test
```

- [ ] **步骤 6：修复发现的问题**

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "test: add E2E tests for workbench, canvas and film factory flows"
```

---

### 任务 20：UI打磨与性能优化

**文件：**
- 修改：多个组件文件
- 新建：`src/components/shared/LoadingSpinner.tsx`
- 新建：`src/components/shared/ErrorBoundary.tsx`
- 新建：`src/components/shared/EmptyState.tsx`

**接口：**
- 依赖输入：任务19的测试通过
- 对外产出：UI细节打磨、加载状态统一、错误处理完善、性能优化

- [ ] **步骤 1：统一Loading组件**

LoadingSpinner: 品牌色旋转动画+文字提示。
Skeleton: 各页面骨架屏。

- [ ] **步骤 2：统一错误处理**

ErrorBoundary: 全局错误捕获+友好提示+重试按钮。
Toast通知: 操作成功/失败反馈。

- [ ] **步骤 3：空状态组件**

EmptyState: 插画+文案+CTA按钮，用于空列表/无搜索结果等场景。

- [ ] **步骤 4：动画优化**

Framer Motion: 页面转场、弹窗出入、卡片hover、loading过渡。

- [ ] **步骤 5：性能优化**

- React.memo包裹纯展示组件
- 虚拟滚动用于长列表
- 图片懒加载
- API请求缓存(SWR/React Query可选)
- Bundle分析+代码分割

- [ ] **步骤 6：响应式适配**

确保移动端/平板/桌面端布局合理。

- [ ] **步骤 7：提交**

```bash
git add -A
git commit -m "perf: UI polish, loading states, error handling and performance optimization"
```

---

### 任务 21：文档与部署准备

**文件：**
- 新建：`README.md`
- 新建：`docs/setup-guide.md`
- 新建：`docs/api-reference.md`
- 新建：`docker-compose.yml`
- 新建：`Dockerfile`

**接口：**
- 依赖输入：任务20的优化完成
- 对外产出：完整文档、Docker部署配置

- [ ] **步骤 1：编写README**

项目介绍、技术栈、快速开始、目录结构、开发指南。

- [ ] **步骤 2：编写Setup Guide**

环境要求、数据库配置、环境变量、本地开发步骤。

- [ ] **步骤 3：编写API Reference**

所有API端点的请求/响应格式、认证方式、错误码。

- [ ] **步骤 4：创建Docker配置**

Dockerfile + docker-compose.yml (Next.js + PostgreSQL)。

- [ ] **步骤 5：最终验证**

全新环境clone → setup → 运行 → 全流程验证。

- [ ] **步骤 6：提交**

```bash
git add -A
git commit -m "docs: add README, setup guide, API reference and Docker deployment config"
```

---

## 📋 每日执行检查清单

### Week 1
| 日 | 任务 | 交付物 | 验证标准 |
|----|------|--------|---------|
| D1 | 任务1 | Next.js项目+Tailwind+shadcn | `npm run dev`启动成功 |
| D2 | 任务2+3 | Prisma+NextAuth | 注册→登录→session正常 |
| D3 | 任务4 | NavBar+Layout | 导航跳转+下拉菜单正常 |
| D4 | 任务5 | AI生成输入区 | 媒体切换+模型选择+参数调整 |
| D5 | 任务6+7 | 精选画廊+AI服务 | 画廊渲染+Mock生成正常 |

### Week 2
| 日 | 任务 | 交付物 | 验证标准 |
|----|------|--------|---------|
| D6 | 任务8(上) | 项目API+卡片组件 | API CRUD正常 |
| D7 | 任务8(下) | 画布首页+团队弹窗 | Tab切换+搜索筛选+弹窗 |
| D8 | 任务9(上) | Canvas Store+节点组件 | 节点渲染+拖拽 |
| D9 | 任务9(中) | 工具栏+面板+编辑器 | 编辑器完整交互 |
| D10 | 任务9(下) | 集成+自动保存 | 保存→重载数据一致 |

### Week 3
| 日 | 任务 | 交付物 | 验证标准 |
|----|------|--------|---------|
| D11 | 任务10 | 影视工厂首页 | 状态统计+卡片列表 |
| D12 | 任务11(上) | INTAKE左栏 | 剧本输入+分集标记提示 |
| D13 | 任务11(下) | INTAKE右栏+表单 | 参数配置+表单验证 |
| D14 | 任务12 | AI分析+审阅弹窗 | Loading→审阅→创建流程 |
| D15 | 任务13 | 剧本详情页 | 三栏布局+工作流程标签 |

### Week 4
| 日 | 任务 | 交付物 | 验证标准 |
|----|------|--------|---------|
| D16 | 任务14(上) | 角色提取+生成 | AI提取→图片生成→展示 |
| D17 | 任务14(下) | 场景+道具 | 三类资产完整流程 |
| D18 | 任务14(收尾) | Loading+集成 | Loading动画+侧边栏集成 |
| D19 | 任务15(上) | 拆分镜API+Tab组件 | 4Tab弹窗渲染 |
| D20 | 任务15(下) | 分镜卡片+集成 | 生成→卡片列表展示 |
| D21 | 任务16(上) | 分镜编辑+图片生成 | 编辑面板+生成弹窗 |
| D22 | 任务16(下) | 反向提示词+集成 | 完整分镜编辑流程 |

### Week 5
| 日 | 任务 | 交付物 | 验证标准 |
|----|------|--------|---------|
| D23 | 任务17(上) | 视频生成API+Dialog | 视频生成配置+调用 |
| D24 | 任务17(下) | 进度+预览+集成 | 进度展示+视频播放 |
| D25 | 任务18(上) | 音频生成+BGM选择 | 配音生成+BGM试听 |
| D26 | 任务18(下) | 后期面板+集成 | 混音预览+完整后期流程 |

### Week 6
| 日 | 任务 | 交付物 | 验证标准 |
|----|------|--------|---------|
| D27 | 任务19(上) | Playwright+E2E工作台 | 工作台测试通过 |
| D28 | 任务19(下) | E2E画布+影视工厂 | 全部E2E测试通过 |
| D29 | 任务20 | UI打磨+性能优化 | 视觉一致+加载流畅 |
| D30 | 任务21 | 文档+Docker+终验 | 文档完整+部署可用 |

---

## 🔧 关键技术决策备忘

| 决策 | 选择 | 理由 |
|------|------|------|
| 路由 | Next.js App Router | SSR/RSC支持，文件系统路由 |
| 状态管理 | Zustand | 轻量、TypeScript友好、无boilerplate |
| UI库 | shadcn/ui | 可定制、基于Radix、Tailwind原生 |
| 节点编辑 | @xyflow/react v11 | React Flow官方维护、活跃社区 |
| ORM | Prisma | 类型安全、迁移管理、直观Schema |
| 认证 | NextAuth.js | 多Provider支持、Prisma Adapter |
| AI策略 | 接口抽象+Mock | 解耦AI供应商、快速迭代UI |
| 表单 | React Hook Form + Zod | 高性能验证、Schema复用 |
| 动画 | Framer Motion | 声明式API、React集成好 |
| 样式 | Tailwind CSS only | 一致性、无需CSS文件切换 |

---

## ⚠️ 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Vision API速率限制 | 无法分析剩余截图 | 已获取足够信息，缺失细节可从代码反推 |
| React Flow复杂度 | 节点编辑器开发超预期 | 先实现基础节点，高级功能延后 |
| AI Mock数据质量 | 演示效果不佳 | 投入时间打磨Mock数据的真实性 |
| 数据库Schema变更 | 迁移成本 | 早期冻结核心Schema，增量演进 |
| 全栈工作量 | 30天可能不够 | 优先级排序，非核心功能可延后 |

---

*本计划由DSH Agent基于产品需求图片分析和superpower-writing-plans技能生成。执行前请复核规格文档和本计划，确认后再开始实施。*

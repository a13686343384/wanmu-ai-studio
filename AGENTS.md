# AGENTS.md — 万幕生 (Manvo TV) 开发约定

> 面向接手本仓库的 AI Agent / 开发者。**动手前请完整读完本文件**，再读 `docs/PROGRESS.md`（当前进度与待办）。

## 0. 一句话说明

万幕生是一个 **AI 影视创作全流程平台**（深色主题 SaaS）：工作台（多模态生成）→ 画布（React Flow 节点编排）→ 创作中心 → 影视工厂（建档 → 大纲 → 资产 → 分镜 → 视频 → 后期）。

## 1. 技术栈（已锁定，勿擅自更换）

| 层 | 选型 |
|---|---|
| 语言 | TypeScript（`strict: true`） |
| 框架 | Next.js 14 App Router（**不用** Pages Router） |
| UI | React 18 + Tailwind CSS v3 + shadcn/ui（Radix 原语，源码在 `src/components/ui/`） |
| 画布 | `@xyflow/react` v12（React Flow） |
| 状态 | Zustand |
| 表单 | React Hook Form + Zod |
| 图标 / 动画 | lucide-react / framer-motion |
| 数据库 | PostgreSQL + Prisma 6 |
| 认证 | NextAuth v4（Credentials + JWT） |
| 测试 | Playwright（E2E）+ 自研 HTTP 冒烟脚本 |

## 2. 环境与启动

```bash
# 1) 依赖
npm install            # 需代理时：export https_proxy=http://127.0.0.1:7892

# 2) 数据库（本机无 Postgres 时用内嵌实例，真实 PostgreSQL，数据落在 .pgdata/）
npm run db:dev         # 前台常驻，另开终端执行后续命令

# 3) 建表 + 种子数据
npm run db:setup       # = prisma migrate deploy && prisma generate && tsx prisma/seed.ts

# 4) 启动
npm run dev            # http://localhost:3000

# 演示账号：demo@wanmusheng.com / demo1234
```

**验证命令（提交前必跑）**

```bash
npx tsc --noEmit            # 必须 0 错误
npm run build               # 必须构建成功
npm run test:smoke          # HTTP 冒烟：26 项中的后端链路，应 17/17 通过
npm run test:e2e            # Playwright：应 26/26 通过（需 dev server 或自动拉起）
npm run lint                # ESLint
```

> `npm run test:e2e` 会自动执行 `scripts/reset-demo.mjs` 把演示账号积分补满，避免生成类用例因累计扣费失败。
> 若已手动运行 dev server，用 `PW_NO_SERVER=1 npx playwright test` 复用。

## 3. 目录结构（按职责分，不按技术分层）

```
src/
├── app/
│   ├── (auth)/                    # 登录/注册（独立布局）
│   ├── (dashboard)/               # 已登录应用区（NavBar + 会话校验）
│   │   ├── page.tsx               # 工作台
│   │   ├── canvas/                # 画布列表 + [projectId] 编辑器
│   │   ├── creation/              # 创作中心
│   │   │   └── film-factory/      # 影视工厂：列表 / new(INTAKE) / [scriptId] 详情
│   │   └── plugins|contact|...    # 占位页（ComingSoon）
│   └── api/                       # Route Handlers（全部返回 { data } 或 { error }）
├── components/
│   ├── ui/                        # shadcn/ui 原语（button/input/dialog/...）
│   ├── layout/                    # NavBar / Logo / 工作区切换 / 团队弹窗
│   ├── workbench/                 # 工作台生成面板、参考素材、作品画廊
│   ├── canvas/                    # 画布：节点(nodes/)、边(edges/)、面板(panels/)
│   ├── creation/film-factory/     # 影视工厂：intake/ detail/ video/ post/
│   ├── auth/ providers/ shared/   # 表单、Provider、通用组件
├── lib/
│   ├── api.ts                     # jsonOk / jsonError / withErrorHandling / AppError
│   ├── session.ts                 # requireUser / requireScriptAccess / requireWorkspaceAccess
│   ├── prisma.ts                  # Prisma 单例
│   ├── constants.ts               # 全部枚举与模型清单（改这里，不要在组件里写死）
│   ├── serializers/script.ts      # Prisma 记录 → 前端 DTO
│   └── validations/               # Zod schema（按域拆分）
├── services/ai/                   # AI 服务抽象层（types / mock / 工厂）
├── stores/                        # Zustand：auth / workbench / canvas
└── hooks/                         # useSyncAuth / useWorkspaces
```

## 4. 硬性约定

### 4.1 API Route 只能导出 HTTP 处理函数
`src/app/api/**/route.ts` **不得导出** 类型、工具函数或常量（Next.js 会构建失败）。
把它们放到 `src/lib/serializers/`、`src/lib/session.ts` 等模块。历史坑：`toScriptSummary`、`assertScriptAccess` 都曾因此报错。

### 4.2 统一响应格式
```ts
// 成功
return jsonOk(data, "可选提示", 201)
// 失败
return jsonError("中文错误信息", 400)
// 需要集中处理异常时
export const POST = withErrorHandling(async (req, { params }) => { ... })
```
`withErrorHandling` 会把 `AppError` 映射为状态码、`ZodError` 映射为 400 + 字段错误。

### 4.3 鉴权与权限
- 页面层：`(dashboard)/layout.tsx` 已做会话校验；`middleware.ts` 兜底。
- API 层：**每个**需要登录的 handler 开头调用 `requireUser()`；访问具体资源用 `requireScriptAccess(id, user.id)` / `requireWorkspaceAccess(workspaceId)`。
- 永远按「用户 → 工作区成员」链路校验，不要只按 id 查询。

### 4.4 AI 能力必须走抽象层
```ts
import { getAIService } from "@/services/ai"
const ai = getAIService()
const { data, usage } = await ai.generateImage({ ... })
```
- **不要**在组件或 route 里直接调第三方 API。
- `AI_MODE=mock`（默认）使用 `mock-ai.service.ts`，离线可跑通全流程；接入真实供应商时新增 `live-ai.service.ts` 并在 `src/services/ai/index.ts` 注册。
- 新增 AI 能力时：先加 `types.ts` 接口 → 补 mock 实现 → 再写 route。

### 4.5 设计系统
- **仅深色模式**，色阶用 zinc，品牌色 `orange-500`。
- 卡片：`bg-zinc-900/40 border-zinc-800 rounded-xl`；主按钮用 `variant="brand"`（橙）/ `variant="inverse"`（白底黑字）。
- 禁止引入亮色主题或第二套色板。新增颜色前先看 `src/styles/globals.css` 与 `tailwind.config.ts`。

### 4.6 枚举集中在 `src/lib/constants.ts`
作品类型、剧集类型、画幅、模型清单（`TEXT_MODELS` / `IMAGE_MODELS` / `VIDEO_MODELS` / `AUDIO_MODELS`）、状态标签与配色，全部在此定义。

### 4.7 交互状态必须完整
任何异步操作都要有：loading（`Loader2` 旋转）、进度（`Progress`）、成功/失败 toast（`sonner`）、空状态、错误态。
参考实现：`GenerationPanel.tsx`（生成）、`AssetSidebar.tsx`（资产出图）、`VideoBatchDialog.tsx`（批量出片）。

### 4.8 数据变更后刷新
Route 里更新关联数据时同步刷新 `Project.updatedAt` / `Script.status` / `progressLabel`，保证列表排序与状态徽章正确。

## 5. 关键业务链路

```
工作台：输入提示词 → POST /api/ai/generate → 扣积分 → 返回资源
画布：/canvas（列表）→ /canvas/[projectId]（React Flow，⌘S 保存 → PUT /api/canvas/[projectId]）
影视工厂：
  1. POST /api/scripts                    INTAKE 落库（processing）
  2. POST /api/scripts/[id]/analyze       AI 通读 → 返回 analysis
  3. POST /api/scripts/[id]/finalize      审阅结果 → 生成 Episode（status=outlining）
  4. POST /api/scripts/[id]/consult       会诊 → Consultation
  5. POST /api/scripts/[id]/consult/apply 勾选项 → 台词优化
  6. POST /api/scripts/[id]/assets        提取角色/场景/道具
  7. POST /api/scripts/[id]/assets/generate 逐类出图
  8. POST /api/scripts/[id]/episodes/[eid]/storyboards  拆分镜
  9. POST /api/storyboards/[id]/generate  出图 / 出视频
 10. POST /api/scripts/[id]/episodes/[eid]/bgm  BGM / 配音
```

剧本状态机：`intake → outlining → assets → storyboarding → video → post_production → completed`（见 `WORKFLOW_STAGES`）。

## 6. Git 约定

- Conventional Commits：`feat:` / `fix:` / `refactor:` / `test:` / `docs:` / `perf:`
- 每个任务完成并自测通过后提交一次，提交信息说明「做了什么 + 验证方式」。
- 不要提交 `.env.local`、`.pgdata/`、`.screenshots/`、`test-results/`（已在 `.gitignore`）。

## 7. 常用工具脚本

| 命令 | 用途 |
|---|---|
| `npm run db:dev` | 启动内嵌 PostgreSQL（前台常驻） |
| `npm run db:setup` | 迁移 + 生成 Client + 种子数据 |
| `npm run db:seed` | 仅写种子数据 |
| `npm run reset:demo` | 重置演示账号积分 |
| `npm run test:smoke` | HTTP 冒烟（17 项核心链路） |
| `npm run test:e2e` | Playwright E2E（26 项） |
| `node scripts/screenshot.mjs /path` | 登录后截图到 `.screenshots/`（`FULL_PAGE=1` 全页） |

## 8. 已知注意事项

1. **不要用 `npm run dev` 之外的端口**：`NEXTAUTH_URL` 与 `middleware` 依赖 `http://localhost:3000`。
2. **新增 route 文件后若 404**：Next dev 偶发路由清单缓存，重启 dev server 即可。
3. **`@xyflow/react` 的 `nodeTypes` / `edgeTypes` 必须定义在组件外**，否则每次渲染重建导致节点闪烁。
4. **Prisma JSON 字段**写入需断言 `as Prisma.InputJsonValue`（React Flow 节点是任意 JSON）。
5. **Zod v3**：用 `.or(z.literal(""))` 处理可选字符串，不要用 `z.string().optional()` 直接接空串。
6. **Tailwind v3**：`tailwind.config.ts` 是 v3 语法；不要按 v4 的 CSS-first 配置改造。

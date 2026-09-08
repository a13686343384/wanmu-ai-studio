# 万幕生 (Manvo TV)

> AI 影视创作全流程平台 —— 从一份剧本到成片：工作台多模态生成 → 画布节点编排 → 影视工厂（建档 → 大纲 → 资产 → 分镜 → 视频 → 后期）。

深色主题 SaaS，内置完整 Mock AI 服务，**无需任何 API Key 即可离线跑通全部流程**；接入真实供应商时只需实现 `live-ai.service.ts` 并注册到抽象层。

| 工作台 | 画布 | 影视工厂 |
|---|---|---|
| ![workbench](docs/images/workbench.png) | ![canvas](docs/images/canvas.png) | ![film-factory](docs/images/film-factory.png) |

> 截图占位：`docs/images/`（可用 `node scripts/screenshot.mjs / /canvas /creation/film-factory` 生成到 `.screenshots/` 后拷入）。

## 功能总览

- **工作台**：文本 / 图片 / 视频 / 音频多模态生成，参考素材上传、@ 引用、模型与参数选择、积分扣减、精选作品画廊。
- **画布**：React Flow 节点编排，7 类节点、动画边、属性面板、撤销重做、⌘S 自动保存；项目 CRUD、网格 / 列表视图、团队工作区。
- **影视工厂**：INTAKE 建档 → AI 通读分析 → 审阅创建分集 → 剧本会诊与台词优化 → 角色 / 场景 / 道具提取与出图 → 拆分镜（4 Tab）→ 批量出片与视频预览 → BGM / 配音 → 后期混音导出。
- **协作**：多工作区（个人 + 团队）、团队创建与 32 位 Team ID 加入申请。
- **工程质量**：Playwright E2E 26 用例 + HTTP 冒烟 17 项，全链路类型安全（TS strict）。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 14 App Router · React 18 · TypeScript (strict) |
| UI | Tailwind CSS v3 · shadcn/ui（Radix） · lucide-react · framer-motion |
| 画布 | @xyflow/react v12 |
| 状态 / 表单 | Zustand · React Hook Form + Zod |
| 数据库 | PostgreSQL 16 + Prisma 6 |
| 认证 | NextAuth v4（Credentials + JWT） |
| 测试 | Playwright E2E + 自研 HTTP 冒烟脚本 |

## 快速开始

前置要求：Node.js ≥ 20、npm ≥ 10。数据库可用内置实例（无需安装 PostgreSQL），或 Docker。

```bash
git clone <repo-url> && cd wanmusheng

# 1) 安装依赖（需要代理时先 export https_proxy=http://127.0.0.1:7892）
npm install

# 2) 配置环境变量（mock 模式无需任何 AI Key）
cp .env.example .env          # 演示可直接使用默认值，建议换掉 NEXTAUTH_SECRET

# 3a) 方式一：内嵌 PostgreSQL（零安装，数据落在 .pgdata/）
npm run db:dev                # 前台常驻，另开终端执行下一步
# 3b) 方式二：Docker Compose 一键起数据库 + 应用
#      docker compose up --build

# 4) 建表 + 种子数据（演示账号）
npm run db:setup

# 5) 启动
npm run dev                   # http://localhost:3000
```

演示账号：`demo@wanmusheng.com` / `demo1234`（初始积分 230，可用 `npm run reset:demo` 补满）。

更详细的环境说明（系统级 PostgreSQL、端口冲突、全新机器演练）见 [docs/setup-guide.md](docs/setup-guide.md)；全部 API 见 [docs/api-reference.md](docs/api-reference.md)。

## Docker 部署

```bash
docker compose up --build -d        # 启动 PostgreSQL 16 + 应用（自动迁移 + 种子）
docker compose logs -f app          # 等待 "Ready in xx ms"
open http://localhost:3000
```

- `docker compose` 会先跑一次性 `migrate` 服务（`prisma migrate deploy` + 种子），再启动应用。
- 生产环境请通过环境变量覆盖：`DATABASE_URL`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`AI_MODE`。
- 镜像为多阶段构建（`output: standalone`），运行层不含 devDependencies。

## 常用命令

| 命令 | 用途 |
|---|---|
| `npm run dev` | 启动开发服务器（http://localhost:3000） |
| `npm run db:dev` | 启动内嵌 PostgreSQL（前台常驻；`--reset` 重置数据目录） |
| `npm run db:setup` | 迁移 + 生成 Prisma Client + 种子数据 |
| `npm run db:seed` / `npm run reset:demo` | 仅写种子 / 重置演示账号积分 |
| `npm run build` / `npm start` | 生产构建 / 启动（先停 dev server） |
| `npm run test:smoke` | HTTP 冒烟：17 项核心链路（需服务器已启动） |
| `npm run test:e2e` | Playwright 26 用例（自动拉起 dev server；复用已有则 `PW_NO_SERVER=1`） |
| `npm run lint` / `npx tsc --noEmit` | ESLint / 类型检查 |
| `node scripts/screenshot.mjs /path` | 登录后截图到 `.screenshots/`（`FULL_PAGE=1` 全页） |

## 目录结构

```
src/
├── app/
│   ├── (auth)/                    # 登录 / 注册（独立布局）
│   ├── (dashboard)/               # 已登录应用区（NavBar + 会话校验）
│   │   ├── page.tsx               # 工作台
│   │   ├── canvas/                # 画布列表 + [projectId] 编辑器
│   │   └── creation/film-factory/ # 影视工厂：列表 / new / [scriptId]
│   ├── api/                       # Route Handlers（统一返回 { data } 或 { error }）
│   └── error.tsx                  # 路由级错误兜底
├── components/
│   ├── ui/                        # shadcn/ui 原语
│   ├── layout/ workbench/ canvas/ # 各模块组件
│   ├── creation/film-factory/     # 影视工厂（intake / detail / video / post）
│   └── shared/                    # LoadingSpinner / ErrorBoundary / EmptyState / 动效 / 骨架屏
├── hooks/                         # useSyncAuth / useWorkspaces / useProgressiveList
├── lib/                           # api 响应封装 / session 鉴权 / constants 枚举 / validations(Zod) / serializers
├── services/ai/                   # AI 服务抽象层（types + mock 实现 + 工厂）
└── stores/                        # Zustand：auth / workbench / canvas
docs/                              # PROGRESS / setup-guide / api-reference
prisma/                            # schema + migrations + seed
scripts/                           # dev-db / smoke-test / reset-demo / screenshot
tests/e2e/                         # Playwright 用例
```

## 开发指南

- **约定先读** [AGENTS.md](AGENTS.md)：统一响应格式、鉴权链路、AI 抽象层、深色设计系统、枚举集中管理等硬性约定都在里面。
- **AI 能力**：一律 `getAIService()` → `services/ai` 抽象层，禁止直连第三方；`AI_MODE=mock`（默认）离线可跑通全流程，`live` 时新增 `live-ai.service.ts` 注册即可。
- **提交规范**：Conventional Commits（`feat:` / `fix:` / `refactor:` / `perf:` / `test:` / `docs:` / `chore:`）。
- **提交前验证**：`npx tsc --noEmit` 0 错误、`npm run build` 成功、`npm run test:e2e` 26/26、`npm run lint` 通过。

## 路线图 / 已知边界

详见 [docs/PROGRESS.md](docs/PROGRESS.md) 第四节「技术债」：真实 AI 供应商接入、团队审批流 UI、积分充值、画布与影视工厂联动导入、分镜产物并发生成等。

## License

仅供学习与内部演示使用。

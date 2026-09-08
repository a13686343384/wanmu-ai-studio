# 进度与交接（PROGRESS）

> **最后更新：** 2026-09-09（UI 对齐产品需求图 ×3 轮）
> **当前状态：** 21 个任务**全部完成**（功能交付 + UI/性能打磨 + 文档与部署配置）。
> **验证基线：** `tsc --noEmit` 0 错误 · `npm run build` 成功 · 冒烟 **17/17** · E2E **26/26** · `npm run lint` 通过。
> **全新环境演练已通过：** 克隆 → `npm ci` → 内嵌库自动 initdb → `db:setup` → `build` → `start` → 冒烟 17/17。

---

## 一、总体完成度

| Phase | 任务 | 状态 | 说明 |
|---|---|---|---|
| 0 项目初始化 | 1 Next.js 脚手架 | ✅ | Next 14 + Tailwind v3 + shadcn 原语 + 深色主题 |
| | 2 Prisma + 数据库 | ✅ | 16 个模型 + 2 次迁移 + 内嵌 PG + 种子数据 |
| | 3 NextAuth 认证 | ✅ | 凭据登录/注册、中间件守卫、会话含积分与会员 |
| 1 全局框架 + 首页 | 4 NavBar + 布局 | ✅ | 导航、创作中心下拉、工作区切换、团队弹窗 |
| | 5 工作台生成区 | ✅ | 参考素材、@ 引用、媒体/模型/参数、积分扣减 |
| | 6 精选作品画廊 | ✅ | 9 件作品、横向滚动、hover 播放 |
| | 7 AI 服务抽象层 | ✅ | `AIService` 接口 + Mock 全实现 + 生成 API |
| 2 画布 | 8 项目管理 | ✅ | CRUD、网格/列表、筛选排序、右键菜单、团队 |
| | 9 React Flow 编辑器 | ✅ | 7 类节点、动画边、属性面板、撤销重做、⌘S 自动保存 |
| 3 影视工厂建档 | 10 工厂首页 | ✅ | 状态统计、分组列表、搜索排序、停止全部 |
| | 11 INTAKE 页面 | ✅ | 双栏表单、分集标记识别、加工方式/执行方式 |
| | 12 AI 分析 + 审阅创建 | ✅ | 分析 loading、审阅弹窗、finalize 生成分集 |
| | 13 剧本详情页 | ✅ | 工作流标签、分集列表、剧本编辑、资产侧栏、分镜区 |
| 4 资产管理 | 14 角色/场景/道具 | ✅ | 提取 + 逐类出图 + 独立 loading 与进度 |
| 5 分镜系统 | 15 拆分镜 | ✅ | 4 Tab 弹窗（出图/仅拆分/出视频/后期 BGM） |
| | 16 分镜编辑与出图 | ✅ | 编辑抽屉、出图/出视频弹窗、反向提示词预设 |
| 6 视频与后期 | 17 视频生成 | ✅ | 批量出片队列、进度条、视频预览播放器 |
| | 18 音频/BGM 与后期 | ✅ | 配音生成、BGM 库试听、混音导出面板 |
| 7 收尾 | 19 E2E 测试 | ✅ | Playwright 26 用例全绿（认证/工作台/画布/影视工厂） |
| | 20 UI 打磨与性能 | ✅ | 共享 Loading/Error/Empty 组件、Skeleton 骨架屏、framer-motion 转场、memo/懒加载/渐进渲染、移动端抽屉入口 |
| | 21 文档与部署 | ✅ | README / setup-guide / api-reference / Dockerfile + docker-compose；全新环境演练通过 |

---

## 二、已完成能力的验收方式

### 2.1 自动化验证

```bash
npx tsc --noEmit          # 0 错误
npm run build             # 构建成功（30 条路由，standalone 输出）
npm run test:smoke        # 17/17 —— 后端链路
npm run test:e2e          # 26/26 —— 端到端 UI
npm run lint              # ESLint 通过
```

**冒烟脚本覆盖**（`scripts/smoke-test.mjs`）：登录 → 工作台生成扣费 → 画布建项目/存节点/重载/重命名 → INTAKE 建档 → AI 分析 → 审阅创建分集 → 会诊 → 资产提取 → 拆分镜 → 清理。

**E2E 覆盖**（`tests/e2e/`）：
- `workbench.spec.ts`：面板渲染、媒体类型切换、参数调整、生成全流程、画廊滚动、导航跳转
- `canvas.spec.ts`：Tab/工具栏、新建项目进编辑器、加节点保存重载、团队弹窗、右键菜单
- `film-factory.spec.ts`：首页统计、INTAKE 校验与选项、完整建档流程、详情页、会诊、4 Tab 拆分镜、AI 复述、资产提取

### 2.2 手工验收路径

1. `npm run db:dev` + `npm run db:setup` + `npm run dev`
2. 用 `demo@wanmusheng.com / demo1234` 登录
3. 工作台：输入提示词 → 生成 → 结果出现在「本次生成」
4. 画布：新建项目 → 拖/点节点 → ⌘S 保存 → 刷新仍在
5. 影视工厂：新建剧本（粘贴 `docs` 中示例）→ AI 智能立项 → 审阅创建 → 详情页走完资产/分镜/出视频/后期

### 2.3 截图核验

```bash
node scripts/screenshot.mjs / /canvas /creation/film-factory /creation/film-factory/new
FULL_PAGE=1 node scripts/screenshot.mjs /creation/film-factory/new
# 产物在 .screenshots/
```

---

## 三、任务 20–21 交付记录（2026-09-09 完成）

### 任务 20：UI 打磨与性能优化 ✅

- [x] 新建 `src/components/shared/LoadingSpinner.tsx`（品牌色旋转 + 文案）
- [x] 新建 `src/components/shared/ErrorBoundary.tsx`（含 `ErrorFallback`；`src/app/error.tsx` 路由级兜底 + (dashboard) 布局包裹）
- [x] 新建 `src/components/shared/EmptyState.tsx`，替换画布项目 / 剧本列表 / 分镜区 / 分集列表 / 资产侧栏 / 剧本内容区零散空状态
- [x] `Skeleton` 统一骨架屏（`shared/skeletons.tsx`：`CardGridSkeleton` / `RowListSkeleton`），并新增 canvas、film-factory、[scriptId]、canvas/[projectId] 四个路由级 `loading.tsx`
- [x] framer-motion：`shared/motion.tsx`（`FadeIn` 内容入场 + `PageTransition` 路由转场）、精选画廊交错入场、EmptyState 上浮淡入。弹窗出入保留 shadcn/Tailwind data-state 动画（已达标，改动 Radix 结构风险大于收益）
- [x] 长列表：`hooks/useProgressiveList.ts`（IntersectionObserver 渐进渲染，分集 >100 集自动启用，免依赖）
- [x] `React.memo` 包裹 `StoryboardCard` / `WorkCard` / `ProjectCard`，父级用 `useCallback`/`useMemo` 稳定回调
- [x] 图片懒加载：全部 `<img>` 补 `loading="lazy" decoding="async"`
- [x] 移动端：详情页 < lg 增加「分集 / 资产」Sheet 抽屉入口；底部状态条 `flex-wrap` 防 375px 横向滚动
- [x] 无障碍复查：icon-only 按钮均有 `aria-label`；BGM 试听按钮改为可区分文案

**验收：** e2e 26/26；build 后共享 First Load JS 87.3 kB（framer-motion 计入后无显著增长）。

### 任务 21：文档与部署 ✅

- [x] `README.md`：项目介绍、功能、技术栈、快速开始、Docker 部署、目录结构、开发指南、截图占位
- [x] `docs/setup-guide.md`：环境要求、三种数据库方式、环境变量表、生产构建、10 分钟演练清单、常见问题
- [x] `docs/api-reference.md`：全部 23 个 route 文件 / 31 个端点的请求、响应、错误码
- [x] `Dockerfile`（多阶段，standalone 运行层 + 一次性 migrate 层）+ `docker-compose.yml`（PostgreSQL 16 + migrate + app，健康检查与依赖顺序）+ `.dockerignore`
- [x] `next.config.mjs` 增加 `output: "standalone"`（本地 dev/start 不受影响）
- [x] 全新环境演练：`git clone → npm ci → db:dev（自动 initdb）→ db:setup → build → start → test:smoke 17/17` ✅
- [x] 顺带修复：`.eslintrc.json` 内容为 CommonJS 导致 `npm run lint` 报错 → 改名 `.eslintrc.js`；`.pgdata/`、`.screenshots/` 被误提交 → 移出追踪并补齐 `.gitignore`（`db:dev` 缺 `.pgdata` 会自动 initdb，克隆后零手工初始化）

> 注：本机无 Docker，`docker compose` 未实际构建运行；compose 文件已通过 YAML 校验，依赖的 standalone 构建路径已在演练中验证。

---

## 四、已知技术债 / 待改进

| 项 | 说明 | 建议 |
|---|---|---|
| Mock 媒体是 SVG 占位 | `services/ai/mock-media.ts` 生成渐变图，非真实视频流 | 接入真实供应商后由 `live-ai.service.ts` 返回真实 URL |
| 真实 AI 供应商未接入 | `AI_MODE=live` 时回退到 Mock 并打警告 | 实现 `live-ai.service.ts` 并在 `services/ai/index.ts` 注册 |
| 团队审批流未实现 | `TeamJoinRequest` 已建表，缺少审批 UI/接口 | 补 `GET/PATCH /api/workspaces/requests` + 团队管理页 |
| 积分只有扣减无充值 | 演示账号靠 `reset-demo` 补满 | 补订阅/充值流程（会员升级按钮目前是占位） |
| 画布节点未与影视工厂真正联动 | 「打通到画布」目前只是跳转 `/canvas` | 补 `POST /api/canvas/[projectId]/import` 把剧本/分镜写成节点 |
| 分镜产物生成是串行 | `VideoBatchDialog` 逐个 await | 可改为并发 + 队列，注意积分并发扣减 |
| 无单元测试 | 只有 E2E 与冒烟 | 补关键纯函数的 Vitest 用例（`lib/utils`、`serializers`、`mock-ai`） |
| 生产迁移用 `migrate deploy` | `db:setup` 已包含 | 上线前确认 `DATABASE_URL` 指向真实 PG |
| 出片前检查/衔接建议未实现 | 需求图 32：出图前检查（必须先解决/建议补齐）与相邻衔接待建议（6 处边界）需新增检查引擎 | 在 `StoryboardSection` 上加检查面板，逻辑挂在拆分镜/生成后 |
| 分析 loading 无「取消」 | 需求图 3 底部状态条带取消按钮，涉及三段串行 fetch 的 AbortController 透传 | 给 IntakeForm 三段请求传 AbortSignal |

---

## 五、关键文件索引（接手者速查）

| 想改什么 | 去哪里 |
|---|---|
| 品牌色 / 全局样式 | `src/styles/globals.css`、`tailwind.config.ts` |
| 导航结构 / 创作中心条目 | `src/lib/constants.ts` → `NAV_ITEMS` / `CREATION_CENTER_ITEMS` |
| 模型清单与积分 | `src/lib/constants.ts` → `*_MODELS` |
| 状态标签与配色 | `src/lib/constants.ts` → `SCRIPT_STATUS_LABEL/COLOR`、`WORKFLOW_STAGES` |
| API 响应规范 | `src/lib/api.ts` |
| 鉴权校验 | `src/lib/session.ts` |
| AI 能力 | `src/services/ai/types.ts`（接口）、`mock-ai.service.ts`（实现） |
| 数据库模型 | `prisma/schema.prisma` |
| 剧本 DTO 映射 | `src/lib/serializers/script.ts` |
| 画布节点 | `src/components/canvas/nodes/`、`src/stores/useCanvasStore.ts` |
| 影视工厂详情页 | `src/components/creation/film-factory/detail/ScriptDetailView.tsx` |
| 测试 | `tests/e2e/`、`scripts/smoke-test.mjs` |
| 共享 UI 组件 | `src/components/shared/`（LoadingSpinner / ErrorBoundary / EmptyState / motion / skeletons） |
| 文档 | `docs/setup-guide.md`、`docs/api-reference.md`、根目录 `README.md` |
| 部署 | `Dockerfile`、`docker-compose.yml`、`.dockerignore`（standalone：`next.config.mjs`） |

---

## 六、最近提交记录（供追溯）

```
feat: add creation center index and placeholder pages for all nav routes
feat: implement video batch generation, video preview player, audio/BGM generation and post-production export panel
feat: implement script detail page with workflow tabs, episode list, content editor, asset sidebar, storyboard grid and 4-tab split dialog
feat: add consult, asset extraction/generation, storyboard split/edit/generate and recap APIs
feat: implement INTAKE form, AI analysis loading, review dialog and finalize flow with smoke test
feat: implement film factory homepage with script list, status stats, grouped sections and scripts API
feat: implement React Flow canvas editor with 7 node types, animated edges, panels, undo/redo and autosave
feat: implement canvas project management with CRUD API, grid/list views, context menus and team tabs
feat: implement featured works gallery with horizontal scroll, work cards and screenshot tooling
feat: implement workbench generation panel with reference upload, @ mentions, model/param selectors and AI generate API
feat: implement global NavBar with workspace switcher, tapies badge, user menu and team dialogs
feat: implement NextAuth credentials auth with register, middleware guard, shadcn UI primitives and auth pages
feat: add Prisma schema with 15 domain models, migration, embedded dev database and seed data
feat: initialize Next.js 14 project with Tailwind CSS, shadcn-ready theme and base utils
```

> 最新代码状态见 `git log --oneline`；`test:e2e` 新增的 `tests/e2e/*.spec.ts` 与 `playwright.config.ts` 在最近一次提交中。

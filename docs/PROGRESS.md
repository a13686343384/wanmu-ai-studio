# 进度与交接（PROGRESS）

> **最后更新：** 2026-09-11（API 调试计划书 15 项落地 + 统一模型配置 + 2 万字开发详情书）
> **开发详情书：** 项目根目录 `开发详情书.md`（现状全景 / 后续路线图 / 盈利策略 / 风险，约 2 万字）
> **当前状态：** 21 个基础任务 + 备忘录需求 + 真实 AI 接入 **全部完成并已提交**（最新 commit 见 `git log`）。
> **验证基线：** `tsc --noEmit` 0 错误 · `npm run build` 成功 · 冒烟 **17/17** · E2E **40/40**（mock 模式）。
> **AI 模式当前值：** `ai_mode = mock`（默认；插件页「AI 服务」开关可切 live，已实测真实 Qwen 调用成功）。

---

## 2026-09-11 返工执行补充：开发与部署启动方式

本段是 API 调试计划书返工中的启动约定；下方历史“全部完成 / 40条通过”是旧交付记录，不能作为本次返工验收结论。新一轮验收结果以 `docs/plans/2026-09-11-api-debug-execution-log.md` 为准。

- 本地仍先在独立终端运行 `npm run db:dev`，然后执行 `npm run dev`。`dev` 现在通过 `scripts/run-app.mjs` 同时启动 Next.js（固定 3000 端口）和持久任务 worker，无需用户另记启动 worker 的步骤。
- 生产环境执行数据库迁移和 `npm run build` 后，`npm run start` 同时运行 Web 与 worker；进程管理器应监督此父进程并在失败后重启。任一子服务退出会停止其配对服务，防止页面存活而任务永远排队。
- 需要 Web/worker 分容器部署时，Web 使用 `npx next start --port 3000`，worker 使用 `npm run tasks:worker`；两者须连接同一个 PostgreSQL、使用相同应用配置和正确的 `NEXTAUTH_URL`。不要同时使用组合启动和独立 worker 来无意增加并发量。
- Ctrl+C / SIGTERM 会向本次创建的子进程组发出停止信号；10秒未退出才强制回收本次进程组。当前无法取消的供应商请求可能结果不明，不会自动重放收费请求；超过2分钟无心跳的任务标记中断，并释放它持有的镜头生成状态，保留已有文件，用户确认后仅重试剩余项。
- 更新 Prisma schema 并执行迁移/生成 Client 后，需要重启开发服务，避免进程级 Prisma 单例仍使用旧模型字段。新字段在数据库已保存但 API 未返回时，先检查这一点。


## ⚡ 断点续写指引（新会话/新 Agent 从这里开始）

1. **读我**：本文件「五、最近一轮工作明细（2026-09-10）」+ `docs/plans/2026-09-10-live-ai-integration.md`（计划，已全部勾选）+ 同名 `.log.md`（执行日志）。
2. **环境**：`npm run db:dev`（内嵌 PG 常驻）→ 若端口 3000 无响应，重启 dev server（**新增路由文件后必须重启**，否则路由清单缓存导致 404，这是本仓库已知坑）。
3. **AI 模式切换**：页面入口 = `/plugins` 页顶部「AI 服务」卡片开关；程序入口 = `PATCH /api/settings/ai {"mode":"live"|"mock"}`；存储 = SystemSetting 表 key `ai_mode`。**当前值为 mock。**
4. **凭据**：已落 `Credential` 表（「阿里云 Qwen（token-plan）」「DeepSeek」「ComfyUI 本地」三条）；`scripts/setup-live-ai.mjs` 幂等重跑。

### 待办（按优先级）
1. **ComfyUI 8118 不可达**（ping 通、端口拒连）：需在 Win11 主机启动 ComfyUI 并放行 8118。完成后到 `/plugins` 点「测试连接」，出图/出视频即自动走本地通道（模板已入库：Z-Image Turbo 文生图 + MiniMaxH3 四参考图图生视频，见 `src/services/ai/comfy/`）。如需远程操作 Win11，用户本机有 Windows App 可远程连接。
2. **线上出图通道**：token-plan 的 `/images/generations` 对 wan2.7-image 返回 `url error`（接口形态待查）；短期方案 = 在插件页用 16 模板接入任意线上出图 API（CustomModel kind=image 优先级高于 ComfyUI）。
3. **generateAudio（live）**：返回明确「暂未配置」；可按同样方式接 TTS 模板。
4. **Z_image UI→API 转换脚本**（可选）：已用代码内置 API 模板替代，未做离线转换脚本。
5. **live 模式 E2E**：`scripts/verify/verify-live-ai.cjs`（切换开关 + 真实调用验证）；全量 E2E 需保持 mock 模式。

### 本轮提交索引（新→旧）
| commit | 内容 |
|---|---|
| 6a3bf1c | 真实 AI 服务接入（Qwen 主力文本 + DeepSeek 辅 + ComfyUI）+ MOCK 开关 |
| 7c2dcde | 合并弹窗人物列表溢出修复（grid min-width:auto） |
| 9e0feb8 | 生成接口兼容旧前端复数 kind 参数 |
| ac1a18d | 剧本创作列表对齐影视工厂 + 分集条滚动条可见 |
| e78c25d | 全局字号 7 级 / 弹窗 4 档规范 + 生成按钮参数修复 |
| 7b95943 | 提示词模板按类型区分 + 场景卡与空间资产弹窗 |
| 35c9332 / 55210ef / 17f3d13 | 道具卡 / 妆造卡 / 角色卡操作条与更多菜单 |
| 4455acb | API 调试计划书 15 项（两步出资产/镜组/段弹窗/视频占位/卡面模板等） |
| 94895ad | 统一模型配置体系（CustomModel 单一入口 + transformBody + 字幕 ASR + /ai-settings） |
| 355800b | 剧本创作宽度/404、电商 JSON 报错、画布工具条居中等 4 问题 |

---

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
| 22 备忘录需求 | ✅ | 文字+93 截图全量读取；全局快修、画布九项、影视工厂七项、剧本创作样式统一、插件模型配置（16 模板+凭据）、电商设计室（商品套图+A+ 详情页） |
| 23 新增模块 | ✅ | 剧本创作（WritingProject+版本/导入）、素材上传（MediaFile）、资产配置弹窗、出片前检查、任务队列 |

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
| 画布操作页本地上传不持久 | 本地文件走 ObjectURL，刷新后丢失（生成产物 dataUrl 可持久） | 上传改走对象存储或写入生成记录 |
| 导演台为单机嵌入 | 3D 导演台静态包 iframe 嵌入，场景数据存 localStorage | 接 OSS 场景同步与全景资产库 |
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


---

## 五、最近一轮工作明细（2026-09-10 · 真实 AI 接入 + 四轮 UI/功能修复）

### 5.1 真实 AI 服务接入（commit 6a3bf1c）
- **配置**：`SystemSetting` 表（`ai_mode` / `ai_providers`）；凭据在 `Credential` 表；`lib/settings.ts` 5s 缓存读写。
- **文本（11 能力全真实）**：建档分析/会诊/会诊对话/台词优化/大纲/分集摘要/角色·场景·道具提取/分镜拆分/编剧写作/自由文本 → **Qwen3.7-plus 主力**（token-plan OpenAI 兼容端点），失败自动 failover DeepSeek；JSON 提取带一次修复重试。实现：`src/services/ai/live-ai.service.ts` + `live/openai-chat.ts`。
- **图片/视频**：顺序 = 线上 CustomModel(kind=image|video，插件 invoke 引擎) → 本地 ComfyUI（Z-Image Turbo 文生图 / MiniMaxH3 四参考图图生视频，模板在 `src/services/ai/comfy/workflows/`，客户端 `comfy/client.ts`：ping/upload/prompt/history/view，产物落 MediaFile）→ 明确报错（不静默回 Mock）。
- **MOCK 开关**：`/plugins` 页「AI 服务」卡片；`getAIService()` 为 mode-aware Proxy，切换即时生效，调用方零改动。
- **端到端已实测**：live 模式 analyzeScript 返回真实 Qwen 立项方案；切回 mock 行为复原；ComfyUI 测试按钮返回清晰不可达提示。

### 5.2 资产侧栏（影视工厂右栏，严格按需求图）
- 角色卡：悬浮「下载原图/上传本地替换/编辑(出角色参考图弹窗)/更多」；更多菜单六项 = 重新出图 / 清空参考图 / 上传图替换 / 锁定（再生成不覆盖，批量跳过锁定）/ 合并到...（去重，别名并入+删除源角色）/ 删除（确认弹窗）。
- 妆造卡：大图卡（名字徽标+状态徽标），悬停「重出（确认弹窗，挂角色脸+道具参考）/ 替换（文件选择框）」，生成按钮置顶。
- 道具卡：大图卡，悬停「重出 / 替换 / 编辑（编辑道具卡弹窗：所属人物/名称/外观细节）/ 删除(红)」。
- 场景卡：大图卡，更多菜单以「空间资产（多角度/侧别/…）」替换合并项；空间资产弹窗 = 双模型 + 比例 12 档 + 清晰度 + 画质锁定低画质 + 多角度 5 宫格（俯视/正向/反向/左侧/右侧）+ 侧别锁定卡 + 光影设计卡（`POST /api/scripts/[id]/scenes/[sceneId]/spatial`）。
- 提示词模板按 Tab 独立（角色/妆造/道具/场景四字段）。

### 5.3 剧本创作模块对齐影视工厂
- 列表页同构：三行标题（眉标+徽标/h1/描述）+ 统计卡 + 同款搜索/排序/新建；场记板卡片（WR 编号/标题状态/简介/集数）；宽度实测与影视工厂一致（1152px）。
- 卡片菜单 = 置顶/编辑(重命名 PATCH)/删除(AlertDialog)；整卡点击守卫含 `[role='menuitem']`。
- 详情分集条去掉 scrollbar-hide（滚动条可见，能翻到最后一集）。

### 5.4 全局设计规范
- 字号 7 级（3xl/2xl/lg/base/sm/xs/[11px]/[10px] 下限），离群字号已归一，全局行高在 globals.css；弹窗 4 档（sm/md/lg + XL 2xl~4xl & 88vh）；文档在 globals.css 头部与 AGENTS.md 4.5。

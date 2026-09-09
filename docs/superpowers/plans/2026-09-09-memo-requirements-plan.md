# 备忘录需求（2026-09-09 版）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落实用户备忘录（系统备忘录 2026-09-09 笔记，正文 3 万字 + 93 张截图，已导出至 `/tmp/note-text.txt` 与 `/tmp/note-images/`）中的全部新需求：全局快修、画布九项、影视工厂七项、剧本创作样式统一、插件模型配置系统、电商设计室（商品套图 + A+ 详情页）。

**Architecture:** 全部在现有 Next14 App Router / React18 / Tailwind3 / Prisma6 / React Flow 仓库内增量实现。插件模型配置为新增子系统（Prisma `CustomModel`/`Credential` + 模板化调用引擎 + `/plugins` 页面）；电商设计室为新增子系统（Prisma `EcomProject` + `/creation/ecommerce` 页面 + 复用 AI 抽象层生成）。AI 能力一律走 `src/services/ai` 抽象层。

**Tech Stack:** Next.js 14 App Router · React 18 · TS strict · Tailwind v3 · shadcn/Radix · @xyflow/react v12 · Prisma 6 + PostgreSQL · Playwright。

**Spec:** 用户系统备忘录（文本副本 `/tmp/note-text.txt`，图片 `/tmp/note-images/img-01..93.png`，清单 `manifest.txt`）。背景参照 `docs/REFERENCE-AUDIT.md`（另一会话已完成并待验收的部分，见「前置状态」）。

## Global Constraints

- 仅深色主题；卡片 `bg-zinc-900/40 border-zinc-800 rounded-xl`；主按钮 `variant="brand"`；禁止引入第二套色板。
- AI 调用必须走 `getAIService()` 抽象层；新增能力先 `types.ts` 接口 → mock → 路由。
- API Route 只导出 HTTP 处理函数；统一 `jsonOk/jsonError`；鉴权走 `requireUser()` + 工作区成员链路。
- 枚举/常量进 `src/lib/constants.ts`；表单校验进 `src/lib/validations/`。
- 每个任务完成即提交（Conventional Commits）；提交前 `npx tsc --noEmit` 必须 0 错误，涉及行为改动的任务跑对应 Playwright 用例。
- 环境注意：本机后台进程会被周期回收，验证前先确认 3000/5432 端口服务存活；`npm run build` 前停 dev server。

## 前置状态（不重做）

另一会话已实现并留存在工作区（待与本计划首批改动一起提交）：剧本创作模块（WritingProject + 版本/导入）、MediaFile 上传、画布 Composer 参数持久化、侧栏定位适配、资产配置弹窗 `AssetSetupDialog`、分镜出片前检查 `StoryboardChecks`、生成 API 原子扣费与 smartLyrics 透传、Agent 生成写回画布。

## 任务总览（6 个阶段 / 24 个任务）

| 阶段 | 任务 | 产出 |
|---|---|---|
| P1 全局快修 | T1.1 banner 变宽；T1.2 删 @ 按钮；T1.3 下拉框选中/未选中分离 | 首页与全局下拉 |
| P2 画布 | T2.1 新建项目卡一致；T2.2 三点菜单报错；T2.3 文本工具条生效；T2.4 输入框范围可见；T2.5 视频点播；T2.6 移除底部吸附；T2.7 Agent 栏对齐原型；T2.8 侧栏收起标签+动画 | 画布操作页九项 |
| P3 影视工厂 | T3.1 卡片浮动+整卡可点；T3.2 置顶/编辑/删除；T3.3 资产栏重构（妆造库/道具库/场景+顶部按钮排）；T3.4 删中间批量按钮；T3.5 下一步·出视频+步骤输电动效；T3.6 查看全部信息+平台节奏档案；T3.7 任务队列+停止全部 | 影视工厂七项 |
| P4 剧本创作 | T4.1 样式统一审查与修复 | 样式一致 |
| P5 插件 | T5.1 数据模型+迁移；T5.2 模板注册表（16 模板）；T5.3 调用引擎+API；T5.4 凭据 API+UI；T5.5 /plugins 页面（列表+配置弹窗） | 模型配置系统 |
| P6 电商设计室 | T6.1 数据模型+API；T6.2 套图表单页；T6.3 生成流程+结果网格+预览+记录；T6.4 A+详情页；T6.5 导航与路由接线 | 电商设计室模块 |

---

# P1 全局快修

### Task 1.1: 首页 banner 变宽

**Files:**
- Modify: `src/components/workbench/HeroSection.tsx:186`

**Interfaces:** 无接口变更，仅样式。

- [ ] **Step 1: 放宽容器宽度**

`HeroSection.tsx` 中内容容器 `max-w-5xl` 改为 `max-w-6xl`，生成面板标题区同步：`<div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:pt-20 lg:px-6">`。同时把背景光晕的横向范围放大（`-left-40` → `-left-64`，`-right-32` → `-right-48`），视觉上铺满更宽的 banner。

- [ ] **Step 2: 视觉验证**

`node scripts/screenshot.mjs /` 后查看 `.screenshots/`，banner 明显宽于之前并与需求图 1 比例接近。

- [ ] **Step 3: Commit**

```bash
git add src/components/workbench/HeroSection.tsx
git commit -m "fix: widen workbench hero banner per memo"
```

### Task 1.2: 删除输入框下方单独的 @ 按钮

**Files:**
- Modify: `src/components/workbench/PromptInput.tsx`

**Interfaces:** 删除后保留 textarea 内输入 `@` 唤起素材列表的既有逻辑（`mentionOpen` state 与 Popover 保留，仅移除常驻触发按钮）。

- [ ] **Step 1: 移除常驻 @ 触发按钮**

删除 `PromptInput.tsx` 中 `<PopoverTrigger asChild><button ... aria-label="引用素材">` 整个按钮节点；将 Popover 的 `PopoverTrigger` 改为包裹一个隐藏 span：`<PopoverTrigger asChild><span className="hidden" /></PopoverTrigger>`（保留 `mentionOpen` 受控逻辑，输入 `@` 仍可唤起）。

- [ ] **Step 2: 验证**

手动：输入 `@` 仍弹出素材列表；页面上不再有独立的 @ 按钮。`grep -c "引用素材" src/components/workbench/PromptInput.tsx` 为 0。

- [ ] **Step 3: Commit**

```bash
git add src/components/workbench/PromptInput.tsx
git commit -m "fix: remove standalone @ trigger from workbench prompt"
```

### Task 1.3: 下拉框选中区与未选中区视觉分离

**Files:**
- Modify: `src/components/ui/dropdown-menu.tsx`（DropdownMenuContent 基类加内边距）
- Modify: `src/components/canvas/studio/StudioComposer.tsx`、`src/components/workbench/ModelSelector.tsx`（模型类下拉的选中项加分隔）

**Interfaces:** 无接口变更。

- [ ] **Step 1: 全局下拉留出间隙**

`dropdown-menu.tsx` 的 `DropdownMenuContent` 基类 `sideOffset = 6` 改为 `sideOffset = 10`，内容基类加 `p-1.5`。

- [ ] **Step 2: 选中项与未选中项分隔**

在 `StudioComposer.tsx` 与 `ModelSelector.tsx` 的模型 DropdownMenuItem 上：选中项 className 追加 `mb-1.5 border-b border-zinc-800 pb-2`（渲染在列表首位时与后续项形成分隔线 + 间距）。

- [ ] **Step 3: 验证 + Commit**

打开工作台模型下拉目检：选中项与下方未选中项之间有分隔线与间距。

```bash
git add src/components/ui/dropdown-menu.tsx src/components/canvas/studio/StudioComposer.tsx src/components/workbench/ModelSelector.tsx
git commit -m "fix: visually separate selected item in dropdowns per memo"
```

---

# P2 画布（9 项）

### Task 2.1: 新建项目卡与普通卡高度一致、图标居中

**Files:**
- Modify: `src/components/canvas/NewProjectCard.tsx`

- [ ] **Step 1: 高度对齐**

网格视图按钮容器由 `aspect-video` 改为固定与 ProjectCard 等高：外层 `flex h-full min-h-[188px] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40`，并在 `CanvasProjects.tsx` 网格子项上统一 `items-stretch`（NewProjectCard 与 ProjectCard 同格等高）。列表视图保持现状。

- [ ] **Step 2: 验证 + Commit**

打开 `/canvas`，个人/团队两个 Tab 下新建卡与项目卡等高、+ 图标水平垂直居中。

```bash
git add src/components/canvas/NewProjectCard.tsx src/components/canvas/CanvasProjects.tsx
git commit -m "fix: align new-project card height with project cards"
```

### Task 2.2: 修复项目卡「三个小点」报错

**Files:**
- Modify: `src/components/canvas/ProjectCard.tsx`、`src/components/canvas/CanvasProjects.tsx`

- [ ] **Step 1: 复现并定位**

新创建项目（无 folder/部分字段 null）点击右上角 `MoreVertical` → `actions.onMove` 中 `workspaces.find(...)` 结果可能为 undefined 时 `setMoveTarget("")` 正常；报错点更可能是 `DropdownMenuContent` 内 `menu` JSX 在 ContextMenu 与 Dropdown 两处渲染同一份导致的 key/上下文问题。修复：`const menu = (scope: "context" | "dropdown") => <MenuItems ... />` 分别渲染两份实例，禁止同一元素树复用；`ProjectCardActions` 增加 `onOpen` 必须兜底（`actions.onOpen?.(project)`）。

- [ ] **Step 2: 验证**

E2E：`tests/e2e/canvas.spec.ts` 已有「项目卡片右键菜单包含全部操作」；补充点击 Dropdown 触发按钮后无页面错误（监听 `pageerror`）。

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/ProjectCard.tsx src/components/canvas/CanvasProjects.tsx tests/e2e/canvas.spec.ts
git commit -m "fix: prevent project card dropdown error for fresh projects"
```

### Task 2.3: 文本节点格式工具条对选中文本生效

**Files:**
- Modify: `src/components/canvas/studio/nodes.tsx`（StudioTextNode）

- [ ] **Step 1: 工具条改为作用于选区**

替换 `formatActions`：为每个 action 增加 `wrap(before, after)` / `prefixLine(prefix)` 两类实现，基于 textarea 的 `selectionStart/selectionEnd`：

```ts
function wrapSelection(before: string, after: string) {
  const el = taRef.current!; // textarea ref
  const { selectionStart: s, selectionEnd: e, value } = el;
  const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
  updateNodeData(id, { text: next });
  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length); });
}
function prefixLine(prefix: string) {
  const el = taRef.current!;
  const { selectionStart: s, value } = el;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  updateNodeData(id, { text: value.slice(0, lineStart) + prefix + value.slice(lineStart) });
}
```

动作映射：H1/H2/H3 → `prefixLine("# "/"## "/"### ")`；❝ → `prefixLine("> ")`；B → `wrapSelection("**","**")`；I → `wrapSelection("*","*")`；• → `prefixLine("- ")`；1. → `prefixLine("1. ")`；— → 光标处插入 `\n---\n`。

- [ ] **Step 2: 验证**

选中一段文字点 B，星号包裹选区而非追加到末尾；空选区点 H1 在行首插入。

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/studio/nodes.tsx
git commit -m "fix: text format toolbar operates on selection in studio text node"
```

### Task 2.4: 节点内输入框底色与边框对比可见

**Files:**
- Modify: `src/components/canvas/studio/nodes.tsx`、`StudioComposer.tsx`

- [ ] **Step 1: 统一输入控件样式**

所有节点内 `textarea/input/select` 统一为 `border-zinc-700 bg-zinc-950/80 text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/60`（把现有 `border-zinc-800 bg-zinc-900/60|70` 全量替换；`grep -n "border-zinc-800 bg-zinc-9" nodes.tsx StudioComposer.tsx` 逐处替换）。卡片容器底色为 `bg-zinc-900/80`，输入框底色更暗 + 边框更亮，范围清晰。

- [ ] **Step 2: 验证 + Commit**

目检文本/图片/视频/音频/动作导演节点选中态，输入框边界清楚。

```bash
git add src/components/canvas/studio/nodes.tsx src/components/canvas/studio/StudioComposer.tsx
git commit -m "fix: make studio node inputs visually distinct from card"
```

### Task 2.5: 视频节点只能点击播放按钮播放

**Files:**
- Modify: `src/components/canvas/studio/nodes.tsx`（StudioVideoNode）

- [ ] **Step 1: 移除原生 controls，改为封面 + 播放键**

把 `<video controls>` 改为无 controls 的封面（`<video src muted playsInline preload="metadata">` + 居中大播放键）。播放键 onClick → `videoRef.current?.play()`，播放中点击暂停；节点 `nodrag nowheel` 已有，保证播放按钮点击不拖动节点。删除 `controls` 属性后文件拖拽下载入口消失。

- [ ] **Step 2: 验证 + Commit**

拖动视频节点不再触发下载/拖文件；点播放键才播放。

```bash
git add src/components/canvas/studio/nodes.tsx
git commit -m "fix: studio video node plays only via play button"
```

### Task 2.6: 移除底部工具条的吸附按钮

**Files:**
- Modify: `src/components/canvas/studio/CanvasStudio.tsx`

- [ ] **Step 1: 删除两处吸附入口**

删除底部工具条的 `Magnet` 按钮（`aria-label="网格吸附设置"`）与缩放控件条中的同名按钮；`snapToGrid` state 与 `snapGrid` 保留（默认关闭，小地图菜单后续接管）。同时删除 `Magnet` 导入。

- [ ] **Step 2: 验证 + Commit**

底部工具条仅剩 + 与六类节点图标。

```bash
git add src/components/canvas/studio/CanvasStudio.tsx
git commit -m "fix: remove duplicate snap toggle from studio bottom toolbar"
```

### Task 2.7: Agent 栏对齐产品原型（图 25）

**Files:**
- Modify: `src/components/canvas/studio/AgentDock.tsx`

- [ ] **Step 1: 结构对齐**

按 img-25 重排：顶部行 `工作流 NEW` 徽章 + `◆ Manvo Agent` + 「默认模型」下拉（含图片/视频/文本/音频四 Tab 与模型清单、底部「自动执行计划」开关）；中部留白；底部问候区 `· Hi 用户0272!` + `今天一起创作点什么？` 大字 + 建议 chips 两行（来点灵感/写段文案/拆个分镜/这段有点平/梳理一下叙事）+ 输入卡（左上 Video 引用小卡 + 加号、placeholder「描述你想对引用节点执行的操作」、左下 风格、右下发送）。宽度 380px、背景 `bg-zinc-950/95`、整体圆角左侧。

- [ ] **Step 2: 行为接线**

发送时：若有选中节点 → 按节点类型调 `/api/ai/generate` 写回节点（复用 StudioComposer 的请求逻辑，抽 `generateForNode(nodeId, prompt)` 到 `StudioComposer.tsx` 导出共用）；无选中 → toast「请先选择一个节点」。引用小卡显示当前选中节点类型图标。

- [ ] **Step 3: 验证 + Commit**

对照 img-25 目检；发送后选中节点产物更新。

```bash
git add src/components/canvas/studio/AgentDock.tsx src/components/canvas/studio/StudioComposer.tsx
git commit -m "feat: restyle agent dock to match product mock"
```

### Task 2.8: 侧栏收起改为左侧标签按钮 + 展开收起动画

**Files:**
- Modify: `src/components/canvas/studio/CanvasStudio.tsx`、`StudioSidebar.tsx`

- [ ] **Step 1: 收起态标签**

`sidebarOpen=false` 时在画布左缘渲染竖排标签按钮：`fixed left-0 top-16 h-9 w-7 rounded-r-lg border border-l-0 border-zinc-800 bg-zinc-900/90 text-zinc-400`，内含竖排文字「画布」（writing-mode: vertical-rl），点击 `setSidebarOpen(true)`。

- [ ] **Step 2: 展开收起动画**

侧栏容器加 framer-motion：`<motion.aside initial={{ x: -236 }} animate={{ x: 0 }} exit={{ x: -236 }} transition={{ duration: 0.22, ease: "easeOut" }}>`，外层包 `<AnimatePresence>`；收起按钮点击 `setSidebarOpen(false)`。

- [ ] **Step 3: 验证 + Commit**

收起 → 侧栏滑出并留竖标签；点击标签滑入。无横向滚动。

```bash
git add src/components/canvas/studio/CanvasStudio.tsx src/components/canvas/studio/StudioSidebar.tsx
git commit -m "feat: collapsible studio sidebar with tab affordance and slide animation"
```

---

# P3 影视工厂（7 项）

### Task 3.1: 剧本卡 hover 浮动 + 整卡可点击

**Files:**
- Modify: `src/components/creation/film-factory/ScriptCard.tsx`

- [ ] **Step 1:** 卡片根容器加 `cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)]`，onClick（除 MoreVertical/按钮外）`router.push(/creation/film-factory/${script.id})`；内部既有 Link 保留（事件冒泡去重：根 onClick 检查 `event.target.closest('button,a')` 为空才跳转）。

- [ ] **Step 2: 验证 + Commit**

hover 上浮有阴影；点击卡片任意空白区进入详情。

```bash
git add src/components/creation/film-factory/ScriptCard.tsx
git commit -m "feat: script card hover lift and whole-card click"
```

### Task 3.2: 卡片菜单：置顶 / 编辑 / 删除

**Files:**
- Modify: `src/components/creation/film-factory/ScriptCard.tsx`、`ScriptList.tsx`
- Create: `src/components/creation/film-factory/RenameScriptDialog.tsx`

- [ ] **Step 1: 菜单项**

DropdownMenu 改为：置顶（`Pin` 图标）/ 编辑（`Pencil`）/ 删除（destructive）。置顶为前端排序：`ScriptList` 增加 `pinnedIds: string[]` state（localStorage 按 userId 持久化 `wanmusheng.pinnedScripts`），排序时 pinned 在前。编辑打开 `RenameScriptDialog`（复用 `RenameDialog` 组件，标题「编辑剧本」、字段 title，PATCH `/api/scripts/[id]` title/synopsis）。

- [ ] **Step 2: 验证 + Commit**

点置顶该卡移到列表首位（刷新仍在）；点编辑改标题生效；删除维持原逻辑。

```bash
git add src/components/creation/film-factory/ScriptCard.tsx src/components/creation/film-factory/ScriptList.tsx src/components/creation/film-factory/RenameScriptDialog.tsx
git commit -m "feat: pin/edit/delete actions on script cards"
```

### Task 3.3: 右侧资产栏重构（妆造库 / 道具库 / 场景 + 手动添加 + 顶部按钮排）

**Files:**
- Modify: `prisma/schema.prisma`（+`prisma migrate dev --name asset_kinds`）
- Create: `src/app/api/scripts/[id]/assets/custom/route.ts`
- Modify: `src/components/creation/film-factory/detail/AssetSidebar.tsx`、`src/lib/serializers/script.ts`

**Interfaces:**
- 新表复用 `Asset` 模型扩展：`Asset.kind` 增加枚举值 `outfit`（妆造）；新增可空列 `parentCharacterId String?`（关联人物，道具/造型用）。迁移 SQL：`ALTER TABLE "Asset" ... `（以 `prisma migrate dev` 生成）。
- API：`POST /api/scripts/[id]/assets/custom` body `{ kind: "outfit"|"prop"|"scene", name, description, parentCharacterId? }` → `requireScriptAccess` 后 `prisma.asset.create`（复用现有 Asset 表结构时按实际字段；若 Asset 为分表则改用各表 create）。序列化器把 outfit 并入 characters 输出的 `outfits[]` 子结构。
- GET 现有 `/api/scripts/[id]` 返回增加 `outfits`。

- [ ] **Step 1: 数据与 API**

按上述 Interfaces 实现迁移与路由；`src/lib/validations/generation.ts` 增加 `customAssetSchema`。

- [ ] **Step 2: 侧栏 UI 重构**

`AssetSidebar`：Tab 改为 `角色 N / 妆造库 N / 道具库 N / 场景 N`；标题行右侧按钮排（img-09）：刷新（重提取）、打包下载（`下载本剧全部图` toast 占位 + 逐张触发下载）、补缺漏提取（调 extract 后只补缺失类）、提示词模板（Popover：textarea 编辑模板 + 保存到 localStorage）、+（当前 Tab 的手动添加弹窗）。妆造 Tab 每个人物分组展示其造型子项，卡片右上「+ 新建造型」打开弹窗（img-06：所属人物下拉只读、造型名称、适用情节、服装与发型描述）；道具 Tab「+ 新建道具」弹窗（img-07/08：所属人物可选=独立道具、名称、外观细节）；场景 Tab「+ 添加场景」弹窗（名称/描述）。添加即调 custom API 并刷新。

- [ ] **Step 3: 验证 + Commit**

新增造型/道具/场景后列表即时出现；妆造卡归属正确人物分组。

```bash
git add prisma/ src/ tests/
git commit -m "feat: asset sidebar with outfit library, manual props/scenes and toolbar"
```

### Task 3.4: 删除中间「批量生成分镜」按钮

**Files:**
- Modify: `src/components/creation/film-factory/detail/StoryboardSection.tsx`

- [ ] **Step 1:** 空态 `EmptyState` 的 action 只保留「先让 AI 复述理解本集（推荐）」，删除「批量生成分镜」按钮；顶部工具条的按钮文案固定为「下一步 · 拆分镜」（有分镜时「重新拆分镜」），onClick 走既有 `onSplit`。

- [ ] **Step 2: 验证 + Commit**

`grep -c "批量生成分镜" src/components/creation/film-factory/detail/StoryboardSection.tsx` 为 0；film-factory E2E 中 `批量生成分镜` 相关断言改为 `下一步 · 拆分镜`。

```bash
git add src/components/creation/film-factory/detail/StoryboardSection.tsx tests/e2e/film-factory.spec.ts
git commit -m "fix: remove center batch-storyboard button per memo"
```

### Task 3.5: 下一步 · 出视频 + 步骤连接线输电动效

**Files:**
- Modify: `src/components/creation/film-factory/detail/ScriptDetailView.tsx`、`WorkflowTabs.tsx`、`SplitStoryboardDialog.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- `SplitStoryboardDialog` 增加 prop `initialMode?: "text" | "image" | "video" | "bgm"`，打开时定位到该 Tab。

- [ ] **Step 1: 下一步按钮接出视频**

`ScriptDetailView` 的 `NEXT_STEP_LABEL.storyboarding = "下一步 · 出视频"`；`runNextStep()` 的 `storyboarding` 分支改为 `setVideoBatchMode("video"); setSplitOpen(true)`（传 `initialMode="video"` 给 SplitStoryboardDialog），点开始后既有批量视频逻辑执行。

- [ ] **Step 2: 步骤线输电动效**

`WorkflowTabs` 连接线（`<span class="h-px w-7 bg-zinc-800">`）分三态：已完成段 `bg-emerald-500/60`；当前段（连接 当前→下一阶段）加 CSS 动画类 `power-line`：

```css
.power-line {
  position: relative;
  overflow: hidden;
  background: #27272a;
}
.power-line::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  background: linear-gradient(90deg, transparent, #f97316, transparent);
  animation: power-flow 1.2s linear infinite;
}
@keyframes power-flow {
  from { left: -12px; }
  to { left: 100%; }
}
```

已完成段绿色（`bg-emerald-500/60`），未开始段保持灰色。

- [ ] **Step 3: 验证 + Commit**

拆完分镜后右上角按钮变「下一步 · 出视频」，点击直接开出视频 Tab 并批量生成；步骤线当前段有流动光效。

```bash
git add src/components/creation/film-factory/detail/ src/styles/globals.css
git commit -m "feat: next-step video action and powered step connectors"
```

### Task 3.6: 查看全部信息弹窗 + 平台节奏档案

**Files:**
- Create: `src/components/creation/film-factory/detail/ScriptInfoDialog.tsx`、`PacingProfileDialog.tsx`
- Modify: `ScriptDetailHeader.tsx`、`ScriptDetailView.tsx`、`src/app/api/scripts/[id]/route.ts`

- [ ] **Step 1: 查看全部信息弹窗**

`ScriptInfoDialog`（img-16）：分区展示 剧本信息（标题/集数/总时长/类型/题材/基调/梗概）、创意来源（idea）、叙事要求、角色概览、故事梗概、第一集预览（只读，数据全部来自已有 `ScriptDetail`）。顶部「查看全部信息」按钮 onClick 打开。

- [ ] **Step 2: 平台节奏档案**

`PacingProfileDialog`（img-17）：表单字段 = 发布平台（多选 chips：抖音/快手/小红书/视频号/B站/淘宝）、直播节奏（`8/16, 21/9, 219/71` 格式输入）、节奏强度（高强度/中高强度/中低强度/弱情节强信息）、前3秒任务（强钩子/冲突钩子/情感钩子/人物反差）、前15秒推进（推进/反转/疑引人/人物滤镜）、前30秒任务（一次有效信息增量/情绪推进/关系变化）、悬念布局（哪位位置允许草、允许多久、为什么留得住）、留白要求（哪个允许钩/线索/线没锁着看多久）、完结目标（留住用户继续看/评论/转发/进入下一集的理由）。持久化：`Script` 模型加 `pacingProfile Json?`（迁移），PATCH `/api/scripts/[id]` 支持该字段；弹窗底部「按作品类型自动派生」按钮调 `/api/ai/generate`（mediaType=text，prompt 按作品类型+题材生成各字段 JSON）回填表单，「保存」写库。

- [ ] **Step 3: 验证 + Commit**

查看全部信息打开信息弹窗；节奏档案可自动派生、保存后重开回显。

```bash
git add prisma/ src/
git commit -m "feat: script info dialog and pacing profile editor"
```

### Task 3.7: 任务队列弹窗 + 停止全部确认

**Files:**
- Create: `src/components/creation/film-factory/TaskQueueDialog.tsx`
- Modify: `ScriptList.tsx`

- [ ] **Step 1: 任务队列弹窗**（img-18）

「任务队列」按钮改为打开 `TaskQueueDialog`：`进行中 N` 分区（当前 `processingStatus==="processing"` 的剧本，含名称/进度标签/开始时间/「停止此任务」→ PATCH processingStatus=idle）与 `历史 N` 分区（已完成/失败：名称 + 完成时间 + 状态点）。数据源：`GET /api/scripts?scope=all` 过滤。

- [ ] **Step 2: 停止全部确认**（img-19）

「停止全部」onClick 打开确认弹窗：「停止全部流程 — 确定要停止当前所有正在跑的工厂流程吗？包括所有剧本的调色/拆本/优化/拆分镜，以及出图/视频批次。已生成的内容不受影响。」取消 + 全部停止（红色）。无进行中任务时按钮 `disabled`（title 提示「没有正在进行的任务」）。

- [ ] **Step 3: 验证 + Commit**

有进行中任务时：队列可见、停止单个/全部生效；无任务时按钮禁用。

```bash
git add src/components/creation/film-factory/
git commit -m "feat: task queue dialog and stop-all confirmation"
```

---

# P4 剧本创作样式统一

### Task 4.1: 剧本创作模块样式对齐系统规范

**Files:**
- Modify: `src/components/creation/script-writing/**`、`src/app/(dashboard)/creation/script-writing/**`

- [ ] **Step 1: 差异清单**

通读 script-writing 全部组件，列出与系统规范不一致点（弹窗是否用 `ui/dialog`、下拉是否用 `ui/select`、按钮 variant、卡片底色边框、圆角、间距）。输出到提交信息正文。

- [ ] **Step 2: 批量修复**

弹窗 → `Dialog` 系组件；下拉 → `Select` 系组件；按钮 → `Button variant`；卡片 → 规范底色边框；删除自绘边框/背景。

- [ ] **Step 3: 验证 + Commit**

`grep -rn "<select\|className=\".*rounded-lg.*bg-black" src/components/creation/script-writing/` 无原生控件；script-writing E2E 仍绿。

```bash
git add src/components/creation/script-writing src/app/\(dashboard\)/creation/script-writing
git commit -m "fix: align script-writing module styles with system ui"
```

---

# P5 插件（模型配置系统）

### Task 5.1: 自定义模型与凭据数据模型

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_plugin_models/migration.sql`（`prisma migrate dev --name plugin_models` 生成）

**Interfaces:**
```prisma
model CustomModel {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  kind        String   // text | image | video | audio
  lifecycle   String   // sync | async
  baseUrl     String
  apiKey      String?
  auth        Json     @default("{}")   // { header, scheme, extra_headers }
  constraints Json     @default("{}")   // ratios/resolutions/duration/max_references/inputs...
  submit      Json     @default("{}")   // { method, path, timeout_sec, body, encoding?, file_field? }
  edits       Json?
  firstLast   Json?
  refRegister Json?
  poll        Json?
  extract     Json     @default("{}")
  result      Json     @default("{}")
  credentialId String?
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  credential  Credential? @relation(fields: [credentialId], references: [id])
  @@index([workspaceId])
}
model Credential {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  baseUrl     String?
  apiKey      String
  models      CustomModel[]
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
}
```

- [ ] **Step 1:** schema 增加上述两模型（Workspace 反向关系 `customModels CustomModel[]`、`credentials Credential[]`），`npx prisma migrate dev --name plugin_models`。

- [ ] **Step 2: 验证 + Commit**

`npx tsc --noEmit` 0 错误；`npx prisma migrate dev` 成功。

```bash
git add prisma/
git commit -m "feat: custom model and credential schema for plugin system"
```

### Task 5.2: 16 个模型模板注册表

**Files:**
- Create: `src/lib/plugins/templates.ts`

**Interfaces:**
```ts
export interface ModelTemplate {
  key: string            // "chat-openai" | "chat-anthropic" | ... | "sfx-sync"
  title: string          // 「对话补全 · OpenAI 兼容」
  kind: "text" | "image" | "video" | "audio"
  lifecycle: "sync" | "async"
  defaults: Partial<CustomModelCfg>   // 与 memo JSON 一致的结构化对象
  previewBody: string    // memo 中的「请求体模板 body」原文
}
export const MODEL_TEMPLATES: readonly ModelTemplate[] = [ /* 16 项 */ ]
```

- [ ] **Step 1:** 把备忘录 16 个 JSON 模板逐字转录为 `defaults` 对象（chat-openai / chat-anthropic / chat-gemini / txt2img / img2img-url / img2img-file / img2img-b64 / img2img-poll / vid-url / vid-assets / vid-first-last / vid-omni-ref / vid-first-last-omni / vid-b64 / music-poll / sfx-sync），`previewBody` 存对应请求体示例。16 个模板的 JSON 全文以 `/tmp/note-text.txt` 为准（第 158–3028 行区间），转录时保持键与默认值一字不差。

- [ ] **Step 2: 验证 + Commit**

`npx tsc --noEmit` 通过；`node -e "console.log(require('ts-node')... )"` 不可用时改用 `npx tsx -e "import({MODEL_TEMPLATES}).then(t=>console.log(t.MODEL_TEMPLATES.length))"` 输出 16。

```bash
git add src/lib/plugins/templates.ts
git commit -m "feat: registry of 16 upstream model templates from memo"
```

### Task 5.3: 模板调用引擎 + 模型 CRUD API

**Files:**
- Create: `src/lib/plugins/invoke.ts`、`src/app/api/plugins/models/route.ts`、`src/app/api/plugins/models/[id]/route.ts`、`src/app/api/plugins/models/[id]/invoke/route.ts`
- Modify: `src/lib/validations/` +`pluginModelSchema.ts`

**Interfaces:**
```ts
// invoke.ts
export async function invokeCustomModel(model: CustomModelCfg, apiKey: string, input: {
  prompt: string; refs?: string[]; count?: number; aspectRatio?: string; resolution?: string; duration?: number;
}): Promise<{ ok: true; url?: string; text?: string } | { ok: false; error: string }>
```
引擎逻辑：渲染 submit.body（`{{model_id}}/{{prompt}}/{{size}}/{{ratio}}/{{resolution}}/{{duration|int}}/{{count|int}}/{{refs}}/{{image_quality|default:"high"}}` 等占位符；`size` 由 constraints.size_table + ratio + resolution 合成）→ fetch（auth header 按 auth.scheme 拼接）→ `extract` 用点路径取值（`choices.0.message.content` → 按 `.` 分段索引）→ status_map 归一化 → `lifecycle==="async"` 时按 poll 配置轮询（interval/deadline/timeout/not_found_grace）→ `result.download && b64` 时转 data URL 返回。

- [ ] **Step 1: CRUD API**

`GET/POST /api/plugins/models`、`GET/PATCH/DELETE /api/plugins/models/[id]`（requireUser + 工作区过滤；apiKey 存库不回显，返回 `hasKey: true`）。

- [ ] **Step 2: 调用引擎 + invoke 路由**

POST `/api/plugins/models/[id]/invoke` body `{ prompt, refs?, count?, aspectRatio?, resolution?, duration? }` → 引擎执行 → `jsonOk({ url?, text? })`。

- [ ] **Step 3: 测试**

新增 `tests/e2e/plugins.spec.ts`：登录 → POST 创建 chat-openai 模型（baseUrl 指向本地 mock）→ invoke 返回 mock 文本 → PATCH 改名 → DELETE。本地 mock 用 Playwright `page.route` 拦截上游地址返回固定 JSON。

- [ ] **Step 4: 验证 + Commit**

`PW_NO_SERVER=1 npx playwright test tests/e2e/plugins.spec.ts` 通过。

```bash
git add src/lib/plugins/ src/app/api/plugins/ tests/e2e/plugins.spec.ts
git commit -m "feat: custom model crud and template invoke engine"
```

### Task 5.4: 凭据管理 API + UI

**Files:**
- Create: `src/app/api/plugins/credentials/route.ts`、`[id]/route.ts`
- Modify: 后续 `/plugins` 页面

- [ ] **Step 1:** 凭据 CRUD（requireUser + 工作区过滤；apiKey 写入时若为空串则保留旧值——编辑回显掩码 `****-key`）。

- [ ] **Step 2:** 验证 + Commit（接口用 Playwright route 拦截断言，或并入 Task 5.5 的页面用例）。

```bash
git add src/app/api/plugins/credentials/
git commit -m "feat: credential crud api"
```

### Task 5.5: /plugins 页面（模型列表 + 配置弹窗 + 凭据）

**Files:**
- Modify: `src/app/(dashboard)/plugins/page.tsx`（替换 ComingSoon）
- Create: `src/components/plugins/PluginSettings.tsx`、`ModelConfigDialog.tsx`、`CredentialPanel.tsx`

- [ ] **Step 1: 页面结构**（img-20~54）

`PluginSettings` 双 Tab：**模型**（列表：名称/kind 徽章/模板名/凭据名；「新建模型」打开 `ModelConfigDialog`）与**凭据**（`CredentialPanel`：列表 + 新建/编辑凭据弹窗 img-56/57 + 每公司「配置公司 Key」入口 img-59）。`ModelConfigDialog`（img-23/45/47/51/53）：顶部「模板化配置 [选择模板下拉] 导入 / 导出」横幅；主体左右分栏 = 可视化表单（基础信息：类型四选、生成模板 HttpSync/HttpAsync、模板名称、提示词名称、上传模式、POST base_url、授权 API Key、超时；async 增加轮询区：POST path / GET path / interval / deadline / not_found_grace；状态提取 status_map）+ 右侧 JSON 实时预览（由表单生成，可切 JSON 编辑反向同步）；底部「导入模板」下拉列出 `MODEL_TEMPLATES` 16 项（选择即回填可视化表单）+ 「从 HTML 导入」。

- [ ] **Step 2: 生成接线**

启用且配置完整的自定义模型出现在画布 Composer/工作台模型下拉的「自定义」分组，选择后生成走 invoke 路由（`getAIService` 增加按模型 id 前缀 `custom:` 的分发，或在 generate 路由先查 CustomModel 表命中则走引擎）。

- [ ] **Step 3: 验证 + Commit**

`/plugins` 可新建模型（导入模板回填→保存→列表出现）；invoke 出图/文本成功（mock 上游）。

```bash
git add src/app/\(dashboard\)/plugins/ src/components/plugins/ src/app/api/ai/generate/route.ts
git commit -m "feat: plugins page with model config dialog, credentials and templates"
```

---

# P6 电商设计室

### Task 6.1: 数据模型 + API

**Files:**
- Modify: `prisma/schema.prisma`（`prisma migrate dev --name ecommerce`）
- Create: `src/app/api/ecommerce/projects/route.ts`、`[id]/route.ts`、`[id]/generate/route.ts`

**Interfaces:**
```prisma
model EcomProject {
  id          String   @id @default(cuid())
  workspaceId String
  module      String   // "set"（商品套图）| "aplus"（A+详情页）
  name        String
  config      Json     @default("{}")   // 出图/规划模型、平台、语言、比例、卖点、结构、风格
  items       Json     @default("[]")   // [{ type, label, prompt, url?, status }]
  status      String   @default("draft") // draft | generating | done | failed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
}
```
API：CRUD + `POST /[id]/generate`（body `{ itemIndexes?: number[] }`；串行逐项调 AI 出图并更新 items/status；失败项标记 failed 可重试）。

- [ ] **Step 1:** schema + 迁移 + CRUD/generate 路由（鉴权同上）。
- [ ] **Step 2:** 验证（tsc + 手动 curl）+ Commit。

```bash
git add prisma/ src/app/api/ecommerce/
git commit -m "feat: ecommerce project model and api"
```

### Task 6.2: 商品套图表单页（左栏）

**Files:**
- Modify: `src/app/(dashboard)/creation/ecommerce/page.tsx`（替换 ComingSoon）
- Create: `src/components/ecommerce/SetImageForm.tsx`

- [ ] **Step 1: 表单结构**（img-66/67/69–76）

左栏 300px：Tab（A+详情 / 商品套图）+ 生成记录按钮（有记录才显示）；出图模型下拉（IMAGE_MODELS）+ 规划模型下拉（TEXT_MODELS）；上传商品图；生成设置（平台：亚马逊/独立站/Temu/Shopee/速卖通/Lazada/TikTok Shop/天猫淘宝；地区：美国/中国/欧洲/东南亚/日本/中东/拉美；语言：英文/中文/俄语/西语/德语/日语/韩语/葡萄牙语/印尼语；比例：1:1/4:5/3:4/16:9/9:16）；商品卖点 & 要求 textarea + 「✦ AI 帮写」按钮（调 text 生成弹 img-74 弹窗：产品名称/核心卖点/适用人群/期望场景/关键材质纹理 + 重新帮写/确认）；套图结构配置（智能匹配 radio / 自定义配置 radio：白底图×n、场景图×n、卖点图×n、其他×n 计数器）；附加功能（爆款风格分析 toggle → 触发「分析商品中…」→ 风格四选卡片 + 换一批风格；商品上架文案生成 toggle）；底部品牌橙大按钮「一键生成套图与上架文案」。

- [ ] **Step 2: 验证 + Commit**

表单完整渲染、AI 帮写/风格分析出内容（mock）。

```bash
git add src/app/\(dashboard\)/creation/ecommerce/ src/components/ecommerce/SetImageForm.tsx
git commit -m "feat: e-commerce set-image form per memo"
```

### Task 6.3: 生成流程 + 结果网格 + 预览 + 生成记录

**Files:**
- Create: `src/components/ecommerce/SetResultGrid.tsx`、`ImagePreviewDialog.tsx`、`GenerationRecords.tsx`
- Modify: `SetImageForm.tsx`

- [ ] **Step 1:** 一键生成 → `POST /api/ecommerce/[id]/generate`（无 id 先创建）→ 右侧网格进入生成态（img-79/80：每格骨架 + 逐格完成）；完成态网格（img-81）每格显示类型角标与图片；点击格子弹 `ImagePreviewDialog`（img-82：大图 + 底部缩略图切换 + 下载）。「生成记录」按钮（img-85）列出历史项目，选中回填 config 并重开对应结果。文案生成结果展示在网格上方的文案卡（img-83 样式）。

- [ ] **Step 2: 验证 + Commit**

mock 模式下全流程可走通；生成记录回填正确。

```bash
git add src/components/ecommerce/
git commit -m "feat: set-image generation flow, preview and records"
```

### Task 6.4: A+ 详情页

**Files:**
- Create: `src/components/ecommerce/AplusEditor.tsx`
- Modify: `src/app/(dashboard)/creation/ecommerce/page.tsx`（Tab 切换 商品套图 / A+详情）

- [ ] **Step 1:** 左栏（img-84/87）：上传商品图（生成后自动填入并提示「未生成前 1 小时内可修改，避免自动清理且不占用套图」）、生成设置（平台/地区/语言 + 比例单选：高级A+(Web端)16:9 / 高级A+(移动端)4:3 / 普通A+3.2 / 1:1 / 3:4 / 9:16）、卖点 textarea、模块勾选卡（使用场景图/多角度图/场景氛围图/商品细节图，各带说明）、「生成 A+ 详情」按钮。右侧（img-86/88/89/90）：生成中骨架长页 → 完成段落卡列表（段落 = 模块卡，失败卡带重试）→ 段落上下拖动排序（`@dnd-kit` 或原生 drag 事件 + 数组重排）→ 保存到 `EcomProject.items`。

- [ ] **Step 2: 验证 + Commit**

mock 模式生成 4 段（1 失败示例可重试）、拖动排序持久化。

```bash
git add src/components/ecommerce/AplusEditor.tsx src/app/\(dashboard\)/creation/ecommerce/
git commit -m "feat: A+ detail page editor with drag order and generation"
```

### Task 6.5: 创作中心接线

**Files:**
- Modify: `src/lib/constants.ts`（CREATION_CENTER_ITEMS 的「电商设计室」描述改「商品套图 · A+详情页」）

- [ ] **Step 1:** 确认创作中心下拉「电商设计室」指向 `/creation/ecommerce` 且页面可用；`nav` 高亮正确。

- [ ] **Step 2: 验证 + Commit**

下拉进入页面正常。

```bash
git add src/lib/constants.ts
git commit -m "chore: wire e-commerce studio entry"
```

---

# 验收与提交纪律（全计划通用）

- 每个 Task 独立提交；阶段收尾跑 `npx tsc --noEmit` + `npm run lint` + 对应 Playwright 套件。
- P5/P6 各自收尾加 `npm run build`。
- 最终收尾：全量 `npm run test:e2e` + `npm run test:smoke`，更新 `docs/PROGRESS.md`。

# API 调试计划书 · 第8-14条严格执行计划

> **面向 Agent 执行者：** 必需子技能：使用 superpower-subagent-driven-development（推荐）或 superpower-executing-plans 按任务逐项执行本计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 严格按原型图 image4-11 重做分镜区交互、段资产弹窗、编辑整段引用弹窗、视频占位框，消除所有"差不多就行"的偏差。

**架构：** 以原型图为唯一验收标准，逐像素对照修改 5 个组件文件 + 1 个工具函数文件。不改后端（后端已就绪），只改前端呈现层。

**技术栈：** React 18 + Tailwind CSS v3 + shadcn/ui + lucide-react

**规格：** `产品需求参考图片/API调试计划书.docx` 第8-14条 + 原型图 image4-11

## 全局约束

- 深色主题，色阶 zinc，品牌色 orange-500
- 字号 7 级规范：text-2xl / text-lg / text-base / text-sm / text-xs / text-[11px] / text-[10px]
- 弹窗 4 档：sm:max-w-sm / sm:max-w-md / sm:max-w-lg / sm:max-w-2xl~4xl + max-h-[88vh] overflow-y-auto
- 所有异步操作必须有 loading / 成功 toast / 失败 toast
- 不引入新依赖
- 后端 schema（`segment-assets.ts`）需同步扩展：aspectRatio 扩展到 12 档、新增 qualityTier 字段
- 后端生成逻辑（`services/segments/assets.ts`）已消费 config 字段，新增字段需透传

---

## 差距清单（原型 vs 现状，逐条事实陈述）

### #9 章节进度规则
| 原型要求 | 现状 | 差距 |
|---------|------|------|
| 出全资产→进度到拆分镜；未出→停在人物/场景（灰）+剧本大纲（黄） | `episodeStage()` 已有 assetsReady 驱动；WorkflowTabs 有 assetsReady 逻辑 | ✅ 基本符合，无需改动 |

### #10 拆分镜交互（image4/5/6）
| 原型要求 | 现状 | 差距 |
|---------|------|------|
| 分镜区居中「AI正在拆分镜… 预计15-90秒，角色bible也会自动生成。」 | StoryboardSection L268-274: 文案只有 splitPhase.label + "完成后将在下方展示本集分镜" | ❌ 缺少副文案"预计15-90秒，角色bible也会自动生成" |
| 右上「生成中·暂停」红按钮 | StoryboardSection L250-263: amber 色 chip 显示"分镜 · xxx 执行中"，无暂停按钮；停止按钮在全局任务条 ScriptDetailView L553-591 | ❌ 颜色错（应红色非amber）、文案错（应"生成中·暂停"非"执行中"）、停止功能不在分镜区内 |
| 顶部「分镜提示词」chip 时间轴 | ScriptDetailView L611-639: 已有 `<details>` 折叠面板展示镜头 chip | ✅ 已实现（带折叠交互） |
| 成功 toast「整剧拆分镜完成 (N 集)」 | SplitStoryboardDialog L116: toast "本集拆分镜完成" | ❌ 文案不符（应"整剧"非"本集"，应含集数） |

### #11 拆分完成页（image7/8）
| 原型要求 | 现状 | 差距 |
|---------|------|------|
| 出片前检查红条：「出片前检查：X项必须优先改 · Y项建议补齐」+ 展开按钮 | StoryboardChecks: 独立 section 卡片，非红条横幅 | ❌ 形态完全不同（应为紧凑红条+折叠面板，现为完整卡片） |
| 「相似度转场建议：6处边界」折叠面板 | 不存在 | ❌ 完全缺失 |
| 段头状态 chips：「分镜率未出齐」（黄）/「全镜组出图」（绿） | L347-356: "拆分镜未生成 N"（红）/"全镜组出图"（绿） | 🟡 文案偏差（"分镜率未出齐" vs "拆分镜未生成"），颜色偏差（应黄非红） |
| 段头按钮：「修改本片切词」「镜像可选」「场景建议」「生成新资产」 | L357-377: 只有「段资产」「编辑引用」「建议优先补齐」 | 🟡 "修改本片切词""镜像可选""场景建议"属高级功能暂不做；"段资产"改名为"生成新资产"；移除"建议优先补齐" |
| 每镜卡底部标签：「第九层位级镜」「林夜（NEW）」「编辑引用」 | StoryboardCard: 无此类标签 | 🟡 属于信息增强，优先级低于布局修正，列入后续迭代 |
| 右上「批量生成」白色按钮 | L203-213: variant="inverse" 按钮 | ✅ 基本符合 |

### #12 段资产弹窗（image9）
| 原型要求 | 现状 | 差距 |
|---------|------|------|
| 标题："段资产 - B01 闪回：背叛前夜" | L215: "段资产 · {segmentTitle}" | 🟡 分隔符差异（"-"vs"·"），可接受 |
| 副标题："本段建议出首帧 - 出视频前置，锁住空间/调度/人群不漂移。" | L217-218: "配置仅作用于当前镜组。首帧、调度图和人群方案分别保存。" | ❌ 文案完全不同 |
| 比例：12档圆形按钮 | L266-281: 5档 select 下拉 | ❌ 控件类型错（应圆形按钮组非下拉），档数错（应12档非5档） |
| 清晰度：1K/2K/4K 圆形按钮 | L283-301: select 下拉 | ❌ 控件类型错 |
| 画质档位：低画质/标准画质/高画质 圆角矩形按钮 | 不存在 | ❌ 完全缺失 |
| 固定提示："影视厂的分镜图/首帧图/调度图固定按 1K-低渲染出…此处不可调" | 不存在 | ❌ 完全缺失 |
| 预计消耗提示 | 不存在 | ❌ 完全缺失（需从模型 cost 字段计算） |
| 本段分镜图统计行「共 N 张 - M 张未生成」 | L203/L397: 仅在按钮文案中嵌入缺图数，无独立统计行 | ❌ 缺少独立统计行和总数展示 |
| 「补全所有图片(N)」按钮文案 | L397: "补缺或更新过期图片（缺 M）" | ❌ 文案和参数均不符（应为"补全所有图片(N)"用总数N） |
| 同场景逐张出详细说明文案 | L313-315: 简短一句话 | 🟡 文案不够详细（原型有完整解释） |
| 安全改写详细说明文案 | L325-327: 简短一句话 | 🟡 文案不够详细 |
| 调度图标注"本段无需"时灰显 | 不存在 | ❌ 缺失条件判断 |
| 人群调度卡标注"本段无需"时灰显 | 不存在 | ❌ 缺失条件判断 |

### #13 编辑整段引用弹窗（image10）
| 原型要求 | 现状 | 差距 |
|---------|------|------|
| 副标题："当前展示本段7个分镜的引用合集；取消错误项并选中新项…" | L182-184: "逐镜保留场景、人物造型和道具；整段替换仅影响使用原场景的镜头。" | ❌ 文案不同 |
| 场景网格（3列，缩略图+名称+"新增引用"标签） | L187-231: 两个 select 下拉（原场景/替换为） | ❌ 控件类型完全不同（应网格卡片非下拉） |
| 单镜独立场景提示 | 不存在 | ❌ 完全缺失 |
| 人物与造型区：缩略图+名称+造型chips（自动/默认/具体造型） | L271-327: checkbox + select 下拉，逐镜展示 | ❌ 布局错（应整段汇总非逐镜），控件错（应chips非checkbox+select） |
| "已选N/M人" 计数 | 不存在 | ❌ 缺失 |
| 道具区：缩略图+名称，"已选N/M个" | L329-350: checkbox 列表 | ❌ 控件错（应卡片非checkbox），缺计数 |
| 底部说明文案 | 不存在 | ❌ 缺失 |
| 整段汇总视图（非逐镜） | 逐镜展示 | ❌ 架构错误 |

### #14 视频阶段（image11）
| 原型要求 | 现状 | 差距 |
|---------|------|------|
| 分镜卡变「生成视频」占位框（宽高比随 targetAspect 动态） | StoryboardCard L118-137: 有占位框 + aspectRatio 动态 | ✅ 基本符合 |
| 右上角批量生成视频 | StoryboardSection L188-202: 有批量生成视频按钮 | ✅ 符合 |
| 视频阶段卡片不应显示首帧图 | L134-136: 显示"首帧图已就绪"文字 | 🟡 原型无此文字，但不算严重 |

---

## 执行任务

### 任务 1：拆分镜交互修正（#10）

**文件：**
- 修改：`src/components/creation/film-factory/detail/StoryboardSection.tsx:249-275`
- 修改：`src/components/creation/film-factory/detail/SplitStoryboardDialog.tsx:95,116`

**接口：**
- 依赖输入：splitPhase prop（已有）
- 对外产出：修正后的 splitPhase chip + 居中 loading + toast 文案

- [ ] **步骤 1：修正 splitPhase chip 样式和文案**

在 `StoryboardSection.tsx` L249-263，将 amber 色 chip 改为红色，文案改为"生成中·暂停"：

```tsx
{splitPhase?.active && splitPhase.mode !== "video" && (
  <div className="flex items-center justify-end border-b border-zinc-800/80 px-3 py-1.5">
    <span className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>生成中 · 暂停</span>
    </span>
  </div>
)}
```

- [ ] **步骤 2：修正居中 loading 副文案**

在 `StoryboardSection.tsx` L267-275，补充副文案：

```tsx
{splitPhase?.active && splitPhase.mode !== "video" && (
  <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2">
    <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
    <p className="text-sm text-zinc-300">{splitPhase.label}</p>
    <p className="text-[11px] text-zinc-600">
      预计 15-90 秒，角色 bible 也会自动生成
    </p>
  </div>
)}
```

- [ ] **步骤 3：修正 toast 文案**

在 `SplitStoryboardDialog.tsx` L116，将 toast 文案改为含集数：

```tsx
toast.success(`整剧拆分镜完成`, {
  description: "请完成出片前校验，再配置段资产或进入视频阶段",
})
```

注：当前是单集拆分，"整剧"指本集全部镜头。如需真实集数需从 props 传入 episodeTitle。

- [ ] **步骤 4：运行 tsc --noEmit 确认 0 错误**

```bash
npx tsc --noEmit
```

- [ ] **步骤 5：提交**

```bash
git add src/components/creation/film-factory/detail/StoryboardSection.tsx src/components/creation/film-factory/detail/SplitStoryboardDialog.tsx
git commit -m "fix: 拆分镜交互按原型修正 chip 颜色/文案/loading 副文案/toast"
```

---

### 任务 2：出片前检查改为红条+折叠面板（#11 上半部分）

**文件：**
- 修改：`src/components/creation/film-factory/detail/StoryboardChecks.tsx`（整体重构布局）
- 修改：`src/components/creation/film-factory/detail/StoryboardSection.tsx:276-290`（调整调用方式）

**接口：**
- 依赖输入：items, scriptId, episodeId, onEdit, onGenerateImage, onSegmentAssets, onValidityChange, busy
- 对外产出：紧凑红条横幅 + 折叠详情面板

- [ ] **步骤 1：重构 StoryboardChecks 为红条+折叠面板**

将整个组件的 return 改为：
- 默认只显示一行红条横幅：`⚠ 出片前检查：X项必须优先改 · Y项建议补齐` + 右侧「展开」按钮
- 校验通过时显示绿色横幅：`✓ 校验通过，可以批量生成`
- 点击展开后显示完整问题列表（保持现有 issue 渲染逻辑）
- 移除模型选择器和"开始校验"按钮到展开区域内（红条上不放）
- 新增「相似度转场建议：N处边界」折叠面板（数据来自 report.advisories 中 action=extendVideo 的条目）

关键样式：
```tsx
// 红条横幅
<div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs">
  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
  <span className="text-rose-300">出片前检查：{blocking.length} 项必须优先改 · {advisory.length} 项建议补齐</span>
  <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px]" onClick={() => setExpanded(!expanded)}>
    {expanded ? "收起" : "展开"}
  </Button>
</div>
```

- [ ] **步骤 2：运行 tsc --noEmit 确认 0 错误**

- [ ] **步骤 3：提交**

```bash
git add src/components/creation/film-factory/detail/StoryboardChecks.tsx
git commit -m "refactor: 出片前检查改为红条横幅+折叠面板，按原型 image7 布局"
```

---

### 任务 3：段头 chips 和按钮修正（#11 下半部分）

**文件：**
- 修改：`src/components/creation/film-factory/detail/StoryboardSection.tsx:339-378`

**接口：**
- 依赖输入：segment 数据
- 对外产出：修正后的段头 UI

- [ ] **步骤 1：修正段头状态 chip 颜色和文案**

L347-356 修改：
- "拆分镜未生成 N" → "分镜图未出齐"，颜色从 rose 改为 amber（黄色）
- "全镜组出图" 保持 emerald 绿色不变

```tsx
{!allImaged && (
  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
    分镜图未出齐
  </span>
)}
```

- [ ] **步骤 2：修正段头按钮组**

移除「建议优先补齐」chip（L373-377）。
保留「段资产」和「编辑引用」按钮，文案不变（原型中的"修改本片切词""镜像可选""场景建议"属于高级功能，当前不在 MVP 范围内，但"生成新资产"应替换现有的"段资产"按钮文案）。

将「段资产」按钮文案改为「生成新资产」：
```tsx
<button ...>生成新资产</button>
```

- [ ] **步骤 3：运行 tsc --noEmit 确认 0 错误**

- [ ] **步骤 4：提交**

```bash
git add src/components/creation/film-factory/detail/StoryboardSection.tsx
git commit -m "fix: 段头 chip 颜色/文案按原型修正，按钮组对齐"
```

---

### 任务 4：段资产弹窗按原型重做（#12）

**文件：**
- 修改：`src/components/creation/film-factory/detail/SegmentAssetsDialog.tsx`（整体重构）

**接口：**
- 依赖输入：props 不变
- 对外产出：按原型 image9 布局的段资产弹窗

- [ ] **步骤 1：重写弹窗布局和控件**

核心变更：
1. 副标题改为原型文案
2. 比例从 select 改为 12 档圆形按钮组
3. 清晰度从 select 改为 3 档圆形按钮组
4. 新增画质档位 3 档圆角矩形按钮组
5. 新增固定提示文案
6. 新增预计消耗提示
7. 同场景逐张出/安全改写说明文案改为原型长文案
8. 调度图/人群调度卡增加"本段无需"条件灰显

比例按钮组示例：
```tsx
const ASPECT_RATIOS = ["1:1","2:1","1:2","5:4","4:5","4:3","3:4","3:2","2:3","16:9","9:16","21:9"] as const

<div className="flex flex-wrap gap-1.5">
  {ASPECT_RATIOS.map((r) => (
    <button
      key={r}
      type="button"
      onClick={() => setConfig(c => ({ ...c, aspectRatio: r }))}
      className={cn(
        "h-7 min-w-[3rem] rounded-full border px-2 text-[10px] transition-colors",
        config.aspectRatio === r
          ? "border-orange-500 bg-orange-500/20 text-orange-300"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
      )}
    >
      {r}
    </button>
  ))}
</div>
```

- [ ] **步骤 2：运行 tsc --noEmit 确认 0 错误**

- [ ] **步骤 3：提交**

```bash
git add src/components/creation/film-factory/detail/SegmentAssetsDialog.tsx
git commit -m "refactor: 段资产弹窗按原型 image9 重做布局和控件"
```

---

### 任务 5：编辑整段引用弹窗按原型重做（#13）

**文件：**
- 修改：`src/components/creation/film-factory/detail/SegmentDialogs.tsx:55-374`（SegmentRefsDialog 整体重构）

**接口：**
- 依赖输入：props 不变
- 对外产出：按原型 image10 布局的引用编辑弹窗

- [ ] **步骤 1：重构为整段汇总视图**

核心变更：
1. 从逐镜展示改为整段汇总：场景区 / 人物造型区 / 道具区三个独立区块
2. 场景区改为 3 列网格卡片（缩略图 + 名称 + "用于N镜"标签 + "新增引用"标签）
3. 人物区改为卡片列表（缩略图 + 名称 + 造型 chips：自动/默认/具体造型）+ "已选N/M人"计数
4. 道具区改为卡片列表（缩略图 + 名称）+ "已选N/M个"计数
5. 新增底部说明文案
6. 副标题改为原型文案
7. 新增单镜独立场景提示

场景网格示例：
```tsx
<div className="grid grid-cols-3 gap-2">
  {assets.scenes.map((scene) => {
    const usedBy = usage.get(scene.id) ?? []
    return (
      <button
        key={scene.id}
        type="button"
        onClick={() => toggleScene(scene.id)}
        className={cn(
          "relative rounded-lg border p-2 text-left transition-colors",
          isSelected(scene.id)
            ? "border-orange-500 bg-orange-500/10"
            : "border-zinc-800 hover:border-zinc-700"
        )}
      >
        {scene.imageUrl ? (
          <img src={scene.imageUrl} alt={scene.name} className="aspect-video w-full rounded object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded bg-zinc-900">
            <Box className="h-4 w-4 text-zinc-700" />
          </div>
        )}
        <p className="mt-1 truncate text-[10px] text-zinc-300">{scene.name}</p>
        {usedBy.length > 0 && (
          <span className="text-[9px] text-zinc-500">用于 {usedBy.join("/")} 镜</span>
        )}
      </button>
    )
  })}
</div>
```

- [ ] **步骤 2：运行 tsc --noEmit 确认 0 错误**

- [ ] **步骤 3：提交**

```bash
git add src/components/creation/film-factory/detail/SegmentDialogs.tsx
git commit -m "refactor: 编辑整段引用弹窗按原型 image10 重做为汇总视图"
```

---

### 任务 6：回归验证

**文件：** 无新文件

- [ ] **步骤 1：tsc --noEmit**

```bash
npx tsc --noEmit
```

预期：0 错误

- [ ] **步骤 2：npm run build**

```bash
npm run build
```

预期：构建成功

- [ ] **步骤 3：冒烟测试**

```bash
npm run test:smoke
```

预期：17/17

- [ ] **步骤 4：E2E 测试**

```bash
npm run test:e2e
```

预期：全部通过

- [ ] **步骤 5：更新 PROGRESS.md 并提交**

```bash
git add docs/plans/2026-09-11-api-debug-phase2-redo.md docs/PROGRESS.md
git commit -m "docs: API调试计划书第8-14条严格执行完成"
```

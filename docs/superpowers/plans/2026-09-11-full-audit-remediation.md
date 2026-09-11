# 全量原型对齐修复实施计划

> **面向 Agent 执行者：** 必需子技能：使用 superpower-subagent-driven-development（推荐）或 superpower-executing-plans 按任务逐项执行本计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 将万幕生 4 大模块（影视工厂、剧本创作、画布、首页）的代码实现严格对齐产品需求原型图，消除 118 项差距中的 27 项关键差距和 53 项中等差距。

**架构：** 按模块分 Phase 执行，每个 Phase 内按优先级 P0→P3 排序。每个任务修改 1-3 个文件，产出可独立验证的变更。不改后端 API 结构（仅前端呈现层 + 少量 schema 扩展）。

**技术栈：** Next.js 14 App Router · React 18 · TypeScript strict · Tailwind CSS v3 · shadcn/ui · lucide-react · @xyflow/react v12 · Zustand · Prisma 6

**规格：** `产品需求参考图片/` 目录下 97 张原型图 + `产品需求参考图片/API调试计划书.docx`

## 全局约束

- 深色主题，色阶 zinc，品牌色 orange-500
- 字号 7 级规范：text-3xl/4xl（仅登录页）→ text-2xl → text-lg → text-base → text-sm → text-xs → text-[11px] → text-[10px]（最小下限）
- 弹窗 4 档：sm:max-w-sm / sm:max-w-md / sm:max-w-lg / sm:max-w-2xl~4xl + max-h-[88vh] overflow-y-auto
- 卡片：bg-zinc-900/40 border-zinc-800 rounded-xl
- 主按钮 variant="brand"（橙）/ variant="inverse"（白底黑字）
- 所有异步操作必须有 loading / 成功 toast / 失败 toast
- 不引入新 npm 依赖（markdown 渲染用已有的或轻量方案）
- ComfyUI 地址：http://192.168.1.12:8188（已确认可达）
- Qwen 不通时 fallback DeepSeek（已配置）
- 原型图中的文案必须逐字还原，不得自行改写

---

## Phase A：影视工厂（18 关键 + 30 中等）

### 任务 A1：AnalysisLoading 改为内联底部 loading 条

**原型图：** 图3、图4
**文件：**
- 修改：`src/components/creation/film-factory/intake/AnalysisLoading.tsx`（整体重写）
- 修改：`src/components/creation/film-factory/intake/IntakeForm.tsx:78-127`（startAnalysis 函数 + 底部操作栏）

**接口：**
- 依赖输入：无
- 对外产出：AnalysisLoading 组件签名不变 `{ active: boolean; label?: string | null }`

**原型要求：**
- loading 嵌入在表单底部（非全屏遮罩），表单仍可见
- 显示实时计时："正在通读全本，理解剧情脉络… 已用 10s · 吃全本 + 推理通常 1-3 分钟，请保持弹窗打开"
- 右下角有"取消"按钮可中断分析
- 底部按钮文案变为"分析中 10s"（动态计时）
- 第二阶段文案："正在推断题材 / 时代 / 视觉风格…"

- [ ] **步骤 1：重写 AnalysisLoading 为内联组件**

删除全屏遮罩逻辑，改为返回一个底部内联条：

```tsx
"use client"
import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AnalysisLoading({
  active,
  label,
  onCancel,
}: {
  active: boolean
  label?: string | null
  onCancel?: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) { setElapsed(0); return }
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [active])
  if (!active) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-400" />
      <p className="min-w-0 flex-1 text-xs text-orange-300">
        {label ?? "正在等待 AI 分析结果…"}{" "}
        <span className="tabular-nums text-orange-400">已用 {elapsed}s</span>
        {" · 吃全本 + 推理通常 1-3 分钟，请保持弹窗打开"}
      </p>
      {onCancel && (
        <Button variant="ghost" size="sm" className="h-7 shrink-0 text-[10px]" onClick={onCancel}>
          <X className="mr-1 h-3 w-3" />取消
        </Button>
      )}
    </div>
  )
}
```

- [ ] **步骤 2：修改 IntakeForm 集成内联 loading**

在 IntakeForm 中：
1. 新增 `abortRef = useRef<AbortController | null>(null)` 用于取消
2. startAnalysis 中创建 AbortController，传给 fetch
3. 新增 cancelAnalysis 函数：abort + setAnalyzing(false)
4. 底部操作栏在 analyzing 时显示 AnalysisLoading 内联条 + 按钮文案改为 `分析中 {elapsed}s`
5. progressLabel 增加中间阶段："正在推断题材 / 时代 / 视觉风格…"（在 analyze 请求发出后切换）
6. 移除对旧 AnalysisLoading 全屏组件的引用

- [ ] **步骤 3：运行 tsc --noEmit 确认 0 新增错误**

- [ ] **步骤 4：提交**

```bash
git add src/components/creation/film-factory/intake/AnalysisLoading.tsx src/components/creation/film-factory/intake/IntakeForm.tsx
git commit -m "fix: AnalysisLoading 改为内联底部条+实时计时+取消按钮，按原型图3/4"
```

---

### 任务 A2：创建剧本解析进度弹窗

**原型图：** 图6、图7
**文件：**
- 新建：`src/components/creation/film-factory/intake/FinalizeProgress.tsx`
- 修改：`src/components/creation/film-factory/intake/ReviewDialog.tsx:172-193`（create 函数）

**接口：**
- 依赖输入：scriptId, values (ReviewValues)
- 对外产出：FinalizeProgress 组件 `{ open: boolean; scriptId: string; values: ReviewValues; onComplete: (scriptId: string) => void; onBackground: () => void }`

**原型要求：**
- 弹窗标题"AI 正在解析剧本"
- 说明文字"把完整剧本拆成集/角色/场景，原样保留通常5~10分钟..."
- 三步进度列表：①拆分集数 ②整理入库 ③剧本医生会诊
- 每步有状态图标（进行中 / ✅完成 / ○待开始）
- 底部进度条区域显示当前步骤文案
- 右下角"后台运行"按钮

- [ ] **步骤 1：创建 FinalizeProgress 组件**

```tsx
"use client"
import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const STEPS = ["拆分集数", "整理入库", "剧本医生会诊"] as const

export function FinalizeProgress({ open, scriptId, values, onComplete, onBackground }: {
  open: boolean; scriptId: string; values: Record<string, unknown>
  onComplete: (id: string) => void; onBackground: () => void
}) {
  const [step, setStep] = useState(0) // 0=拆分集数, 1=整理入库, 2=会诊
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function run() {
      try {
        // Step 0: finalize API (拆分集数 + 整理入库)
        setStep(0)
        const res = await fetch(`/api/scripts/${scriptId}/finalize`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "创建剧本失败")
        if (cancelled) return
        setStep(1)
        // Step 1: 整理入库已完成（finalize 内部已处理）
        await new Promise(r => setTimeout(r, 500)) // 视觉过渡
        if (cancelled) return
        setStep(2)
        // Step 2: 会诊（可选，当前跳过直接进入详情页）
        await new Promise(r => setTimeout(r, 300))
        if (cancelled) return
        onComplete(scriptId)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "解析失败")
      }
    }
    void run()
    return () => { cancelled = true }
  }, [open, scriptId, values, onComplete])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>AI 正在解析剧本</DialogTitle>
          <DialogDescription>
            把完整剧本拆成集 / 角色 / 场景，原样保留通常 5~10 分钟，会诊+台词优化另计。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i < step ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : i === step && !error ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                : <Circle className="h-4 w-4 text-zinc-600" />}
              <span className={i <= step ? "text-sm text-zinc-200" : "text-sm text-zinc-500"}>{label}</span>
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {!error && (
          <p className="text-[11px] text-zinc-500">
            {step === 0 ? "正在按分集标记切剧本…" : step === 1 ? "正在整理入库…" : "剧本医生正在通读全剧会诊…"}
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onBackground}>后台运行</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **步骤 2：修改 ReviewDialog.create() 使用 FinalizeProgress**

将 create() 中的直接 fetch + redirect 改为打开 FinalizeProgress 弹窗：
1. 新增 state: `const [finalizing, setFinalizing] = useState(false)`
2. create() 改为 `setFinalizing(true)`
3. onComplete 回调中执行 `window.location.href = /creation/film-factory/${scriptId}`
4. onBackground 回调中关闭弹窗并跳转
5. 在 JSX 末尾渲染 `<FinalizeProgress open={finalizing} ... />`

- [ ] **步骤 3：运行 tsc --noEmit**

- [ ] **步骤 4：提交**

```bash
git add src/components/creation/film-factory/intake/FinalizeProgress.tsx src/components/creation/film-factory/intake/ReviewDialog.tsx
git commit -m "feat: 创建剧本解析进度弹窗（三步进度+后台运行），按原型图6/7"
```

---

### 任务 A3：分镜区工具栏补全（下载/BGM/禁止项）

**原型图：** 图30、图34-38
**文件：**
- 修改：`src/components/creation/film-factory/detail/StoryboardSection.tsx:121-227`（工具栏区域）
- 新建：`src/components/creation/film-factory/detail/NegativePromptDialog.tsx`

**接口：**
- 依赖输入：scriptId, episodeId, storyboards
- 对外产出：NegativePromptDialog 组件 `{ open: boolean; onOpenChange: (v: boolean) => void; scriptId: string }`

**原型要求（工具栏按钮从左到右）：**
1. 分镜图筛选（已有）
2. 视频筛选（已有）
3. BGM 筛选（新增）— 切换到 BGM 视图
4. 下载图片 — tooltip "打包下载本集全部图片"
5. 下载 BGM — tooltip "打包下载本集全部 BGM"
6. 禁止项 — tooltip "视频禁止项 (反向提示词)"，点击打开 NegativePromptDialog
7. 批量生成（已有）

**BGM 视图：** 切换到 BGM tab 后，分镜区显示 BGM 空状态或已生成的 BGM 信息。

**禁止项弹窗：** 标题"视频禁止项·反向提示词"，多行文本输入，保存到 script.negativePrompt 字段。

- [ ] **步骤 1：在 StoryboardSection 工具栏添加 BGM/下载/禁止项按钮**

在现有筛选按钮组后面添加：
```tsx
// BGM 筛选 tab
{ value: "bgm", label: "BGM", icon: Music }
// 下载图片
<Button variant="ghost" size="icon-sm" title="打包下载本集全部图片" onClick={handleDownloadImages}>
  <Download className="h-3.5 w-3.5" />
</Button>
// 下载 BGM
<Button variant="ghost" size="icon-sm" title="打包下载本集全部 BGM" onClick={handleDownloadBgm}>
  <Music className="h-3.5 w-3.5" />
</Button>
// 禁止项
<Button variant="ghost" size="icon-sm" title="视频禁止项 (反向提示词)" onClick={() => setNegPromptOpen(true)}>
  <Ban className="h-3.5 w-3.5" />
</Button>
```

下载功能暂时用 toast 提示"即将上线"（后续接入真实打包下载）。

- [ ] **步骤 2：添加 BGM 视图**

当 filter === "bgm" 时，分镜区显示 BGM 空状态：
```tsx
{filter === "bgm" && (
  <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
    <Music className="h-5 w-5 text-zinc-600" />
    <p className="text-sm text-zinc-400">🎵 本集 BGM · 后期声音</p>
    <p className="text-xs text-zinc-600">
      还没生成本集 BGM。点右上「批量生成」→ 选「后期 BGM」，配好音频模型/时长/风格即可生成。
    </p>
  </div>
)}
```

- [ ] **步骤 3：创建 NegativePromptDialog 组件**

```tsx
"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function NegativePromptDialog({ open, onOpenChange, scriptId }: {
  open: boolean; onOpenChange: (v: boolean) => void; scriptId: string
}) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) fetch(`/api/scripts/${scriptId}`).then(r => r.json()).then(d => setText(d.data?.negativePrompt ?? "")).catch(() => {})
  }, [open, scriptId])
  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ negativePrompt: text }) })
      if (!res.ok) throw new Error("保存失败")
      toast.success("禁止项已保存")
      onOpenChange(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败") }
    finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>视频禁止项 · 反向提示词</DialogTitle>
          <DialogDescription>
            统一写「不要什么」（如 不要背景音乐、不要字幕、不要旁白、不要镜头切换…）。本剧每次出视频前编提示词时，LLM 会把这些当硬规则严格规避。剧本级，只影响本剧。
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={6} value={text} onChange={e => setText(e.target.value)}
          placeholder={"每行一条，例如：\n不要背景音乐/BGM\n不要字幕、不要旁白\n不要无意义的镜头切换"} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="inverse" disabled={saving} onClick={() => void save()}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

注意：需要确认 Script schema 是否有 negativePrompt 字段，如果没有需要在 PATCH route 中支持。

- [ ] **步骤 4：运行 tsc --noEmit**

- [ ] **步骤 5：提交**

```bash
git add src/components/creation/film-factory/detail/StoryboardSection.tsx src/components/creation/film-factory/detail/NegativePromptDialog.tsx
git commit -m "feat: 分镜区工具栏补全 BGM视图/下载/禁止项弹窗，按原型图30/34-39"
```

---

### 任务 A4：SplitStoryboardDialog 各 Tab 功能补全

**原型图：** 图22、图24、图25、图26
**文件：**
- 修改：`src/components/creation/film-factory/detail/SplitStoryboardDialog.tsx`（整体重构）

**接口：**
- 依赖输入：props 不变
- 对外产出：补全后的 SplitStoryboardDialog

**出图 Tab 需补全（图22）：**
1. "确保分镜图一致(段内)" Switch 开关 + 说明文案
2. "增强视频效果·额外收费" Switch 开关 + 说明文案
3. "重出已生成的" Switch 开关（从出视频 tab 移到这里也显示）
4. "安全改写(防审核拦截)" Switch 开关（从出视频 tab 移到这里也显示）
5. 底部费用预估区（橙色边框）

**出视频 Tab 需补全（图24/26）：**
1. 出视频方式改为卡片式选择（分镜驱动 / 直出·免分镜图），替代 Switch
2. 增加生图模型选择器 + 清晰度 + 画质档位（用于分镜图）
3. 增加"确保分镜图一致(段内)"和"增强视频效果"开关
4. 生视频模型独立清晰度选择（480p/720p）

**BGM Tab 需补全（图25）：**
1. 增加文本模型选择器（用于编 BGM 提示词）
2. 增加"时长意向"输入框
3. 增加"生成次数"输入框
4. 增加"风格"独立输入框
5. 增加"额外提示词(可选)"输入框
6. "重新生成(清空已有候选)" Switch 替代"智能歌词"
7. 详细说明文字和积分提示

**弹窗标题改为：** "批量生成 · {episodeTitle}"

- [ ] **步骤 1-7：逐步补全各 Tab**（每个 Tab 一个步骤，具体代码在执行时根据原型图逐字实现）

- [ ] **步骤 8：运行 tsc --noEmit**

- [ ] **步骤 9：提交**

```bash
git add src/components/creation/film-factory/detail/SplitStoryboardDialog.tsx
git commit -m "feat: SplitStoryboardDialog 各Tab按原型补全开关/选择器/费用预估，图22/24/25/26"
```

---

### 任务 A5：影视工厂文案对齐 + 分组标题修正

**原型图：** 图1、图8、图9
**文件：**
- 修改：`src/components/creation/film-factory/ScriptList.tsx`

- [ ] **步骤 1：分组标题"待描述"→"待推进"**

- [ ] **步骤 2：默认排序改为"创建时间"**

- [ ] **步骤 3：提交**

---

### 任务 A6：资产坞 Tab 结构调整 + 卡片编号 + 说明文字

**原型图：** 图10、图18、图19、图20
**文件：**
- 修改：`src/components/creation/film-factory/detail/AssetSidebar.tsx`

**原型要求：**
- 顶部两大 Tab：角色 / 场景（而非四 tab 平铺）
- 角色 Tab 下子 Tab：角色 N / 妆造库 N / 道具库 N
- 角色卡片显示编号标签（C1/C2/C3...）
- 角色卡片增加"排队中"状态（蓝色圆点）
- 妆造库顶部增加说明文字 + "新建造型"按钮
- 道具库顶部增加说明文字 + "新建道具"按钮

- [ ] **步骤 1-4：逐步修改**

- [ ] **步骤 5：提交**

---

### 任务 A7：审阅弹窗补全（三幕结构 + era/tech 字段 + 积分提示）

**原型图：** 图5
**文件：**
- 修改：`src/components/creation/film-factory/intake/ReviewDialog.tsx`

- [ ] **步骤 1：AI 推理结果区增加 era 和 tech 独立字段展示**
- [ ] **步骤 2：AI 立项方案区增加三幕结构节点展示**
- [ ] **步骤 3：底部增加积分预估提示**
- [ ] **步骤 4：提交**

---

### 任务 A8：INTAKE 表单补全（节奏档案 + 模型积分标注 + 警告提示 + 分集标记提示）

**原型图：** 图2
**文件：**
- 修改：`src/components/creation/film-factory/intake/IntakeForm.tsx`（ConfigPanel 部分）

- [ ] **步骤 1：模型选择器增加积分消耗标注**
- [ ] **步骤 2：增加模型不支持结构化输出的警告提示**
- [ ] **步骤 3：底部增加分集标记规则详细提示条**
- [ ] **步骤 4：提交**

---

### 任务 A9：横屏布局列数修正 + 出片前检查段级别

**原型图：** 图31、图32
**文件：**
- 修改：`src/components/creation/film-factory/detail/StoryboardSection.tsx`（gridCols）
- 修改：`src/components/creation/film-factory/detail/StoryboardChecks.tsx`

- [ ] **步骤 1：横屏布局改为最多 5 列**
- [ ] **步骤 2：出片前检查改为段级别（而非镜头级别）**
- [ ] **步骤 3：衔接建议增加 4 种类型标签**
- [ ] **步骤 4：提交**

---

## Phase B：剧本创作（5 关键 + 7 中等）

### 任务 B1：编辑器顶栏信息补全

**原型图：** 图4、图19
**文件：**
- 修改：`src/components/creation/script-writing/WritingEditor.tsx`

**原型要求：** 顶栏显示 "← 剧本创作 | {title} | {genre} | {N} 集目标 | {status}"

- [ ] **步骤 1：顶栏增加 genre 标签、集数目标、状态标签**
- [ ] **步骤 2：顶栏 Tab 名称改为"大纲"/"角色"（简化）**
- [ ] **步骤 3：增加"质检全剧"按钮（占位，toast 即将上线）**
- [ ] **步骤 4：增加"批量生成剩余 N 集"按钮**
- [ ] **步骤 5：增加左右翻页箭头（上一集/下一集）**
- [ ] **步骤 6：增加"重写正文"按钮**
- [ ] **步骤 7：提交**

---

### 任务 B2：Agent 面板补全（快捷提示 + 费用提示 + Markdown 渲染）

**原型图：** 图4、图7、图8、图11
**文件：**
- 修改：`src/components/creation/script-writing/WritingEditor.tsx`（Agent 面板部分）

**原型要求：**
- 4 个快捷提示按钮："先取配方,给我一版大纲初稿" / "前3集节奏帮我加强钩子" / "通读已生成的正文,查一下有没有漏洞" / "我满意了,定稿吧"
- 底部 "每次对话消耗 🎫2 · 失败自动退还"
- Agent 回复支持 Markdown 渲染（加粗、列表、标题、表格）
- 输入框 placeholder "和编剧 Agent 聊聊这部剧的大纲…"

- [ ] **步骤 1：添加快捷提示按钮**
- [ ] **步骤 2：添加底部费用提示**
- [ ] **步骤 3：Agent 回复区域增加 Markdown 渲染**（使用简单的正则替换或轻量库）
- [ ] **步骤 4：修改输入框 placeholder**
- [ ] **步骤 5：提交**

---

### 任务 B3：故事大纲弹窗补全（工具栏 + Markdown 渲染）

**原型图：** 图5、图12
**文件：**
- 修改：`src/components/creation/script-writing/WritingEditor.tsx`（大纲弹窗部分）

**原型要求：**
- 弹窗标题改为"故事大纲"
- 顶部工具栏 4 个按钮：质检 / 版本 / 复制 / 重新生成蓝图
- 大纲内容 Markdown 渲染
- 空状态增加"一键生成项目包蓝图"按钮

- [ ] **步骤 1：弹窗标题改为"故事大纲"**
- [ ] **步骤 2：添加工具栏按钮（质检/版本/复制/重新生成蓝图）**
- [ ] **步骤 3：大纲内容增加 Markdown 渲染**
- [ ] **步骤 4：空状态增加"一键生成项目包蓝图"按钮**
- [ ] **步骤 5：提交**

---

### 任务 B4：列表页文案对齐 + 工序进度条

**原型图：** 图1、图17
**文件：**
- 修改：`src/components/creation/script-writing/WritingProjects.tsx`

**原型要求：**
- 标题 "SCREENWRITING DESK · 编剧车间"
- 副标题 "选一套爆款配方,跟编剧 Agent 对话打磨大纲,再逐集展开成品级正文。"
- 统计栏：剧本 / 创作中 / 已完成
- 搜索框 placeholder "搜索剧名 / 题材 / 灵感…"
- 卡片编号前缀 "SC-"
- 状态标签 "草稿"（带圆点）
- 工序进度条（彩色圆点 ●●●○○）
- 题材标签为独立 badge

- [ ] **步骤 1-7：逐步对齐文案和样式**
- [ ] **步骤 8：提交**

---

### 任务 B5：新建剧本弹窗对齐

**原型图：** 图2
**文件：**
- 修改：`src/components/creation/script-writing/WritingProjects.tsx`（新建弹窗部分）

- [ ] **步骤 1：增加"正文字数按时长换算(约 7~11 字/秒)"提示**
- [ ] **步骤 2：移除 number input，只保留按钮组选择**
- [ ] **步骤 3：按钮增加笔图标**
- [ ] **步骤 4：placeholder 对齐原型**
- [ ] **步骤 5：提交**

---

### 任务 B6：分集正文空状态改为独立居中展示

**原型图：** 图14
**文件：**
- 修改：`src/components/creation/script-writing/WritingEditor.tsx`

- [ ] **步骤 1：空状态改为居中展示 + "选内置模型生成"按钮（带笔图标）**
- [ ] **步骤 2：提交**

---

### 任务 B7：Agent 面板右上角按钮补全

**原型图：** 图4
**文件：**
- 修改：`src/components/creation/script-writing/WritingEditor.tsx`

- [ ] **步骤 1：增加历史、+（新建对话）、收起按钮**
- [ ] **步骤 2：副标题改为"对话打磨大纲·查一致性·定稿"**
- [ ] **步骤 3：提交**

---

## Phase C：画布（4 关键 + 9 中等）

### 任务 C1：资产 Tab 文件夹树结构

**原型图：** 图17(编辑器)
**文件：**
- 修改：`src/components/canvas/studio/StudioAssets.tsx`（整体重构）
- 修改：`src/components/canvas/studio/StudioSidebar.tsx`

**原型要求：**
- 顶部 "AI 角色" 按钮 + "+" 按钮
- 个人/团队切换 Tab
- 搜索框
- 文件夹树：收藏(星标) / 未分类 / 角色 / {项目名}(N项) / 场景 / 道具 / 风格 / 音乐 / 其他
- 每个文件夹可展开/折叠
- 点击文件夹显示其下的资产列表

- [ ] **步骤 1：重构 StudioAssets 为文件夹树结构**
- [ ] **步骤 2：添加个人/团队切换 Tab**
- [ ] **步骤 3：添加 AI 角色按钮和 + 按钮**
- [ ] **步骤 4：实现文件夹展开/折叠交互**
- [ ] **步骤 5：提交**

---

### 任务 C2：图片节点 Composer 控制项补全

**原型图：** 图3(编辑器)
**文件：**
- 修改：`src/components/canvas/studio/StudioComposer.tsx`

**需补全的控制项（图片模式）：**
1. 风格按钮（魔法棒图标 + "风格"）
2. 预设下拉
3. 摄影机控制按钮
4. 1x 倍率控制
5. 安全区开关
6. 特效开关
7. 透明度/不透明参数

- [ ] **步骤 1-7：逐步添加控制项**（每个控制项先做 UI 占位，功能后续接入）
- [ ] **步骤 8：提交**

---

### 任务 C3：视频节点 Composer 控制项补全

**原型图：** 图4(编辑器)
**文件：**
- 修改：`src/components/canvas/studio/StudioComposer.tsx`

**需补全：** 运镜按钮、技能按钮、全能参考模式标识、1x倍率、安全区、特效

- [ ] **步骤 1-6：逐步添加**
- [ ] **步骤 7：提交**

---

### 任务 C4：音频自定义模式补全

**原型图：** 图6(编辑器)、图7(编辑器)
**文件：**
- 修改：`src/components/canvas/studio/StudioComposer.tsx`

**需补全：**
1. 三模式切换（自适应/自定义/纯音乐）
2. 自定义模式下：歌曲标题输入框 + 歌词输入区域
3. 麦克风图标

- [ ] **步骤 1-3：逐步添加**
- [ ] **步骤 4：提交**

---

### 任务 C5：项目卡片菜单按来源/scope 区分

**原型图：** 图3-5(列表页)
**文件：**
- 修改：`src/app/(dashboard)/canvas/CanvasProjects.tsx`（ProjectCard 菜单部分）

- [ ] **步骤 1：影视工厂来源的卡片只显示 3 项菜单（打开/重命名/删除）**
- [ ] **步骤 2：增加"转移到其它工作区…"独立菜单项**
- [ ] **步骤 3：团队卡片去掉"移动至…"项**
- [ ] **步骤 4：提交**

---

### 任务 C6：画布编辑器杂项修正

**原型图：** 图1(编辑器)、图2(编辑器)、图5(编辑器)、图23(编辑器)、图25(编辑器)
**文件：**
- 修改：`src/components/canvas/studio/CanvasStudio.tsx`
- 修改：`src/components/canvas/studio/AgentDock.tsx`

- [ ] **步骤 1：存储用量改为动态计算（或至少显示节点数估算）**
- [ ] **步骤 2：文本节点增加颜色选择器**
- [ ] **步骤 3：音频节点去掉左侧连接点（只有右侧）**
- [ ] **步骤 4：增加弹出式缩放面板（滑块 + 50%/100%/150%/200% 快捷按钮）**
- [ ] **步骤 5：Agent 面板增加历史/固定/新建按钮**
- [ ] **步骤 6：Agent 问候语改为动态用户名**
- [ ] **步骤 7：提交**

---

## Phase D：首页 + 创作中心菜单（0 关键 + 7 中等）

### 任务 D1：导航栏 + 首页文案对齐

**原型图：** 首页/1.png、首页/2.png、首页/3.png、首页/4.png、创作中心菜单展示.png
**文件：**
- 修改：`src/lib/constants.ts`（NAV_ITEMS / VIDEO_FEATURES / CREATION_CENTER_ITEMS）
- 修改：`src/components/workbench/ParameterBar.tsx`（cost 动态计算）
- 修改：`src/components/workbench/featured-works.ts`（文案对齐）
- 修改：`src/components/layout/CreationCenterDropdown.tsx`

- [ ] **步骤 1：NAV_ITEMS 第4项 "AI 设置" → "插件"**
- [ ] **步骤 2：VIDEO_FEATURES "全能参考视频" → "全能参考生视频"**
- [ ] **步骤 3：CREATION_CENTER_ITEMS 电商设计室描述改为 "商品图、套图、场景图批量产出"**
- [ ] **步骤 4：CreationCenterDropdown 移除"选择创作线"标题，增加右箭头**
- [ ] **步骤 5：ParameterBar cost 改为从模型 cost 字段动态读取**
- [ ] **步骤 6：featured-works.ts 文案逐条对齐原型**
- [ ] **步骤 7：提交**

---

### 任务 D2：图片模式参数补全

**原型图：** 首页/3.png
**文件：**
- 修改：`src/components/workbench/ParameterBar.tsx`
- 修改：`src/lib/constants.ts`

- [ ] **步骤 1：增加"画质等级"参数（低画质/标准画质/高画质）**
- [ ] **步骤 2：增加"透明度/重绘幅度"参数（不透明等）**
- [ ] **步骤 3：提交**

---

## Phase E：回归验证

### 任务 E1：全量回归

- [ ] **步骤 1：tsc --noEmit — 0 新增错误**
- [ ] **步骤 2：npm run build — 构建成功**
- [ ] **步骤 3：npm run test:smoke — 17/17**
- [ ] **步骤 4：npm run test:e2e — 核心用例通过**
- [ ] **步骤 5：逐模块截图对比原型**
- [ ] **步骤 6：更新 PROGRESS.md 并提交**

---

## 附录：暂不实现的功能（需后端支持或独立项目）

| 功能 | 原因 | 建议 |
|------|------|------|
| 大纲质检（图12/18） | 需要新的 AI prompt + 评分体系 + 表格渲染，独立功能模块 | 单独计划 |
| Tool-use 步骤可视化（图8） | 需要后端 SSE 流式 + function calling 支持 | 单独计划 |
| 历史记录（图17/21） | 需要新的数据库表 + API | 单独计划 |
| 导演台内部 UI（图8-15编辑器） | iframe 嵌入的静态包，需单独审计 public/director-desk/ | 单独计划 |
| "自定义平台节奏档案"（图2） | 需要新的配置存储 + UI | 单独计划 |
| 下载图片/BGM 打包（图36/37） | 需要后端打包 API | 后续接入 |

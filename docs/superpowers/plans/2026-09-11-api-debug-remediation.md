# API调试计划书详细执行与验收计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. 本文件只制定计划，不表示已授权本次执行返工；实施时按用户当时指令选择执行方式。

**Goal:** 使原始《API调试计划书》的生成流程、引用、模型、状态和参考图要求具备可验证的端到端行为。

**Architecture:** 保留现有技术栈、AI 抽象层和 CustomModel 配置。将分集阶段、镜组标识、任务及校验状态变成服务端事实；前端渲染服务端状态。所有单个、批量、重试入口复用同一生成输入解析和执行服务。

**Tech Stack:** Next.js14 App Router、React18、TypeScript strict、Tailwind3、Prisma6/PostgreSQL、Zod3、Playwright；不新增另一套 UI 或状态框架。

**Spec:** `产品需求参考图片/API调试计划书.docx`；需求编号及语义见 `docs/plans/2026-09-11-api-requirements-quality-review.md` 的 R01–R19。

## Global Constraints

- 用户原文：“检查他们是否真实有效。特别是进度条”“要严格按这个格式输出”“你可以自己测试”“这里没有展示图片”“场景角色物品都已经默认选择好了的。但是也可以让你再次调整”。
- 不在组件/Route 直接调用第三方供应商；新增能力先定义 AIService/types、Mock、live，然后接 Route。
- 模型目录统一来自 CustomModel；UI选择、实际请求与生成记录保持一致。用户明确指定但无效的模型不得静默替换；仅 auto 使用默认。
- API 返回统一 `{data}`/`{error}`，受保护资源按用户→工作区成员检查；Route仅导出HTTP handler。
- 仅深色zinc+orange；字号、88vh弹窗和宽度遵守当前 AGENTS.md。严格原型差异须在验收表明确记录，不自行省略控件。
- 保留既有用户数据和已完成产物。迁移有旧数据回填策略，不能重拆全部用户分镜来偷换数据结构。
- Mock用例不替代真实图片/视频验收。没有可用环境不标成功。

## 执行边界和优先顺序

T1 → T3；T2 → T5；T5+T6 → T7 → T8 → T9；T3 → T4；T4+T8+T9 → T10 → T11 → T12。

T1、T2先排除假反馈和错误调用。T5/T6解决会污染后续生成的状态与引用，不能先只做样式。当前未提交的 WorkflowTabs 补丁应先取证、纳入基线，未经确认不覆盖别人的工作。

以下文件名中“新增”均为计划产物，当前还不存在。以下接口是实施契约，不是对当前代码的描述。每项先建失败测试，再实现与验证，任务完成前按仓库规范执行必要检查并提交；不要为方便只跑原来的40条就结案。

## T1 统一模型选择和实际生成参数

覆盖：R06、R08、R15。优先级P1。

**文件**：新增 `src/services/ai/live/model-resolver.ts`；修改 `src/services/ai/live-ai.service.ts`、`src/services/ai/types.ts`、`src/lib/plugins/invoke.ts`（仅必要适配）、`src/components/creation/film-factory/detail/ScriptDetailView.tsx`、`src/app/api/scripts/[id]/assets/generate/route.ts`、`src/app/api/storyboards/[id]/generate/route.ts`；新增 `tests/e2e/api-model-routing.spec.ts`。

**接口约定**：
```ts
type GenerationKind = "text" | "image" | "video" | "audio"
type ResolvedModel = {
  id: string; name: string; kind: GenerationKind
  providerModel: string; supportsReferenceImages: boolean
}
// 服务端校验enabled、kind、权限和默认配置，再返回唯一模型。
async function resolveGenerationModel(id: string | "auto", kind: GenerationKind): Promise<ResolvedModel>
```

- [ ] 建两个本地受控供应商A/B（不是真实付费服务），响应分别写A/B；给测试隔离模型配置，退出时清理。
- [ ] 测试选择A：文本生成、资产提取、拆分调用只到A；B调用数为0。选择不存在ID返回明确4xx；把text ID用于image返回4xx；auto返回已配置默认。
- [ ] 将 selected model 传入 chatText/chatJson；修复精确匹配漏kind；模板鉴权/字段转换复用invoke能力，不能再忽略用户配置。
- [ ] 移除单镜、批量、封面入口的硬编码模型，显示/保存所选配置；请求和结果返回实际 modelId，fallback必须显式可见。
- [ ] 将 `firstFrameUrl` 和引用URL合并去重传给视频供应商；从原始数据而非格式化卡面中选引用图；模型不支持某参数时明确报错或禁用。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/api-model-routing.spec.ts`。成功条件：上述路由、参数和负例全部通过，日志不含密钥。

请求验收示例：`{kind:"video",model:"video-A",aspectRatio:"16:9"}` 应由A收到16:9和已保存首帧URL，绝不被隐式替换成9:16。

## T2 真实任务反馈和取消语义

覆盖：R01、R10、R18。优先级P1。

**文件**：新增 `src/lib/tasks/types.ts`、`src/services/tasks/runner.ts`、`src/app/api/tasks/[id]/route.ts`、`scripts/task-worker.ts`、`tests/e2e/task-feedback.spec.ts`；修改 `prisma/schema.prisma` 与新迁移、`TaskQueueDialog.tsx`、`GenerationPanel.tsx`、`IntakeForm.tsx`、`SplitStoryboardDialog.tsx`、`WritingEditor.tsx`、`StudioComposer.tsx`、`PostProductionPanel.tsx` 及旧 AINode。

**接口约定**：
```ts
type TaskState = "queued" | "running" | "cancel_requested" | "cancelled" | "succeeded" | "failed"
type TaskProgress = {
  id: string; state: TaskState; completed: number; failed: number
  total: number | null; currentLabel: string; resultUrl?: string
}
```
Task数据含workspaceId、episodeId可空、kind、幂等key、心跳/租约、状态、取消请求、结果、错误。worker是独立Node进程，不依赖Next请求结束后继续工作的侥幸行为；在package脚本/部署文档增加启动方式。

- [ ] 拦截长请求等待10秒：未知总量不显示百分比；真实批量3项完成1项只显示1/3；测试第二项失败不能显示“全部成功”。
- [ ] 单次短请求用不确定态；多步长任务由服务端记录进度，删除时间自增和虚构阶段。计时、轮询、搜索防抖保留。
- [ ] 接任务GET与取消PATCH；双worker不能同时领同一任务；幂等重复提交返回原任务。
- [ ] 取消后不再提交后续镜头；供应商支持取消就调用取消，不支持时显示“已请求停止，当前任务收尾中”。终态前不宣称取消成功，旧响应不得覆盖新版本。
- [ ] 重启worker后恢复/标记中断任务，刷新页面重连任务；部分成功结果保留，仅重试失败项。
- [ ] 后期现无真实合成：立即去掉“已导出”的假成功，明确“合成功能暂不可用”，保留已有视频下载。真实ffmpeg合成属于另一个生产能力，不把更换进度样式说成已实现合成。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/task-feedback.spec.ts`，同时验证任务越权401/404、取消、重启、失败、结果版本保护。

## T3 两步资产生产与妆造提取

覆盖：R03、R06、R07、R08。

**文件**：修改 `AssetSetupDialog.tsx`、`AssetSidebar.tsx`、`ScriptDetailView.tsx`（均在 `src/components/creation/film-factory/detail/`），`src/app/api/scripts/[id]/assets/route.ts`、`assets/generate/route.ts`、`src/services/ai/types.ts`、mock/live实现和Prisma；新增 `tests/e2e/asset-pipeline.spec.ts`。

**接口约定**：
```ts
type AssetGenerationConfig = {
  textModelId: string; imageModelId: string
  sheetAspect: "16:9"; resolution: "1K" | "2K" | "4K"
}
```
持久化到Script资产配置（与影片targetAspect分开）。生图模型在提取阶段用于描述适配，必须保留；分辨率等若仅第二步使用，移到出图设置且回显，不能保留无效控件。

- [ ] 先测试“提取”期间image/video供应商调用数严格为0；点击右上旋转才开始四类出图。
- [ ] 服务端将imageModelId解析为模型名称/能力提示传给文本模型；主入口、补缺漏、重新提取使用相同配置。
- [ ] 让资产提取结构返回角色造型{name,appearance,适用剧情}；无明确换装时基于已知外观生成默认造型，不能全都写通用占位句。角色与造型在同事务写入，避免只创建角色后失败。
- [ ] 老数据缺造型提供幂等补齐，只为缺少的角色创建；不删除自定义造型、锁定图片。
- [ ] 第二步消费同一imageModel配置；四类生成跳过不存在和锁定项，显示实际计数与失败；“全部重出”与“补缺图”区分，避免重试重复扣费。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/asset-pipeline.spec.ts`。覆盖零资产、部分已有图、锁定、换模型、重入、第二类失败。

关键断言：`imageRequestsBeforeRefresh === 0`；每个实际生成请求的modelId与已保存config.imageModelId一致。

## T4 三类资产卡面与完整图片预览

覆盖：R04、R05。真实效果验收依赖T11。

**文件**：修改 `src/lib/asset-prompt.ts`、`AssetSidebar.tsx`、`src/app/api/scripts/[id]/assets/generate/route.ts`；新增 `src/services/assets/reference-sheet.ts`、`tests/e2e/asset-preview.spec.ts`。

- [ ] 对角色/造型/道具/场景参数化测试：hover出现“查看大图”，点击后完整object-contain图可见，Esc关闭；小图裁切不影响原图下载。
- [ ] 加场景卡放大镜，统一复用现有AssetImagePreview。
- [ ] 根据图1–3建立版面清单：角色名称/介绍、拼音、档案、主立绘、6表情、4视图、4服饰、标志物、关键特征、色板；道具视图/透视/2细节/色板；场景无人物主景/4细节/6色/3机位。
- [ ] 拆分UI外层说明和图内标题，避免把原型弹窗说明也混进生成图。资产设计卡横版16:9，影片9:16仍独立。
- [ ] 先验证整张生成能否满足全部分区。若分区、文字不可控，使用确定性排版：AI生成各格素材，SVG/HTML模板排名称、拼音、介绍、格线与色板，服务端合成最终图；主图、分区图与referenceSheetUrl分开保存。
- [ ] 保持剧本视觉风格，移除模板中与动漫等风格冲突的强制写实；未知身高/年龄标未设定，不捏造剧本事实。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/asset-preview.spec.ts`。布局单测验证每类必需格子数量；真实人物/风格一致性由T11验收。

## T5 分集阶段、稳定镜组和生命周期

覆盖：R09、R10、R11、R16。依赖T2。

**文件**：修改Prisma与迁移、`src/lib/serializers/script.ts`、`src/app/api/scripts/[id]/episodes/[episodeId]/storyboards/route.ts`、`WorkflowTabs.tsx`、`EpisodeStrip.tsx`、`StoryboardSection.tsx`、`ScriptDetailView.tsx`；新增 `src/lib/workflow/episode-state.ts`、`tests/e2e/episode-workflow.spec.ts`。

**数据契约**：Segment有稳定id、episodeId、order、title、note；Storyboard关联segmentId。Episode保存productionStage（outline/assets/storyboard/video/post/completed）和当前taskId；UI就绪条件由真实记录推导，不单凭脚本全局status。

- [ ] 建三集夹具：A已有视频、B仅拆完、C未拆。全局资产补齐后C待拆，A/B不能倒退；切集/刷新保持各自状态。
- [ ] 资产未齐时大纲黄色、人物/场景灰；全部齐备时未拆集下一步拆分，按原文呈现“完成”和“下一步”区别。
- [ ] 回填旧segmentTitle为连续镜组ID；同名不同段不合并；无标题按既定规则分组并落库，不能只依赖注释。
- [ ] 拆分启动显示中央状态与任务状态；成功先持久化分镜与阶段，再刷新。文案区分“本集”与真实“整剧N集”。
- [ ] 分镜文本阶段和视频待生成阶段分别渲染；筛选仅改变展示，不改变镜组成员或批量作用域。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/episode-workflow.spec.ts`。覆盖同名段、空标题、重复拆分失败保留旧数据、取消、刷新、部分完成。

## T6 引用保存、恢复与下游消费

覆盖：R11、R15、R17、R18。优先级P1。

**文件**：拆分 `SegmentDialogs.tsx` 的引用逻辑到新增 `src/lib/storyboards/references.ts`；修改 `src/app/api/storyboards/[id]/route.ts`、`generate/route.ts`；新增 `src/app/api/scripts/[id]/segments/[segmentId]/refs/route.ts`、`tests/e2e/segment-references.spec.ts`；修改 StoryboardCard 和 AI引用输入类型。

**契约**：
```ts
type ShotRefs = {
  sceneId: string | null
  cast: { characterId: string; costumeId: string | null }[]
  propIds: string[]
}
type RefsPatch = { storyboardId: string; revision: number; refs: ShotRefs }
// 新增于src/lib/storyboards/references.ts，单个/批量入口共用。
type StoryboardGenerationInput = {
  prompt: string; references: { name: string; kind: "image" }[]
  refsRevision: number; firstFrameUrl?: string
}
// name沿用现有AI服务约定，值必须为可解析图片URL；后续统一改名时全链路迁移。
declare function resolveStoryboardGenerationInput(
  storyboardId: string, userId: string
): Promise<StoryboardGenerationInput>
```
前端展示本段引用合集和每个引用的镜头number列表；服务端按条事务写入，拒绝旧revision。仅在无已有引用时自动解析默认值；独立场景必须保留。

- [ ] 失败用例：第1镜场景A、第2镜独立B；整段替换A→C后应为C/B，不能为C/C。保存再打开仍为C/B。
- [ ] 在弹窗保留初始逐镜快照；用户操作转成受影响镜头的差量patch，而非广播同一refs。展示“用于1/3/5镜”，不误实现为跨集计数。
- [ ] 校验每个资产属于当前剧本/允许工作区；造型属于所选角色；全部patch一致提交，冲突409不部分写入。
- [ ] `resolveStoryboardGenerationInput`读取最新引用，拼描述和真实图片URL；使用人物或造型原图，不将整张设定卡代替角色脸图；记录生成时refs版本与输入摘要。
- [ ] 引用更改后标记旧产物过期，保留旧文件；单个、批量和重试共用解析器。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/segment-references.spec.ts`：保存重开、独立引用、外部资产、错误造型、过期提交、供应商收到引用URL。

## T7 大模型校验、问题修复和生成门槛

覆盖：R12、R13。依赖T1/T5/T6。

**文件**：新增 `src/services/ai/storyboard-validation.ts`、`src/app/api/scripts/[id]/episodes/[episodeId]/validate/route.ts`、`src/lib/validations/storyboard-review.ts`、`tests/e2e/storyboard-validation.spec.ts`；修改AIService及mock/live、StoryboardChecks、StoryboardSection和生成routes。

**契约**：
```ts
type ReviewIssue = {
  id: string; severity: "blocking" | "advisory"
  storyboardIds: string[]; reason: string
  action: "edit" | "resplit" | "attachScene" | "firstFrame" | "blockingPlan" | "extendVideo"
}
type ReviewReport = { episodeId: string; inputRevision: number; issues: ReviewIssue[] }
```

- [ ] 用受控AI返回一个blocking和一个advisory：顶部显示数量；blocking时按钮禁用，直接POST生成也拒绝。
- [ ] 拆分后传本集正文、镜组、镜头、资产引用、空间/调度事实给AI；Zod校验响应ID只能指向当前集；AI失败展示“校验失败/未完成”，不能展示全部通过。
- [ ] 基础结构规则和LLM语义问题合并但标来源；缺描述/失效引用直接阻断。
- [ ] 按action定位对应镜头或段资产；不存在的视频延长能力明确不可用，不能有一个可点但无动作的chip。
- [ ] 修改正文/分镜/引用后旧报告失效；修复再检查后解除阻断。建议项提供处理/明确确认机制；不能依靠关闭面板绕过。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/storyboard-validation.spec.ts`。覆盖AI失败、无效ID、报告过期、直接API绕过与修复闭环。

## T8 段资产弹窗真实生产行为

覆盖：R13、R14。依赖T1/T2/T5/T6/T7。

**文件**：拆出 `src/components/creation/film-factory/detail/SegmentAssetsDialog.tsx`；新增 `src/app/api/scripts/[id]/segments/[segmentId]/assets/route.ts`、`src/services/storyboards/segment-assets.ts`、`tests/e2e/segment-assets.spec.ts`；修改Prisma保存段资产和AI能力接口。

**契约**：
```ts
type SegmentAssetConfig = {
  textModelId: string; imageModelId: string; aspectRatio: string
  resolution: "1K" | "2K" | "4K"; sequential: boolean; safeRewrite: boolean
}
type SegmentProducts = {
  firstFrameUrl: string | null; blockingPlanUrl: string | null
  crowdPlan: string | null; needsBlockingPlan: boolean; needsCrowdPlan: boolean
}
```

- [ ] 双模型接useAiModels；左栏比例、清晰度、画质与成本说明对齐图9，每个字段必须能追到实际请求。
- [ ] 补全只取未生成项；重出全部用明确范围与确认；失败保留已完成项并支持失败重试。
- [ ] sequential=true最大并发1，后一张请求参考前一张新结果；false使用有界并发3（不超过模型上限），不得出现两分支相同。以受控延迟服务记录最大并发与references断言。
- [ ] safeRewrite=true调用所选文本模型做非血腥表达改写，保留原文与改写稿，不承诺绕过供应商规则；false直接用原提示词。
- [ ] 首帧、空间调度图独立请求、独立存储、独立预览；人群调度是文字方案，写明数量/位置/方向/遮挡/动作并供视频使用。“无需”由校验结果决定，不能一律写死。
- [ ] 请求返回真实taskId，刷新后还可追踪；按钮错误可见，无结果不能显示出图成功。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/segment-assets.spec.ts`。除上述断言，检查重新打开参数和产物回显。

## T9 视频空框与单个批量生成闭环

覆盖：R10、R15、R16、R18、R19。依赖T5–T8。

**文件**：修改 ScriptDetailView、SplitStoryboardDialog、StoryboardSection、StoryboardCard、`src/components/creation/film-factory/video/VideoBatchDialog.tsx`、单镜生成Route及live适配；新增 `tests/e2e/video-production-flow.spec.ts`。

- [ ] 拆分成功后不自动生成付费图片/视频；先校验、补资产、改引用，再持久化进入待视频阶段。若保留原有“一步自动”模式，应独立明确标识且遵守同样门槛，不能成为默认绕过路径。
- [ ] 点击进入生成阶段立即显示全部目标镜头空框；进度逐卡显示，不用全屏loading把卡片藏起来；刷新依旧空框。
- [ ] 单个/批量使用同一model、duration、aspect、refs、首帧与调度信息解析；移除9:16与5s硬编码。
- [ ] 按模型能力判定是否必须首帧。要求首帧但缺失的镜头列出原因，不默默跳过；支持纯文本视频的模型允许无首帧调用。
- [ ] 失败2/总5准确显示成功3失败2；重试仅2项；有视频则播放实际videoUrl，不能只用海报或“已出视频”徽标冒充可播放产物。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/video-production-flow.spec.ts`。比例9:16/16:9/1:1各一遍，检验CSS和供应商参数同时一致。

## T10 原型逐屏与基础交互复核

覆盖：R02、R04、R10、R11、R14、R16、R17、R19。

**文件**：修改前述对应组件；新增 `tests/e2e/film-factory-reference-ui.spec.ts`。参考图来自原始DOCX，保留来源和图号，不将截图缓存提交。

- [ ] 使用固定夹具：至少3集、2段同名镜组、7镜、四类资产，含单镜独立场景、部分完成/失败状态。
- [ ] 图4/5：运行状态、顶部状态、中央提示、左右栏位置；图6：准确集数/成功数；图7：文本镜组、段头徽标、引用、滚动；图8：问题置顶及处理。
- [ ] 图9：双栏参数、所有实际按钮/开关/三类产物；图10：场景网格、独立场景、人物造型、道具、用于哪些镜头；图11：无图片空框、编辑入口、批量视频、动态比例。
- [ ] 桌面1440×900、参考原图尺寸、窄屏800×600分别检查；不允许遮挡、裁切、无法滚动、双关闭按钮。Dialog最大88vh，内容滚动。
- [ ] 视觉截图外再加行为断言：每个图标对应点击效果；禁止只有toast无实际请求/持久化。相同输入下对照截图复查，动态内容区域排除像素误报。
- [ ] 执行 `PW_NO_SERVER=1 npx playwright test tests/e2e/film-factory-reference-ui.spec.ts`；输出图号→页面→差异→修复→复验记录。

## T11 真实模型与产物效果验收

覆盖：R05、R08、R15、R18。依赖可用的合法配置通道；环境不可用不得强行判通过。

**文件**：新增 `scripts/verify/verify-api-debug-live.cjs`、`docs/acceptance/api-debug-live-results.md`；只写脱敏结果，不写凭据。

- [ ] 先确认当前启用模型能力与可达性；不依赖昨晚“ComfyUI关机”的旧结论。通过配置页/真实最小请求确认文本、图像、视频通道。
- [ ] 选择写实与动漫两个代表风格，每种做角色/道具/场景各2次，共12张卡面；这12张是最小验收样本，不代表长期稳定性统计。
- [ ] 每张逐格检查T4版面清单、文字可读、同一人物各视图一致、道具细节一致、场景无人物且空间一致。少格、重复格、乱码、风格冲突均记录不通过并迭代；保留原输入和重试版本。
- [ ] 用至少两个镜组生成真实短视频，验证更换场景/造型后的引用实际到达供应商；记录结果与参考差异，不能仅凭HTTP200证明人物一致。
- [ ] 核验文件可访问、解码、时长和画幅；没有实际视频不能用SVG/海报通过。
- [ ] `node scripts/verify/verify-api-debug-live.cjs` 运行后记录模型/配置ID、时间、输入摘要、输出地址、实际费用、人工判定。测试失败留下准确原因，不自动切Mock掩盖。

## T12 全量验证与最终交付

覆盖全部R01–R19。

- [ ] 先重新执行本计划新增的语义测试；它们必须包含服务端/受控供应商断言，不能全部mock掉业务代码。
- [ ] 在隔离测试数据、mock模式下运行：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run test:smoke`、`npm run test:e2e`。build与dev不要并发写同一.next；记录实际用例数、失败项、commit与环境。
- [ ] 验证Task worker独立部署与重启恢复；新迁移用`prisma migrate deploy`，旧项目回填后仍能打开、保存、生成。
- [ ] 复核R01全局搜索，不允许“假导出成功”“已取消但还继续提交”“一项失败仍全部完成”。
- [ ] 将R01–R19逐项填为通过/不通过/环境阻塞，附测试和产物证据。不能使用无计算依据的总体百分比替代结论。
- [ ] 更新PROGRESS与旧交付日志的状态说明；保留历史记录并注明修正。尚未完成的真实合成、不可用供应商、未验证效果明确列出。
- [ ] 只提交本次代码、迁移、测试与文档；不提交密钥、数据库、用户临时Word文件和截图目录。

## 可直接采用的行为验收结构

以下不是现有测试已通过的声明，而是新增测试必须验证的业务结果。夹具用登录后的demo测试工作区和受控供应商，记录真实发出的请求。

```ts
// Playwright业务断言示例：一次编辑必须在重开后保留。
await page.getByRole("button", { name: "保存引用", exact: true }).click()
await expect(page.getByRole("dialog")).toBeHidden()
await page.getByRole("button", { name: "编辑引用", exact: true }).first().click()
await expect(page.getByRole("button", { name: "场景C", exact: true }))
  .toHaveAttribute("aria-pressed", "true")
// 再由API读取逐镜结果，断言独立场景B没有被覆盖；不能只断言toast。
```

```ts
// 状态真实性：受控上游失败时，不准出现全成功提示。
await page.route("**/api/storyboards/*/generate", route => route.fulfill({
  status: 502, contentType: "application/json",
  body: JSON.stringify({ error: "受控上游失败" }),
}))
await page.getByRole("button", { name: "批量生成视频", exact: true }).click()
await expect(page.getByText("视频已全部生成", { exact: true })).toHaveCount(0)
await expect(page.getByText(/失败/).first()).toBeVisible()
```

## 工期和依赖说明

按“先写验收、实现、复查”计，T1–T3约2–3人日，T5–T7约3–5人日，T4/T8/T9/T10约3–5人日，T11/T12约1–2人日，另加供应商等待和卡面迭代。合计是粗估9–15人日，不是承诺，也不包括真实后期合成新系统。若只去掉假控件、不做任务/引用/真实产物，可以更快，但不满足本次原文完整要求。

## 计划覆盖复核

R01→T2/T12；R02→T10；R03→T3；R04→T4/T10；R05→T4/T11；R06→T1/T3；R07→T3；R08→T1/T11；R09→T5；R10→T2/T5/T9/T10；R11→T5/T6/T10；R12→T7；R13→T7/T8；R14→T8/T10；R15→T1/T6/T9/T11；R16→T5/T9/T10；R17→T6/T10；R18→T2/T9/T11；R19→T9/T10。

所有任务复验前保持未勾选。本计划没有把“已画按钮”视为完成，也没有将环境阻塞自动降级为Mock通过。

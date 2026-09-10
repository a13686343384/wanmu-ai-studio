# 执行日志：API 调试计划书（15 项需求）

> 计划：`docs/plans/2026-09-10-api-debug-plan.md`
> 每完成一项在此追加。

## 2026-09-10

- [P0] 读取 docx 全文（26 段）+ 提取 11 张原型图并逐一查看。
- [P0] 计划落盘，进入 A 阶段侦察。

- [A1] live 模型回退：loadCustomModel 查无 id 时按 kind 回退第一个启用模型；错误文案改为引导 /ai-settings。✅
- [A2] 提取路由事务后妆造兜底：为无造型角色补「默认造型」（覆盖式与补缺漏两条路径均生效）。✅
- [A3] 资产卡放大镜：角色/妆造/道具卡悬停出「查看大图」，点击全屏预览（AssetImagePreview）。✅
- [A4] 拆分资产携带图片模型：extract 路由新增 imageModel 参数，三路提取提示词追加 [目标图片模型] 适配说明；ScriptDetailView 传入 config.imageModel。✅
- [B1] 两步分离：AssetSetupDialog 改「提取资产描述词」（不出图）；右栏刷新图标改为「重新出图」= 一次性重出角色/场景/道具/造型四类图（逐类跳过空类别）。✅
- [B2] 新建剧本改弹窗：ScriptList 弹窗承载 IntakeForm（embedded 模式：隐藏外层留白与返回按钮），/new 页保留深链兼容。✅
- [B3] 进度规则：WorkflowTabs 增加 assetsReady —— 资产未出齐时进度停在「剧本大纲」（人物/场景灰显），出齐推进到「拆分镜」。✅
- [C1] 镜组分段：Storyboard 新增 segmentTitle/segmentNote（迁移 storyboard_segments）；拆分（mock+live）输出镜组；分镜区按连续 segmentTitle 分组渲染段卡（段头：标题/时长/镜数/状态 chips + 段资产/编辑引用按钮；未出图红 chip + 补全首帧图）。✅
- [C2] 出片前检查重排：顶部红横幅「X 项必须先解决 · Y 项建议补齐」+ 必须解决（红，编辑镜头）/ 建议补齐（橙，去补首帧图）/ 相邻衔接建议（优先级 chips）。✅
- [C3] 编辑整段引用弹窗：场景网格/人物造型 chips/道具多选，默认按分镜文本自动匹配，保存按条写入每个分镜 generationParams.refs（PATCH refs 支持）。✅
- [C4] 段资产弹窗：双模型选择、本段分镜图 N 张未生成、补全所有图片/重新生成全部、同场景逐张出开关、安全改写开关、首帧图/调度图出图块、人群调度卡说明。✅
- [C5] 视频占位：分镜卡占位框按 targetAspect 动态（style.aspectRatio）；视频阶段未出视频的卡显示「生成视频」占位按钮；右上角「批量生成视频」逐镜生成（复用 splitPhase 进度显示）。✅
- [D1] 三类资产参考图提示词模板重写（asset-prompt.ts）：角色设定卡（标题/拼音/档案/主视觉/表情集6宫格/四视图/服饰细节/标志道具/关键特征/色板）、道具卡（三视图/透视大图/局部放大/色板HEX）、场景卡（主视觉HERO/细节4宫格/色板/机位建议3宫格）。✅
- [D2] 全局 loading 审计：移除 AssetSidebar 批量生成的假百分比（固定 interval 自增），改为真实的不确定态（旋转+文案）；分镜拆分改居中不确定 loading；其余（提取 30/100 里程碑、逐镜比例、段填充逐镜标签）为真实进度。✅
- [E] 回归：tsc 0 错误、build 成功、workbench E2E 10/10、smoke 17/17（全量 E2E 38 通过 + 2 例为 dev 路由清单缓存 404 的环境抖动，重启后单跑通过）。ComfyUI 关机期间未做任何 ComfyUI 实测。

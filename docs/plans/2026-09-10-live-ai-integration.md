# 执行计划：真实 AI 服务接入（Qwen/DeepSeek + ComfyUI）与 MOCK 开关

> 日期：2026-09-10 · 状态：执行中 · 日志：`docs/plans/2026-09-10-live-ai-integration.log.md`

## 目标

1. 把用户提供的 **DeepSeek** 与 **阿里云 Qwen（token-plan，OpenAI 兼容）** 凭据接入系统现有配置体系（Credential/CustomModel）。
2. **Qwen 作为主力文本理解模型**：剧本分析 / 会诊 / 台词优化 / 大纲 / 分集摘要 / 资产提取 / 分镜拆分 / 编剧 Agent 对话等全部文本能力走真实接口。
3. 接入局域网 **ComfyUI（192.168.1.12:8118，Win11 + 7900XTX 24G）** 作为图片/视频的本地辅助通道；线上 API 为主、本地为辅，走统一配置入口（凭据 + 自定义模型/模板），不单独开第二套配置。
4. 设置页增加 **MOCK 开关**：开（默认）= 现有 Mock；关 = 文本/图片/视频全走真实接口。
5. 打通工厂生产链路（建档→分析→蓝图→资产→分镜→出图→出视频）在 live 模式下的真实运转。

## 侦察结论（已完成）

- `getAIService()`（src/services/ai/index.ts）：`AI_MODE=live` 目前回退 Mock，真实实现未注册 —— 本计划的落点。
- `AIService` 接口 15 个方法全部带 `model` 入参（当前为 mock 模型 id，如 ovlm-5.6）。
- 插件体系已有 `Credential`（baseUrl+apiKey）与 `CustomModel`（kind/lifecycle/submit/poll/extract 模板化调用引擎 `src/lib/plugins/invoke.ts`，16 个模板）——统一配置入口。
- 无 SystemSetting 表 → 需要新增（存 `ai_mode` 等运行时开关，DB 持久化，改动即时生效、无需改 env）。
- ComfyUI 8118：主机 ping 通（192.168.1.5 → 192.168.1.12），**端口不通**（服务未启动或 Win11 防火墙拦截）→ 全部适配做成配置驱动，凭据中存地址，服务可达即用；设置页提供连通性测试按钮。
- workflow 文件夹：`api_base_workflow/MiniMaxH3多参视频.json` 已是 **API 格式**（图生视频，4 参考图 + 提示词，4-step turbo，Sage/BlockSwap 适配 24G 卡）——用作视频模板；`01-Z_image_Turbo-文生图.json` 是 **UI 格式**，需离线转换为 API 格式（写转换脚本）；另有 Qwen-Image-2512 文生图等备用。

## 阶段

### P1 配置基座（SystemSetting + 凭据落库）
- [x] P1.1 Prisma 新增 `SystemSetting(key@id, value Json, updatedAt)` + 迁移。
- [x] P1.2 `lib/settings.ts`：读写 `ai_mode`（mock|live）+ `ai_providers`（qwen/deepseek/comfyui 的 baseUrl、模型名、凭据引用），5s 进程内缓存。
- [x] P1.3 把用户三组凭据写入 `Credential` 表（qwen-token-plan / deepseek / comfyui-local），幂等脚本 `scripts/setup-live-ai.mjs`。

### P2 真实文本服务（Qwen 主力，DeepSeek 辅）
- [x] P2.1 `src/services/ai/live/openai-chat.ts`：OpenAI 兼容 chat.completions 调用（baseUrl 可配），支持 JSON 输出解析与一次修复重试。
- [x] P2.2 `src/services/ai/live-ai.service.ts`：实现 15 个方法的文本部分；model 入参映射（`ovlm-*`/`glm-*`/`deepseek*` → 配置的主力 qwen 模型或 deepseek）；输出结构体与 Mock 同形。
- [x] P2.3 文本能力清单逐一接线：writeScript、analyzeScript、generateText、consultScript、consultChat、optimizeDialogue、generateOutline、summarizeEpisode、extractCharacters/Scenes/Props、splitStoryboards。
- [x] P2.4 探测 token-plan `/models` 可用模型，选定主力（qwen-plus 级）与 fallback（deepseek-chat）；凭据写入后用真实 key 打一次最小请求验证。

### P3 图片/视频（线上优先，ComfyUI 辅助）
- [x] P3.1 `src/services/ai/live/image.ts`：生成顺序 = 启用中的 CustomModel(kind=image)（走 invoke 引擎）→ ComfyUI 文生图模板 → 显式报错（绝不静默回 Mock 混真数据）。
- [x] P3.2 `src/services/ai/live/video.ts`：同序；ComfyUI 走 MiniMaxH3 图生视频模板（参数：提示词/比例/时长/参考图/种子）。
- [x] P3.3 `src/services/ai/comfy/`：ComfyUI 客户端（`/prompt` 提交、`/history/{id}` 轮询、`/view` 下载、`/upload/image` 上传参考图）；UI→API 格式离线转换脚本，产出文生图 API 模板入库。
- [x] P3.4 generateAudio：live 模式暂返回明确「暂未配置」错误（不阻塞主链路）。

### P4 MOCK 开关（设置页）
- [x] P4.1 `getAIService()` 改为读 SystemSetting（进程缓存 5s）：mock → Mock 实现；live → Live 实现（文本全真；图片/视频按 P3 顺序）。
- [x] P4.2 设置页（plugins/PluginSettings 同级新增「AI 服务」卡片）：MOCK 开关、三组凭据状态、ComfyUI 连通性测试按钮（打 /system_info）、主力文本模型显示。API：`/api/settings/ai`（GET/PATCH，requireUser + 管理校验沿用现有会话）。

### P5 生产链路接入与端到端
- [x] P5.1 live 模式下工厂链路真实运转验证：建档→分析（Qwen）→会诊→蓝图→资产提取→分镜拆分（文本部分全真）。
- [x] P5.2 出图/出视频：ComfyUI 可达时真出；不可达时返回清晰错误（设置页可见原因），不落脏数据。
- [x] P5.3 E2E：保持 mock 模式 40/40 不变；新增 `scripts/verify/verify-live-ai.cjs` 脚本验证 live 模式（文本真实调用一次 + 开关切换）。

### P6 回归与提交
- [x] P6.1 `npx tsc --noEmit`、`npm run build`、`npm run test:smoke`、`PW_NO_SERVER=1 playwright test`。
- [x] P6.2 分阶段提交（P1/P2、P3、P4/P5 各一笔），更新本文件勾选与日志。

## 风险与决策记录
- ComfyUI 当前端口不通 → 全部配置驱动，凭据地址可改；不阻塞其它阶段。
- token-plan 兼容端点的可用模型名需上线探测后写死为主力（P2.4），代码里做成配置项可改。
- Mock 积分扣费逻辑保留不变；live 模式仍扣积分（防止真实费用失控时无限调用）。
- 密钥只落 DB（Credential 表），不进代码与 git。

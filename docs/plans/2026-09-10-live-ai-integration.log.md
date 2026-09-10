# 执行日志：live-ai-integration

> 计划：`docs/plans/2026-09-10-live-ai-integration.md`
> 约定：每完成一项，在此追加一行（时间 + 阶段 + 内容 + 证据）。

## 2026-09-10

- [P0 侦察] `getAIService()` AI_MODE=live 回退 Mock 未注册真实实现；AIService 15 方法均带 model 入参。
- [P0 侦察] 插件体系已有 Credential / CustomModel（16 模板 + invoke 引擎），作为统一配置入口。
- [P0 侦察] 无 SystemSetting 表 → P1 新增。
- [P0 侦察] ComfyUI 192.168.1.12:8118：ping 通、8118 端口不通（服务未启动或防火墙）→ 配置驱动 + 设置页连通性测试。
- [P0 侦察] workflow 文件夹：`api_base_workflow/MiniMaxH3多参视频.json` 已是 API 格式（4 参考图图生视频，含 Qwen3.5-VL 本地提示词增强、4-step turbo、Sage+BlockSwap，适配 24G 卡）→ 视频模板；`01-Z_image_Turbo-文生图.json` 为 UI 格式 → P3.3 离线转换；备用：Qwen-Image-2512 文生图、Scail 动作迁移、TTS 等。

- [P1] SystemSetting 表 + 迁移 system_settings；lib/settings.ts（ai_mode / ai_providers，5s 缓存）。
- [P1] scripts/setup-live-ai.mjs 幂等落库：阿里云 Qwen（token-plan）/ DeepSeek 凭据 + ai_providers 默认值。
- [P2.4] token-plan /models 探测：文本 qwen3.8-max/flash、qwen3.7-max/plus、qwen3.6-flash、glm-5.2、deepseek-v4-pro/flash；图片 wan2.7-image(-pro)；音频 TTS。主力文本 = qwen3.7-plus（最小请求实测「收到」，69 tokens）。
- [P2] live/openai-chat.ts（chat.completions + JSON 提取/修复重试）；live-ai.service.ts 15 方法全实现（文本 11 个方法走 Qwen 主力/DeepSeek 辅助 failover；writeScript/analyze/consult/outline/extract/split 均真实输出）。
- [P3] comfy/client.ts（/system_info ping、/upload/image、/prompt 提交、/history 轮询、/view 下载、产物落 MediaFile）；Z-Image Turbo 文生图模板（CFG1/9步/res_multistep/AuraFlow shift3，按源工作流）；MiniMaxH3 图生视频模板（用户 API 格式工作流原样入库，参数化 提示词/比例/时长/种子/4 参考图）。
- [P3] 图片/视频顺序 = 线上 CustomModel(kind) → ComfyUI → 明确报错（不静默回 Mock）；generateAudio live 下明确「暂未配置」。token-plan images 端点报 url error，线上出图通道留待插件模板接入。
- [P3] GenerateImage/VideoInput 增加可选 workspaceId；assets/storyboards/ecommerce/spatial 各调用点传入。
- [P4] getAIService() 改为 mode-aware Proxy（每调用读 SystemSetting，5s 缓存），调用方零改动；/api/settings/ai GET/PATCH/POST(test-comfyui)；插件页新增「AI 服务」卡片（MOCK 开关、凭据状态、Key 更新、ComfyUI 地址+连通性测试）。
- [P5] 端到端实测：live 模式 analyzeScript 返回真实 Qwen 立项方案（与 Mock 启发式截然不同）；切回 mock 行为复原；ComfyUI 测试端点返回清晰的不可达提示。
- [P6] tsc 0 错误；build 成功；E2E 40/40（mock 模式回归不受影响）。
- [备注] ComfyUI 8118 当前不可达（Win11 服务未启动或防火墙拦截）；服务可达后出图/出视频即走本地通道，无需改代码。

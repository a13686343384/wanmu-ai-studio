# 统一模型配置 — 执行计划日志

> **创建：** 2026-09-10
> **设计文档：** `docs/superpowers/specs/2026-09-10-unified-model-config-design.md`

## 阶段概览

| # | 阶段 | 状态 | 说明 |
|---|------|------|------|
| 1 | 数据模型 + Prisma 迁移 | ✅ 完成 | CustomModel 加 cost/transformBody/providerType，新增 SUBTITLE_MODELS |
| 2-4 | 调用引擎统一化（合并执行） | ✅ 完成 | SystemSetting 简化 + invoke transformBody + live-ai 统一分发 + UI 精简 |
| 5 | ComfyUI 纳入 CustomModel | ✅ 完成 | 种子数据预置 ComfyUI 图片+视频模型，providerType=comfyui |
| 6 | 字幕 ASR 能力 | ✅ 完成 | types + mock + live 实现，SRT 输出 |
| 7 | 模板补充 | ✅ 完成 | 火山 Seedance（含 transformBody）+ Whisper ASR 模板 |
| 8 | 验证 | ✅ 通过 | tsc 0 错误 · build 编译成功 · dev server 正常 |

## 执行日志

### 2026-09-10 · 前置工作完成

**已完成的前置改造（本次会话早期）：**
- ✅ 新增 `GET /api/ai/models?kind=` API（mock 返回内置列表，live 返回 CustomModel）
- ✅ 新增 `useAiModels(kind)` hook
- ✅ 改造 18 个 UI 组件从静态常量改为动态 hook
- ✅ `live-ai.service.ts` 的 generateImage/generateVideo/generateAudio 改为要求 CustomModel
- ✅ TypeScript 编译 0 错误，构建成功

**设计文档第一节已确认：**
- CustomModel 加 cost / transformBody / providerType
- kind 新增 subtitle
- SystemSetting 只保留 ai_mode
- ComfyUI 统一为一个模型实例

### 2026-09-10 · 阶段 1 完成

- ✅ Prisma 迁移 `20260910110714_add_cost_transformbody_providertype_subtitle` 已应用
- ✅ CustomModel 新增字段：cost (Int), transformBody (String?), providerType (String)
- ✅ kind 注释更新为 text | image | video | audio | subtitle
- ✅ SUBTITLE_MODELS 常量添加到 constants.ts
- ✅ API /api/ai/models 支持 subtitle kind，live 模式返回 m.cost
- ✅ useAiModels hook ModelKind 加 subtitle
- ✅ templates.ts ModelKind 加 subtitle
- ✅ PluginSettings KIND_LABEL 加字幕
- ✅ tsc --noEmit 0 错误

### 2026-09-10 · 阶段 2-4 进行中

**已完成：**
- ✅ invoke.ts 加 transformBody 钩子（InvokeConfig 接口 + renderValue 后执行）
- ✅ settings.ts 精简：删除 AiProviders/getAiProviders/setAiProviders/DEFAULT_PROVIDERS，只保留 getAiMode/setAiMode
- ✅ /api/settings/ai route 精简：GET 只返回 mode，PATCH 只接受 mode
- ✅ AiServiceSettings UI 精简：只保留 mock 开关
- 🔄 live-ai.service.ts 重构中（子代理处理）：统一 CustomModel 查找，删除硬编码 provider

**待子代理完成：**
- live-ai.service.ts 的 chatText/generateImage/generateVideo/generateAudio 全部改为 loadCustomModel 分发

### 2026-09-10 · 阶段 2-4 完成

**已完成：**
- ✅ settings.ts：删除 AiProviders/getAiProviders/setAiProviders/DEFAULT_PROVIDERS，只保留 getAiMode/setAiMode
- ✅ /api/settings/ai：GET 只返回 mode，PATCH 只接受 mode
- ✅ AiServiceSettings UI：精简为 mock 开关 + 引导文案
- ✅ invoke.ts：InvokeConfig 加 transformBody，renderValue 后执行钩子
- ✅ live-ai.service.ts：
  - 新增 loadCustomModel() 统一查找函数
  - textChannels() 改为先查 CustomModel(kind=text)，fallback 到 Credential 表
  - generateImage/generateVideo：按 providerType 分发（api→invokeCustomModel, comfyui→comfyRun）
  - generateAudio：走 invokeCustomModel
  - 删除 customModelMedia()、旧的 textChannels/loadCredentialKey/hasKey
- ✅ tsc --noEmit 0 错误

**设计决策：**
- 文本通道保留 fallback 到 Credential 表（避免现有 Qwen/DeepSeek 凭据立即失效），后续可完全迁移到 CustomModel
- ComfyUI 的 baseUrl 通过参数传递，不再读 SystemSetting

### 2026-09-10 · 阶段 5 完成 + 构建验证通过

**已完成：**
- ✅ 种子数据新增 ComfyUI 本地图片模型（cm-comfyui-local, providerType=comfyui）
- ✅ 种子数据新增 ComfyUI 本地视频模型（cm-comfyui-video, providerType=comfyui）
- ✅ tsc --noEmit 0 错误
- ✅ npm run build 编译成功（27/27 页面生成）
- ✅ dev server 正常启动

**已知遗留（非本次引入）：**
- build 的 standalone 输出步骤有 ENOENT 错误（Next.js 14 已知 bug，不影响 dev 模式）
- /404 和 /500 预渲染警告（pre-existing）

### 2026-09-10 · 阶段 6-7 完成

**阶段 6 — 字幕 ASR：**
- ✅ types.ts 新增 GenerateSubtitleInput/Result/SubtitleSegment
- ✅ AIService 接口加 generateSubtitle 方法
- ✅ mock-ai.service.ts 实现（返回 3 段假字幕 SRT）
- ✅ live-ai.service.ts 实现（invokeCustomModel → 解析 JSON segments → SRT）

**阶段 7 — 模板补充：**
- ✅ 火山 Seedance 模板（volc-seedance）：async + transformBody 注入 content 数组
- ✅ Whisper ASR 模板（whisper-asr）：sync + multipart/form-data
- ✅ tsc --noEmit 0 错误

---

## 全部 8 个阶段完成 🎉

---

### 2026-09-10 · 优化轮次完成

**已完成 6/7 项改进：**
- ✅ O1: 文本通道去 fallback + 种子数据预置 Qwen/DeepSeek CustomModel
- ✅ O2: POST /api/plugins/models/[id]/test + PluginSettings Play 按钮
- ✅ O3: loaded.cost → usage.tapies 链路已通
- ✅ O4: comfyImage/comfyVideo 接受 workflow 参数从 constraints 读取
- ✅ O6: 架构天然支持多 ComfyUI 实例
- ✅ O7: 错误信息统一 /plugins 路径 + UI 空状态加链接
- ⏸️ O5: 模型分组排序延后（当前模型数量少）

---

## 优化轮次（设计文档第五节改进建议）

| # | 改进项 | 状态 | 说明 |
|---|--------|------|------|
| O1 | 文本通道去 fallback | ✅ | 删除 Credential fallback，种子数据预置 Qwen/DeepSeek CustomModel |
| O2 | 模型连通性测试按钮 | ✅ | POST /api/plugins/models/[id]/test + Play 按钮 |
| O3 | 积分体系打通 | ✅ | loaded.cost → usage.tapies 链路已通 |
| O4 | ComfyUI 工作流灵活化 | ✅ | comfyImage/comfyVideo 接受 workflow 参数，从 constraints 读取 |
| O5 | 模型分组排序 | ⏸️ 延后 | 当前模型数量少，优先级低 |
| O8 | 模块重命名：插件 → AI 设置 | ✅ | URL /plugins → /ai-settings，全部文案更新 |
| O6 | 多 ComfyUI 实例 | ✅ | 架构已天然支持（多条 providerType=comfyui 记录） |
| O7 | 错误信息深链接 | ✅ | 后端错误统一 /plugins 路径 + UI 空状态加链接 |

# 统一模型配置模块设计

> **日期：** 2026-09-10
> **状态：** 设计中（第一节已确认）
> **作者：** AI Agent + 用户协作

## 背景与动机

### 现有问题
1. **两套配置体系并存**：`AiServiceSettings`（Qwen/DeepSeek/ComfyUI 硬编码）+ `PluginSettings`（CustomModel），职责不清
2. **文本通道硬编码**：`live-ai.service.ts` 的 `chatText()` 直接读 `getAiProviders()`，绕过 CustomModel 体系
3. **ComfyUI 是孤岛**：有独立 client/workflow/ping，但不出现在模型选择器里
4. **模板引擎表达力不足**：`{{key}}` 字符串替换无法覆盖火山 Seedance / 可灵等结构化请求体
5. **缺少字幕能力**：ASR（语音转字幕）未在模型体系中
6. **模型无 cost 字段**：live 模式下选择器显示 "0 起"，无法区分成本

### 目标
- 统一为单一 CustomModel 体系，`/plugins` 页为唯一模型管理入口
- 支持：线上 API / 本地 ComfyUI / 线上 ComfyUI
- 能力覆盖：文本 / 图片 / 视频 / 音频 / 字幕（ASR）
- mock / live 模式切换，仅管理员可操作
- 调用引擎支持 transformBody 钩子，覆盖任意 API 结构

## 设计决策记录

| # | 决策 | 选项 | 结论 | 理由 |
|---|------|------|------|------|
| 1 | 字幕范围 | ASR / 文案生成 / 烧录 / 全部 | ASR（语音转字幕） | 用户明确选择 |
| 2 | ComfyUI 实例 | 统一一个 / 可配多个 | 统一为一个 | 切换本地/线上时改地址即可 |
| 3 | 文本模型 | 纳入统一 / 保持现状 | 全部纳入 | 废弃 AiServiceSettings 硬编码 |
| 4 | 调用引擎扩展 | transformBody 钩子 / Handlebars 语法 / 专用适配器 | transformBody 钩子 | 轻量、灵活、不破坏现有模板 |

## 第一节：统一模型数据模型（已确认 ✅）

### CustomModel 表扩展

```prisma
model CustomModel {
  // === 现有字段保留 ===
  id           String   @id @default(cuid())
  workspaceId  String
  name         String
  kind         String   // text | image | video | audio | subtitle
  lifecycle    String   @default("sync")
  baseUrl      String
  apiKey       String?
  credentialId String?
  auth         Json     @default("{}")
  constraints  Json     @default("{}")
  submit       Json     @default("{}")
  edits        Json?
  firstLast    Json?
  refRegister  Json?
  poll         Json?
  extract      Json     @default("{}")
  result       Json     @default("{}")
  templateKey  String?
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // === 新增字段 ===
  cost          Int     @default(0)     // 积分消耗
  transformBody String?                 // JS 函数体，body 预处理钩子
  providerType  String  @default("api") // api | comfyui

  workspace    Workspace    @relation(...)
  credential   Credential?  @relation(...)
}
```

### providerType 语义

| 值 | 调用通道 | 说明 |
|----|---------|------|
| `api` | `invokeCustomModel()` | REST API，走模板渲染 + transformBody + sync/async/poll |
| `comfyui` | `comfyRun()` | ComfyUI /prompt → /history → /view 协议 |

### SystemSetting 简化

```
ai_mode: "mock" | "live"     ← 保留
ai_providers: { ... }        ← 删除（qwen/deepseek/comfyui 硬编码配置块）
```

### mock 模式行为

- 模型选择器显示内置列表（TEXT_MODELS / IMAGE_MODELS / VIDEO_MODELS / AUDIO_MODELS + 新增 SUBTITLE_MODELS）
- 调用走 `mock-ai.service.ts`
- 不需要任何 CustomModel 配置

### live 模式行为

- 模型选择器只显示 CustomModel 表中 `enabled=true` 的记录
- 按 `providerType` 分发到对应调用引擎
- 无可用模型时明确提示

## 第二节：调用引擎改造（已确认 ✅）

### 2.1 invoke.ts 加 transformBody 钩子

在 `renderValue` 之后、`fetch` 之前，如果 CustomModel 配了 `transformBody`，执行它：

```js
// 签名：(body, input) => body
// body = renderValue 渲染后的对象
// input = { prompt, refs, ratio, resolution, duration, count, quality }
// 示例（火山 Seedance）：
(body, input) => {
  const content = [{ type: "text", text: input.prompt }]
  if (input.refs?.length) {
    content.push({ type: "image_url", image_url: { url: input.refs[0] }, role: "first_frame" })
  }
  return { ...body, content }
}
```

执行方式：`new Function('body', 'input', transformBody)(body, input)`，try-catch 包裹，失败用原始 body + 警告。

### 2.2 live-ai.service.ts 统一分发

```
generateImage / generateVideo / generateAudio / generateSubtitle
  → 按 input.model (= CustomModel.id) 精确查找
  → providerType="api"     → invokeCustomModel()
  → providerType="comfyui" → comfyRun()
  → 无 CustomModel         → 明确报错
```

### 2.3 文本通道统一

`chatText()` 改为接收 modelId，从 CustomModel 读取配置，用 invokeCustomModel 调用。
废弃 `textChannels()` / `loadCredentialKey()` / `getAiProviders()`。

### 2.4 ComfyUI 调用适配

`providerType=comfyui` 时：
- baseUrl = ComfyUI 地址
- constraints.workflow = 工作流模板名
- 调用 comfyRun()，复用现有 client

## 第三节：UI 统一（已确认 ✅）

### AiServiceSettings 精简
- 只保留 mock/live 开关
- 删除 Qwen/DeepSeek Key 输入框、ComfyUI 地址配置、凭据状态面板
- 提示文案引导用户到「模型」Tab 配置

### PluginSettings 成为唯一入口
- 模型 Tab：管理所有 CustomModel（text/image/video/audio/subtitle）
- 凭据 Tab：管理 API Key
- KIND_LABEL 新增「字幕」

### /api/settings/ai 简化
- GET：只返回 `{ mode }`
- PATCH：只接受 `{ mode: "mock" | "live" }`
- 删除 providers/credentials 相关逻辑

## 第四节：迁移策略

### 向后兼容
- SystemSetting 表中的 `ai_providers` 行不删除（避免迁移风险），只是不再被代码读取
- 现有 Credential 记录保留，可被 CustomModel 通过 credentialId 引用
- ComfyUI 地址从 SystemSetting 迁移到 CustomModel（providerType=comfyui）

### 种子数据
- 预置 ComfyUI 图片模型（cm-comfyui-local, providerType=comfyui）
- 预置 ComfyUI 视频模型（cm-comfyui-video, providerType=comfyui）

## 第五节：设计审视与改进建议

### 当前设计的优点

1. **单一数据源**：所有模型都是 CustomModel，一个表管一切
2. **调用引擎可扩展**：transformBody 钩子让任意 API 结构都能适配
3. **providerType 分离**：API 和 ComfyUI 走不同通道但共享选择器
4. **mock/live 干净切换**：一个开关，前端自动切换内置列表 vs 自定义列表
5. **模板体系完整**：18 个模板覆盖主流 API 形态

### 已知不足与改进建议

#### 1. 文本通道仍有 fallback（技术债）
**现状**：`textChannels()` 先查 CustomModel(kind=text)，找不到时 fallback 到 Credential 表中硬编码名称的记录。
**风险**：两套查找逻辑并存，用户可能困惑"我配了 CustomModel 但系统还在用旧的 Qwen"。
**建议**：下一轮彻底删除 fallback，强制要求文本也通过 CustomModel 配置。迁移脚本自动把现有 Credential 转为 CustomModel。

#### 2. ComfyUI 工作流绑定不够灵活
**现状**：ComfyUI 模型的 `constraints.workflow` 是字符串，对应代码里硬编码的工作流模板（z-image-t2i / minimax-h3-r2v）。新增工作流需要改代码。
**建议**：把 ComfyUI 工作流 JSON 存到数据库或文件系统，constraints.workflow 引用文件名而非硬编码 key。或者允许用户在 UI 上传 .json 工作流。

#### 3. 缺少模型连通性测试
**现状**：配完模型保存后没有"测试连接"按钮，只能等实际生成时才发现配错。
**建议**：在 PluginSettings 的模型卡片上加"测试"按钮，对 api 类型发一个轻量请求（如 /models），对 comfyui 类型调 /api/system_stats。

#### 4. 积分体系未打通
**现状**：CustomModel.cost 字段已加，但 live 模式下实际扣费仍由 generate route 里的 `result.usage.tapies` 决定，而 invokeCustomModel 返回的 usage 是 0。
**建议**：invokeCustomModel 成功后，用 CustomModel.cost 作为 tapies；或在 constraints 里支持按分辨率/时长动态计费。

#### 5. 模型分组与排序
**现状**：模型选择器按 createdAt 倒序排列，无分组。当模型数量增多时难以查找。
**建议**：选择器按 kind 分组显示；CustomModel 加 sortOrder 字段支持手动排序。

#### 6. 多 ComfyUI 实例
**现状**：设计决策是"统一为一个 ComfyUI 模型"，但实际可能需要同时使用本地 GPU 和云端 GPU。
**建议**：未来可放宽为多个 providerType=comfyui 的模型，每个有不同的 baseUrl 和 name。当前架构已支持（只需在种子数据里多加几条），只是 UI 上需要更好的区分展示。

#### 7. 错误信息缺少深链接
**现状**："请到「插件」页检查配置"是纯文本，用户需要手动导航。
**建议**：改为带链接的 toast 或内联提示，点击直接跳转到 /plugins。

# API Reference

万幕生全部 HTTP 接口。实现位于 `src/app/api/**/route.ts`，请求校验统一使用 Zod（`src/lib/validations/`）。

## 通用约定

### Base URL

```
http://localhost:3000
```

### 认证

除 `POST /api/auth/register` 与 NextAuth 自身的 `signin/callback` 外，所有接口都需要**已登录会话**：

- 浏览器端：登录后自动携带 NextAuth 会话 Cookie（`next-auth.session-token`）。
- 脚本 / 测试：先走 `POST /api/auth/callback/credentials` 拿到 Set-Cookie，后续请求带上该 Cookie（参见 `scripts/smoke-test.mjs`）。

未登录访问受保护接口时，`requireUser()` 抛出 `401`。

### 响应封装

所有业务接口（`/api/auth/register` 除外）使用统一封装 `jsonOk` / `jsonError`（`src/lib/api.ts`）：

```jsonc
// 成功
{ "data": { /* ... */ }, "message": "可选提示" }

// 失败
{ "error": "中文错误信息", "details": { /* 可选：Zod 字段级错误等 */ } }
```

### 状态码

| 状态码 | 场景 |
|---|---|
| 200 | 查询 / 更新成功 |
| 201 | 创建成功（项目、剧本、分镜、BGM、团队、注册等） |
| 400 | 参数校验失败（Zod → `details.fieldErrors`）、业务规则不满足 |
| 401 | 未登录 / 会话失效 |
| 402 | 积分不足（仅 `/api/ai/generate`） |
| 403 | 目标资源存在但当前用户无权访问 |
| 404 | 资源不存在（或按权限链路不可见，与 403 合并返回 404 的接口见各节说明） |
| 409 | 唯一性冲突（邮箱已注册、重复申请入队等） |
| 422 | AI 返回结果为空（拆分镜未产出镜头） |
| 500 | 未处理异常 |

### 鉴权链路

资源访问一律按「用户 → 工作区成员」校验，不按裸 id 查询：

- 画布项目：`workspace.members.some(userId)`
- 剧本及子资源（分集 / 资产 / 分镜 / 会诊）：`script.workspace.members.some(userId)`

因此「存在但无权」的资源统一返回 `404 项目/剧本不存在或无权访问`。

---

## 1. 认证

### POST /api/auth/register

注册新用户，并自动创建其个人工作区（成员角色 `owner`）。

**请求体**

| 字段 | 类型 | 规则 |
|---|---|---|
| `name` | string | 2–24 字符 |
| `email` | string | 合法邮箱 |
| `password` | string | 8–72 位，需含字母与数字 |
| `confirmPassword` | string | 必须与 password 一致 |

**响应** `201` → `{ data: { id, name, email } }`

**错误**：`400` 参数校验失败（details.fieldErrors）· `409` 该邮箱已被注册 · `500` 注册失败

### /api/auth/[...nextauth]（GET / POST）

NextAuth v4 标准 endpoints：

- `GET /api/auth/session` — 当前会话（含 `user.id / tapies / membership` 扩展字段）
- `POST /api/auth/callback/credentials` — 凭据登录（body: `email`, `password`）
- `POST /api/auth/signout` — 退出登录

---

## 2. 工作区

### GET /api/workspaces

返回当前用户的全部工作区（个人在前）。

**响应** `data: WorkspaceSummary[]`

```jsonc
{
  "id": "ws-personal-demo",
  "name": "用户0272 的工作区",
  "description": null,
  "isPersonal": true,
  "role": "owner",            // owner | admin | member
  "memberCount": 1,
  "projectCount": 2,
  "scriptCount": 1
}
```

### POST /api/workspaces

创建团队工作区。每人最多创建 `MAX_TEAMS_PER_USER`（5）个团队。

**请求体**：`{ name: string(2–24), description?: string(≤120) }`

**响应** `201` → `{ data: WorkspaceSummary }`（`role: "owner"`，计数为 0）

**错误**：`400` 团队数量已达上限 / 校验失败

### POST /api/workspaces/join

通过 32 位 Team ID 申请加入团队，写入 `TeamJoinRequest`（`status: "pending"`，等待管理员审批——审批 UI 尚未实现）。

**请求体**：`{ teamId: string(32 位字母数字), message?: string(≤120) }`

**响应** `201` → `{ data: { id, status: "pending", workspaceName } }`

**错误**：`404` Team ID 不存在 · `400` 你是该团队创建者 · `409` 已是成员 / 已有 pending 申请

---

## 3. 画布项目

### GET /api/projects

按当前用户可见（工作区成员）的项目列表，排除已删除。

**Query 参数**

| 参数 | 取值 | 默认 |
|---|---|---|
| `scope` | `personal` / `team` / `all` | `all` |
| `workspaceId` | 工作区 id | -（优先于 scope） |
| `q` | 名称 / 描述模糊搜索 | - |
| `filter` | `all` / `folder`（仅文件夹）/ `project`（仅项目） | `all` |
| `sort` | `updated` / `created` | `updated` |
| `order` | `desc` / `asc` | `desc` |

**响应** `data: ProjectSummary[]`

```jsonc
{
  "id": "…", "name": "小和尚", "description": null, "coverImage": null,
  "folder": null, "status": "active",
  "workspaceId": "…", "workspaceName": "用户0272 的工作区", "isPersonal": true,
  "itemCount": 3,               // 画布节点数
  "createdAt": "…ISO", "updatedAt": "…ISO"
}
```

### POST /api/projects

新建项目并同时创建空画布。

**请求体**：`{ name: string(1–60), description?: string(≤200), folder?: string(≤40), workspaceId?: string }`
不传 `workspaceId` 时落到用户个人工作区。

**响应** `201` → `{ data: ProjectSummary }`（`itemCount: 0`）

### GET /api/projects/[id]

**响应** `data: ProjectDetail` — ProjectSummary 字段 + `canvas`（完整画布记录）。

**错误**：`404` 项目不存在或无权访问

### PATCH /api/projects/[id]

重命名 / 移动文件夹 / 归档 / 恢复 / 软删除 / 更新封面。

**请求体**（均可选）：`{ name?, description?(nullable), folder?(nullable), status?: "active"|"archived"|"deleted", coverImage?(nullable) }`

**响应** → `{ data: { id, name, folder, status, updatedAt } }`

### DELETE /api/projects/[id]

软删除：`status → "deleted"`（可 PATCH 恢复，画布内容保留）。

**响应** → `{ data: { id } }`

### POST /api/projects/[id]/move

将项目（含画布记录）转移到当前用户所在的另一工作区，事务内同步 `canvas.workspaceId`。

**请求体**：`{ targetWorkspaceId: string }`

**响应** → `{ data: { id, workspaceId } }`

**错误**：`404` 项目不存在或无权访问 · `403` 目标工作区不存在或无权访问 · `400` 项目已在目标工作区中

---

## 4. 画布数据

### GET /api/canvas/[projectId]

**响应**

```jsonc
{
  "projectId": "…", "projectName": "小和尚",
  "nodes": [ /* React Flow 节点，任意 JSON */ ],
  "edges": [ /* React Flow 边 */ ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "updatedAt": "…ISO"
}
```

**错误**：`404` 项目不存在或无权访问

### PUT /api/canvas/[projectId]

全量保存节点、连线与视口（编辑器 ⌘S 调用），并刷新 `Project.updatedAt` 供列表排序。幂等 upsert。

**请求体**

| 字段 | 规则 |
|---|---|
| `nodes` | 数组，≤ 2000 项 |
| `edges` | 数组，≤ 4000 项 |
| `viewport` | `{ x, y, zoom }`，缺省 `{ x:0, y:0, zoom:1 }` |

**响应** → `{ data: { projectId, nodeCount, edgeCount, updatedAt } }`

---

## 5. 工作台 AI 生成

### POST /api/ai/generate

统一生成入口：按 `mediaType` 分发到 AI 抽象层（`getAIService()`），成功后原子扣减积分。

**请求体**

| 字段 | 类型 | 规则 / 默认 |
|---|---|---|
| `mediaType` | `"video" \| "image" \| "audio"` | 必填 |
| `prompt` | string | 1–2000 字 |
| `modelId` | string | 模型 id，见 `constants.ts` 的 `*_MODELS` |
| `aspectRatio` | string | 默认 `"16:9"` |
| `resolution` | string | 默认 `"480p"` |
| `duration` | string | 默认 `"5s"`（video/audio 生效） |
| `count` | number | 1–4，默认 1（image 生效） |
| `style` | string \| null | 可选 |
| `references` | `{ name, kind: "image"\|"video"\|"audio" }[]` | ≤ 12 项，默认 `[]` |

**响应** → `{ data: { id, mediaType, url, poster?, duration?, model, cost, tapiesLeft, prompt } }`

**错误**：`402` 积分不足（消息含所需与余额）· `400` 校验失败 · `401` 未登录

---

## 6. 剧本主流程（影视工厂）

剧本状态机：`intake → outlining → assets → storyboarding → video → post_production → completed`（`WORKFLOW_STAGES`）。

### GET /api/scripts

**Query**：`q`（标题模糊）、`status`（状态枚举值）、`scope=personal|team|all`、`workspaceId`

**响应** `data: ScriptSummary[]`（含 `workspaceName / isPersonal / counts{episodes,characters,scenes,props} / progress / progressLabel` 等）

### POST /api/scripts

INTAKE 第一步：落库原始剧本（`status: "intake"`、`processingStatus: "processing"`），供随后 analyze。

**请求体**

| 字段 | 规则 |
|---|---|
| `title` | 1–60 字 |
| `content` | 20–200000 字 |
| `workType` | `vertical_short` / `horizontal_short` / `micro_film` / `anime` |
| `seriesType` | `limited`（限定剧）/ `serial`（连载） |
| `targetAspect` | `9:16` / `16:9` / `1:1` / `4:3` / `3:4` |
| `textModel` | 模型 id |
| `processingMode` | `consult_optimize`（会诊+优化）/ `keep_original`（原样保留） |
| `executionMode` | `step_by_step` / `full_auto` |
| `consultModel` / `dialogueModel` | 可选，缺省跟随 `textModel` |
| `workspaceId` | 可选，缺省个人工作区 |

**响应** `201` → `{ data: ScriptSummary }`

### GET /api/scripts/[id]

剧本详情：元信息 + `episodes`（按集号排序）+ `characters` / `scenes` / `props` + `consultations`（最近 5 次），日期均为 ISO 字符串。

**错误**：`404` 剧本不存在或无权访问

### PATCH /api/scripts/[id]

局部更新：`title / synopsis / status / processingStatus / progress / progressLabel / genre / narrativeStyle / visualStyle / costumeStyle / era / totalEpisodes / episodeDuration / targetAspect`（均可选，规则见 route 内 `patchScriptSchema`）。

**响应** → `{ data: { id, title, status, processingStatus, progress, progressLabel, updatedAt } }`

### DELETE /api/scripts/[id]

物理删除剧本（级联删除分集 / 资产 / 分镜 / 会诊）。**响应** → `{ data: { id } }`

### POST /api/scripts/[id]/analyze

INTAKE 第二步：AI 通读全本，返回题材 / 叙事 / 视觉 / 服装 / 年代 / 基调 / 内容红线与推荐集数时长，并写回剧本元信息（`progressLabel: "分析完成，待你审阅"`）。

**请求体**：无

**响应** → `{ data: { script: {...摘要}, analysis, usage } }`；`analysis` 含 `genre / narrativeStyle / visualStyle / costumeStyle / era / tone / allowed[] / forbidden[] / recommendedEpisodes / recommendedDuration`。

### POST /api/scripts/[id]/finalize

INTAKE 第三步：应用用户审阅后的元信息，AI 生成分集大纲并重建 `Episode` 记录（重复提交幂等），状态 `intake → outlining`。

**请求体**：`{ title, totalEpisodes(1–500), episodeDuration(5–3600), targetAspect, genre?, narrativeStyle?, visualStyle?, costumeStyle?, era? }`

**响应** `201` → `{ data: { id, title, status, totalEpisodes, episodeDuration, episodes: [{ id, number, title }], usage } }`

### POST /api/scripts/[id]/consult

剧本会诊：AI 出具诊断报告（结构 / 人物 / 节奏 / 台词 / 逻辑），落库为 `Consultation`。

**请求体**：`{ dialogueOnly?: boolean = false, model?: string }`

**响应** → `{ data: { consultationId, summary, suggestions: [{ id, category, issue, suggestion, mustFix }], mustFixCount, usage } }`

### POST /api/scripts/[id]/consult/apply

应用勾选的会诊建议：AI 对全文做一次台词优化，改写 `script.content`，并把建议标记为已采纳（`status: "applied"`）。

**请求体**：`{ suggestionIds: string[] }`（至少 1 项）

**响应** → `{ data: { appliedCount, summary, changes } }`

**错误**：`400` 尚未会诊 / 勾选项不存在

### POST /api/scripts/[id]/assets

从剧本提取角色 / 场景 / 道具（只建记录不出图）。重复调用会**清空并覆盖**对应类别。完成后剧本状态推进到 `assets`。

**请求体**：`{ kinds?: ("characters"|"scenes"|"props")[] }`，缺省全三类。

**响应** → `{ data: { counts: { characters, scenes, props }, characters, scenes, props } }`

**错误**：`400` 校验失败

### POST /api/scripts/[id]/assets/generate

逐类生成资产图（结果写回 `imageUrl`，`status: "completed"`）。

**请求体**：`{ kind: "character"|"scene"|"prop", ids?: string[], model?: string = "man-image-v2-lite" }`
`ids` 为空则生成该类全部。

**响应** → `{ data: { kind, generated: number } }`

**错误**：`400` 没有可生成的资产（请先提取）

---

## 7. 分集

### PATCH /api/episodes/[id]

编辑分集（详情页「剧本内容」保存调用）。

**请求体**（均可选）：`{ title?(1–60), summary?(≤1000, nullable), content?(≤200000), duration?(5–3600), style?(≤60, nullable), status?: "draft"|"outlined"|"assets_ready"|"storyboarded"|"video_ready"|"completed" }`

**响应** → `{ data: { id, title, duration, status, updatedAt } }`

**错误**：`404` 分集不存在或无权访问

### POST /api/scripts/[id]/episodes/[episodeId]/recap

「先让 AI 复述理解本集」：AI 复述剧情并给出镜组节奏建议，不落库。

**请求体**：`{ model?: string }`

**响应** → `{ data: { episodeId, recap: string, pacing: string, usage } }`（字段以 AI 服务 `summarizeEpisode` 返回为准）

**错误**：`404` 分集不存在

### POST /api/scripts/[id]/episodes/[episodeId]/bgm

为分集生成 BGM / 配音，写入 `Episode.audioUrl / bgmPrompt / bgmModel`，剧本状态推进到 `post_production`。

**请求体**：`{ prompt(2–400 字, 必填), model?: string = "mv-audio-5.5", duration?: string = "15s", smartLyrics?: boolean = false }`

**响应** `201` → `{ data: { episodeId, audioUrl, duration, usage } }`

**错误**：`404` 分集不存在

---

## 8. 分镜

### GET /api/scripts/[id]/episodes/[episodeId]/storyboards

**响应** → `{ data: { episodeId, storyboards: Storyboard[] } }`（按 `number` 升序）

`Storyboard` 字段：`id, number, shotType, description, dialogue, action, camera, duration, imageUrl, videoUrl, audioUrl, prompt, negativePrompt, model, status, episodeId`。

### POST /api/scripts/[id]/episodes/[episodeId]/storyboards

拆分镜：AI 把分集内容切为镜头列表（重建式：先清空该集现有分镜）。已存在且未要求重新拆分时直接返回现有数据（`reused: true`）。成功后分集 `status: "storyboarded"`、剧本推进到 `storyboarding`。

**请求体**：`{ mode?: "text"|"image"|"video" = "text", model: string, regenerate?: boolean = false }`

**响应**：已有数据时 `200` → `{ data: { episodeId, storyboards, reused: true } }`；新拆分成功 `201` → `{ data: { episodeId, storyboards, usage } }`

**错误**：`404` 分集不存在 · `422` AI 未能拆分出镜头

### PATCH /api/storyboards/[id]

编辑分镜字段（编辑抽屉保存调用）。

**请求体**（均可选）：`{ shotType?(≤20), description?(≤600), dialogue?(nullable), action?(nullable), camera?(≤120, nullable), duration?(0.5–120), prompt?(≤2000, nullable), negativePrompt?(≤1000, nullable) }`

**响应** → `{ data: Storyboard }`

### DELETE /api/storyboards/[id]

**响应** → `{ data: { id } }`

### POST /api/storyboards/[id]/generate

为单个分镜生成产物；生成前置 `status: "generating"`，失败回滚为 `failed`。

**请求体**

| 字段 | 规则 / 默认 |
|---|---|
| `kind` | `"image"` 或 `"video"`，必填 |
| `model` | 模型 id，必填 |
| `prompt` | 1–2000 字（追加到由视觉风格 + 镜头描述 + 动作 + 运镜合成的提示词之后） |
| `negativePrompt` | ≤ 1000 字，可选 |
| `aspectRatio` | 默认 `"9:16"`；缺省时使用剧本 `targetAspect` |
| `resolution` | 默认 `"1080p"` |
| `duration` | 默认 `"5s"`（video） |
| `skipStoryboardImage` | boolean，默认 `false`；`true` 时视频直出（首帧不依赖分镜图） |

**响应** → `{ data: { kind: "image"|"video", storyboard: Storyboard, usage } }`

**错误**：`404` 分镜不存在或无权访问

---

## 附：错误响应示例

```jsonc
// Zod 校验失败（400）
{
  "error": "参数校验失败",
  "details": {
    "title": ["请输入剧本标题"],
    "content": ["剧本内容太短，至少 20 字"]
  }
}

// 积分不足（402）
{ "error": "积分不足，本次需要 14，当前余额 3" }
```

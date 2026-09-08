# 万幕生 (Manvo TV) AI影视创作平台 — 设计规格

> **版本:** 1.0  
> **日期:** 2025-09-08  
> **状态:** 待复核

## 1. 项目概述

万幕生是一个AI驱动的影视创作全流程平台，提供从剧本创作、资产生成、分镜拆分到视频合成的完整工作流。平台采用深色模式设计，以橙色/金色为品牌强调色，面向专业影视创作者和AI内容生产者。

### 1.1 核心价值主张
- **一站式AI影视创作**：建档 → 大纲 → 资产 → 分镜 → 成片
- **智能剧本会诊**：AI剧本医生诊断 + 逐步确认修改
- **可视化画布编排**：React Flow节点编辑器实现创作流程可视化
- **多模态AI生成**：文本/图片/视频/音频全链路AI生成能力

### 1.2 技术栈
- **前端**: TypeScript + Next.js 14 (App Router) + React 18 + Tailwind CSS + shadcn/ui + React Flow
- **后端**: Next.js API Routes + PostgreSQL + Prisma ORM
- **认证**: NextAuth.js + Prisma Adapter
- **AI集成**: 抽象服务接口层 + Mock优先策略
- **状态管理**: Zustand (轻量级)
- **表单**: React Hook Form + Zod
- **图标**: Lucide React
- **动画**: Framer Motion

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App Router                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  首页    │ │  画布    │ │创作中心  │ │ 插件   │ │
│  │Workbench │ │ Canvas   │ │Creation  │ │Plugins │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────────────┤
│              Shared Components & Layout              │
│  NavBar / Sidebar / ThemeProvider / AuthGuard        │
├─────────────────────────────────────────────────────┤
│              API Routes (Next.js)                    │
│  /api/auth / /api/projects / /api/scripts            │
│  /api/canvas / /api/ai/*                             │
├─────────────────────────────────────────────────────┤
│              Service Layer                           │
│  AIService (abstract) / ScriptService / CanvasService│
├─────────────────────────────────────────────────────┤
│              Data Layer                              │
│  Prisma ORM → PostgreSQL                             │
└─────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 认证相关页面组
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # 主应用页面组（需登录）
│   │   ├── layout.tsx            # Dashboard布局（含NavBar）
│   │   ├── page.tsx              # 首页/工作台
│   │   ├── canvas/               # 画布模块
│   │   │   ├── page.tsx          # 画布项目列表
│   │   │   └── [projectId]/      # 画布编辑器
│   │   │       └── page.tsx
│   │   └── creation/             # 创作中心
│   │       ├── layout.tsx
│   │       ├── film-factory/     # 影视工厂
│   │       │   ├── page.tsx      # 影视工厂首页
│   │       │   ├── new/          # 新建剧本
│   │       │   │   └── page.tsx
│   │       │   └── [scriptId]/   # 剧本详情
│   │       │       └── page.tsx
│   │       └── script-factory/   # 剧本工厂（Phase 2）
│   └── api/                      # API Routes
│       ├── auth/[...nextauth]/route.ts
│       ├── projects/
│       ├── scripts/
│       ├── canvas/
│       └── ai/
├── components/                   # 共享组件
│   ├── ui/                       # shadcn/ui组件
│   ├── layout/                   # 布局组件
│   │   ├── NavBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── ThemeProvider.tsx
│   ├── workbench/                # 首页组件
│   ├── canvas/                   # 画布组件
│   │   ├── nodes/                # React Flow自定义节点
│   │   ├── edges/                # React Flow自定义边
│   │   └── panels/               # 侧边面板
│   ├── creation/                 # 创作中心组件
│   │   ├── film-factory/
│   │   └── script-factory/
│   └── shared/                   # 通用业务组件
├── lib/                          # 工具库
│   ├── prisma.ts                 # Prisma客户端单例
│   ├── auth.ts                   # NextAuth配置
│   ├── utils.ts                  # 通用工具函数
│   └── constants.ts              # 常量定义
├── services/                     # 服务层
│   ├── ai/                       # AI服务抽象
│   │   ├── types.ts              # AI服务接口定义
│   │   ├── mock-ai.service.ts    # Mock实现
│   │   └── ai.service.ts         # 真实实现（后续）
│   ├── script.service.ts         # 剧本服务
│   ├── project.service.ts        # 项目服务
│   └── canvas.service.ts         # 画布服务
├── stores/                       # Zustand状态管理
│   ├── useAuthStore.ts
│   ├── useCanvasStore.ts
│   └── useFilmFactoryStore.ts
├── types/                        # TypeScript类型定义
│   ├── database.ts               # Prisma生成的类型re-export
│   ├── api.ts                    # API请求/响应类型
│   └── domain.ts                 # 领域模型类型
└── styles/
    └── globals.css               # Tailwind全局样式
```

## 3. 数据模型 (Prisma Schema)

### 3.1 核心实体

```prisma
// 用户与认证
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  tapies        Int       @default(1000)  // 积分
  membership    String    @default("free") // free/pro/enterprise
  accounts      Account[]
  sessions      Session[]
  workspaces    WorkspaceMember[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// 工作区/团队
model Workspace {
  id          String            @id @default(cuid())
  name        String
  description String?
  ownerId     String
  members     WorkspaceMember[]
  projects    Project[]
  scripts     Script[]
  canvases    Canvas[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  role        String    @default("member") // owner/admin/member
  user        User      @relation(fields: [userId], references: [id])
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  joinedAt    DateTime  @default(now())
  @@unique([userId, workspaceId])
}

// 项目（画布项目）
model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  canvas      Canvas?
  coverImage  String?
  status      String    @default("active") // active/archived/deleted
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// 画布（React Flow数据）
model Canvas {
  id        String   @id @default(cuid())
  projectId String   @unique
  project   Project  @relation(fields: [projectId], references: [id])
  nodes     Json     @default("[]")  // React Flow nodes JSON
  edges     Json     @default("[]")  // React Flow edges JSON
  viewport  Json     @default("{\"x\":0,\"y\":0,\"zoom\":1}")
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 剧本（影视工厂核心）
model Script {
  id              String        @id @default(cuid())
  title           String
  content         String        // 原始剧本文本
  workspaceId     String
  workspace       Workspace     @relation(fields: [workspaceId], references: [id])
  
  // AI推理元信息
  genre           String?       // 题材：都市言情/古风仙侠/悬疑推理等
  narrativeStyle  String?       // 叙事风格
  visualStyle     String?       // 视觉风格
  costumeStyle    String?       // 服化道风格
  era             String?       // 时代背景
  
  // 作品配置
  workType        String        @default("vertical_short") // vertical_short/horizontal_short/micro_film/anime
  seriesType      String        @default("limited")        // limited/serial
  targetAspect    String        @default("9:16")           // 目标画幅
  totalEpisodes   Int           @default(1)
  episodeDuration Int           @default(90)               // 秒
  
  // 状态流转
  status          String        @default("intake")         // intake/outlining/assets/storyboarding/video/post_production/completed
  processingStatus String       @default("idle")           // idle/processing/completed/error
  
  // 关联
  episodes        Episode[]
  characters      Character[]
  scenes          Scene[]
  props           Prop[]
  consultations   Consultation[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// 分集
model Episode {
  id          String   @id @default(cuid())
  scriptId    String
  script      Script   @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  number      Int      // 集号
  title       String   // 集标题
  content     String   // 分集剧本内容
  summary     String?  // 大纲摘要
  duration    Int      @default(90) // 秒
  style       String?  // 单集风格（可覆盖全剧设置）
  
  // 分镜
  storyboards Storyboard[]
  
  status      String   @default("draft") // draft/outlined/assets_ready/storyboarded/video_ready/completed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([scriptId, number])
}

// 角色
model Character {
  id          String   @id @default(cuid())
  scriptId    String
  script      Script   @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  name        String
  description String   // 角色描述/背景
  appearance  String?  // 外貌特征
  personality String?  // 性格特征
  imageUrl    String?  // AI生成的角色图
  costumes    Costume[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 妆造
model Costume {
  id          String    @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  name        String
  description String
  imageUrl    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// 场景
model Scene {
  id          String   @id @default(cuid())
  scriptId    String
  script      Script   @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  name        String
  description String
  environment String?  // 环境描述
  lighting    String?  // 光照条件
  imageUrl    String?  // AI生成的场景图
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 道具
model Prop {
  id          String   @id @default(cuid())
  scriptId    String
  script      Script   @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  name        String
  description String
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 分镜
model Storyboard {
  id          String   @id @default(cuid())
  episodeId   String
  episode     Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  number      Int      // 镜号
  shotType    String   // 镜头类型：近景/中景/远景/特写等
  description String   // 镜头描述
  dialogue    String?  // 台词
  action      String?  // 动作描述
  camera      String?  // 运镜描述
  duration    Float?   // 预估时长(秒)
  
  // 生成产物
  imageUrl    String?  // 分镜图
  videoUrl    String?  // 生成的视频片段
  audioUrl    String?  // 配音/BGM
  
  // AI生成参数
  prompt      String?  // 生成用的prompt
  negativePrompt String? // 反向提示词
  model       String?  // 使用的模型
  generationParams Json? // 其他生成参数
  
  status      String   @default("pending") // pending/generating/completed/failed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([episodeId, number])
}

// 会诊记录
model Consultation {
  id          String   @id @default(cuid())
  scriptId    String
  script      Script   @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  type        String   // diagnosis/dialogue_optimization/review
  input       String   // 输入内容
  output      String   // AI输出结果
  suggestions Json     // 建议列表 [{id, text, accepted: boolean}]
  model       String   // 使用的AI模型
  status      String   @default("pending") // pending/completed/applied
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 4. 模块详细设计

### 4.1 全局布局与导航

**NavBar组件规格：**
- 高度: 64px, 背景: `bg-zinc-950`, 边框底: `border-b border-zinc-800`
- 左侧: Logo (橙色渐变图标 + "Manvo TV" 白色文字)
- 导航菜单: 工作台/画布/创作中心(下拉)/插件/联系我们
  - 当前激活项: `bg-zinc-800 text-white rounded-md`
  - 非激活项: `text-zinc-400 hover:text-white hover:bg-zinc-800/50`
- 创作中心下拉菜单:
  - 剧本工厂 (文件夹图标, 红色新标记)
  - 影视工厂 (胶卷图标)
  - 剧本创作 (铅笔图标)
  - 电商设计室 (购物袋图标)
- 右侧用户区:
  - 工作区选择器 (下拉)
  - 积分显示 (金币图标 + 数字)
  - 会员升级按钮 (金色皇冠图标)
  - 帮助/通知/头像

**主题系统：**
- 仅深色模式，基于zinc色阶
- 品牌色: `orange-500` (#f97316)
- 成功: `emerald-500`, 警告: `amber-500`, 错误: `rose-500`
- 卡片背景: `bg-zinc-900`, 边框: `border-zinc-800`

### 4.2 首页/工作台 (Workbench)

**布局结构：**
```
┌─────────────────────────────────────────────┐
│              NavBar                          │
├─────────────────────────────────────────────┤
│                                             │
│   欢迎语: "你好，今天想生成点什么？"          │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  AI生成输入区                        │   │
│   │  [+参考素材] [@引用提示]             │   │
│   │  [媒体类型▼] [模型▼] [比例] [分辨率] │   │
│   │  [时长] [数量] [风格] [积分] [生成]  │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   精选作品画廊                               │
│   "让作品，成为最有力的表达"                  │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│   │Card│ │Card│ │Card│ │Card│  ← 横向滚动   │
│   └────┘ └────┘ └────┘ └────┘              │
│                                             │
└─────────────────────────────────────────────┘
```

**AI生成输入区组件 (`GenerationInput`)：**
- 参考素材上传区: 虚线边框圆角矩形, 点击触发文件选择
- @引用功能: 输入@弹出已上传素材列表
- 媒体类型切换: 视频(红)/图片/音频, 带图标
- 模型选择下拉: 显示模型名+积分消耗+内置标签
- 参数控件: 比例(16:9/9:16/1:1)、分辨率(480p/720p/1080p/1K)、时长(5s/10s)、数量(1-4)
- 风格选择: 魔法棒图标按钮
- 积分显示: 金色图标+剩余次数
- 生成按钮: `bg-orange-500 hover:bg-orange-600 text-white` 带闪电图标

**精选作品画廊 (`FeaturedGallery`)：**
- 标题区: 大标题 + 副标题 + 作品计数
- 卡片网格: 横向滚动, 每卡含缩略图+类型标签+标题+描述+播放按钮
- 卡片尺寸: 约320x480px, 圆角12px
- Hover效果: 缩放+阴影增强

### 4.3 画布模块 (Canvas)

**项目列表页：**
- Tab切换: 个人/团队项目
- 搜索框 + 筛选器(显示全部/仅文件夹/仅项目) + 排序(最近修改/创建日期)
- 视图切换: 网格/列表
- 新建项目按钮: 白色背景CTA
- 项目卡片: 缩略图+标题+编辑时间+项目数
- 右键菜单: 打开/重命名/选择/移动至/分享链接/转移工作区/删除(红色)

**团队管理弹窗：**
- 创建团队: 团队名称输入 + 说明文字(共享画布/资产/Tapies额度, 最多5个)
- 加入团队: 32位Team ID输入 + 申请留言(可选)

**React Flow编辑器：**
- 节点类型:
  - `TextNode`: 文本输入/展示节点
  - `ImageNode`: 图片预览节点
  - `VideoNode`: 视频预览节点
  - `AudioNode`: 音频播放节点
  - `AINode`: AI生成节点（带模型选择和参数配置）
  - `ScriptNode`: 剧本内容节点
  - `StoryboardNode`: 分镜预览节点
- 边类型:
  - `DefaultEdge`: 默认贝塞尔曲线
  - `AnimatedEdge`: 数据流动画边
- 工具栏: 缩放/适应/撤销/重做/节点添加面板
- 侧边面板: 属性编辑/节点库/历史记录

### 4.4 创作中心 — 影视工厂 (Film Factory)

**影视工厂首页：**
- 标题: "CINEMA FLOOR · 影视制片" + 流程说明
- 状态统计: 在产(黄)/就绪(蓝)/已完成(绿)/总计(白)
- 搜索框 + 排序 + 任务队列 + 停止全部 + 新建剧本
- 项目卡片列表:
  - 黄色虚线边框 = 制作中
  - 蓝色虚线边框 = 待推进
  - 显示: 标题/状态/类型/简介/进度条/集数/时长
- 分组标签: "制作中 IN PRODUCTION" / "待推进 READY"

**新建剧本 (INTAKE) 页面：**
- 左侧: 剧本原料
  - 剧本标题输入
  - 剧本内容大文本框 (支持分集标记: "第N集"或"---")
  - 蓝色提示框说明分集格式
- 右侧: 参数配置
  - 作品类型: 竖屏短剧/横屏短剧/微电影/动漫
  - 剧集类型: 限定剧/连载剧
  - 目标画幅: 9:16/16:9/1:1/4:3/3:4
  - AI模型选择: OVLM 6/OVLM 5.6/GVLM 3.1 Pro (带积分消耗)
  - 剧本加工方式: 会诊+台词优化(推荐)/原样保留
  - 模型细分: 会诊模型/台词模型
  - 执行方式: 逐步确认(推荐)/全自动一步到位
- 底部: 关闭/AI智能立项按钮

**审阅并创建剧本弹窗：**
- AI推理结果展示 (允许/禁止内容标记)
- 剧本标题编辑
- 题材选择 (都市言情/古风仙侠/悬疑推理等)
- AI立项方案展示
- 集数/单集时长设置
- 叙事风格/视觉风格/服化道风格选择
- 目标画幅确认
- 底部: 修改剧本/取消/创建剧本

**剧本详情页：**
- 顶部: 返回按钮 + 项目标题 + 状态标签 + 操作按钮
- 工作流程标签栏: 限定剧→建档→剧本大纲→人物/场景→拆分镜→视频→后期
- 左侧: 分集列表 (EP01/EP02... + 标题 + 简述)
- 中间: 剧本内容区 (大纲摘要/闪回/现实分段)
- 右侧: 全局角色/妆造库/道具库
- 分镜编辑区: 镜组列表 + 批量生成按钮
- AI复述理解按钮

**拆分镜弹窗 (4个Tab)：**
- 出图Tab: 分镜图生成配置
- 仅拆分镜Tab: 纯文本分镜拆分
- 出视频Tab: 视频生成配置
- 后期BGM Tab: 背景音乐配置

**资产生成Loading状态：**
- 角色/场景/道具各自独立的loading动画
- 进度百分比 + 当前步骤描述
- 完成后自动刷新对应库

## 5. AI服务抽象层

### 5.1 接口定义

```typescript
// src/services/ai/types.ts

export interface AIService {
  // 剧本分析
  analyzeScript(input: AnalyzeScriptInput): Promise<AnalyzeScriptResult>;
  
  // 剧本会诊
  consultScript(input: ConsultScriptInput): Promise<ConsultScriptResult>;
  
  // 台词优化
  optimizeDialogue(input: OptimizeDialogueInput): Promise<OptimizeDialogueResult>;
  
  // 大纲生成
  generateOutline(input: GenerateOutlineInput): Promise<GenerateOutlineResult>;
  
  // 角色提取与生成
  extractCharacters(input: ExtractCharactersInput): Promise<ExtractCharactersResult>;
  generateCharacterImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  
  // 场景提取与生成
  extractScenes(input: ExtractScenesInput): Promise<ExtractScenesResult>;
  generateSceneImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  
  // 道具提取与生成
  extractProps(input: ExtractPropsInput): Promise<ExtractPropsResult>;
  generatePropImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  
  // 分镜拆分
  splitStoryboards(input: SplitStoryboardsInput): Promise<SplitStoryboardsResult>;
  
  // 图片生成
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  
  // 视频生成
  generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult>;
  
  // 音频生成
  generateAudio(input: GenerateAudioInput): Promise<GenerateAudioResult>;
  
  // AI复述理解
  summarizeEpisode(input: SummarizeEpisodeInput): Promise<SummarizeEpisodeResult>;
}
```

### 5.2 Mock实现策略
- 所有AI方法返回预设的合理数据
- 模拟延迟 (500ms-3000ms) 以还原真实体验
- 支持通过环境变量切换Mock/真实实现
- Mock数据存储在 `src/services/ai/mock-data/` 目录

## 6. API路由设计

### 6.1 认证
- `POST /api/auth/[...nextauth]` — NextAuth处理

### 6.2 项目管理
- `GET /api/projects` — 获取项目列表
- `POST /api/projects` — 创建项目
- `GET /api/projects/[id]` — 获取项目详情
- `PATCH /api/projects/[id]` — 更新项目
- `DELETE /api/projects/[id]` — 删除项目

### 6.3 剧本管理
- `GET /api/scripts` — 获取剧本列表
- `POST /api/scripts` — 创建剧本(INTAKE)
- `GET /api/scripts/[id]` — 获取剧本详情
- `PATCH /api/scripts/[id]` — 更新剧本
- `POST /api/scripts/[id]/analyze` — AI分析剧本
- `POST /api/scripts/[id]/consult` — 剧本会诊
- `POST /api/scripts/[id]/episodes` — 生成分集
- `GET /api/scripts/[id]/episodes` — 获取分集列表
- `GET /api/scripts/[id]/episodes/[episodeId]` — 获取分集详情
- `POST /api/scripts/[id]/characters` — 提取/生成角色
- `POST /api/scripts/[id]/scenes` — 提取/生成场景
- `POST /api/scripts/[id]/props` — 提取/生成道具
- `POST /api/scripts/[id]/episodes/[episodeId]/storyboards` — 拆分镜
- `POST /api/scripts/[id]/episodes/[episodeId]/storyboards/[sbId]/generate` — 生成分镜产物

### 6.4 画布
- `GET /api/canvas/[projectId]` — 获取画布数据
- `PUT /api/canvas/[projectId]` — 保存画布数据

### 6.5 AI代理
- `POST /api/ai/generate-image` — 图片生成代理
- `POST /api/ai/generate-video` — 视频生成代理
- `POST /api/ai/generate-audio` — 音频生成代理

## 7. 全局约束

- Node.js >= 20, TypeScript strict mode
- Next.js 14 App Router, 不使用Pages Router
- Tailwind CSS v3, 不使用CSS Modules
- shadcn/ui组件按需安装, 不fork源码
- React Flow v11, 使用@xyflow/react包
- Prisma schema同步迁移, 不使用db push生产
- 所有API返回统一格式 `{ data?, error?, message? }`
- 错误处理使用自定义AppError类
- 组件文件PascalCase, 工具文件camelCase
- 测试文件 `*.test.ts` / `*.test.tsx` 与源文件同目录
- Git提交遵循Conventional Commits规范
- 深色模式only, 不支持亮色切换

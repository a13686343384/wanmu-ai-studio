# 环境搭建指南（Setup Guide）

> 目标：新机器上 10 分钟内把万幕生跑起来。有任何问题先看本文末尾「常见问题」。

## 1. 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 20 LTS | 建议 20.x；`node -v` 验证 |
| npm | ≥ 10 | 随 Node 安装 |
| PostgreSQL | 16 | **可零安装**：用内嵌实例（方式 A）或 Docker（方式 B） |
| Git | 任意近期版本 | |

> 内嵌 PostgreSQL 通过 `embedded-postgres` npm 包提供，首次 `npm install` 会按平台自动下载二进制（macOS arm64 / linux x64 均支持）；无网络代理环境如下载失败，先 `export https_proxy=http://127.0.0.1:7892`。

## 2. 标准流程（内嵌数据库，推荐）

```bash
# 1) 克隆 + 安装
git clone <repo-url> && cd wanmusheng
npm install

# 2) 环境变量
cp .env.example .env
# 演示可直接用默认值；正式使用请更换 NEXTAUTH_SECRET（见下文）

# 3) 启动数据库（前台常驻进程，Ctrl+C 停止）
npm run db:dev

# 4) 另开一个终端：建表 + 生成 Prisma Client + 种子数据
npm run db:setup

# 5) 启动应用
npm run dev
```

打开 http://localhost:3000，使用演示账号登录：

- 邮箱 `demo@wanmusheng.com`
- 密码 `demo1234`
- 初始积分 230；生成类操作会扣积分，积分不足时执行 `npm run reset:demo`

## 3. 环境变量说明（.env）

| 变量 | 必填 | 默认 / 示例 | 说明 |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres:postgres@localhost:5432/wanmusheng?schema=public` | Prisma 连接串；端口需与数据库实际端口一致 |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | 必须与访问地址一致（middleware 与 NextAuth 回调依赖它） |
| `NEXTAUTH_SECRET` | ✅ | - | 会话签名密钥：`openssl rand -base64 32` 生成 |
| `AI_MODE` | - | `mock` | `mock`＝内置假数据，无需任何 Key；`live`＝真实供应商（需实现 live-ai.service） |
| `AI_*_BASE_URL` / `AI_*_API_KEY` | - | 空 | 仅 `AI_MODE=live` 时使用（text/image/video/audio 四组） |

内嵌数据库脚本额外识别：`DEV_DB_PORT`（默认 5432）、`DEV_DB_NAME`（默认 wanmusheng）。

## 4. 使用系统级 / Docker PostgreSQL

如果本机已有 PostgreSQL（或想用容器跑数据库），只需让 `DATABASE_URL` 指向它，再跳过 `npm run db:dev`：

```bash
# 方式 B1：本机已有 PG
createdb wanmusheng
# 编辑 .env 的 DATABASE_URL 指向该实例
npm run db:setup && npm run dev

# 方式 B2：只起数据库容器
docker run -d --name wanmusheng-db -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wanmusheng \
  postgres:16
npm run db:setup && npm run dev

# 方式 C：数据库 + 应用全部容器化
docker compose up --build -d
```

## 5. 生产构建与启动

```bash
npm run build      # 先停掉 dev server（两者共用 .next 目录，并行会互相覆盖）
npm start          # 默认 3000 端口
```

容器化部署见 `Dockerfile` / `docker-compose.yml`（多阶段构建，运行镜像基于 standalone 输出；启动前由一次性 `migrate` 服务执行 `prisma migrate deploy` + 种子）。

## 6. 数据库管理

| 命令 | 说明 |
|---|---|
| `npm run db:dev` | 启动内嵌 PG；`--reset` 删除 `.pgdata/` 后重建（清空数据） |
| `npm run db:migrate` | 开发期迁移（`prisma migrate dev`） |
| `npm run db:setup` | `migrate deploy` + `prisma generate` + 种子（幂等，可重复执行） |
| `npm run db:seed` | 仅写种子数据（全 upsert，幂等） |
| `npm run db:studio` | Prisma Studio 可视化管理 |

内嵌实例的数据全部落在项目根目录 `.pgdata/`（已在 `.gitignore` 中，勿提交）。该目录缺失时 `db:dev` 会自动 `initdb`，因此克隆仓库后无需任何手工初始化。

## 7. 全新机器演练清单（10 分钟验收）

```bash
git clone <repo-url> && cd wanmusheng
npm install                 # ~2-4 min
cp .env.example .env
npm run db:dev              # 终端 A，等待「就绪」
npm run db:setup            # 终端 B
npm run dev                 # 终端 B，等待 Ready
curl -I http://localhost:3000/login   # 期望 200
```

用演示账号登录后按顺序验证：工作台生成一次图片 → 画布新建项目并添加节点 ⌘S → 影视工厂新建剧本走通「AI 立项 → 审阅创建 → 资产提取 → 拆分镜」。回归测试可运行 `npm run test:smoke`（需先 `npm run reset:demo`）与 `npm run test:e2e`。

## 8. 常见问题

**Q：`npm run db:dev` 报端口占用（5432）**
本机已有 PostgreSQL 占用端口。要么停掉系统 PG，要么换端口：`DEV_DB_PORT=5433 npm run db:dev`，并把 `.env` 中 `DATABASE_URL` 的端口同步改为 5433。

**Q：`npm run build` 之后 dev server 报模块缺失 / 页面 500**
`build` 与运行中的 `dev` 共用 `.next`，会互相覆盖。执行 `rm -rf .next` 后重启 dev server。

**Q：NextAuth 登录报「UntrustedHost」或回调地址错误**
检查 `NEXTAUTH_URL` 是否与实际访问地址（协议 + 域名 + 端口）完全一致。

**Q：登录 401 / 演示账号不存在**
种子未写入：执行 `npm run db:seed`（幂等）。密码至少 8 位且包含字母与数字（注册校验同规则）。

**Q：`embedded-postgres` 安装失败**
平台二进制下载失败，配置代理后重试：`export https_proxy=http://127.0.0.1:7892 && npm install`。

**Q：新增 API 路由后请求 404**
Next dev 偶发路由清单缓存，重启 dev server 即可。

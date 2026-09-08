/**
 * 数据库种子数据。
 * 运行：npm run db:seed
 *
 * 提供一个可直接登录的演示账号与最小可用数据，便于前端联调：
 *   邮箱：demo@wanmusheng.com
 *   密码：demo1234
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const DEMO_EMAIL = "demo@wanmusheng.com"
const DEMO_PASSWORD = "demo1234"

async function main() {
  console.log("→ 开始写入种子数据…")

  const password = await bcrypt.hash(DEMO_PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "用户0272",
      password,
      tapies: 230,
      membership: "free",
    },
  })
  console.log(`  ✓ 用户 ${user.email}`)

  // 个人工作区
  const personal = await prisma.workspace.upsert({
    where: { id: "ws-personal-demo" },
    update: {},
    create: {
      id: "ws-personal-demo",
      name: "用户0272 的工作区",
      ownerId: user.id,
      isPersonal: true,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
  })
  console.log(`  ✓ 个人工作区 ${personal.name}`)

  // 团队工作区
  const team = await prisma.workspace.upsert({
    where: { id: "ws-team-demo" },
    update: {},
    create: {
      id: "ws-team-demo",
      name: "雪崩制作组",
      description: "科幻短剧《雪崩》的主创团队",
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
  })
  console.log(`  ✓ 团队工作区 ${team.name}`)

  // 演示画布项目
  const project = await prisma.project.upsert({
    where: { id: "proj-demo-xiaoheshang" },
    update: {},
    create: {
      id: "proj-demo-xiaoheshang",
      name: "小和尚",
      description: "演示用画布项目",
      workspaceId: personal.id,
      creatorId: user.id,
      canvas: {
        create: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          metadata: {},
          workspaceId: personal.id,
        },
      },
    },
  })
  console.log(`  ✓ 项目 ${project.name}`)

  await prisma.project.upsert({
    where: { id: "proj-demo-untitled" },
    update: {},
    create: {
      id: "proj-demo-untitled",
      name: "Untitled",
      workspaceId: personal.id,
      creatorId: user.id,
      canvas: {
        create: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          metadata: {},
          workspaceId: personal.id,
        },
      },
    },
  })
  console.log("  ✓ 项目 Untitled")

  // 演示剧本（影视工厂）
  const script = await prisma.script.upsert({
    where: { id: "script-demo-xuebeng" },
    update: {},
    create: {
      id: "script-demo-xuebeng",
      title: "雪崩（影视）",
      content: [
        "第1集 芯片",
        "江婉为伊甸园VIP资格出卖林夜，赵天昊步步紧逼。",
        "第九层拾荒者林夜即将面临集团的致命围剿，生死一线。",
        "江婉看着旁边林夜空着的睡铺，小声说：“对个起，怀林夜。我得活。”",
        "",
        "---",
        "",
        "第2集 反杀",
        "林夜意外融合远古防御系统“雪崩”芯片，凭借吞噬数据与具现化能力反杀追兵。",
      ].join("\n"),
      synopsis:
        "底层拾荒者林夜遭女友背叛，险遭灭口时意外融合远古防御系统“雪崩”芯片。他凭借吞噬数据与具现化的能力，一步步向上层复仇。",
      workspaceId: personal.id,
      creatorId: user.id,
      genre: "科幻/废土/复仇爽剧",
      narrativeStyle: "主角单线快节奏升级",
      visualStyle: "真人写实电影感",
      costumeStyle: "废土机能风",
      era: "近未来废土",
      tone: "冷峻、压迫、爽感",
      workType: "vertical_short",
      seriesType: "limited",
      targetAspect: "9:16",
      totalEpisodes: 45,
      episodeDuration: 90,
      status: "outlining",
      processingStatus: "completed",
      progress: 100,
      progressLabel: "大纲就绪",
      episodes: {
        create: [
          {
            number: 1,
            title: "芯片",
            summary: "江婉为伊甸园VIP资格出卖林夜，赵天昊步步紧逼，林夜生死一线。",
            content:
              "【闪回】江婉看着旁边林夜空着的睡铺，小声说：“对个起，怀林夜。我得活。”\n【现实】第九层拾荒区，警报骤响，探照灯扫过锈蚀的走廊。林夜被逼到管道尽头。",
            duration: 90,
            status: "outlined",
          },
          {
            number: 2,
            title: "反杀",
            summary: "林夜融合“雪崩”芯片，反杀追兵，第一次尝到力量的滋味。",
            content:
              "【现实】芯片在林夜体内启动，蓝色数据流自他瞳孔涌出。他抬手，废铁重构为盾。",
            duration: 90,
            status: "outlined",
          },
        ],
      },
    },
  })
  console.log(`  ✓ 剧本 ${script.title}`)

  console.log("→ 种子数据写入完成")
}

main()
  .catch((error) => {
    console.error("种子数据写入失败:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

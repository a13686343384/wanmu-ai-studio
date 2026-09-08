/**
 * 端到端冒烟测试：用真实 HTTP 请求走通核心业务链路。
 *
 * 用法：node scripts/smoke-test.mjs
 * 前置：开发服务器已在 BASE_URL（默认 http://localhost:3000）运行，且已执行 npm run db:seed
 *
 * 覆盖：登录 → 工作台生成 → 画布 CRUD → 影视工厂 INTAKE → 分析 → 创建 → 资产 → 拆分镜
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const DEMO = { email: "demo@wanmusheng.com", password: "demo1234" }

let cookie = ""
let passed = 0
let failed = 0

function log(ok, name, extra = "") {
  if (ok) {
    passed++
    console.log(`  ✓ ${name}${extra ? ` — ${extra}` : ""}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`)
  }
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  })

  const setCookie = res.headers.getSetCookie?.() ?? []
  if (setCookie.length) {
    const jar = new Map(
      cookie
        .split("; ")
        .filter(Boolean)
        .map((pair) => pair.split("=").map((part, index) => (index === 0 ? part : pair.slice(part.length + 1)))),
    )
    for (const raw of setCookie) {
      const [pair] = raw.split(";")
      const eq = pair.indexOf("=")
      jar.set(pair.slice(0, eq), pair.slice(eq + 1))
    }
    cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
  }

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }

  return { status: res.status, json, text }
}

async function login() {
  const csrf = await request("/api/auth/csrf")
  const token = csrf.json?.csrfToken
  if (!token) throw new Error("无法获取 csrfToken")

  const params = new URLSearchParams({
    csrfToken: token,
    email: DEMO.email,
    password: DEMO.password,
    callbackUrl: `${BASE}/`,
    json: "true",
  })

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: params.toString(),
    redirect: "manual",
  })

  const setCookie = res.headers.getSetCookie?.() ?? []
  const jar = new Map(
    cookie
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=")
        return [pair.slice(0, eq), pair.slice(eq + 1)]
      }),
  )
  for (const raw of setCookie) {
    const [pair] = raw.split(";")
    const eq = pair.indexOf("=")
    jar.set(pair.slice(0, eq), pair.slice(eq + 1))
  }
  cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")

  const session = await request("/api/auth/session")
  return Boolean(session.json?.user?.id)
}

const SCRIPT_TEXT = `第1集 芯片
江婉为伊甸园VIP资格出卖林夜，赵天昊步步紧逼。第九层拾荒者林夜即将面临集团的致命围剿，生死一线。
江婉看着旁边林夜空着的睡铺，小声说：“对个起，怀林夜。我得活。”
---
第2集 反杀
林夜意外融合远古防御系统“雪崩”芯片，凭借吞噬数据与具现化能力反杀追兵。`

async function main() {
  console.log(`\n万幕生冒烟测试 → ${BASE}\n`)

  // ---------- 1. 认证 ----------
  console.log("[1] 认证")
  const authed = await login()
  log(authed, "登录 demo 账号")
  if (!authed) throw new Error("登录失败，后续测试终止")

  const session = await request("/api/auth/session")
  log(typeof session.json?.user?.tapies === "number", "会话包含 tapies", String(session.json?.user?.tapies))

  // ---------- 2. 工作台生成 ----------
  console.log("\n[2] 工作台生成")
  const gen = await request("/api/ai/generate", {
    method: "POST",
    body: {
      mediaType: "image",
      prompt: "赛博朋克雨夜街头，霓虹倒影",
      modelId: "man-image-v2-lite",
      aspectRatio: "16:9",
      resolution: "1K",
      duration: "5s",
      count: 1,
      references: [],
    },
  })
  log(gen.status === 200 && Boolean(gen.json?.data?.url), "图片生成返回资源", `cost=${gen.json?.data?.cost}`)

  // ---------- 3. 画布 CRUD ----------
  console.log("\n[3] 画布")
  const created = await request("/api/projects", {
    method: "POST",
    body: { name: `冒烟测试画布-${Date.now().toString(36)}` },
  })
  const projectId = created.json?.data?.id
  log(created.status === 201 && Boolean(projectId), "创建项目")

  const save = await request(`/api/canvas/${projectId}`, {
    method: "PUT",
    body: {
      nodes: [
        {
          id: "text-smoke",
          type: "text",
          position: { x: 100, y: 100 },
          data: { kind: "text", label: "冒烟节点", text: "hello" },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  })
  log(save.status === 200 && save.json?.data?.nodeCount === 1, "保存画布节点")

  const reload = await request(`/api/canvas/${projectId}`)
  log(reload.json?.data?.nodes?.length === 1, "重新加载画布节点")

  const renamed = await request(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: { name: "冒烟测试画布-已重命名" },
  })
  log(renamed.status === 200, "重命名项目")

  const listed = await request("/api/projects?scope=personal")
  log(
    (listed.json?.data ?? []).some((p) => p.id === projectId),
    "项目出现在个人列表",
  )

  // ---------- 4. 影视工厂 ----------
  console.log("\n[4] 影视工厂")
  const script = await request("/api/scripts", {
    method: "POST",
    body: {
      title: `冒烟测试剧本-${Date.now().toString(36)}`,
      content: SCRIPT_TEXT,
      workType: "vertical_short",
      seriesType: "limited",
      targetAspect: "9:16",
      textModel: "ovlm-6",
      processingMode: "consult_optimize",
      executionMode: "step_by_step",
    },
  })
  const scriptId = script.json?.data?.id
  log(script.status === 201 && Boolean(scriptId), "INTAKE 建档")

  const analyze = await request(`/api/scripts/${scriptId}/analyze`, { method: "POST" })
  log(
    analyze.status === 200 && Boolean(analyze.json?.data?.analysis?.genre),
    "AI 分析剧本",
    analyze.json?.data?.analysis?.genre,
  )

  const finalize = await request(`/api/scripts/${scriptId}/finalize`, {
    method: "POST",
    body: {
      title: `冒烟测试剧本-${Date.now().toString(36)}`,
      genre: "科幻/废土",
      narrativeStyle: "单线升级",
      visualStyle: "写实电影感",
      costumeStyle: "废土机能",
      era: "近未来",
      totalEpisodes: 2,
      episodeDuration: 90,
      targetAspect: "9:16",
    },
  })
  log(
    finalize.status === 201 && finalize.json?.data?.episodes?.length === 2,
    "审阅并创建剧本（生成分集）",
  )

  const consult = await request(`/api/scripts/${scriptId}/consult`, { method: "POST" })
  log(
    consult.status === 200 && (consult.json?.data?.suggestions ?? []).length > 0,
    "剧本会诊",
    `${consult.json?.data?.suggestions?.length} 条建议`,
  )

  const assets = await request(`/api/scripts/${scriptId}/assets`, { method: "POST" })
  log(
    assets.status === 200 && (assets.json?.data?.characters ?? []).length > 0,
    "提取角色 / 场景 / 道具",
    `角色 ${assets.json?.data?.characters?.length} · 场景 ${assets.json?.data?.scenes?.length} · 道具 ${assets.json?.data?.props?.length}`,
  )

  const detail = await request(`/api/scripts/${scriptId}`)
  const firstEpisode = detail.json?.data?.episodes?.[0]
  log(Boolean(firstEpisode), "读取分集列表")

  if (firstEpisode) {
    const storyboards = await request(
      `/api/scripts/${scriptId}/episodes/${firstEpisode.id}/storyboards`,
      { method: "POST", body: { mode: "text", model: "ovlm-6", regenerate: true } },
    )
    log(
      storyboards.status === 200 && (storyboards.json?.data?.storyboards ?? []).length > 0,
      "拆分镜",
      `${storyboards.json?.data?.storyboards?.length} 个镜头`,
    )
  }

  // ---------- 5. 清理 ----------
  console.log("\n[5] 清理")
  const delProject = await request(`/api/projects/${projectId}`, { method: "DELETE" })
  log(delProject.status === 200, "删除测试项目")
  const delScript = await request(`/api/scripts/${scriptId}`, { method: "DELETE" })
  log(delScript.status === 200, "删除测试剧本")

  console.log(`\n结果：${passed} 通过 / ${failed} 失败\n`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error("\n冒烟测试异常:", error)
  process.exitCode = 1
})

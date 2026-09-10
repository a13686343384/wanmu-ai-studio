const base = "http://localhost:3000";
async function login() {
  const res = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await res.json();
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const r2 = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
    body: new URLSearchParams({ csrfToken, email: "demo@wanmusheng.com", password: "demo1234", json: "true" }),
  });
  return r2.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}
async function main() {
  const C = await login();
  const H = { "Content-Type": "application/json", Cookie: C };

  // 1. settings status
  const st = await (await fetch(`${base}/api/settings/ai`, { headers: { Cookie: C } })).json();
  console.log("mode:", st.data.mode, "| credentials:", st.data.credentials.map((c) => `${c.key}:${c.ready ? "ready" : "missing"}`).join(" "));

  // 2. switch to live
  const patch = await fetch(`${base}/api/settings/ai`, {
    method: "PATCH", headers: H, body: JSON.stringify({ mode: "live" }),
  });
  console.log("switch live:", patch.status, (await patch.json()).message);

  // 3. real text call: analyzeScript via scripts API
  const cr = await fetch(`${base}/api/scripts`, {
    method: "POST", headers: H,
    body: JSON.stringify({
      title: "真实AI链路测试", workType: "vertical_short", seriesType: "limited", targetAspect: "9:16",
      textModel: "ovlm-5.6", processingMode: "keep_original", executionMode: "step_by_step",
      content: "第一集：末班车上，司机老陈发现车厢里多出一位没有影子的乘客。第二集：老陈追查乘客身份，发现是十年前自己见死不救的少女。第三集：少女索命，老陈在 confession 中崩溃。",
    }),
  });
  const script = (await cr.json()).data;
  console.log("script created:", cr.status, script.id);
  const ar = await fetch(`${base}/api/scripts/${script.id}/analyze`, {
    method: "POST", headers: H, body: JSON.stringify({}),
  });
  const analysis = await ar.json();
  console.log("analyze:", ar.status, "| genre:", analysis.data?.genre, "| episodes:", analysis.data?.analysis?.episodeIdeas?.length ?? analysis.data?.episodeIdeas?.length, "| recommended:", analysis.data?.analysis?.recommendedEpisodes ?? analysis.data?.recommendedEpisodes);
  console.log("treatment preview:", (analysis.data?.analysis?.treatment ?? analysis.data?.treatment ?? "").slice(0, 80));

  // 4. switch back to mock and re-run: should be mock heuristics
  await fetch(`${base}/api/settings/ai`, { method: "PATCH", headers: H, body: JSON.stringify({ mode: "mock" }) });
  const ar2 = await fetch(`${base}/api/scripts/${script.id}/analyze`, { method: "POST", headers: H, body: "{}" });
  const mockAnalysis = await ar2.json();
  const t1 = analysis.data?.analysis?.treatment ?? analysis.data?.treatment ?? "";
  const t2 = mockAnalysis.data?.analysis?.treatment ?? mockAnalysis.data?.treatment ?? "";
  console.log("mock rerun differs from live:", t1 !== t2, "| mock genre:", mockAnalysis.data?.analysis?.genre ?? mockAnalysis.data?.genre);

  // 5. cleanup test script
  await fetch(`${base}/api/scripts/${script.id}`, { method: "DELETE", headers: { Cookie: C } });
  console.log("cleaned");
}
main().catch((e) => { console.error(e); process.exit(1); });

const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  const list = (await (await page.request.get("http://localhost:3000/api/scripts")).json()).data;
  const detail = (await (await page.request.get(`http://localhost:3000/api/scripts/${list[0].id}`)).json()).data;
  // 找一个 status=assets 且有缺图资产的剧本；没有就制造一个（抹掉一张已出图）
  let sid = list.find((s) => s.status === "assets")?.id;
  if (!sid) {
    sid = list[0].id;
    const d = (await (await page.request.get(`http://localhost:3000/api/scripts/${sid}`)).json()).data;
    const withImg = [...d.characters, ...d.scenes, ...d.props].find((a) => a.imageUrl);
    if (withImg) {
      await page.request.patch(`http://localhost:3000/api/scripts/${sid}/assets/${withImg.id}`, { data: { imageUrl: null } });
    }
    if (d.characters.length === 0 && d.scenes.length === 0 && d.props.length === 0) {
      await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets`, { data: {} });
    }
  }
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const btn = page.getByRole("button", { name: /下一步 · 拆分镜|下一步 · 出人物/ });
  console.log("button label:", (await btn.textContent())?.trim());
  console.log("disabled:", await btn.isDisabled());
  const hint = await page.getByText(/关键资产未生成/).count();
  console.log("grey hint:", hint);
  await page.screenshot({ path: ".screenshots/verify-next-step-guard.png" });
  await browser.close();
  console.log("done");
})();

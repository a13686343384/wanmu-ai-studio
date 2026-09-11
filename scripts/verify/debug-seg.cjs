const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGEERROR:", String(err).slice(0, 300)));
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  const list = (await (await page.request.get("http://localhost:3000/api/scripts")).json()).data;
  let sid = list[0].id;
  for (const s of list) {
    const d = (await (await page.request.get(`http://localhost:3000/api/scripts/${s.id}`)).json()).data;
    if (d.episodes.some((e) => e.status === "storyboarded")) { sid = s.id; break; }
  }
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  // 段头 段资产 按钮
  const segBtn = page.getByRole("button", { name: "段资产" }).first();
  console.log("段资产 btn:", await segBtn.count());
  await segBtn.click();
  await page.waitForTimeout(800);
  console.log("after 段资产 dialogs:", await page.locator('[role="dialog"]').count());
  console.log("本段分镜图:", await page.getByText(/本段分镜图/).count());
  await browser.close();
})();

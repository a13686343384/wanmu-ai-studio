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
  let sid = list[0].id;
  for (const s of list) {
    const d = (await (await page.request.get(`http://localhost:3000/api/scripts/${s.id}`)).json()).data;
    if (d.episodes.some((e) => e.status === "storyboarded")) { sid = s.id; break; }
  }
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const cards = await page.locator("img").count();
  console.log("cards row check via screenshot");
  await page.screenshot({ path: ".screenshots/verify-card-size.png" });
  await browser.close();
  console.log("done");
})();

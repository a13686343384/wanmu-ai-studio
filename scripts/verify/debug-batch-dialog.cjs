const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGEERROR:", String(err).slice(0, 300)));
  page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE:", msg.text().slice(0, 250)); });
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
  for (let i = 0; i < 5; i++) {
    try {
      await page.getByRole("button", { name: "批量生成", exact: true }).first().click({ timeout: 3000 });
      break
    } catch (e) { await page.waitForTimeout(1000) }
  }
  await page.waitForTimeout(1000);
  console.log("segClicked:", await page.evaluate(() => (window).__segClicked || 0));
  console.log("dialogs:", await page.locator('[role="dialog"]').count());
  console.log("dialog texts:", (await page.locator('[role="dialog"]').allTextContents()).map(t => t.slice(0, 60)));
  await browser.close();
})();

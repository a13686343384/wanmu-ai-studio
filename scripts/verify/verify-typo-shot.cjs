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
  await page.goto(`http://localhost:3000/creation/film-factory/${list[0].id}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.getByRole("tab", { name: /妆造库/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".screenshots/verify-typo-outfits.png" });
  // agent dock
  await page.goto(`http://localhost:3000/canvas/${(await page.evaluate(async () => (await (await fetch("/api/projects")).json()).data)[0].id)}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /Agent/ }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".screenshots/verify-typo-agent.png" });
  await browser.close();
  console.log("done");
})();

const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await page.goto("http://localhost:3000/creation/film-factory");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "新建剧本" }).click();
  await page.waitForTimeout(1000);
  const dlg = page.locator('[role="dialog"]');
  // X 数量（可见的关闭按钮）
  const closeBtns = await dlg.getByRole("button", { name: "关闭" }).count();
  const xIcons = await dlg.locator("svg.lucide-x").count();
  console.log("关闭按钮:", closeBtns, "| X 图标:", xIcons);
  console.log("resize 手柄:", await dlg.locator("textarea").evaluate((el) => getComputedStyle(el).resize));
  await page.screenshot({ path: ".screenshots/verify-intake-dialog.png" });
  await browser.close();
  console.log("done");
})();

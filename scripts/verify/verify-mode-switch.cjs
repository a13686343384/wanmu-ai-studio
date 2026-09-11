const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await page.goto("http://localhost:3000/ai-settings");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  console.log("status badge:", await page.getByText("当前：MOCK 演示数据").count());
  // 开关切到真实 → 应弹确认
  const sw = page.getByRole("switch", { name: /MOCK 数据开关/ });
  await sw.click();
  await page.waitForTimeout(500);
  console.log("confirm dialog:", await page.getByText("关闭 MOCK、切换到真实服务？").count());
  await page.screenshot({ path: ".screenshots/verify-mode-switch.png" });
  await page.getByRole("button", { name: "取消" }).click();
  await page.waitForTimeout(400);
  console.log("mode after cancel:", await page.evaluate(async () => (await (await fetch("/api/settings/ai")).json()).data.mode));
  await browser.close();
  console.log("done");
})();

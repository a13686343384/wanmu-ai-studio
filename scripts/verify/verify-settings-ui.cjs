const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await page.goto("http://localhost:3000/plugins");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: ".screenshots/verify-ai-settings.png" });
  // comfyui test
  await page.getByRole("button", { name: "测试连接" }).click();
  await page.waitForTimeout(8000);
  const toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  console.log("comfy test toasts:", toasts);
  await page.screenshot({ path: ".screenshots/verify-ai-settings-comfy.png" });
  await browser.close();
  console.log("done");
})();

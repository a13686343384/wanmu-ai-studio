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
  const sid = list[0].id;

  const cr = await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/manual`, {
    data: { kind: "prop", name: "待删道具B" },
  });
  console.log("temp prop:", cr.status());
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.getByRole("tab", { name: /道具库/ }).click();
  await page.waitForTimeout(800);
  const targetCard = page.locator('div.overflow-hidden.rounded-lg', { hasText: "待删道具B" }).first();
  await targetCard.hover();
  await page.waitForTimeout(300);
  await targetCard.getByRole("button", { name: "删除" }).first().click();
  await page.waitForTimeout(500);
  console.log("dialog:", await page.getByText(/删除道具「待删道具B」？/).count());
  await page.getByRole("dialog").getByRole("button", { name: "删除" }).click();
  await page.waitForTimeout(2000);
  const still = await page.getByText("待删道具B").count();
  console.log("after confirm delete, still visible:", still);
  const toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  console.log("toasts:", toasts);
  await browser.close();
})();

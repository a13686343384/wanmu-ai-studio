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

  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // each tab's bulk generate button should now succeed (no 参数校验失败)
  const tabs = [["角色", "生成角色图"], ["妆造库", "生成造型图"], ["道具库", "生成道具图"], ["场景", "生成场景图"]];
  for (const [tab, btn] of tabs) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      try {
        await page.getByRole("tab", { name: new RegExp(tab) }).click({ timeout: 5000 });
        await page.getByRole("button", { name: new RegExp(btn) }).first().click({ timeout: 5000 });
        break;
      } catch (e) {
        if (attempt === 2) throw e;
      }
    }
    await page.waitForTimeout(2500);
    const toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
    const bad = toasts.some(t => /参数校验失败|失败/.test(t));
    console.log(`${btn}:`, bad ? "FAIL " + toasts.join("|") : "OK " + toasts.join("|"));
  }
  await page.screenshot({ path: ".screenshots/verify-generate-buttons.png" });
  await browser.close();
  console.log("done");
})();

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
  await page.getByRole("tab", { name: /^角色/ }).click();
  await page.waitForTimeout(600);
  const card = page.locator('div[class*="aspect-["]').first();
  await card.hover();
  await card.getByRole("button", { name: "更多" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: /合并到/ }).click();
  await page.waitForTimeout(700);
  // measure row overflow
  const rows = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return "no dialog";
    const cs = (el) => { const s = getComputedStyle(el); return { w: Math.round(el.getBoundingClientRect().width), display: s.display, maxW: s.maxWidth, pad: s.padding, overflow: s.overflow }; };
    const dlgRect = dlg.getBoundingClientRect();
    const rows = [...dlg.querySelectorAll(":scope > div > button")];
    return {
      dlgWidth: Math.round(dlgRect.width),
      rows: rows.map((b) => {
        const r = b.getBoundingClientRect();
        return { w: Math.round(r.width), overflowRight: Math.round(r.right - dlgRect.right) };
      }),
    };
  });
  console.log("dialog rect & rows:", JSON.stringify(rows, null, 1));
  await page.screenshot({ path: ".screenshots/debug-merge-dialog.png" });
  await browser.close();
})();

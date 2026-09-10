const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");

  const list = await page.evaluate(async () => (await (await fetch("/api/scripts")).json()).data);
  const sid = list[0].id;
  const detail = (await (await page.request.get(`http://localhost:3000/api/scripts/${sid}`)).json()).data;

  // ensure a character has an image (mock-generate first character)
  const withImg = detail.characters.find((c) => c.imageUrl);
  const target = withImg ?? detail.characters[0];
  if (!withImg) {
    const r = await page.request.post(`/api/scripts/${sid}/assets/generate`, {
      data: { kind: "character", ids: [target.id], model: "all-in-one", resolution: "1K" },
    });
    console.log("seed image:", r.status());
  }

  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // 1. outfits tab: generate button at top?
  await page.getByRole("tab", { name: /妆造库/ }).click();
  await page.waitForTimeout(400);
  const outfitsTab = page.locator('[role="tabpanel"]:visible');
  const genBtn = outfitsTab.getByRole("button", { name: /生成造型图/ }).first();
  const listY = await outfitsTab.locator(" > div > div.studio-scroll, .studio-scroll").first().boundingBox();
  const genBox = await genBtn.boundingBox();
  console.log("outfit gen btn y:", genBox?.y, "list y:", listY?.y, "btn above list:", genBox && listY ? genBox.y < listY.y : "?");
  await page.screenshot({ path: ".screenshots/verify-outfits-top.png" });

  // 2. characters tab: hover toolbar
  await page.getByRole("tab", { name: /^角色/ }).click();
  await page.waitForTimeout(400);
  const cardImg = page.locator('div[class*="aspect-["]').first();
  await cardImg.hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".screenshots/verify-hover-bar.png" });
  const dl = await cardImg.getByRole("button", { name: "下载原图" }).count();
  const up = await cardImg.getByRole("button", { name: "上传本地替换参考图" }).count();
  const ed = await cardImg.getByRole("button", { name: "编辑", exact: true }).count();
  const more = await cardImg.getByRole("button", { name: "更多" }).count();
  console.log("hover buttons:", { dl, up, ed, more });

  // 3. more menu
  await cardImg.getByRole("button", { name: "更多" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".screenshots/verify-more-menu.png" });
  for (const item of ["重新出图", "清空参考图", "上传图替换", "合并到...（去重）", "删除"]) {
    const n = await page.getByRole("menuitem", { name: new RegExp(item.replace(/[().]/g, "\\$&")) }).count();
    console.log("menuitem", item, n);
  }
  const lockItem = await page.getByRole("menuitem", { name: /锁定|解锁/ }).count();
  console.log("menuitem 锁定/解锁", lockItem);

  // 4. 重新出图 dialog
  await page.getByRole("menuitem", { name: "重新出图" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".screenshots/verify-reset-dialog.png" });
  const resetText = await page.getByText(/将清空/).count();
  console.log("reset dialog text:", resetText);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 5. 编辑 dialog (出角色参考图)
  await cardImg.hover();
  await cardImg.getByRole("button", { name: "编辑", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: ".screenshots/verify-gen-dialog.png" });
  const dlg = page.locator('[role="dialog"]');
  console.log("gen dialog title:", await dlg.getByText("出角色参考图").count());
  console.log("gen dialog chips:", await dlg.getByRole("button", { name: "2K" }).count(), await dlg.getByRole("button", { name: "超高清画质" }).count());
  await page.getByRole("button", { name: "开始出图" }).click();
  await page.waitForTimeout(4000);
  const toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  console.log("generate toasts:", toasts);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 6. lock toggle via menu
  await cardImg.hover();
  await cardImg.getByRole("button", { name: "更多" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: /锁定/ }).click();
  await page.waitForTimeout(1200);
  const lockBadge = await page.getByLabel("已锁定").count();
  console.log("lock badge after lock:", lockBadge);
  await page.screenshot({ path: ".screenshots/verify-locked.png" });

  // 7. merge dialog
  await cardImg.hover();
  await cardImg.getByRole("button", { name: "更多" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: /合并到/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".screenshots/verify-merge-dialog.png" });
  console.log("merge dialog:", await page.getByText(/合并「/).count());
  await page.keyboard.press("Escape");

  await browser.close();
})();

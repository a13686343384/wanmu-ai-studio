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
  const detail = (await (await page.request.get(`http://localhost:3000/api/scripts/${sid}`)).json()).data;

  // ensure a costume exists + has an image
  let costume = null;
  for (const c of detail.characters) {
    if (c.costumes?.length) { costume = { ...c.costumes[0], characterName: c.name }; break; }
  }
  if (!costume && detail.characters[0]) {
    const cr = await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/manual`, {
      data: { kind: "costume", characterId: detail.characters[0].id, name: "默认造型", description: "日常着装" },
    });
    costume = (await cr.json()).data;
    costume.characterName = detail.characters[0].name;
  }
  if (!costume.imageUrl) {
    const g = await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/generate`, {
      data: { kind: "outfit", ids: [costume.id], model: "all-in-one", resolution: "1K" },
    });
    console.log("seed costume image:", g.status());
  }

  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.getByRole("tab", { name: /妆造库/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ".screenshots/verify-costumes-tab.png" });

  // header format 「名 · N套造型」
  console.log("group header:", await page.getByText(/套造型/).count());
  console.log("costume cards:", await page.locator('div[class*="aspect-["]').count());

  const card = page.locator('div[class*="aspect-["]').first();
  await card.hover();
  await page.waitForTimeout(400);
  const rc = await card.getByRole("button", { name: "重出" }).count();
  const rp = await card.getByRole("button", { name: "替换" }).count();
  console.log("hover buttons 重出/替换:", rc, rp);
  await page.screenshot({ path: ".screenshots/verify-costume-hover.png" });

  // 重出 dialog
  await card.getByRole("button", { name: "重出" }).click();
  await page.waitForTimeout(500);
  console.log("regen dialog title:", await page.getByText("重新出这套造型").count());
  console.log("regen dialog text:", await page.getByText(/会删掉当前造型图重新生成/).count());
  await page.screenshot({ path: ".screenshots/verify-costume-regen.png" });
  await page.getByRole("button", { name: "重新出图" }).click();
  await page.waitForTimeout(4000);
  console.log("regen toasts:", await page.locator("[data-sonner-toast]").allTextContents().catch(() => []));

  // 替换 opens file chooser
  const card2 = page.locator('div[class*="aspect-["]').first();
  await card2.hover();
  await page.waitForTimeout(300);
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 5000 });
  await card2.getByRole("button", { name: "替换" }).click();
  const chooser = await chooserPromise;
  console.log("file chooser opened:", chooser.isMultiple() === false);

  await browser.close();
  console.log("done");
})();

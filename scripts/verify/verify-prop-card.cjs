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

  // ensure a prop with an image
  let prop = detail.props.find((p) => p.imageUrl);
  if (!prop && detail.props[0]) prop = detail.props[0];
  if (!prop) {
    const cr = await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/manual`, {
      data: { kind: "prop", name: "电磁手枪", description: "黑色金属材质、幽蓝色充能纹路" },
    });
    prop = (await cr.json()).data;
  }
  if (!prop.imageUrl) {
    const g = await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/generate`, {
      data: { kind: "prop", ids: [prop.id], model: "all-in-one", resolution: "1K" },
    });
    console.log("seed prop image:", g.status());
  }

  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.getByRole("tab", { name: /道具库/ }).click();
  await page.waitForTimeout(800);

  const card = page.locator('div[class*="aspect-["]').first();
  await card.hover();
  await page.waitForTimeout(400);
  for (const b of ["重出", "替换", "编辑", "删除"]) {
    console.log("btn", b, await card.getByRole("button", { name: b, exact: b !== "删除" }).count());
  }
  console.log("category chip:", await card.getByText("道具", { exact: true }).count());
  await page.screenshot({ path: ".screenshots/verify-prop-hover.png" });

  // 编辑道具卡 dialog
  await card.getByRole("button", { name: "编辑" }).click();
  await page.waitForTimeout(600);
  console.log("edit dialog:", await page.getByText("编辑道具卡").count());
  console.log("edit subtitle:", await page.getByText(/一致性锚点/).count());
  console.log("name input value:", await page.getByLabel("道具名称").inputValue());
  await page.screenshot({ path: ".screenshots/verify-prop-edit.png" });
  // change name and save
  await page.getByLabel("道具名称").fill("电磁手枪 Mk2");
  await page.getByRole("button", { name: "保存" }).click();
  await page.waitForTimeout(1500);
  console.log("after save, name visible:", await page.getByText("电磁手枪 Mk2").count());
  const toasts1 = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  console.log("save toasts:", toasts1);

  // 重出 dialog
  const card2 = page.locator('div[class*="aspect-["]').first();
  await card2.hover();
  await card2.getByRole("button", { name: "重出" }).click();
  await page.waitForTimeout(500);
  console.log("regen dialog:", await page.getByText("重新出这个道具").count());
  await page.getByRole("button", { name: "重新出图" }).click();
  await page.waitForTimeout(4000);
  console.log("regen toasts:", await page.locator("[data-sonner-toast]").allTextContents().catch(() => []));

  // 替换 file chooser
  const card3 = page.locator('div[class*="aspect-["]').first();
  await card3.hover();
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 5000 });
  await card3.getByRole("button", { name: "替换" }).click();
  console.log("file chooser:", await chooserPromise.then(() => true).catch(() => false));

  // 删除 dialog (use a temp prop to avoid destroying seeded data)
  const cr2 = await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/manual`, {
    data: { kind: "prop", name: "待删道具" },
  });
  const temp = (await cr2.json()).data;
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.getByRole("tab", { name: /道具库/ }).click();
  await page.waitForTimeout(800);
  const target = page.locator("div").filter({ has: page.locator("p", { hasText: "待删道具" }) }).last().locator('div[class*="aspect-["]').first();
  const targetCard = page.locator('div.overflow-hidden.rounded-lg', { hasText: "待删道具" }).first();
  await targetCard.hover();
  await targetCard.getByRole("button", { name: "删除" }).click();
  await page.waitForTimeout(500);
  console.log("delete dialog title:", await page.getByText(/删除道具「待删道具」？/).count());
  console.log("delete dialog text:", await page.getByText(/退还存储容量/).count());
  await page.screenshot({ path: ".screenshots/verify-prop-delete.png" });
  await page.getByRole("button", { name: "删除", exact: true }).last().click();
  await page.waitForTimeout(1500);
  console.log("after delete, still visible:", await page.getByText("待删道具").count());

  await browser.close();
  console.log("done");
})();

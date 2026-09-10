const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("response", (res) => {
    if (res.url().includes("/assets/generate") && res.status() >= 400)
      errors.push(`generate ${res.status()} ${res.request().postData()?.slice(0, 120)}`);
  });
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

  const tabs = [["角色", "生成角色图"], ["妆造库", "生成造型图"], ["道具库", "生成道具图"], ["场景", "生成场景图"]];
  for (const [tab, btn] of tabs) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await page.waitForTimeout(700);
    const b = page.getByRole("button", { name: new RegExp(btn) }).first();
    const disabled = await b.isDisabled().catch(() => "missing");
    if (disabled === "missing") { console.log(`${btn}: 按钮不存在`); continue; }
    if (disabled) { console.log(`${btn}: 禁用（无数据，跳过）`); continue; }
    await b.click();
    await page.waitForTimeout(2200);
    const toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
    console.log(`${btn}:`, toasts.length ? toasts.join("|") : "(无 toast)");
  }

  // per-item dialogs: 角色 编辑→开始出图；造型 重出；道具 重出；场景 编辑→开始出图
  async function perItem(tabRegex, tabLabel, hoverBtn, dlgBtnName, confirmBtnName) {
    await page.getByRole("tab", { name: tabRegex }).click();
    await page.waitForTimeout(600);
    const card = page.locator('div[class*="aspect-["]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const trigger = card.getByRole("button", { name: hoverBtn });
    if ((await trigger.count()) === 0) { console.log(`${tabLabel} ${hoverBtn}: 按钮不存在（可能未出图）`); return; }
    await trigger.click();
    await page.waitForTimeout(500);
    const confirm = page.getByRole("button", { name: confirmBtnName }).last();
    if ((await confirm.count()) === 0) { console.log(`${tabLabel} ${hoverBtn}: 确认按钮不存在`); return; }
    await confirm.click();
    await page.waitForTimeout(2500);
    const toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
    console.log(`${tabLabel} ${hoverBtn}→${confirmBtnName}:`, toasts.length ? toasts.join("|") : "(无 toast)");
  }
  await perItem(/^角色/, "角色", "编辑", null, "开始出图");
  await perItem(/^妆造库/, "妆造库", "重出", null, "重新出图");
  await perItem(/道具库/, "道具库", "重出", null, "重新出图");
  await perItem(/^场景/, "场景", "编辑", null, "开始出图");

  console.log(errors.length ? "HTTP错误:\n" + errors.join("\n") : "无 generate HTTP 错误");
  await browser.close();
})();

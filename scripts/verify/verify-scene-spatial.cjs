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
  const scene = detail.scenes[0];
  if (scene && !scene.imageUrl) {
    await page.request.post(`http://localhost:3000/api/scripts/${sid}/assets/generate`, {
      data: { kind: "scene", ids: [scene.id], model: "all-in-one", resolution: "1K" },
    });
  }

  // --- 1. template popover per tab ---
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  const titles = [];
  for (const [tab, expected] of [["角色", "角色提示词模板"], ["妆造库", "妆造提示词模板"], ["道具库", "道具提示词模板"], ["场景", "场景提示词模板"]]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: new RegExp(`设置${expected.slice(0, 2)}`) }).click().catch(async () => {
      await page.getByRole("button", { name: /设置.*提示词模板/ }).click();
    });
    await page.waitForTimeout(400);
    const t = await page.locator('[role="dialog"]').getByText(new RegExp("提示词模板$")).first().textContent().catch(() => "N/A");
    titles.push(`${tab}:${t}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  console.log("template titles:", titles.join(" | "));

  // save a scene template via popover
  await page.getByRole("tab", { name: /^场景/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "设置场景提示词模板" }).click();
  await page.waitForTimeout(400);
  await page.locator('[role="dialog"] textarea').fill("电影级场景参考图，写实光影，细节丰富。");
  await page.getByRole("button", { name: "保存" }).click();
  await page.waitForTimeout(1500);
  const after = (await (await page.request.get(`http://localhost:3000/api/scripts/${sid}`)).json()).data;
  console.log("scene template saved:", after.scenePromptTemplate);

  // --- 2. scene card hover + more menu ---
  await page.getByRole("tab", { name: /^场景/ }).click();
  await page.waitForTimeout(500);
  const card = page.locator('div[class*="aspect-["]').first();
  await card.hover();
  await page.waitForTimeout(400);
  for (const b of ["下载原图", "上传本地替换参考图", "编辑", "更多"]) {
    console.log("scene btn", b, await card.getByRole("button", { name: b }).count());
  }
  await card.getByRole("button", { name: "更多" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".screenshots/verify-scene-menu.png" });
  for (const item of ["重新出图", "清空参考图", "上传图替换", "空间资产（多角度/侧别/…）", "删除"]) {
    console.log("menu", item, await page.getByRole("menuitem", { name: item.replace(/[().]/g, "\\$&") }).count());
  }
  console.log("menu 锁定:", await page.getByRole("menuitem", { name: /锁定/ }).count());
  console.log("menu 合并到 (should be 0):", await page.getByRole("menuitem", { name: /合并到/ }).count());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // --- 3. spatial dialog ---
  await card.hover();
  await page.waitForTimeout(300);
  await card.getByRole("button", { name: "更多" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: /空间资产/ }).click();
  await page.waitForTimeout(600);
  const dlg = page.locator('[role="dialog"]');
  console.log("spatial title:", await dlg.getByText(/空间资产 · /).count());
  console.log("spatial subtitle:", await dlg.getByText(/跨镜空间一致性资产包/).count());
  console.log("ratios:", await dlg.getByRole("button", { name: "9:16" }).count(), await dlg.getByRole("button", { name: "21:9" }).count());
  console.log("res chips:", await dlg.getByRole("button", { name: "2K" }).count());
  console.log("tiles:", await dlg.getByText("俯视布局").count(), await dlg.getByText("右侧").count());
  console.log("cards:", await dlg.getByText("侧别锁定卡").count(), await dlg.getByText("光影设计卡").count());
  console.log("画质 note:", await dlg.getByText(/此处不可调/).count());
  await page.screenshot({ path: ".screenshots/verify-spatial.png" });

  // generate one angle
  await dlg.getByText("俯视布局").click();
  await page.waitForTimeout(3500);
  console.log("gen toasts:", await page.locator("[data-sonner-toast]").allTextContents().catch(() => []));
  // generate side card
  await dlg.locator("div", { hasText: "侧别锁定卡" }).last().getByRole("button", { name: "生成" }).click();
  await page.waitForTimeout(3500);
  const after2 = (await (await page.request.get(`http://localhost:3000/api/scripts/${sid}`)).json()).data;
  console.log("spatialPack keys:", Object.keys(after2.scenes[0].spatialPack || {}));
  await page.screenshot({ path: ".screenshots/verify-spatial-after.png" });

  await browser.close();
  console.log("done");
})();

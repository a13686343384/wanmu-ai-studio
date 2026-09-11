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
  let sid = (await (await page.request.get(`http://localhost:3000/api/scripts/${list[0].id}`)).json()).data.episodes.length ? list[0].id : list.find(s => true).id;
  // 用有分集的剧本
  for (const s of list) {
    const d = (await (await page.request.get(`http://localhost:3000/api/scripts/${s.id}`)).json()).data;
    if (d.episodes.length > 0) { sid = s.id; break; }
  }
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // 进入拆分（主按钮 批量生成 → 弹窗 → 开始）
  await page.getByRole("button", { name: "重新拆分镜" }).click();
  await page.waitForTimeout(500);
  const dlg = page.locator('[role="dialog"]').last();
  const startBtn = dlg.getByRole("button", { name: /开始|生成|拆分/ }).last();
  await startBtn.click();
  // 弹窗应立即收起，分镜区出现「AI 正在拆分镜…」
  await page.waitForTimeout(400);
  console.log("dialog closed on start:", (await page.locator('[role="dialog"]').count()) === 0 || !(await page.getByText("出图参数").count()));
  console.log("area loading:", await page.getByText("AI 正在拆分镜").count());
  console.log("stop chip:", await page.getByText("停止").count());
  await page.screenshot({ path: ".screenshots/verify-split-loading.png" });
  await page.waitForTimeout(6000);
  // 完成后：镜组分段 + 生成首帧图占位 + 出片前检查
  console.log("segments:", await page.locator("section .rounded-xl.border", { hasText: /B0\d/ }).count());
  console.log("生成首帧图 buttons:", await page.getByRole("button", { name: "生成首帧图" }).count());
  console.log("checks banner:", await page.getByText(/出片前检查 ·/).count());
  await page.screenshot({ path: ".screenshots/verify-split-done.png" });
  // 段资产弹窗
  await page.getByRole("button", { name: "重新拆分镜" }).click();
  await page.waitForTimeout(600);
  console.log("segment assets dialog:", await page.getByText(/本段分镜图/).count());
  await page.screenshot({ path: ".screenshots/verify-segment-assets.png" });
  await page.keyboard.press("Escape");
  // 编辑整段引用
  await page.getByRole("button", { name: "编辑引用" }).first().click();
  await page.waitForTimeout(600);
  console.log("refs dialog:", await page.getByText(/编辑整段引用/).count());
  await page.screenshot({ path: ".screenshots/verify-refs-dialog.png" });
  await browser.close();
  console.log("done");
})();

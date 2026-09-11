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
  let sid = list[0].id;
  for (const s of list) {
    const d = (await (await page.request.get(`http://localhost:3000/api/scripts/${s.id}`)).json()).data;
    if (d.episodes.some((e) => e.status === "storyboarded")) { sid = s.id; break; }
  }
  await page.goto(`http://localhost:3000/creation/film-factory/${sid}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("checks:", await page.getByText(/出片前检查/).count());
  console.log("segments:", await page.locator("section", { hasText: /B0\d·/ }).count());
  console.log("批量生成 btn:", await page.getByRole("button", { name: "批量生成", exact: true }).count());
  await page.screenshot({ path: ".screenshots/verify-post-split.png" });
  // 打开段资产弹窗（顶部批量生成）
  await page.getByRole("button", { name: "批量生成", exact: true }).first().click();
  await page.waitForTimeout(800);
  console.log("segment assets dialog:", await page.getByText(/本段分镜图/).count());
  console.log("补全所有图片:", await page.getByRole("button", { name: /补全所有图片/ }).count());
  await page.screenshot({ path: ".screenshots/verify-segment-assets2.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // 编辑整段引用
  await page.getByRole("button", { name: "编辑引用" }).first().click();
  await page.waitForTimeout(800);
  console.log("refs dialog:", await page.getByText(/编辑整段引用/).count());
  console.log("场景区:", await page.getByText("场景", { exact: true }).count());
  console.log("人物与造型:", await page.getByText("人物与造型").count());
  await page.screenshot({ path: ".screenshots/verify-refs-dialog2.png" });
  await browser.close();
  console.log("done");
})();

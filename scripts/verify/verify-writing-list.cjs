const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");

  // factory list measurements as baseline
  await page.goto("http://localhost:3000/creation/film-factory");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const factoryMain = await page.locator("main").first().boundingBox();
  const factoryH1 = await page.locator("h1").first().textContent();
  await page.screenshot({ path: ".screenshots/verify-baseline-factory.png" });

  // writing list
  await page.goto("http://localhost:3000/creation/script-writing");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const main = await page.locator("main").first().boundingBox();
  console.log("factory main width:", factoryMain?.width, "| writing main width:", main?.width);
  console.log("writing h1:", await page.locator("h1").first().textContent());
  console.log("eyebrow:", await page.getByText("Writing Room").count(), "badge:", await page.getByText("编剧工坊").count());
  console.log("stat cards:", await page.getByText("已有蓝图").count(), await page.getByText("已导入").count());
  console.log("search:", await page.getByPlaceholder("搜索剧名或故事核心…").count());
  console.log("sort btn:", await page.getByRole("button", { name: /最近修改/ }).count());
  await page.screenshot({ path: ".screenshots/verify-writing-list.png" });

  // card menu (hover first card)
  const card = page.locator("div.group.cursor-pointer").first();
  await card.hover();
  await page.waitForTimeout(400);
  console.log("card menu trigger:", await card.getByRole("button", { name: "更多操作" }).count());
  await card.getByRole("button", { name: "更多操作" }).click();
  await page.waitForTimeout(400);
  console.log("menu 置顶:", await page.getByRole("menuitem", { name: /置顶/ }).count());
  console.log("menu 编辑:", await page.getByRole("menuitem", { name: "编辑" }).count());
  console.log("menu 删除剧本:", await page.getByRole("menuitem", { name: "删除剧本" }).count());
  await page.getByRole("menuitem", { name: "删除剧本" }).click();
  await page.waitForTimeout(500);
  console.log("delete alert:", await page.getByText("确定要删除「").count());
  await page.getByRole("button", { name: "取消" }).click();
  await page.waitForTimeout(400);

  // create dialog typography
  await page.getByRole("button", { name: "新建剧本" }).click();
  await page.waitForTimeout(500);
  const dlg = page.locator('[role="dialog"]');
  const labelSize = await dlg.getByText("题材配方").evaluate((el) => getComputedStyle(el).fontSize);
  console.log("dialog label font-size:", labelSize);
  await page.screenshot({ path: ".screenshots/verify-writing-create.png" });

  await browser.close();
  console.log("done");
})();

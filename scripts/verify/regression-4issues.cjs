const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const fails = [];

  // 1. login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"], #email, input[type="email"]', "demo@wanmusheng.com");
  await page.fill('input[name="password"], #password, input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/(dashboard)**/**", { timeout: 15000 }).catch(async () => {
    await page.waitForLoadState("networkidle");
  });
  console.log("after login url:", page.url());

  // 2. script-writing list width + create + detail
  await page.goto("http://localhost:3000/creation/script-writing");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main").first();
  const mainClass = await main.getAttribute("class");
  console.log("writing main class:", mainClass);
  if (!/max-w-6xl/.test(mainClass)) fails.push("writing list width not max-w-6xl");
  await page.screenshot({ path: ".screenshots/reg-writing-list.png", fullPage: false });

  await page.getByRole("button", { name: /新建剧本/ }).click();
  await page.waitForTimeout(600);
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input').first().fill("回归测试剧本");
  await dialog.locator("textarea").first().fill("一个关于回归测试的故事：主角每天修复 bug，直到发现自己也是 bug。");
  await page.getByRole("button", { name: /创建|生成|开始/ }).last().click();
  await page.waitForTimeout(2500);
  console.log("after create url:", page.url());
  if (page.url().includes("script-writing/") && !page.url().endsWith("script-writing")) {
    const h1 = await page.locator("h1, h2").first().textContent().catch(() => null);
    console.log("detail h1/h2:", h1);
    const notFound = await page.getByText("404").count();
    const notFound2 = await page.getByText("不存在").count();
    if (notFound && notFound2) fails.push("writing detail shows not-found UI");
    await page.screenshot({ path: ".screenshots/reg-writing-detail.png" });
  } else {
    fails.push("create did not navigate to detail: " + page.url());
    const toast = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
    console.log("toasts:", toast);
  }

  // 3. ecommerce create + generate
  await page.goto("http://localhost:3000/creation/ecommerce");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".screenshots/reg-ecommerce.png" });
  const genBtn = page.getByRole("button", { name: /一键生成|生成/ }).first();
  await genBtn.click();
  await page.waitForTimeout(6000);
  const ecomToasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  console.log("ecom toasts:", ecomToasts);
  if (ecomToasts.some(t => /JSON|失败|错误|Unexpected/.test(t))) fails.push("ecommerce error toast: " + ecomToasts.join(" | "));
  await page.screenshot({ path: ".screenshots/reg-ecommerce-after.png" });

  // 4. canvas studio visuals
  const pres = await page.evaluate(async () => {
    const r = await fetch("/api/projects");
    return (await r.json()).data;
  });
  const pid = pres?.[0]?.id;
  if (pid) {
    await page.goto(`http://localhost:3000/canvas/${pid}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    // footer toolbar centered?
    const box = await page.getByTestId("studio-toolbar").boundingBox();
    const vp = page.viewportSize();
    if (box) {
      const center = box.x + box.width / 2;
      console.log("toolbar center:", Math.round(center), "viewport center:", vp.width / 2);
      if (Math.abs(center - vp.width / 2) > 40) fails.push(`toolbar not centered (off ${Math.round(center - vp.width / 2)}px)`);
    } else fails.push("studio-toolbar not found");
    // collapse sidebar, screenshot tab
    await page.getByRole("button", { name: "收起侧栏" }).click().catch(e => fails.push("collapse btn: " + e.message));
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".screenshots/reg-canvas-collapsed.png" });
    await page.getByRole("button", { name: "展开侧栏" }).click().catch(e => fails.push("expand tab: " + e.message));
    await page.waitForTimeout(400);
    // add text node and screenshot input darkness
    await page.getByTestId("studio-toolbar").getByRole("button", { name: "添加节点" }).click();
    await page.waitForTimeout(400);
    await page.getByRole("menuitem", { name: /文本/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByTestId("studio-toolbar").getByRole("button", { name: "新建文本" }).click().catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: ".screenshots/reg-canvas-nodes.png" });
  } else {
    fails.push("no canvas project found");
  }

  console.log(fails.length ? "FAILS:\n- " + fails.join("\n- ") : "ALL CHECKS PASSED");
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();

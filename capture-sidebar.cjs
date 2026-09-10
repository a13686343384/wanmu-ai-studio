const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'demo@wanmusheng.com');
  await page.fill('#password', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/');
  await page.goto('http://localhost:3000/creation/film-factory/script-demo-xuebeng');
  await page.waitForTimeout(2500);
  // 裁出右侧资产栏
  const aside = page.locator('aside.hidden.lg\\:block').last();
  const box = await aside.boundingBox();
  if (box) {
    await page.screenshot({
      path: '/tmp/verify-r2/sidebar-live.png',
      clip: { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: Math.min(box.height + 8, 880) },
    });
  }
  await browser.close();
})();

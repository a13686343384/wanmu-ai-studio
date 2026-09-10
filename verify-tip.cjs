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
  // 悬停「重新出一遍」按钮（资产栏第一个按钮）
  const btn = page.getByRole('button', { name: '重新出一遍' });
  console.log('刷新按钮:', await btn.count());
  await btn.hover();
  await page.waitForTimeout(600);
  const tip = await page.getByText(TIP_TEXT).count().catch(() => 0);
  async function tipCheck() {}
  const tipVisible = await page.getByText('删除旧图重出').first().isVisible().catch(() => false);
  console.log('tooltip visible:', tipVisible);
  await page.screenshot({ path: '/tmp/verify-r2/tooltip.png' });
  await browser.close();
})();
const TIP_TEXT = '';

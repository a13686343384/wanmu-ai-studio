const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', process.env.EV_EMAIL || 'demo@wanmusheng.com');
  await page.fill('#password', process.env.EV_PASS || 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/');
  const shots = process.argv.slice(2);
  for (const [path, name] of shots.map((s) => s.split('='))) {
    await page.goto('http://localhost:3000' + path);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `/tmp/verify-r2/${name}.png` });
  }
  console.log('captured', shots.length, 'pages; pageerrors:', errs.length);
  await browser.close();
})();

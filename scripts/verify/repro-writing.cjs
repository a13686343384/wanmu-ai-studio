const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const apiErrs = [];
  page.on('response', async (r) => {
    if (r.status() >= 400) {
      let body = '';
      try { body = (await r.text()).slice(0, 250); } catch {}
      apiErrs.push(r.status() + ' ' + r.url().slice(-70) + ' :: ' + body);
    }
  });
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'demo@wanmusheng.com');
  await page.fill('#password', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/');

  // 直接走 API 复现创建
  const create = await page.request.post('http://localhost:3000/api/writing-projects', {
    data: { title: '复现测试', genre: '霸总', idea: '复现用的故事核心', totalEpisodes: 30, episodeDuration: 90 },
  });
  console.log('create status:', create.status());
  const cp = await create.json().catch(() => ({}));
  console.log('create body:', JSON.stringify(cp).slice(0, 200));
  const pid = cp.data?.id;
  if (pid) {
    // 详情页
    const pageRes = await page.request.get(`http://localhost:3000/creation/script-writing/${pid}`);
    console.log('detail page status:', pageRes.status());
    // 详情 API
    const apiRes = await page.request.get(`http://localhost:3000/api/writing-projects/${pid}`);
    console.log('detail api status:', apiRes.status());
    // 生成
    const gen = await page.request.post(`http://localhost:3000/api/writing-projects/${pid}`, {
      data: { action: 'write', prompt: '写一段开场' },
    });
    console.log('generate status:', gen.status(), (await gen.text()).slice(0, 150));
  }
  console.log('api errors seen:', apiErrs.length ? apiErrs.slice(0, 3) : 'none');
  await browser.close();
})();

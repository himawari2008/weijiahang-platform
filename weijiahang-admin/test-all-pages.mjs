import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5174';

// 全部19个路由
const ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/shop-verify', name: 'ShopVerify' },
  { path: '/navigator-verify', name: 'NavigatorVerify' },
  { path: '/users', name: 'UserManage' },
  { path: '/orders', name: 'OrderManage' },
  { path: '/markets', name: 'MarketManage' },
  { path: '/market-analytics', name: 'MarketAnalytics' },
  { path: '/ads', name: 'AdManage' },
  { path: '/marketing', name: 'MarketingManage' },
  { path: '/settlements', name: 'SettlementManage' },
  { path: '/reviews', name: 'ReviewModeration' },
  { path: '/beacons', name: 'BeaconManage' },
  { path: '/product-orders', name: 'ProductOrderManage' },
  { path: '/customers', name: 'CustomerSegmentManage' },
  { path: '/coupons', name: 'CouponManage' },
  { path: '/message-templates', name: 'MessageTemplateManage' },
  { path: '/finance', name: 'Finance' },
  { path: '/system', name: 'SystemConfig' },
  { path: '/audit-log', name: 'AuditLog' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const results = [];

  // 收集控制台日志
  const errors = [];
  page.on('pageerror', err => {
    errors.push({ page: currentPage, error: err.message });
  });

  let currentPage = '';

  try {
    // 先登录
    console.log('📋 登录中...');
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(500);

    // 填写登录表单
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('admin');
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('admin123');
    }
    await page.click('button');
    await sleep(2000);

    // 验证登录
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    if (!token) {
      console.log('❌ 登录失败!');
      await browser.close();
      return;
    }
    console.log('✅ 登录成功\n');

    // 遍历每个页面
    for (const route of ROUTES) {
      currentPage = route.name;
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);

        // 检查是否有错误
        const pageErrors = errors.filter(e => e.page === route.name);
        const hasCrash = pageErrors.length > 0;

        // 检查 ErrorBoundary 是否渲染
        const errorBoundary = await page.$('.ant-empty');
        const emptyDesc = errorBoundary ? await page.$eval('.ant-empty-description', el => el?.innerText || '').catch(() => '') : '';

        // 检查页面标题
        const h2 = await page.$('h2');
        const title = h2 ? await h2.evaluate(el => el.innerText).catch(() => 'N/A') : 'N/A';

        const status = hasCrash ? '❌ CRASH' : '✅ OK';
        const crashInfo = hasCrash ? ` | ${pageErrors[0].error}` : '';

        console.log(`${status} ${route.name.padEnd(22)} ${route.path.padEnd(22)} ${title}${crashInfo}`);

        results.push({
          name: route.name,
          path: route.path,
          title,
          crashed: hasCrash,
          errors: pageErrors.map(e => e.error),
        });
      } catch (err) {
        console.log(`⚠️  ${route.name.padEnd(22)} ${route.path.padEnd(22)} 导航超时/失败: ${err.message}`);
        results.push({ name: route.name, path: route.path, title: 'TIMEOUT', crashed: true, errors: [err.message] });
      }
    }

  } catch (err) {
    console.error('Fatal:', err.message);
  }

  // 汇总
  console.log('\n📊 汇总:');
  const crashed = results.filter(r => r.crashed);
  const ok = results.filter(r => !r.crashed);
  console.log(`  ✅ 正常: ${ok.length}/${results.length}`);
  console.log(`  ❌ 崩溃: ${crashed.length}/${results.length}`);

  if (crashed.length > 0) {
    console.log('\n崩溃页面:');
    crashed.forEach(r => {
      console.log(`  - ${r.name} (${r.path}): ${r.errors.join(', ')}`);
    });
  }

  // 所有收集到的错误
  const uniqueErrors = [...new Set(errors.map(e => e.error))];
  if (uniqueErrors.length > 0) {
    console.log('\n所有唯一错误:');
    uniqueErrors.forEach(e => console.log(`  - ${e}`));
  }

  await browser.close();
  console.log('\n✅ 测试完成');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

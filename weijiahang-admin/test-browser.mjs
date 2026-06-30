import puppeteer from 'puppeteer';

const LOGIN_URL = 'http://localhost:5174';
const TEST_URL = 'http://localhost:5174/test-login.html';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 收集控制台日志
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    logs.push(`[PAGE_ERROR] ${err.message}`);
  });

  try {
    // ============ 第1步：测试独立登录 API ============
    console.log('\n📋 第1步: 测试独立 test-login.html 页面');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);

    // 点击 "Test Login (fetch)" 按钮
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      await buttons[0].click();
      await sleep(2000);
    }

    // 检查结果
    const testLog = await page.$eval('#log', el => el.innerText).catch(() => '无法读取日志');
    console.log('独立测试日志:', testLog.substring(0, 500));

    // ============ 第2步：访问 React 登录页 ============
    console.log('\n📋 第2步: 测试 React 登录页');

    // 清除 localStorage
    await page.evaluate(() => localStorage.clear());

    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    // 截图看页面状态
    await page.screenshot({ path: 'test-screenshots/01-login-page.png', fullPage: true });
    console.log('已截图: 01-login-page.png');

    // 检查页面元素
    const pageTitle = await page.$eval('h1', el => el.innerText).catch(() => '未找到标题');
    console.log('页面标题:', pageTitle);

    const inputs = await page.$$('input');
    console.log(`找到 ${inputs.length} 个输入框`);

    // 查找用户名和密码输入框
    const usernameInput = await page.$('input[placeholder*="用户名"], input#username');
    const passwordInput = await page.$('input[placeholder*="密码"], input#password, input[type="password"]');

    if (usernameInput) {
      console.log('找到用户名输入框');
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type('admin');
    } else {
      console.log('未找到用户名输入框，尝试通用查找...');
      const allInputs = await page.$$('input');
      for (const inp of allInputs) {
        const placeholder = await inp.evaluate(el => el.placeholder || el.getAttribute('name') || '');
        console.log(`  输入框: placeholder="${placeholder}"`);
      }
      if (allInputs.length >= 2) {
        await allInputs[0].click({ clickCount: 3 });
        await allInputs[0].type('admin');
        await allInputs[1].click({ clickCount: 3 });
        await allInputs[1].type('admin123');
      }
    }

    if (passwordInput) {
      console.log('找到密码输入框');
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type('admin123');
    }

    await sleep(500);

    // 截图填表后
    await page.screenshot({ path: 'test-screenshots/02-filled-form.png', fullPage: true });
    console.log('已截图: 02-filled-form.png');

    // 点击登录按钮
    const loginBtn = await page.$('button');
    if (loginBtn) {
      console.log('点击登录按钮...');
      await loginBtn.click();
      await sleep(3000);
    }

    // 截图登录后
    await page.screenshot({ path: 'test-screenshots/03-after-login.png', fullPage: true });
    console.log('已截图: 03-after-login.png');

    // 检查登录结果
    const currentUrl = page.url();
    console.log('当前URL:', currentUrl);

    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    console.log('localStorage token:', token ? `${token.substring(0, 30)}...` : 'null (登录失败!)');

    // 检查是否还在登录页
    const stillLoginPage = await page.$('h1');
    if (stillLoginPage) {
      const h1Text = await stillLoginPage.evaluate(el => el.innerText);
      console.log('仍在登录页. 标题:', h1Text);
    }

    // 检查是否有 antd message 提示
    const messageElements = await page.$$('.ant-message-notice-content');
    for (const el of messageElements) {
      const text = await el.evaluate(e => e.innerText);
      console.log('消息提示:', text);
    }

  } catch (err) {
    console.error('测试出错:', err.message);
  }

  // 输出所有控制台日志
  console.log('\n📋 浏览器控制台日志:');
  for (const log of logs) {
    if (log.includes('[Login]') || log.includes('error') || log.includes('Error') || log.includes('fail') || log.includes('PAGE_ERROR')) {
      console.log('  ⚠️ ', log);
    }
  }

  // 输出所有日志（最多50条）
  const relevantLogs = logs.filter(l =>
    l.includes('[Login]') || l.includes('ERROR') || l.includes('error') || l.includes('warn') || l.includes('fail') || l.includes('401') || l.includes('403') || l.includes('500')
  );
  if (relevantLogs.length > 0) {
    console.log('\n⚠️ 关键日志:');
    relevantLogs.forEach(l => console.log('  ', l));
  }

  console.log(`\n总计 ${logs.length} 条控制台日志`);
  if (logs.length <= 30) {
    logs.forEach(l => console.log('  ', l));
  }

  await browser.close();
  console.log('\n✅ 测试完成');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// พรีวิวหน้าจอสำหรับตรวจภาพ (T16): เดินผ่านขั้นตั้งค่าเริ่มต้น → Paywall → ล็อกอิน (mock) → ทุกแท็บ แล้วถ่ายภาพ
// ใช้: npm run preview:web (อีกเทอร์มินัล) แล้ว node scripts/web-screenshots.js <โฟลเดอร์ภาพ> [en|th] [dark|light] [สีหลัก]
// ต้องมี Playwright: ตั้ง PLAYWRIGHT_MODULE=/path/to/playwright ถ้าไม่ได้ติดตั้งในโปรเจกต์
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.argv[2];
const lang = process.argv[3] || 'en';
const theme = process.argv[4] || 'dark';
const accent = process.argv[5] || 'pink';
(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const tid = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
  const tap = async (id) => {
    await tid(id).click({ timeout: 8000 });
    await page.waitForTimeout(600);
  };
  const shot = async (name, full = false) => {
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${lang}-${theme}-${name}.png`, fullPage: full });
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      console.log('STEP FAILED', name, e.message.split('\n')[0]);
    }
  };
  await page.goto('http://localhost:' + (process.env.PORT || 8089) + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await step('appearance', async () => {
    await tap(`lang-${lang}`);
    await tap(`segment-${theme}`);
    await tap(`accent-${accent}`);
    await shot('01-onboarding-1');
  });
  await step('profile', async () => {
    await tap('onboarding-next');
    await tap('sex-male');
    await tid('field-age').fill('30');
    await tid('field-height').fill('175');
    await tid('field-weight').fill('72');
    await page
      .getByText(lang === 'th' ? /ปานกลาง/ : /Moderate exercise/)
      .locator('visible=true')
      .first()
      .click();
    await shot('02-onboarding-2');
  });
  await step('quickstart', async () => {
    await tap('onboarding-next');
    await tap('template-ppl3');
    await shot('03-onboarding-3');
    await tap('onboarding-next');
  });
  await step('paywall', async () => {
    await page.waitForTimeout(1000);
    await shot('04-paywall');
    await tap('paywall-cta');
  });
  await step('login', async () => {
    await page.waitForTimeout(800);
    await shot('05-login');
    await tap('signin-google');
    await page.waitForTimeout(1500);
  });
  await step('paywall2', async () => {
    await shot('06-paywall-after-login');
    await tap('paywall-cta');
    await page.waitForTimeout(2500);
  });
  await step('today', async () => {
    await shot('07-today');
    await shot('07-today-full', true);
  });
  await step('programs', async () => {
    await tap('tab-programs');
    await shot('08-programs');
  });
  await step('week', async () => {
    await tap('programs-week');
    await shot('09-week');
    await page.goBack();
    await page.waitForTimeout(800);
  });
  await step('session', async () => {
    await tap('tab-index');
    await page
      .locator('[data-testid^="start-"]:not([data-testid="start-empty"]):visible')
      .first()
      .click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    await shot('10-session');
    await page.locator('[data-testid^="tick-"]:visible').first().click();
    await page.waitForTimeout(500);
    await shot('11-session-ticked');
  });
  await step('finish', async () => {
    await tap('session-finish');
    await page.waitForTimeout(800);
    await tap('intensity-hard').catch(() => {});
    await tap('session-save');
    await page.waitForTimeout(1200);
    await shot('12-summary');
    await tap('summary-home');
  });
  await step('stats', async () => {
    await tap('tab-stats');
    await shot('13-stats');
    await shot('13-stats-full', true);
  });
  await step('settings', async () => {
    await tap('tab-settings');
    await shot('14-settings');
  });
  await step('profile', async () => {
    await tap('settings-profile');
    await page.waitForTimeout(800);
    await shot('15-profile-full', true);
  });
  await browser.close();
})();

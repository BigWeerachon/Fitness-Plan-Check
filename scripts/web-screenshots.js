// พรีวิวหน้าจอสำหรับตรวจภาพ (T16): เดินผ่านขั้นตั้งค่าเริ่มต้น → Paywall → ซื้อ (mock) → ทุกแท็บ แล้วถ่ายภาพ
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
  const byTestId = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
  const tapByTestId = async (id) => {
    await byTestId(id).click({ timeout: 8000 });
    await page.waitForTimeout(600);
  };
  const shot = async (name, { fullPage = false } = {}) => {
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${lang}-${theme}-${name}.png`, fullPage });
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
    await tapByTestId(`lang-${lang}`);
    await tapByTestId(`segment-${theme}`);
    await tapByTestId(`accent-${accent}`);
    await shot('01-onboarding-1');
  });
  await step('onboarding-profile', async () => {
    await tapByTestId('onboarding-next');
    await tapByTestId('sex-male');
    await byTestId('field-age').fill('30');
    await byTestId('field-height').fill('175');
    await byTestId('field-weight').fill('72');
    await page
      .getByText(lang === 'th' ? /ปานกลาง/ : /Moderate exercise/)
      .locator('visible=true')
      .first()
      .click();
    await shot('02-onboarding-2');
  });
  await step('quickstart', async () => {
    await tapByTestId('onboarding-next');
    await tapByTestId('template-ppl3');
    await shot('03-onboarding-3');
    await tapByTestId('onboarding-next');
  });
  await step('paywall', async () => {
    await page.waitForTimeout(1000);
    await shot('04-paywall');
    // ซื้อได้ทันทีโดยไม่ต้องล็อกอิน (D81)
    await tapByTestId('paywall-cta');
    await page.waitForTimeout(2500);
  });
  await step('today', async () => {
    await shot('07-today');
    await shot('07-today-full', { fullPage: true });
  });
  await step('programs', async () => {
    await tapByTestId('tab-programs');
    await shot('08-programs');
  });
  await step('week', async () => {
    await tapByTestId('programs-week');
    await shot('09-week');
    await page.goBack();
    await page.waitForTimeout(800);
  });
  await step('session', async () => {
    await tapByTestId('tab-index');
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
    await tapByTestId('session-finish');
    await page.waitForTimeout(800);
    await tapByTestId('intensity-hard').catch(() => {});
    await tapByTestId('session-save');
    await page.waitForTimeout(1200);
    await shot('12-summary');
    await tapByTestId('summary-home');
  });
  await step('stats', async () => {
    await tapByTestId('tab-stats');
    await shot('13-stats');
    await shot('13-stats-full', { fullPage: true });
  });
  await step('settings', async () => {
    await tapByTestId('tab-settings');
    await shot('14-settings');
    await shot('14-settings-full', { fullPage: true });
  });
  await step('settings-profile', async () => {
    await tapByTestId('settings-profile');
    await page.waitForTimeout(800);
    await shot('15-profile-full', { fullPage: true });
  });
  await browser.close();
})();

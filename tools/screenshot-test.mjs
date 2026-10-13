import { chromium } from '/workspace/hyt-tools/node_modules/playwright-core/index.mjs';
const url = process.argv[2] || 'http://localhost:8765/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: +(process.env.DSF || 1) });
const errors = [], warns = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warns.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => errors.push('REQFAIL ' + r.url()));
const shots = (process.argv[3] || '1,5,6,8').split(',').map(Number);
for (const n of shots) {
  await page.goto(url + '?slide=' + n, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hyt && window.__hyt.ready, null, { timeout: 120000 });
  await page.waitForTimeout(+process.argv[4] || 9000);
  await page.screenshot({ timeout: 180000, path: `/workspace/haiyantang/shots/slide${String(n).padStart(2, '0')}.png` });
  console.log('shot', n, JSON.stringify(await page.evaluate(() => window.__hyt.quality && window.__hyt.quality())));
}
// navigation test
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500);
console.log('cur after ArrowRight:', await page.evaluate(() => window.__hyt.cur));
console.log('ERRORS', JSON.stringify(errors, null, 1));
console.log('WARNS', JSON.stringify([...new Set(warns)].slice(0, 10), null, 1));
await browser.close();

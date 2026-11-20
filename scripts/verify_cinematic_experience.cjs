/* Optional local browser QA. Uses an installed Playwright library without
 * adding a production dependency. See docs/CINEMATIC_EXPERIENCE_REPORT.md. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SAFEHOME_PREVIEW_URL || 'http://localhost:3210';
const output = path.join(process.cwd(), 'docs/images/experience');
const results = [];
const errors = [], failedAssets = [];
let browser;
let previousScore, nextScore;
const delay = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
async function check(name, run) {
  try { const detail = await run(); results.push({ name, status: 'PASS', detail }); }
  catch (error) { results.push({ name, status: 'FAIL', detail: error.message }); console.error(error.message); }
  console.log(results.at(-1).status + ': ' + name);
  fs.writeFileSync('docs/EXPERIENCE_BROWSER_RESULTS.json', JSON.stringify({ runAt: new Date().toISOString(), base, results, errors, failedAssets }, null, 2));
}
async function ready(page) {
  await page.locator('canvas[data-renderer="ready"]').waitFor({ timeout: 90000 });
  await page.locator('.experience-loading').waitFor({ state: 'hidden', timeout: 90000 });
  await delay(1800);
}
async function chapter(page, number) {
  await page.getByRole('button', { name: new RegExp('^Đến chương ' + number + ':') }).click();
  await page.waitForFunction(number => document.querySelector('[aria-current="step"]')?.getAttribute('aria-label')?.startsWith('Đến chương ' + number + ':'), number);
  await delay(1400);
}
async function score(page) { return Number((await page.getByTestId('safety-score').innerText()).split('/')[0]); }
async function screenshot(page, name) { await page.screenshot({ path: path.join(output, name), animations: 'disabled' }); }
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.SAFEHOME_BROWSER_EXECUTABLE ? { executablePath: process.env.SAFEHOME_BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  context.setDefaultNavigationTimeout(180000);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && /\.(glb|gltf|jpg|png|webp)/.test(response.url())) failedAssets.push(response.url()); });
  await check('Desktop house loads and renders actual WebGL pixels', async () => {
    await page.goto(base + '/experience', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await ready(page);
    const pixelCount = await page.locator('canvas').evaluate(canvas => {
      const copy = document.createElement('canvas'); copy.width = 80; copy.height = 60;
      const draw = copy.getContext('2d'); draw.drawImage(canvas, 0, 0, 80, 60);
      const data = draw.getImageData(0, 0, 80, 60).data; const colors = new Set();
      for (let index = 0; index < data.length; index += 4) colors.add([data[index] >> 3, data[index + 1] >> 3, data[index + 2] >> 3].join(','));
      return colors.size;
    });
    assert(pixelCount > 50, 'Canvas must contain rendered geometry, not a blank background');
    await screenshot(page, '01-home-reveal.png');
    return { distinctSampledColors: pixelCount, viewport: '1440x960', browser: await browser.version() };
  });
  await check('Scroll chapters and room selection', async () => {
    await chapter(page, 2);
    await page.getByRole('button', { name: 'Phòng ngủ chính', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Nội thất', exact: true }).getAttribute('aria-pressed'), 'true');
    await screenshot(page, '02-bedroom-interior.png');
    await page.getByLabel('Chọn không gian').selectOption('room-bedroom-01');
    await chapter(page, 3); await ready(page);
    previousScore = await score(page);
    assert(await page.locator('.experience-hotspot').count() > 0);
    return { unsafePresetScore: previousScore, hotspots: await page.locator('.experience-hotspot').count() };
  });
  await check('Risk hotspot selects an actual finding and evidence rule', async () => {
    await page.locator('.experience-hotspot').first().click();
    if (await page.locator('.inspector-evidence details').getAttribute('open') === null) await page.locator('.inspector-evidence summary').click();
    const rule = await page.locator('.inspector-evidence code').innerText();
    assert(rule.startsWith('RULE_'));
    assert((await page.locator('.experience-inspector h3').innerText()).length > 0);
    await screenshot(page, '03-risk-evidence.png');
    return { rule };
  });
  await check('Intervention recalculation and undo/redo', async () => {
    await chapter(page, 5);
    await page.getByRole('button', { name: 'Cố định thảm', exact: true }).click();
    nextScore = await score(page); assert(nextScore > previousScore);
    await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click(); assert.equal(await score(page), previousScore);
    await page.getByRole('button', { name: 'Làm lại', exact: true }).click(); assert.equal(await score(page), nextScore);
    await page.getByRole('button', { name: 'Thu gọn dây điện', exact: true }).click();
    nextScore = await score(page);
    return { before: previousScore, after: nextScore };
  });
  await check('Save and reload preserve scene identity and score', async () => {
    await page.getByRole('button', { name: 'Lưu trên thiết bị', exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('safehome:experience:room-bedroom-01')));
    assert.equal(saved.room.id, 'room-bedroom-01');
    await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
    await page.getByLabel('Chọn không gian').selectOption('room-bedroom-01');
    await chapter(page, 5);
    await page.getByRole('button', { name: 'Tải đã lưu', exact: true }).click();
    assert.equal(await score(page), nextScore);
    return { objectCount: saved.room.objects.length, restoredScore: nextScore, storage: 'browser-local' };
  });
  await check('Synchronized comparison slider and score difference', async () => {
    await chapter(page, 6);
    const slider = page.getByRole('slider', { name: 'Vị trí thanh so sánh trước sau' });
    await slider.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await slider.inputValue(), '51');
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(Number(await page.getByTestId('comparison-after-score').innerText()), nextScore);
    await screenshot(page, '04-before-after.png');
    return { slider: 51, canvases: 1, score: nextScore };
  });
  await check('Visual lighting does not change risk facts', async () => {
    const before = await score(page);
    await page.getByLabel('Ánh sáng mô phỏng').selectOption('NIGHT'); await delay(1000);
    assert.equal(await score(page), before);
    await page.getByLabel('Ánh sáng mô phỏng').selectOption('MORNING');
    return { unchangedScore: before };
  });
  await check('Top view and first-person movement respond to controls', async () => {
    await page.getByRole('button', { name: 'Mặt bằng', exact: true }).click(); await delay(2300);
    assert.equal(await page.getByRole('button', { name: 'Mặt bằng', exact: true }).getAttribute('aria-pressed'), 'true');
    await screenshot(page, '09-top-plan.png');
    await page.getByRole('button', { name: 'Đi bộ', exact: true }).click(); await delay(2300);
    await page.locator('.experience-shell').focus();
    const before = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
    let moved = false;
    for (const key of ['w', 'd', 'a', 's']) {
      await page.keyboard.down(key); await delay(350); await page.keyboard.up(key); await delay(300);
      if (await page.locator('canvas').evaluate(canvas => canvas.toDataURL()) !== before) { moved = true; break; }
    }
    assert(moved, 'First-person keyboard input should change the rendered view');
    await screenshot(page, '10-walkthrough.png');
    await page.getByRole('button', { name: 'Dollhouse', exact: true }).click();
  });
  await check('Keyboard chapter navigation and user-controlled playback', async () => {
    await page.locator('.experience-shell').focus(); await page.keyboard.press('Home'); await delay(1600);
    await page.keyboard.press('ArrowRight'); await delay(1600);
    assert((await page.locator('[aria-current="step"]').getAttribute('aria-label')).startsWith('Đến chương 2:'));
    await page.getByRole('button', { name: 'Phát hành trình', exact: true }).click();
    await page.getByRole('button', { name: 'Tạm dừng hành trình', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tạm dừng hành trình', exact: true }).click();
  });
  await check('WebGL context loss and recovery', async () => {
    const supported = await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2'); const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext(); setTimeout(() => extension.restoreContext(), 800); return true;
    });
    assert(supported, 'Context loss extension must be available to test recovery');
    await delay(1300); await ready(page);
    return { recovered: true };
  });
  await check('Apply scenario into existing Digital Twin and use editor comparison', async () => {
    await chapter(page, 6);
    await page.getByRole('button', { name: 'Áp dụng kịch bản này', exact: true }).click();
    await page.locator('.experience-back').click();
    await page.waitForURL('**/digital-twin', { timeout: 180000, waitUntil: 'domcontentloaded' });
    const closeIntro = page.getByTitle('Bỏ qua giới thiệu (Skip Intro)'); if (await closeIntro.isVisible()) await closeIntro.click();
    const compare = page.getByRole('button', { name: 'Trước/Sau', exact: true });
    await compare.click();
    const slider = page.getByRole('slider', { name: 'So sánh kịch bản trước sau' });
    await slider.waitFor({ timeout: 30000 });
    await screenshot(page, '05-workspace-comparison.png');
  });
  await check('Mobile touch layout, rendering and chapter navigation', async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    mobile.setDefaultNavigationTimeout(180000);
    const tab = await mobile.newPage(); await tab.goto(base + '/experience', { waitUntil: 'domcontentloaded' }); await ready(tab);
    assert.equal(await tab.getByLabel('Chất lượng đồ họa').inputValue(), 'LOW');
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    await screenshot(tab, '06-mobile-home.png');
    await chapter(tab, 5);
    await tab.locator('.experience-shell').evaluate(element => { element.scrollTop += 140; });
    await delay(600); await screenshot(tab, '07-mobile-simulation.png');
    await mobile.close(); return { viewport: '390x844', horizontalPageOverflow: overflow };
  });
  await check('Reduced-motion accessibility', async () => {
    const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    reduced.setDefaultNavigationTimeout(180000);
    const tab = await reduced.newPage(); await tab.goto(base + '/experience', { waitUntil: 'domcontentloaded' }); await ready(tab);
    assert(await tab.getByRole('button', { name: 'Phát hành trình', exact: true }).isDisabled());
    assert.equal(await tab.locator('.experience-shell').evaluate(element => getComputedStyle(element).scrollBehavior), 'auto');
    await chapter(tab, 3); await reduced.close();
  });
  await check('WebGL unavailable fallback remains useful', async () => {
    const noGL = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    noGL.setDefaultNavigationTimeout(180000);
    await noGL.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
    });
    const tab = await noGL.newPage(); await tab.goto(base + '/experience', { waitUntil: 'domcontentloaded' });
    await tab.getByText('Tiếp tục khám phá bằng dữ liệu', { exact: true }).waitFor({ timeout: 30000 });
    await screenshot(tab, '08-webgl-fallback.png');
    assert(await tab.getByRole('link', { name: 'Mở bảng đánh giá nguy cơ' }).isVisible());
    await noGL.close();
  });
  await check('No missing desktop assets or unexpected page errors', async () => { assert.deepEqual(failedAssets, []); assert.deepEqual(errors, []); });
  const report = { runAt: new Date().toISOString(), browser: await browser.version(), base, results, failedAssets, errors,
    limitations: ['Desktop/mobile FPS targets require measurements on physical target devices.', 'Mobile checks use browser emulation, not a physical mobile GPU.', 'WebGL screenshot checks verify rendering and interactions, not photographic equivalence.'] };
  fs.writeFileSync('docs/EXPERIENCE_BROWSER_RESULTS.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: results.filter(result => result.status === 'PASS').length, failed: results.filter(result => result.status === 'FAIL').length }));
  if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });

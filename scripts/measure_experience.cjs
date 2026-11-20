const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const base = process.env.SAFEHOME_PREVIEW_URL || 'http://localhost:3210';
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.SAFEHOME_BROWSER_EXECUTABLE ? { executablePath: process.env.SAFEHOME_BROWSER_EXECUTABLE } : {}) });
  const measurements = [];
  for (const profile of [
    { name: 'desktop-high', width: 1440, height: 960, quality: 'HIGH' },
    { name: 'desktop-low', width: 1440, height: 960, quality: 'LOW' },
    { name: 'mobile-emulation-low', width: 390, height: 844, quality: 'LOW' },
  ]) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(base + '/experience', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.locator('.experience-loading').waitFor({ state: 'hidden', timeout: 90000 });
    await page.getByLabel('Chất lượng đồ họa').selectOption(profile.quality);
    await page.waitForTimeout(4000);
    const result = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const duration = 5000, frames = []; const start = performance.now(); let previous = start;
      await new Promise(resolve => {
        function frame(time) { frames.push(time - previous); previous = time; if (time - start >= duration) resolve(); else requestAnimationFrame(frame); }
        requestAnimationFrame(frame);
      });
      const elapsed = previous - start;
      const sorted = [...frames].sort((a, b) => a - b);
      return { renderer, sampleDurationMs: Math.round(elapsed), frames: frames.length, meanRafFps: Number((frames.length * 1000 / elapsed).toFixed(1)), p95FrameMs: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(1)),
        canvasResolution: [canvas.width, canvas.height] };
    });
    measurements.push({ profile, ...result });
    console.log(JSON.stringify(measurements.at(-1)));
    await context.close();
  }
  fs.writeFileSync('docs/EXPERIENCE_PERFORMANCE.json', JSON.stringify({ runAt: new Date().toISOString(), browser: await browser.version(), measurements,
    caveats: ['Five-second requestAnimationFrame sampling in headless Edge on this execution host.', 'Not a physical midrange-mobile benchmark or a guarantee of presented GPU FPS.', 'Concurrent host/browser workloads affect these measurements.'] }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });

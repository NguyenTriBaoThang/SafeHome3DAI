/* Exercise the built Next server over loopback. No cloud calls, model downloads or DB writes. */
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const buildDirectory = process.env.SAFEHOME_BUILD_DIR || '.scratch/cinematic-production';
  const buildId = fs.readFileSync(path.join(buildDirectory, 'BUILD_ID'), 'utf8').trim();
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    env: { ...process.env, SAFEHOME_BUILD_DIR: buildDirectory, VISION_PROVIDER: 'local',
      LOCAL_DETECTOR_URL: 'http://127.0.0.1:1', NEXT_TELEMETRY_DISABLED: '1' },
  });
  // Drain output without recording environment or request details.
  server.stdout.resume(); server.stderr.resume();
  const base = `http://127.0.0.1:${port}`;
  const results = [];
  const jpeg = new Uint8Array([255, 216, 255, 224, 0, 2, 255, 217]);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw Error('Next server exited before becoming ready');
      try {
        const response = await fetch(`${base}/ai-vision`, { signal: AbortSignal.timeout(2000) });
        const html = await response.text();
        if (response.status === 200 && html.includes('SafeHome Vision Intelligence Studio')) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Built /ai-vision page must render');
    results.push({ name: 'built_photo_page', status: 'passed' });
    const scan = await fetch(`${base}/api/vision/scan-photo`, { method: 'POST', body: jpeg });
    assert.equal(scan.status, 503);
    const body = await scan.json();
    assert.equal(body.code, 'PROVIDER_UNAVAILABLE');
    assert.equal(body.detections, undefined);
    results.push({ name: 'offline_provider_returns_503_without_demo', status: 'passed' });
    const invalid = await fetch(`${base}/api/vision/scan-photo`, { method: 'POST', body: 'not an image' });
    assert.equal(invalid.status, 400);
    results.push({ name: 'invalid_image_returns_400', status: 'passed' });
    const oversized = await fetch(`${base}/api/vision/scan-photo`, { method: 'POST', body: new Uint8Array(10 * 1024 * 1024 + 1) });
    assert.equal(oversized.status, 413);
    results.push({ name: 'oversized_stream_returns_413', status: 'passed' });
    const analysis = await fetch(`${base}/api/vision/images/img-user-smoke/analyze`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBufferBase64: Buffer.from(jpeg).toString('base64'), caption: 'table' }) });
    assert.equal(analysis.status, 503);
    assert.equal((await analysis.json()).success, false);
    results.push({ name: 'analysis_failure_before_persistence', status: 'passed' });
    const output = { checked_at: new Date().toISOString(), build_id: buildId, build_directory: buildDirectory,
      checks: results, paid_api_calls: 0, onnx_inferences: 0, scope: 'Actual built Next server; local provider deliberately unreachable. No browser rendering or model inference.' };
    fs.mkdirSync('reports/stage6', { recursive: true });
    fs.writeFileSync('reports/stage6/http-smoke.json', JSON.stringify(output, null, 2) + '\n');
    console.log(JSON.stringify(output, null, 2));
  } finally {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    if (server.exitCode === null) { server.kill(); await stopped; }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

/* Exercise the built Next server over loopback. Authenticated requests use new disposable family databases; no cloud calls or model downloads. */
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
  const buildDirectory = process.env.SAFEHOME_BUILD_DIR || '.scratch/completion-production';
  const buildId = fs.readFileSync(path.join(buildDirectory, 'BUILD_ID'), 'utf8').trim();
  fs.mkdirSync('.scratch',{recursive:true});
  const privateDirectory=fs.mkdtempSync(path.resolve('.scratch/completion-http-'));
  const legacyRoot=path.resolve('public/uploads/vision');fs.mkdirSync(legacyRoot,{recursive:true});
  const legacyName='acceptance-'+require('node:crypto').randomUUID()+'.jpg',legacyFile=path.join(legacyRoot,legacyName);
  fs.writeFileSync(legacyFile,fs.readFileSync('public/reference/reference_room.jpg'),{flag:'wx'});
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    env: { ...process.env, SAFEHOME_PRIVATE_DIR:privateDirectory, SAFEHOME_APP_ORIGIN:base, SAFEHOME_BUILD_DIR: buildDirectory, VISION_PROVIDER: 'local',
      LOCAL_DETECTOR_URL: 'http://127.0.0.1:1', NEXT_TELEMETRY_DISABLED: '1' },
  });
  // Drain output without recording environment or request details.
  server.stdout.resume(); server.stderr.resume();
  const results = [];
  let cookie; const rawFetch=globalThis.fetch;
  const fetch=(url,init={})=>rawFetch(url,{...init,headers:{...Object.fromEntries(new Headers(init.headers)),...(cookie?{cookie}:{})}});
  const jpeg = new Uint8Array([255, 216, 255, 224, 0, 2, 255, 217]);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw Error('Next server exited before becoming ready');
      try {
        const response = await rawFetch(`${base}/api/auth/me`, { signal: AbortSignal.timeout(2000) });
        const html = await response.text();
        if (response.status === 401) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Built authenticated API must start');
    results.push({ name: 'anonymous_api_rejected', status: 'passed' });
    const signInHtml=await (await rawFetch(base+'/sign-in')).text();
    const scripts=[...signInHtml.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match=>match[1]);
    assert.ok(scripts.length>0);
    for(const src of scripts){const response=await rawFetch(new URL(src,base));assert.equal(response.status,200,src);assert.ok(response.headers.get('content-type')?.includes('javascript'),src+' must be JavaScript');}
    results.push({name:'anonymous_login_javascript_assets_available',status:'passed'});
    const registration=await rawFetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json',origin:base},body:JSON.stringify({email:'http@fixture.invalid',password:'HTTP-fixture-password-2026!',consent:true})});
    assert.equal(registration.status,201); cookie=registration.headers.get('set-cookie').split(';')[0];
    results.push({name:'real_registration',status:'passed'});
    const page=await fetch(base+'/ai-vision'); assert.equal(page.status,200);
    const crossOrigin=await fetch(base+'/api/vision/images/unknown',{method:'DELETE',headers:{origin:'https://attacker.invalid'}});
    assert.equal(crossOrigin.status,403); results.push({name:'cross_origin_rejected',status:'passed'});
    const switched=await fetch(base+'/api/vision/rooms/any/images',{headers:{'X-SafeHome-Account':'wrong-account'}});
    assert.equal(switched.status,403); results.push({name:'stale_browser_account_rejected',status:'passed'});
    for(const prefix of ['/uploads/vision/','/%75ploads/vision/','/uploads%2Fvision/','/%2575ploads/vision/']){
      const legacy=await fetch(base+prefix+legacyName); assert.ok([400,404].includes(legacy.status),'Private legacy image must be blocked: '+prefix);
    }
    results.push({name:'legacy_public_media_blocked',status:'passed'});
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
      body: JSON.stringify({ consent:true,imageBufferBase64: Buffer.from(jpeg).toString('base64'), caption: 'table' }) });
    assert.equal(analysis.status, 503);
    assert.equal((await analysis.json()).success, false);
    results.push({ name: 'analysis_failure_before_persistence', status: 'passed' });
    const output = { checked_at: new Date().toISOString(), build_id: buildId, build_directory: buildDirectory,
      checks: results, paid_api_calls: 0, onnx_inferences: 0, scope: 'Actual built Next server; local provider deliberately unreachable. No browser rendering or model inference.' };
    fs.mkdirSync('reports/completion', { recursive: true });
    fs.writeFileSync('reports/completion/http-smoke.json', JSON.stringify(output, null, 2) + '\n');
    console.log(JSON.stringify({checks:results.length,status:'passed'}));
  } finally {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    if (server.exitCode === null) { server.kill(); await stopped; }
    if(path.dirname(legacyFile)===legacyRoot&&fs.existsSync(legacyFile))fs.unlinkSync(legacyFile);
    if(cookie){
      const {archive}=require('../accounts/archive.cjs');
      const backup=privateDirectory+'-backup',restored=privateDirectory+'-restored';
      archive('backup',privateDirectory,backup); archive('restore',backup,restored);
      const {PrismaClient}=require('@prisma/client');
      const restoredAccounts=new PrismaClient({datasources:{db:{url:'file:'+path.join(restored,'accounts.db').replaceAll('\\','/')}}});
      const accounts=await restoredAccounts.$queryRawUnsafe('SELECT id FROM Account'); assert.equal(accounts.length,1); await restoredAccounts.$disconnect();
      const restoredFamily=new PrismaClient({datasources:{db:{url:'file:'+path.join(restored,'families',accounts[0].id,'family.db').replaceAll('\\','/')}}});
      assert.equal(await restoredFamily.roomImage.count(),0); await restoredFamily.$disconnect();
      fs.writeFileSync('reports/completion/restore.json',JSON.stringify({checked_at:new Date().toISOString(),status:'passed',scope:'Actual disposable account and family SQLite databases restored after stopping Next; not a backup of user data.'},null,2)+'\n');
      console.log('PASS offline_backup_restore_real_sqlite');
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

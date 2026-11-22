/* Real Chromium + built Next + isolated SQLite. Detector responses are explicit fixtures. */
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { createServer } = require('node:http');
const { PrismaClient } = require('@prisma/client');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const scratch = path.resolve('.scratch');
const output = path.resolve('data/review/qa_stage6');

async function main() {
  fs.mkdirSync(scratch, { recursive: true }); fs.mkdirSync(output, { recursive: true });
  const directory = fs.mkdtempSync(path.join(scratch, 'vision-browser-'));
  const databaseFile = path.join(directory, 'fixture.db'); fs.writeFileSync(databaseFile, '', { flag: 'wx' });
  const databaseUrl = 'file:' + databaseFile.replaceAll('\\', '/');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], {
    env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe', timeout: 60000, windowsHide: true,
  });
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  let fixtureCalls = 0, fixtureOffline = false, next, browser, socket;
  const checks = [], exceptions = [], uploads = [];
  const userDb = path.resolve('prisma/dev.db');
  const userDbHash = fs.existsSync(userDb) ? crypto.createHash('sha256').update(fs.readFileSync(userDb)).digest('hex') : null;
  const pass = name => { checks.push({ name, status: 'passed' }); console.log('PASS ' + name); };
  const categories = ['bed','chair','table','cabinet','nightstand','door','toilet','sink','bathtub','sofa','rug','electrical_cable','grab_bar','obstacle_route','threshold_step','lamp','light_switch','other'];
  const fixture = createServer(async (request, response) => {
    for await (const _ of request) { /* Drain actual uploaded image bytes. */ }
    fixtureCalls++;
    if (fixtureOffline) { response.writeHead(503); response.end(); return; }
    const labels = fixtureCalls > 1 ? ['toilet', 'sink'] : ['bed', 'rug'];
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ contract_version: 1, source: 'LOCAL_FINE_TUNED_DETECTOR', risk_supported: false,
      model_sha256: 'a'.repeat(64), trained_classes: categories, untrained_classes: [],
      objects: labels.map((category, i) => ({ category, confidence: .9,
        bbox: { xMin: .1 + i*.45, yMin: .2, xMax: .45 + i*.45, yMax: .8 } })) }));
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const buildDirectory = process.env.SAFEHOME_BUILD_DIR || '.scratch/cinematic-production';
  const browserBin = process.env.SAFEHOME_BROWSER_BIN || [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find(file => fs.existsSync(file));
  if (!browserBin) throw Error('A local Chromium browser is required for this explicit browser check');
  try {
    next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
      stdio: ['ignore','pipe','pipe'], windowsHide: true, env: { ...process.env, SAFEHOME_BUILD_DIR: buildDirectory,
        DATABASE_URL: databaseUrl, VISION_PROVIDER: 'local', LOCAL_DETECTOR_URL: `http://127.0.0.1:${fixture.address().port}`, NEXT_TELEMETRY_DISABLED: '1' },
    });
    next.stdout.resume(); next.stderr.resume();
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try { const res = await fetch(base+'/api/vision/rooms/room-bedroom-01/images', { signal: AbortSignal.timeout(1000) });
        if (res.ok) { assert.equal((await res.json()).data.length, 0, 'QA database must start empty'); ready = true; break; } } catch {}
      await pause(200);
    }
    assert.ok(ready, 'Next server must be ready with isolated database');
    const profile = path.join(directory, 'browser');
    browser = spawn(browserBin, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', '--user-data-dir='+profile, 'about:blank'], { stdio: 'ignore', windowsHide: true });
    const activePort = path.join(profile, 'DevToolsActivePort');
    for (let n=0; n<100 && !fs.existsSync(activePort); n++) await pause(200);
    const debug = 'http://127.0.0.1:'+fs.readFileSync(activePort, 'utf8').split(/\r?\n/)[0];
    const target = await (await fetch(debug+'/json/new?about:blank', { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.onopen=resolve; socket.onerror=reject; });
    let sequence=0; const pending=new Map();
    socket.onmessage=event => {
      const message=JSON.parse(event.data);
      if (message.id) { const item=pending.get(message.id); if (!item) return; clearTimeout(item.timer); pending.delete(message.id);
        message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result); }
      if (message.method==='Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    };
    const send=(method,params={}) => new Promise((resolve,reject) => {
      const id=++sequence; const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);
      pending.set(id,{resolve,reject,timer}); socket.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async expression => {
      const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if (result.exceptionDetails) throw Error(result.exceptionDetails.text+' '+result.result?.description);
      return result.result.value;
    };
    const wait=expression => evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>{if(${expression})return resolve(true);if(Date.now()-start>20000)return reject(Error('UI wait: '+${JSON.stringify(expression)}+' | '+document.querySelector('[role="status"]')?.textContent));setTimeout(poll,100)};poll()})`);
    const click=async selector => { assert.ok(await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`), 'Missing '+selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); };
    const button=async prefix => {
      const found=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(prefix)}));if(!b)return false;b.click();return true})()`);
      assert.ok(found,'Missing button '+prefix);
    };
    const upload=async () => {
      const doc=await send('DOM.getDocument'); const node=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#vision-file-upload-input'});
      const photo=path.resolve('public/reference/reference_room.jpg'); assert.ok(fs.existsSync(photo));
      await send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[]});
      await send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[photo]});
      await wait(`document.querySelector('[role="status"]')?.textContent.includes('Phân tích hoàn tất')`);
    };
    const getImages=async roomId => (await (await fetch(base+`/api/vision/rooms/${roomId}/images`)).json()).data;
    const choose=async (id,value) => {
      await button('Xác minh'); await wait(`document.querySelector('[data-question-id="${id}"]')`);
      await click(`[data-question-id="${id}"] [data-answer-value="${value}"]`);
      await wait(`document.querySelector('[data-question-id="${id}"] [data-answer-value="${value}"]')?.getAttribute('aria-pressed')==='true'`);
    };
    const reassess=async () => { await button('Đồng bộ Khảo sát AI'); await wait(`document.querySelector('[role="status"]')?.textContent.includes('Đã cập nhật kết quả')`); };
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    await send('Network.setBlockedURLs',{urls:['*images.unsplash.com*','*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:base+'/ai-vision'});
    await wait(`document.querySelector('[role="status"]')?.textContent.includes('Dữ liệu minh họa')`);
    assert.equal(await evaluate(`document.querySelector('header').textContent.includes('Điểm an toàn')`),false);
    assert.equal(await evaluate(`document.querySelector('header').textContent.includes('Lux')`),false);
    pass('photo_header_does_not_show_simulation_safety_score_or_lux');
    assert.equal(await db.roomImage.count(),0); pass('demo_does_not_persist_fake_detections');
    await upload();
    const bedroomImages=await getImages('room-bedroom-01'); assert.equal(bedroomImages.length,1,'One upload must create one photo');
    const bedroom=bedroomImages[0]; uploads.push(bedroom.storageKey);
    assert.equal(bedroom.latestAnalysis.detections.length,2);
    const imageResponse=await fetch(base+bedroom.fileUrl); assert.equal(imageResponse.status,200);
    await wait(`document.querySelector('img[alt="Room Analysis"]')?.naturalWidth>0`);
    pass('real_image_upload_persistence_and_display_with_fixture_detector');
    await button('Vật thể'); await click('button[title="Xác nhận đúng"]');
    await wait(`document.querySelector('[role="status"]')?.textContent.includes('Đã lưu xác nhận')`);
    assert.ok((await getImages('room-bedroom-01'))[0].latestAnalysis.detections.some(d=>d.verificationStatus==='CONFIRMED'));
    pass('detection_confirmation_persists');
    await click('button[title="Sửa nhãn"]');
    await wait(`document.querySelector('input[aria-label="Tên hiển thị tùy chỉnh"]')`);
    await evaluate(`(()=>{const el=document.querySelector('input[aria-label="Tên hiển thị tùy chỉnh"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Browser fixture label');el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await button('Lưu sửa đổi'); await wait(`document.querySelector('[role="status"]')?.textContent.includes('Đã lưu nhãn')`);
    assert.ok((await getImages('room-bedroom-01'))[0].latestAnalysis.detections.some(d=>d.userLabel==='Browser fixture label'));
    await wait(`document.querySelector('[data-detection-id]')?.textContent.includes('Đã điều chỉnh')`);
    pass('corrected_label_round_trips');
    await db.visionClarification.create({data:{roomId:'room-bedroom-01',surveyQuestionId:'BED_004',questionText:'Legacy QA fixture',
      optionsJson:'[]',status:'ANSWERED',userResponse:'INVALID_LEGACY_ENUM'}});
    await choose('BED_006','NO'); await reassess(); pass('legacy_invalid_answer_does_not_block_new_confirmation');
    await send('Page.reload'); await wait(`document.querySelector('[role="status"]')?.textContent.includes('Đã khôi phục')`);
    assert.equal(fixtureCalls,1); pass('reload_restores_saved_photo_without_new_inference');
    await button('Vật thể'); await wait(`document.body.textContent.includes('Browser fixture label')`);
    await choose('BED_006','UNKNOWN'); await reassess();
    const rug=await db.visionRoomFact.findUnique({where:{roomId_fieldPath:{roomId:'room-bedroom-01',fieldPath:'rugs.present'}}});
    assert.equal(rug.verificationStatus,'PENDING_REVIEW'); assert.equal(rug.confirmedValue,null);
    const rugSurvey=await db.surveyAnswer.findUnique({where:{roomId_questionId:{roomId:'room-bedroom-01',questionId:'BED_006'}}});
    assert.equal(rugSurvey.confirmationStatus,'UNKNOWN'); pass('unknown_edit_retracts_database_and_canonical_survey');
    await button('Nhà vệ sinh tầng 1'); await wait(`document.querySelector('[role="status"]')?.textContent.includes('Dữ liệu minh họa')`);
    await upload(); const bathroom=(await getImages('room-bathroom-01'))[0]; uploads.push(bathroom.storageKey);
    await choose('BATH_005','YES'); await choose('BATH_006','TOILET'); await reassess();
    const bath=JSON.parse((await db.surveyRoomProfile.findUnique({where:{roomId:'room-bathroom-01'}})).profileJson);
    assert.deepEqual(bath.grabBars.locations,['TOILET']);
    await wait(`document.body.textContent.includes('RISK-006')`); pass('single_grab_bar_location_remains_missing_other_location');
    await choose('BATH_005','UNKNOWN'); await reassess();
    const assessed=await (await fetch(base+'/api/vision/rooms/room-bathroom-01/reassess',{method:'POST'})).json();
    assert.equal(assessed.data.ruleEvaluations.find(r=>r.ruleId==='RISK-006').state,'NEEDS_VERIFICATION');
    assert.equal(assessed.data.safetyScore,null); pass('unknown_parent_does_not_produce_default_clinical_score');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,screenWidth:390,screenHeight:844,deviceScaleFactor:1,mobile:true});
    await send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await pause(300);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`)); pass('mobile_layout_has_no_horizontal_overflow');
    fs.writeFileSync(path.join(output,'mobile.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    fs.writeFileSync(path.join(output,'desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    fixtureOffline=true;
    await button('Phân tích lại'); await wait(`document.querySelector('[role="status"]')?.textContent.includes('Detector local chưa sẵn sàng')`);
    await button('Vật thể'); await wait(`document.body.textContent.includes('Chưa có vật thể nào được nhận diện')`);
    pass('inference_failure_clears_stale_visible_result');
    assert.equal(exceptions.length,0); pass('no_browser_runtime_exceptions');
    const userDbAfter = fs.existsSync(userDb) ? crypto.createHash('sha256').update(fs.readFileSync(userDb)).digest('hex') : null;
    assert.equal(userDbAfter,userDbHash); pass('user_database_bytes_unchanged');
    const report={checked_at:new Date().toISOString(),status:'passed',build_id:fs.readFileSync(path.join(buildDirectory,'BUILD_ID'),'utf8').trim(),
      checks, browser_runtime_exceptions:exceptions, fixture_detector_calls:fixtureCalls, paid_api_calls:0, real_onnx_inferences:0,
      scope:'Real browser, image file, Next API and isolated SQLite; detector output is a test fixture, no model accuracy claim.',
      user_database_unchanged:true,screenshots:['data/review/qa_stage6/desktop.png','data/review/qa_stage6/mobile.png']};
    fs.mkdirSync('reports/stage6',{recursive:true}); fs.writeFileSync('reports/stage6/browser.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,checks:checks.length,fixture_detector_calls:fixtureCalls}));
    await send('Browser.close').catch(()=>{});
  } finally {
    if(socket)socket.close();
    if(browser?.exitCode===null)browser.kill();
    if(next?.exitCode===null)next.kill();
    await new Promise(resolve=>fixture.close(resolve));
    for(const image of await db.roomImage.findMany().catch(()=>[])) uploads.push(image.storageKey);
    await db.$disconnect();
    const uploadRoot=path.resolve('public/uploads/vision');
    for(const name of uploads){const target=path.resolve(uploadRoot,path.basename(name));if(path.dirname(target)===uploadRoot&&fs.existsSync(target))fs.unlinkSync(target);}
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

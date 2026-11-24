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
const output = path.resolve('data/review/qa_completion');

async function main() {
  fs.mkdirSync(scratch, { recursive: true }); fs.mkdirSync(output, { recursive: true });
  const directory = fs.mkdtempSync(path.join(scratch, 'completion-browser-'));
  const privateDirectory = path.join(directory, 'private');
  let db;
  let cookieA, cookieB, accountA;
  const rawFetch = globalThis.fetch;
  const fetch = (url, init = {}) => rawFetch(url, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), ...(cookieA && String(url).startsWith(base) ? { cookie: cookieA } : {}) } });
  let fixtureCalls = 0, fixtureOffline = false, next, browser, socket;
  const checks = [], exceptions = [], uploads = [], networkErrors = [];
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
  const buildDirectory = process.env.SAFEHOME_BUILD_DIR || '.scratch/completion-production';
  const browserBin = process.env.SAFEHOME_BROWSER_BIN || [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find(file => fs.existsSync(file));
  if (!browserBin) throw Error('A local Chromium browser is required for this explicit browser check');
  try {
    next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
      stdio: ['ignore','pipe','pipe'], windowsHide: true, env: { ...process.env, SAFEHOME_BUILD_DIR: buildDirectory,
        SAFEHOME_PRIVATE_DIR: privateDirectory, SAFEHOME_APP_ORIGIN: base, VISION_PROVIDER: 'local', LOCAL_DETECTOR_URL: `http://127.0.0.1:${fixture.address().port}`, NEXT_TELEMETRY_DISABLED: '1' },
    });
    next.stdout.resume(); next.stderr.resume();
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try { const res = await rawFetch(base+'/api/auth/me', { signal: AbortSignal.timeout(1000) });
        if (res.status === 401) { ready = true; break; } } catch {}
      await pause(200);
    }
    assert.ok(ready, 'Next server must be ready with isolated database');
    for (const name of ['a', 'b']) {
      const response = await rawFetch(base+'/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json',origin:base}, body:JSON.stringify({email:name+'@browser-fixture.invalid',password:'Browser-fixture-password-2026!',consent:true}) });
      assert.equal(response.status,201,'Account registration must initialize a private database');
      const account=(await response.json()).account, cookie=response.headers.get('set-cookie').split(';')[0];
      if(name==='a'){accountA=account;cookieA=cookie;}else cookieB=cookie;
    }
    db=new PrismaClient({datasources:{db:{url:'file:'+path.join(privateDirectory,'families',accountA.id,'family.db').replaceAll('\\','/')}}});
    assert.equal(await db.roomImage.count(),0);
    pass('real_registration_creates_separate_family_databases');
    const profile = path.join(directory, 'browser');
    browser = spawn(browserBin, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', '--user-data-dir='+profile, 'about:blank'], { stdio: 'ignore', windowsHide: true });
    const activePort = path.join(profile, 'DevToolsActivePort');
    let debugPort;
    for(let n=0;n<200;n++){
      try {const value=fs.readFileSync(activePort,'utf8').split(/\r?\n/)[0];if(/^\d+$/.test(value)){debugPort=value;break;}}catch{}
      await pause(100);
    }
    assert.ok(debugPort,'Chromium DevTools port must be readable');
    const debug='http://127.0.0.1:'+debugPort;
    const target = await (await fetch(debug+'/json/new?about:blank', { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.onopen=resolve; socket.onerror=reject; });
    let sequence=0; const pending=new Map();
    socket.onmessage=event => {
      const message=JSON.parse(event.data);
      if (message.id) { const item=pending.get(message.id); if (!item) return; clearTimeout(item.timer); pending.delete(message.id);
        message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result); }
      if (message.method==='Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if(message.method==='Network.responseReceived' && message.params.response.status>=400)networkErrors.push({path:new URL(message.params.response.url).pathname,status:message.params.response.status});
    };
    const send=(method,params={}) => new Promise((resolve,reject) => {
      const id=++sequence; const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},method==='Runtime.evaluate'?55000:30000);
      pending.set(id,{resolve,reject,timer}); socket.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async expression => {
      const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if (result.exceptionDetails) throw Error(result.exceptionDetails.text+' '+result.result?.description);
      return result.result.value;
    };
    const wait=async (expression, navigationRetries=3) => {
      try { return await evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>{if(${expression})return resolve(true);if(Date.now()-start>45000)return reject(Error('UI wait: '+${JSON.stringify(expression)}+' | '+document.querySelector('[role="status"]')?.textContent));setTimeout(poll,100)};poll()})`); }
      catch(error){
        if(navigationRetries>0 && /Inspected target navigated|context was destroyed|Cannot find context/.test(error.message)){
          await pause(100);return wait(expression,navigationRetries-1);
        }
        const state=await evaluate(`({path:location.pathname,text:document.body.innerText.slice(0,2200),ready:document.readyState,next:Boolean(window.next),reactKeys:Object.keys(document.querySelector('form')||{}).filter(k=>k.startsWith('__react')),scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),resources:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').map(r=>({path:new URL(r.name).pathname,end:r.responseEnd,size:r.transferSize}))})`).catch(()=>({}));
        fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({...state,exceptions,networkErrors},null,2));
        const shot=await send('Page.captureScreenshot',{format:'png'}).catch(()=>null);
        if(shot)fs.writeFileSync(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));
        throw Error(error.message+' '+JSON.stringify({...state,exceptions,networkErrors}));
      }
    };
    const click=async selector => { assert.ok(await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`), 'Missing '+selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); };
    const button=async prefix => {
      const found=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(prefix)}));if(!b)return false;b.click();return true})()`);
      assert.ok(found,'Missing button '+prefix);
    };
    const upload=async () => {
      await evaluate(`(()=>{const el=document.querySelector('#vision-photo-consent');if(el&&!el.checked)el.click()})()`);
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
    await send('Page.navigate',{url:base+'/sign-in'});
    await wait(`document.querySelector('input[type="email"]')`);
    // SSR controls exist before React attaches its event handlers.
    await wait(`Object.keys(document.querySelector('form')||{}).some(key=>key.startsWith('__reactProps'))`);
    // Then verify a real state transition before typing.
    await button('Chưa có tài khoản?');
    await wait(`document.querySelector('input[autocomplete="new-password"]')`);
    await button('Đã có tài khoản?');
    await wait(`document.querySelector('input[autocomplete="current-password"]')`);
    await evaluate(`document.querySelector('input[type="email"]').focus()`);
    await send('Input.insertText',{text:'a@browser-fixture.invalid'});
    await evaluate(`document.querySelector('input[type="password"]').focus()`);
    await send('Input.insertText',{text:'Browser-fixture-password-2026!'});
    await button('Đăng nhập');
    await wait(`document.querySelector('[role="status"]')?.textContent.includes('Dữ liệu minh họa')`);
    assert.equal(await evaluate(`document.querySelector('header').textContent.includes('Điểm an toàn')`),false);
    assert.equal(await evaluate(`document.querySelector('header').textContent.includes('Lux')`),false);
    pass('real_login_form_opens_only_the_authenticated_family');
    assert.equal(await evaluate(`document.querySelector('aside')?.textContent.includes('Bác Nam')`),false);
    assert.ok(await evaluate(`document.querySelector('aside')?.textContent.includes('Gia đình của bạn')`));
    pass('sidebar_does_not_invent_a_patient_profile_for_the_account');

    pass('photo_header_does_not_show_simulation_safety_score_or_lux');
    assert.equal(await db.roomImage.count(),0); pass('demo_does_not_persist_fake_detections');
    await upload();
    const bedroomImages=await getImages('room-bedroom-01'); assert.equal(bedroomImages.length,1,'One upload must create one photo');
    const bedroom=bedroomImages[0]; uploads.push(bedroom.storageKey);
    assert.equal(bedroom.latestAnalysis.detections.length,2);
    const imageResponse=await fetch(base+bedroom.fileUrl); assert.equal(imageResponse.status,200);
    await wait(`document.querySelector('img[alt="Room Analysis"]')?.naturalWidth>0`);
    pass('real_image_upload_persistence_and_display_with_fixture_detector');
    assert.equal((await rawFetch(base+bedroom.fileUrl)).status,401);
    assert.equal((await rawFetch(base+bedroom.fileUrl,{headers:{cookie:cookieB}})).status,404);
    assert.equal((await rawFetch(base+'/api/vision/images/'+bedroom.id,{method:'DELETE',headers:{cookie:cookieB,origin:base}})).status,404);
    assert.equal((await rawFetch(base+'/uploads/vision/'+bedroom.storageKey,{headers:{cookie:cookieA}})).status,404);
    assert.equal((await rawFetch(base+'/_next/image?url='+encodeURIComponent('/uploads/vision/'+bedroom.storageKey)+'&w=640&q=75',{headers:{cookie:cookieA}})).status,404);
    pass('private_media_rejects_anonymous_other_family_and_public_optimizer_access');

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
    await button('Dựng Mô Phỏng');
    await wait(`location.pathname==='/digital-twin' && document.querySelector('header')?.textContent.includes('Bản dựng ước lượng')`);
    assert.equal(await evaluate(`document.querySelector('header').textContent.includes('Điểm an toàn')`),false);
    pass('photo_to_3d_keeps_unknown_assessment_and_hides_safety_score');
    await click('a[href="/risk-assessment"]');
    await wait(`location.pathname==='/risk-assessment' && document.querySelector('[data-testid="risk-photo-draft"]')`);
    assert.equal(await evaluate(`document.querySelector('header').textContent.includes('Điểm an toàn')`),false);
    pass('risk_dashboard_does_not_score_photo_geometry');
    await click('a[href="/analytics"]');
    await wait(`location.pathname==='/analytics' && document.body.textContent.includes('Chưa thể đối sánh')`);
    await click('a[href="/reports"]');
    await wait(`location.pathname==='/reports' && document.body.textContent.includes('Chưa đánh giá')`);
    await send('Browser.setDownloadBehavior',{behavior:'deny'});
    await evaluate(`(()=>{const original=URL.createObjectURL;URL.createObjectURL=function(blob){window.__acceptanceExport=blob;return original.call(URL,blob)}})()`);
    await button('Xuất JSON');
    const exported=await evaluate(`window.__acceptanceExport.text().then(JSON.parse)`);
    assert.equal(exported.safetyScore,null);assert.equal(exported.resident,null);
    assert.equal(exported.room.dimensions,null);assert.equal(exported.room.lightingLevel,null);
    assert.equal(exported.room.isWet,null);assert.equal(exported.room.isSlipResistant,null);
    assert.equal(exported.room.evidenceStatus,'PHOTO_DRAFT');
    pass('analytics_and_exported_report_keep_photo_measurements_and_score_unknown');

    await send('Page.navigate',{url:base+'/ai-vision'});
    await wait(`document.querySelector('[role="status"]')?.textContent.includes('Đã khôi phục')`);

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
    await click('button[title="Xóa ảnh này"]');
    await wait(`document.querySelector('[role="status"]')?.textContent.includes('Đã xóa ảnh')`);
    assert.equal((await getImages('room-bathroom-01')).length,0);
    await send('Page.reload'); await wait(`['Dữ liệu minh họa','Đã khôi phục'].some(text=>document.querySelector('[role="status"]')?.textContent.includes(text))`);
    assert.equal((await getImages('room-bathroom-01')).length,0);
    pass('delete_button_removes_photo_persistently_and_reload_does_not_restore_it');
    const created=await evaluate(`fetch('/api/simulations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Phòng fixture đã lưu',roomType:'BEDROOM'})}).then(r=>r.json())`);
    assert.equal(created.success,true);assert.ok(created.data.objects.length>0);
    const savedId=created.data.id;
    assert.equal((await rawFetch(base+'/api/simulations/'+savedId,{headers:{cookie:cookieB}})).status,404);
    await send('Page.navigate',{url:base+'/simulations'});
    await wait(`document.querySelector('[data-room-id="${savedId}"]')`);
    await click(`[data-room-id="${savedId}"]`);
    await wait(`location.pathname==='/digital-twin' && document.body.textContent.includes('Phòng fixture đã lưu')`);
    pass('archive_opens_persisted_objects_after_reload_and_rejects_other_family');
    for(const route of ['/dashboard','/risk-assessment','/ai-guided-survey','/ai-assistant','/knowledge','/workflow','/simulations']) {
      await send('Page.navigate',{url:base+route});
      await wait(`location.pathname===${JSON.stringify(route)} && document.querySelector('aside') && document.body.innerText.length>150`);
      await pause(300);
      assert.equal(await evaluate(`document.body.innerText.includes('Application error: a client-side exception')`),false,route);
    }
    assert.ok(await evaluate(`document.body.innerText.includes('Dữ liệu mẫu')`));
    pass('authenticated_main_pages_render_without_runtime_errors');
    await button('Đăng xuất');
    await wait(`location.pathname==='/sign-in' && document.querySelector('input[type="email"]')`);
    assert.equal(await evaluate(`fetch('/api/vision/rooms/r/images').then(r=>r.status)`),401);
    pass('logout_form_revokes_browser_session');
    assert.equal(exceptions.length,0); pass('no_browser_runtime_exceptions');
    const userDbAfter = fs.existsSync(userDb) ? crypto.createHash('sha256').update(fs.readFileSync(userDb)).digest('hex') : null;
    assert.equal(userDbAfter,userDbHash); pass('user_database_bytes_unchanged');
    const report={checked_at:new Date().toISOString(),status:'passed',build_id:fs.readFileSync(path.join(buildDirectory,'BUILD_ID'),'utf8').trim(),
      checks, browser_runtime_exceptions:exceptions, fixture_detector_calls:fixtureCalls, paid_api_calls:0, real_onnx_inferences:0,
      scope:'Real browser, image file, Next API and isolated SQLite; detector output is a test fixture, no model accuracy claim.',
      user_database_unchanged:true,screenshots:['data/review/qa_completion/desktop.png','data/review/qa_completion/mobile.png']};
    fs.mkdirSync('reports/completion',{recursive:true}); fs.writeFileSync('reports/completion/browser.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,checks:checks.length,fixture_detector_calls:fixtureCalls}));
    await send('Browser.close').catch(()=>{});
  } finally {
    if(socket)socket.close();
    if(browser?.exitCode===null)browser.kill();
    if(next?.exitCode===null)next.kill();
    await new Promise(resolve=>fixture.close(resolve));
    for(const image of await db?.roomImage.findMany().catch(()=>[]) || []) uploads.push(image.storageKey);
    await db?.$disconnect();
    const uploadRoot=path.join(privateDirectory,'families',accountA?.id || 'unused','images');
    for(const name of uploads){const target=path.resolve(uploadRoot,path.basename(name));if(path.dirname(target)===uploadRoot&&fs.existsSync(target))fs.unlinkSync(target);}
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

/* Read-only UI smoke check using an already running Chromium CDP endpoint.
 * Node 22+; no npm dependencies. Start a headless browser with a temporary
 * profile and --remote-debugging-port=9229. Never submits a scene decision.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.ML_REVIEW_URL || 'http://127.0.0.1:8765';
const debug = process.env.ML_BROWSER_DEBUG_URL || 'http://127.0.0.1:9229';
const output = path.resolve('data/review/qa');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const target = await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map(), exceptions = [], failedRequests = [], checks = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) return;
      clearTimeout(entry.timer); pending.delete(message.id);
      message.error ? entry.reject(Error(JSON.stringify(message.error))) : entry.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failedRequests.push(message.params.response.url);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = expression => evaluate(`new Promise((resolve,reject)=>{const started=Date.now();const poll=()=>{if(${expression})return resolve(true);if(Date.now()-started>10000)return reject(Error('UI wait timeout'));setTimeout(poll,100)};poll()})`);
  const screenshot = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
  };
  const pass = name => { checks.push(name); console.log('PASS: ' + name); };
  try {
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: base });
    await waitFor(`document.querySelector('#position')?.textContent.includes('/ 500')`);
    assert.equal(await evaluate(`document.querySelectorAll('#summary .stat').length`), 3);
    pass('500 pending images and three room summaries render');
    assert.equal(await evaluate(`!document.querySelector('#conceal').hidden && !document.querySelector('#photo').hasAttribute('src')`), true);
    pass('Metadata-sensitive first image is concealed and not fetched');
    await screenshot('desktop-concealed');
    await evaluate(`document.querySelector('#keep').click()`);
    assert.match(await evaluate(`document.querySelector('#message').textContent`), /Nhập tên/);
    pass('Missing reviewer prevents Keep; no real decision submitted');
    await evaluate(`document.querySelector('#room').value='bathroom';document.querySelector('#flag').value='clear';document.querySelector('#room').dispatchEvent(new Event('change'))`);
    await waitFor(`document.querySelector('#photo')?.complete && document.querySelector('#photo').naturalWidth>0`);
    const first = await evaluate(`document.querySelector('#image-id').textContent`);
    assert.match(first, /^bathroom_/);
    await evaluate(`document.querySelector('#next').click()`);
    assert.notEqual(await evaluate(`document.querySelector('#image-id').textContent`), first);
    await waitFor(`document.querySelector('#photo')?.complete && document.querySelector('#photo').naturalWidth>0`);
    pass('Room/flag filters, image decoding and navigation work');
    await screenshot('desktop-image');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true);
    pass('390px mobile layout has no horizontal overflow');
    await screenshot('mobile');
    assert.equal(exceptions.length, 0); assert.equal(failedRequests.length, 0);
    pass('No browser exceptions or failed HTTP resources');
    const state = await (await fetch(base + '/api/state')).json();
    assert.equal(state.revision, 0); assert.equal(state.items.some(item => item.review), false);
    pass('All 500 real images remain unreviewed after browser QA');
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ checks, exceptions, failedRequests }, null, 2));
  } finally {
    socket.close();
    await fetch(debug + '/json/close/' + target.id);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

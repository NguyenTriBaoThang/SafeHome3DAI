const { test } = require('node:test');
const assert = require('node:assert/strict');
const { predict, loadPipeline } = require('./baseline_bridge.cjs');
const input = { model: 'fixture-model', room: 'bedroom', imageId: 'fixture', imageBase64: 'Zml4dHVyZQ==', mimeType: 'image/jpeg' };

test('actual TS adapter and unchanged UI risk function run with mocked network', async () => {
  const previousFetch = global.fetch, previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fixture-placeholder';
  let request;
  global.fetch = async (url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ detections: [
      { category: 'rug', labelVi: 'Thảm trượt', box_2d: [100, 200, 500, 600], confidence: .85 },
    ] }) }] } }] }) };
  };
  try {
    const result = await predict(input, loadPipeline());
    assert.equal(result.modelUsed, input.model);
    assert.equal(result.detections[0].bbox.xMin, .2);
    assert.equal(result.risks['RISK-001'].present, true);
    assert.equal(request.generationConfig.responseMimeType, 'application/json');
    assert.equal(request.generationConfig.temperature, undefined);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  }
});

test('fallback is rejected even if it returns boxes', async () => {
  const pipeline = { analyze: async () => ({ modelUsed: 'intelligent-local-vision-engine', detections: [{ source: 'OBJECT_DETECTOR' }] }) };
  await assert.rejects(predict(input, pipeline), /NO_LIVE_INFERENCE/);
});

test('hallway risk stays unsupported/unknown, without relabeling the room', async () => {
  let options;
  const pipeline = { analyze: async (image, mime, supplied) => { options = supplied; return { modelUsed: input.model, detections: [], observations: [] }; },
    assess: () => { throw Error('Must not map hallway to bedroom'); } };
  const result = await predict({ ...input, room: 'hallway' }, pipeline);
  assert.equal(options.roomType, undefined);
  assert.equal(result.risk_supported, false);
  assert.deepEqual(result.risks, {});
});

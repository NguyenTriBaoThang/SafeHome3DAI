const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generate, servingSchema } = require('./experiment_bridge.cjs');

const input = { model: 'fixture', prompt: 'Inspect current image', schema: { type: 'object' },
  imageBase64: 'YQ==', mimeType: 'image/jpeg', seed: 17, temperature: .1, examples: [] };

test('serving schema keeps coordinate bounds, required and enums without a large array grammar', () => {
  const original = { type: 'array', maxItems: 200, items: { type: 'object', required: ['x'],
    properties: { x: { type: 'number', minimum: 0, maximum: 1 }, category: { type: 'string', enum: ['bed'] } } } };
  const slim = servingSchema(original);
  assert.equal(slim.maxItems, undefined);
  assert.deepEqual(slim.items.properties.x, { type: 'number', minimum: 0, maximum: 1 });
  assert.deepEqual(slim.items.properties.category.enum, ['bed']);
  assert.deepEqual(slim.items.required, ['x']);
  assert.equal(original.items.properties.x.maximum, 1);
});

test('few-shot sends actual train images and human answers before target image', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fixture-only';
  let received;
  class Client {
    models = { generateContent: async request => {
      received = request;
      return { candidates: [{ finishReason: 'STOP' }], text: '{"objects":[]}', modelVersion: 'fixture-version' };
    } };
  }
  try {
    const output = await generate({ ...input, examples: [{ split: 'train', prompt: 'Train example',
      imageBase64: 'Yg==', mimeType: 'image/jpeg', answer: { objects: [] } }] }, Client);
    assert.equal(received.contents.length, 3);
    assert.equal(received.contents[0].parts[1].inlineData.data, 'Yg==');
    assert.equal(received.contents[1].role, 'model');
    assert.equal(received.contents[2].parts[1].inlineData.data, 'YQ==');
    assert.equal(received.config.seed, 17);
    assert.equal(output.modelVersion, 'fixture-version');
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test('validation and test exemplars are rejected before client construction', async () => {
  for (const split of ['val', 'test']) {
    await assert.rejects(generate({ ...input, examples: [{ split, prompt: 'bad', imageBase64: 'Yg==', answer: {} }] },
      class Client { constructor() { assert.fail('Must not construct client'); } }), /INVALID_EXEMPLAR/);
  }
});

test('missing sampling settings cannot silently use provider defaults', async () => {
  await assert.rejects(generate({ ...input, seed: undefined }, class {}), /INVALID_INPUT/);
});

test('malformed stdin emits a sanitized code without echoing image or prompt', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'experiment_bridge.cjs')],
    { input: '{"prompt":"private-fixture-marker",bad-json', encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stderr), { error: 'API_OR_JSON_ERROR' });
  assert.equal(result.stdout, '');
  assert.ok(!result.stderr.includes('private-fixture-marker'));
});

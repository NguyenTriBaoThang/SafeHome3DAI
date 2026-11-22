const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('./gemini_prelabel.cjs');

const input = { model: 'fixture-model', prompt: 'Fixture prompt', imageBase64: 'Zml4dHVyZQ==',
  schema: { type: 'object' }, mimeType: 'image/jpeg', temperature: .1, seed: 20261122 };

async function withFixtureKey(action) {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fixture-placeholder';
  try { return await action(); }
  finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
}

test('SDK request includes JSON schema, low temperature, seed and actual image part', () => withFixtureKey(async () => {
  let captured;
  class FakeClient {
    constructor() { this.models = { generateContent: async request => {
      captured = request;
      return { text: '{"objects":[]}', candidates: [{ finishReason: 'STOP' }], modelVersion: 'fixture-v1' };
    } }; }
  }
  const result = await generate(input, FakeClient);
  assert.deepEqual(result.payload, { objects: [] });
  assert.deepEqual(captured.config.responseJsonSchema, input.schema);
  assert.equal(captured.config.responseMimeType, 'application/json');
  assert.equal(captured.config.temperature, .1);
  assert.equal(captured.config.seed, 20261122);
  assert.equal(captured.contents[0].parts[1].inlineData.data, input.imageBase64);
}));

test('Truncated/blocked response is rejected, never converted to empty detections', () => withFixtureKey(async () => {
  class FakeClient {
    constructor() { this.models = { generateContent: async () => ({ text: '{"objects":[]}', candidates: [{ finishReason: 'MAX_TOKENS' }] }) }; }
  }
  await assert.rejects(generate(input, FakeClient), /EMPTY_BLOCKED_OR_TRUNCATED/);
}));

test('Malformed JSON and non-low temperature fail instead of producing labels', () => withFixtureKey(async () => {
  class FakeClient {
    constructor() { this.models = { generateContent: async () => ({ text: 'not JSON', candidates: [{ finishReason: 'STOP' }] }) }; }
  }
  await assert.rejects(generate(input, FakeClient), SyntaxError);
  await assert.rejects(generate({ ...input, temperature: .8 }, FakeClient), /INVALID_INPUT/);
}));

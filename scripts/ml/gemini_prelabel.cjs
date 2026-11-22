/* Uses the existing @google/genai dependency. Image bytes arrive only on stdin. */
const fs = require('node:fs');

async function generate(input, Client) {
  if (!input || typeof input.model !== 'string' || !input.model || typeof input.prompt !== 'string' ||
      typeof input.imageBase64 !== 'string' || !input.schema || input.temperature < 0 || input.temperature > .3) {
    throw Error('INVALID_INPUT');
  }
  if (!Client) ({ GoogleGenAI: Client } = await import('@google/genai'));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Error('MISSING_API_KEY');
  const ai = new Client({ apiKey, httpOptions: { timeout: 60000 } });
  const response = await ai.models.generateContent({
    model: input.model,
    contents: [{ role: 'user', parts: [{ text: input.prompt }, { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } }] }],
    config: { responseMimeType: 'application/json', responseJsonSchema: input.schema,
      temperature: input.temperature, seed: input.seed, maxOutputTokens: 10000 },
  });
  if (response.candidates?.[0]?.finishReason !== 'STOP' || !response.text) throw Error('EMPTY_BLOCKED_OR_TRUNCATED');
  return { payload: JSON.parse(response.text), modelVersion: response.modelVersion || input.model,
    usageMetadata: response.usageMetadata || null };
}

if (require.main === module) {
  (async () => {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    process.stdout.write(JSON.stringify(await generate(input)));
  })().catch(error => {
    // SDK exceptions can include request details. Never print raw errors or keys.
    const known = new Set(['INVALID_INPUT', 'MISSING_API_KEY', 'EMPTY_BLOCKED_OR_TRUNCATED']);
    const code = known.has(error.message) ? error.message : error.code === 'ERR_MODULE_NOT_FOUND' ? 'SDK_NOT_INSTALLED' : 'API_OR_JSON_ERROR';
    process.stderr.write(JSON.stringify({ error: code, status: Number.isInteger(error.status) ? error.status : null }) + '\n');
    process.exitCode = 1;
  });
}
module.exports = { generate };

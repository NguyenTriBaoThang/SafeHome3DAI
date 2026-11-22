/* Stage 4 multimodal few-shot bridge; no fallback and no image/key in argv or logs. */
const fs = require('node:fs');

// Serving constraints can exceed Gemini's grammar budget on the 8-risk schema.
// Keep shape/enums/types and coordinate bounds on the wire; the Python contract
// still enforces nonempty evidence and the array limit on returned JSON.
function servingSchema(value) {
  if (Array.isArray(value)) return value.map(servingSchema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['minLength', 'maxItems'].includes(key))
    .map(([key, child]) => [key, servingSchema(child)]));
}

async function generate(input, Client) {
  if (!input?.model || !input.prompt || !input.schema || !input.imageBase64 ||
      !Number.isInteger(input.seed) || !Number.isFinite(input.temperature) ||
      input.temperature < 0 || input.temperature > .3 || !Array.isArray(input.examples)) throw Error('INVALID_INPUT');
  const contents = [];
  for (const example of input.examples) {
    if (example.split !== 'train' || !example.imageBase64 || !example.answer || !example.prompt) throw Error('INVALID_EXEMPLAR');
    contents.push({ role: 'user', parts: [{ text: example.prompt },
      { inlineData: { mimeType: example.mimeType, data: example.imageBase64 } }] });
    contents.push({ role: 'model', parts: [{ text: JSON.stringify(example.answer) }] });
  }
  contents.push({ role: 'user', parts: [{ text: input.prompt },
    { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } }] });
  if (!Client) ({ GoogleGenAI: Client } = await import('@google/genai'));
  if (!process.env.GEMINI_API_KEY) throw Error('MISSING_API_KEY');
  const ai = new Client({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 60000 } });
  const response = await ai.models.generateContent({ model: input.model, contents,
    config: { responseMimeType: 'application/json', responseJsonSchema: servingSchema(input.schema),
      seed: input.seed, temperature: input.temperature, maxOutputTokens: 10000 } });
  if (response.candidates?.[0]?.finishReason !== 'STOP' || !response.text) throw Error('EMPTY_BLOCKED_OR_TRUNCATED');
  return { payload: JSON.parse(response.text), modelVersion: response.modelVersion || input.model,
    usageMetadata: response.usageMetadata || null };
}

if (require.main === module) {
  (async () => {
    process.stdout.write(JSON.stringify(await generate(JSON.parse(fs.readFileSync(0, 'utf8')))));
  })().catch(error => {
    const known = new Set(['INVALID_INPUT', 'INVALID_EXEMPLAR', 'MISSING_API_KEY', 'EMPTY_BLOCKED_OR_TRUNCATED']);
    process.stderr.write(JSON.stringify({ error: known.has(error.message) ? error.message :
      error.code === 'ERR_MODULE_NOT_FOUND' ? 'SDK_NOT_INSTALLED' : 'API_OR_JSON_ERROR' }) + '\n');
    process.exitCode = 1;
  });
}
module.exports = { generate, servingSchema };

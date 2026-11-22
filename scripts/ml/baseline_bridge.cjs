/* Execute the same TypeScript Gemini adapter and photo-risk function used by the UI.
 * No new runtime dependencies; TypeScript is already a project devDependency.
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');

function loadPipeline() {
  const ts = require('typescript');
  const originalResolve = Module._resolveFilename;
  const originalTs = require.extensions['.ts'];
  Module._resolveFilename = function (request, ...args) {
    return originalResolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...args);
  };
  require.extensions['.ts'] = (mod, filename) => {
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: filename,
    }).outputText;
    mod._compile(code, filename);
  };
  try {
    return {
      analyze: require(path.join(root, 'src/lib/vision/geminiVisionAdapter.ts')).analyzeRoomPhotoWithGemini,
      assess: require(path.join(root, 'src/lib/vision/imageRiskAssessment.ts')).computeImageRiskAssessment,
    };
  } finally {
    Module._resolveFilename = originalResolve;
    if (originalTs) require.extensions['.ts'] = originalTs; else delete require.extensions['.ts'];
  }
}

async function predict(input, pipeline) {
  if (!input || !['bedroom', 'bathroom', 'hallway'].includes(input.room) ||
      typeof input.model !== 'string' || !input.model || typeof input.imageBase64 !== 'string') throw Error('INVALID_INPUT');
  const previousModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = input.model;
  const saved = { warn: console.warn, error: console.error, log: console.log };
  console.warn = console.error = console.log = () => {};
  try {
    pipeline ||= loadPipeline();
    const roomType = input.room === 'hallway' ? undefined : input.room.toUpperCase();
    const result = await pipeline.analyze(Buffer.from(input.imageBase64, 'base64'), input.mimeType || 'image/jpeg', {
      roomType, imageId: input.imageId, analysisId: 'baseline-' + input.imageId, isCustom: true,
    });
    if (result.modelUsed !== input.model || result.detections.some(det => det.source !== 'VISION_LANGUAGE_MODEL')) throw Error('NO_LIVE_INFERENCE');
    const snapshot = roomType ? pipeline.assess(roomType, result.detections, result.observations) : null;
    const risks = {};
    if (snapshot) for (const rule of snapshot.ruleEvaluations) {
      risks[rule.ruleId] = { present: rule.state === 'DETECTED' ? true : rule.state === 'NOT_DETECTED' ? false : 'unknown',
        state: rule.state, severity: rule.priority, evidence: rule.evidence };
    }
    return { modelUsed: result.modelUsed, detections: result.detections, risks,
      risk_supported: Boolean(snapshot), unsupported_reason: snapshot ? null : 'Current photo UI supports bedroom/bathroom, not hallway',
      provenance: 'existing Gemini room adapter + unchanged UI photo-risk helper' };
  } finally {
    Object.assign(console, saved);
    if (previousModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = previousModel;
  }
}

if (require.main === module) {
  (async () => process.stdout.write(JSON.stringify(await predict(JSON.parse(fs.readFileSync(0, 'utf8'))))))()
    .catch(error => {
      const code = ['INVALID_INPUT', 'NO_LIVE_INFERENCE'].includes(error.message) ? error.message : 'BASELINE_INFERENCE_FAILED';
      process.stderr.write(JSON.stringify({ error: code }) + '\n'); process.exitCode = 1;
    });
}
module.exports = { predict, loadPipeline };

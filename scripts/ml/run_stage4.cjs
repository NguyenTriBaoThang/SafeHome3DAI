/* Load local project configuration into this process, then run the existing guarded CLI.
 * Never prints .env contents or passes credentials as command-line arguments.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadEnvFile } = require('node:process');

function launch(args, dependencies = {}) {
  const root = path.resolve(__dirname, '../..');
  const exists = dependencies.exists || fs.existsSync;
  const load = dependencies.load || loadEnvFile;
  const spawn = dependencies.spawn || spawnSync;
  // Existing process environment wins; local configuration precedes base configuration.
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (exists(file)) load(file);
  }
  if (!process.env.GEMINI_API_KEY && process.env.GOOGLE_API_KEY) process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
  const localPython = path.join(root, '.venv-ml', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const python = exists(localPython) ? localPython : 'python';
  const exploratory = args[0] === '--exploratory';
  const result = spawn(python, [path.join(__dirname, exploratory ? 'explore_stage4.py' : 'experiment_stage4.py'),
    ...args.slice(exploratory ? 1 : 0)],
    { cwd: root, env: process.env, stdio: 'inherit', shell: false });
  if (result.error) throw Error('STAGE4_PYTHON_LAUNCH_FAILED');
  return result.status ?? 2;
}

if (require.main === module) {
  try { process.exitCode = launch(process.argv.slice(2)); }
  catch { process.stderr.write('Stage 4 configuration or Python launcher failed; no credentials logged.\n'); process.exitCode = 2; }
}
module.exports = { launch };

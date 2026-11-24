const { spawn } = require('node:child_process');
const mode = process.argv[2] || 'dev';
if (!['dev', 'build', 'start'].includes(mode)) throw new Error('Expected dev, build or start');
const args = [require.resolve('next/dist/bin/next'), mode];
if (mode === 'build') args.push('--no-lint');
else args.push('-p', process.env.SAFEHOME_PREVIEW_PORT || '3210');
const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: { ...process.env, SAFEHOME_BUILD_DIR: process.argv[3] || process.env.SAFEHOME_BUILD_DIR || (mode === 'dev' ? '.scratch/cinematic-dev' : '.scratch/cinematic-production') },
});
child.on('exit', code => { process.exitCode = code || 0; });

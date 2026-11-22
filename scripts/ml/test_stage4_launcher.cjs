const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { launch } = require('./run_stage4.cjs');

test('launcher loads local configuration first and passes credentials only through environment', () => {
  const loaded = [];
  const code = launch(['val', '--dry-run'], {
    exists: () => true,
    load: file => loaded.push(path.basename(file)),
    spawn: (python, args, options) => {
      assert.ok(!args.some(arg => arg.includes('API_KEY')));
      assert.deepEqual(args.slice(1), ['val', '--dry-run']);
      assert.equal(options.shell, false);
      assert.equal(options.env, process.env);
      return { status: 2 };
    },
  });
  assert.deepEqual(loaded, ['.env.local', '.env']);
  assert.equal(code, 2);
});

test('launcher does not hide child failures or launch failures', () => {
  assert.equal(launch([], { exists: () => false, spawn: () => ({ status: 7 }) }), 7);
  assert.throws(() => launch([], { exists: () => false, spawn: () => ({ error: Error('fixture') }) }), /STAGE4_PYTHON_LAUNCH_FAILED/);
});

test('AI exploration explicitly routes to a separate runner', () => {
  launch(['--exploratory', 'val'], { exists: () => false, spawn: (python, args) => {
    assert.equal(path.basename(args[0]), 'explore_stage4.py');
    assert.deepEqual(args.slice(1), ['val']);
    return { status: 0 };
  } });
});

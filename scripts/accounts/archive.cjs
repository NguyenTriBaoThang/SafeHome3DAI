/* Offline, checked file copies. Never overwrites or deletes an existing destination. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function within(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || path.isAbsolute(relative)) throw Error('Invalid archive path');
  const target = path.resolve(root, relative), rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Path escapes archive root');
  return target;
}
function sourceFile(root, relative) {
  const resolved = fs.realpathSync(within(root, relative)), rel = path.relative(root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Source link escapes archive root');
  return resolved;
}
function entries(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error('Symbolic links are not allowed in household archives');
    return entry.isDirectory() ? entries(root, file) : [{ path: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(file)), size: fs.statSync(file).size }];
  });
}
function archive(mode, source, destination) {
  source = fs.realpathSync(source); destination = path.resolve(destination);
  const relative = path.relative(source, destination);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) throw Error('Destination must be outside the source');
  if (fs.existsSync(destination)) throw Error('Destination already exists; refusing to overwrite');
  let manifest;
  if (mode === 'backup') {
    if (!fs.existsSync(path.join(source, 'accounts.db'))) throw Error('Missing accounts.db');
    manifest = { version: 1, created_at: new Date().toISOString(), consistency: 'application stopped by operator', files: entries(source) };
  } else if (mode === 'restore') {
    manifest = JSON.parse(fs.readFileSync(path.join(source, 'archive-manifest.json'), 'utf8'));
    if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw Error('Invalid archive manifest');
    const names = new Set();
    for (const file of manifest.files) {
      if (names.has(file.path)) throw Error('Duplicate archive path'); names.add(file.path);
      const bytes = fs.readFileSync(sourceFile(source, file.path));
      if (hash(bytes) !== file.sha256 || bytes.length !== file.size) throw Error('Archive checksum mismatch');
    }
    if (!names.has('accounts.db')) throw Error('Archive has no account database');
  } else throw Error('Expected backup or restore');
  // Validate all paths before creating the destination, including for backup.
  for (const file of manifest.files) { within(source, file.path); within(destination, file.path); }
  fs.mkdirSync(destination, { mode: 0o700 });
  for (const file of manifest.files) {
    const target = within(destination, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    const bytes = fs.readFileSync(sourceFile(source, file.path));
    if (hash(bytes) !== file.sha256 || bytes.length !== file.size) throw Error('Source changed during archive operation');
    fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
    fs.chmodSync(target, 0o600);
  }
  if (mode === 'backup') fs.writeFileSync(path.join(destination, 'archive-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { mode, files: manifest.files.length, verified: true };
}
module.exports = { archive };
if (require.main === module) {
  const args = process.argv.slice(2), mode = args[0];
  const get = name => args[args.indexOf(name) + 1];
  try {
    if (!args.includes('--offline') || !args.includes('--source') || !args.includes('--destination')) throw Error('Stop the application, then pass backup|restore --source PATH --destination NEW_PATH --offline');
    console.log(JSON.stringify(archive(mode, get('--source'), get('--destination'))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vm from 'node:vm';

const execFileAsync = promisify(execFile);

const [html, js, readme] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('js/main.js', 'utf8'),
  readFile('README.md', 'utf8'),
]);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const capture = (pattern, source) => [...source.matchAll(pattern)].map((match) => match[1]);
const unique = (values) => [...new Set(values)];

function extractSpec(source) {
  const start = source.indexOf('const SPEC = ');
  assert(start >= 0, 'SPEC declaration is missing');
  const objectStart = source.indexOf('{', start);
  let depth = 0;

  for (let index = objectStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return vm.runInNewContext(`(${source.slice(objectStart, index + 1)})`);
  }
  throw new Error('SPEC object is not closed');
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} function is missing`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} function is not closed`);
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const isHigh = code >= 0xd800 && code <= 0xdbff;
    const isLow = code >= 0xdc00 && code <= 0xdfff;
    if (isHigh) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (isLow) {
      return true;
    }
  }
  return false;
}

const spec = extractSpec(js);
const htmlRoles = unique(capture(/data-role="([^"]+)"/g, html));
const htmlFields = unique(capture(/data-field="([^"]+)"/g, html));
const htmlActions = unique(capture(/data-action="([^"]+)"/g, html));
const jsRoles = unique(capture(/querySelector\('\[data-role="([^"]+)"\]'\)/g, js));
const jsFields = unique(capture(/querySelector\('\[data-field="([^"]+)"\]'\)/g, js));
const handledActions = unique([
  ...capture(/case '([^']+)':/g, js),
  ...capture(/explicit === '([^']+)'/g, js),
]);

for (const role of jsRoles) assert(htmlRoles.includes(role), `Missing data-role="${role}"`);
for (const field of jsFields) assert(htmlFields.includes(field), `Missing data-field="${field}"`);
for (const action of htmlActions) assert(handledActions.includes(action), `Unhandled data-action="${action}"`);

assert(spec.slug === 'pitch-canvas-lite', 'SPEC slug must match the repo');
assert(spec.categories?.length >= 4, 'Pitch canvas needs at least four block categories');
assert(spec.states?.includes('Delivered'), 'States must include Delivered');
assert(spec.completedStates.every((state) => spec.states.includes(state)), 'Completed states must be valid states');
assert(spec.metric.min < spec.metric.max, 'Metric bounds must be ordered');
assert(spec.metric.default >= spec.metric.min && spec.metric.default <= spec.metric.max, 'Metric default is out of bounds');
assert(spec.items?.length >= 3, 'Sample board should include at least three pitch blocks');

for (const [index, item] of spec.items.entries()) {
  assert(spec.categories.includes(item.category), `Sample item ${index + 1} has an unknown category`);
  assert(spec.states.includes(item.state), `Sample item ${index + 1} has an unknown state`);
  assert(item.metric >= spec.metric.min && item.metric <= spec.metric.max, `Sample item ${index + 1} metric is out of bounds`);
}

assert(spec.actions.every((action) => action.id && action.label && action.mode), 'Every quick action needs an id, label, and mode');
assert(js.includes('const MAX_IMPORT_BYTES = 5 * 1024 * 1024;'), 'Import byte cap changed unexpectedly');
assert(js.includes('const MAX_IMPORT_ITEMS = 1000;'), 'Import item cap changed unexpectedly');
assert(js.includes('function normalizeItems(items = [])'), 'Imported pitch blocks should normalize as a collection');
assert(js.includes('const usedIds = new Set();'), 'Imported pitch blocks should guard duplicate ids');
assert(js.includes('normalizeText(item.title'), 'Imported text fields should be normalized defensively');

const normalizeText = vm.runInNewContext(`(${extractFunction(js, 'normalizeText')})`);
const emojiTitle = `A${'🚀'.repeat(64)}`;
assert(normalizeText(emojiTitle, 'fallback', 120) === emojiTitle, 'normalizeText must count emoji as whole characters, not UTF-16 code units, when checking the length cap');
const oversizedEmojiNote = '🚀'.repeat(200);
const truncatedEmojiNote = normalizeText(oversizedEmojiNote, 'fallback', 120);
assert(!hasLoneSurrogate(truncatedEmojiNote), 'normalizeText must not cut a surrogate pair in half when truncating long input');
assert(truncatedEmojiNote === '🚀'.repeat(120), 'normalizeText should keep exactly maxLength whole characters when truncation is needed');
assert(readme.includes('npm run verify'), 'README should document npm run verify');
assert(readme.includes('example:backup'), 'README should document the runnable import example');
assert(readme.includes('example:brief'), 'README should document the rehearsal brief example');

const { stdout: exampleStdout } = await execFileAsync(process.execPath, ['examples/investor-review-backup.mjs']);
const exampleBackup = JSON.parse(exampleStdout);
assert(exampleBackup.schema === `${spec.slug}/v3`, 'Example backup schema must match the app import schema');
assert(Array.isArray(exampleBackup.items), 'Example backup must include an items array');
assert(exampleBackup.items.length >= 3, 'Example backup should include at least three pitch blocks');
assert(exampleBackup.items.every((item) => spec.categories.includes(item.category)), 'Example backup contains an unknown category');
assert(exampleBackup.items.every((item) => spec.states.includes(item.state)), 'Example backup contains an unknown state');

const { stdout: briefStdout } = await execFileAsync(process.execPath, ['examples/rehearsal-brief.mjs'], { input: exampleStdout });
assert(briefStdout.includes('# Investor review pitch canvas'), 'Rehearsal brief should include the imported board title');
assert(briefStdout.includes('Focus queue: 3 active pitch blocks'), 'Rehearsal brief should count active pitch blocks');
assert(briefStdout.includes('Pain narrative opening'), 'Rehearsal brief should surface the top pitch block');

console.log(`Verified ${spec.title}: ${spec.items.length} sample pitch blocks, ${jsRoles.length} DOM roles, ${htmlActions.length} page actions.`);

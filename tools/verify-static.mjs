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
assert(readme.includes('npm run verify'), 'README should document npm run verify');
assert(readme.includes('example:backup'), 'README should document the runnable import example');

const { stdout: exampleStdout } = await execFileAsync(process.execPath, ['examples/investor-review-backup.mjs']);
const exampleBackup = JSON.parse(exampleStdout);
assert(exampleBackup.schema === `${spec.slug}/v3`, 'Example backup schema must match the app import schema');
assert(Array.isArray(exampleBackup.items), 'Example backup must include an items array');
assert(exampleBackup.items.length >= 3, 'Example backup should include at least three pitch blocks');
assert(exampleBackup.items.every((item) => spec.categories.includes(item.category)), 'Example backup contains an unknown category');
assert(exampleBackup.items.every((item) => spec.states.includes(item.state)), 'Example backup contains an unknown state');

console.log(`Verified ${spec.title}: ${spec.items.length} sample pitch blocks, ${jsRoles.length} DOM roles, ${htmlActions.length} page actions.`);

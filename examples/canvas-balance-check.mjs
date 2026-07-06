import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const REQUIRED_CATEGORIES = ['Problem', 'Proof', 'Offer', 'Close'];
const POLISHED_STATES = new Set(['Rehearsed', 'Delivered']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let input = '';
    let fallback;
    const finish = (value) => {
      clearTimeout(fallback);
      process.stdin.removeAllListeners('data');
      process.stdin.removeAllListeners('end');
      process.stdin.pause();
      resolve(value);
    };
    fallback = setTimeout(() => finish(''), 50);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; clearTimeout(fallback); });
    process.stdin.on('end', () => finish(input.trim()));
  });
}

async function loadBackup() {
  const stdin = await readStdin();
  if (stdin) return JSON.parse(stdin);
  const { stdout } = await execFileAsync(process.execPath, ['examples/investor-review-backup.mjs']);
  return JSON.parse(stdout);
}

function auditCategories(backup) {
  assert(backup?.schema === 'pitch-canvas-lite/v3', 'Expected a pitch-canvas-lite/v3 backup');
  assert(Array.isArray(backup.items), 'Backup is missing an items array');

  return REQUIRED_CATEGORIES.map((category) => {
    const items = backup.items.filter((item) => item.category === category);
    const polished = items.filter((item) => POLISHED_STATES.has(item.state));
    return { category, count: items.length, polished: polished.length };
  });
}

function formatReport(rows) {
  const missing = rows.filter((row) => row.count === 0);
  const unpolished = rows.filter((row) => row.count > 0 && row.polished === 0);
  const lines = ['# Pitch canvas balance check', ''];

  for (const row of rows) {
    const flag = row.count === 0 ? ' -- MISSING' : row.polished === 0 ? ' -- nothing rehearsed yet' : '';
    lines.push(`${row.category}: ${row.count} block${row.count === 1 ? '' : 's'}, ${row.polished} rehearsed or delivered${flag}`);
  }

  lines.push('');
  if (missing.length) {
    lines.push(`Blocked: ${missing.map((row) => row.category).join(', ')} has no pitch block yet. A pitch cannot ship without every category covered.`);
  } else if (unpolished.length) {
    lines.push(`Warning: ${unpolished.map((row) => row.category).join(', ')} has no rehearsed or delivered block yet.`);
  } else {
    lines.push('Balanced: every category has at least one rehearsed or delivered pitch block.');
  }

  return { text: lines.join('\n'), blocked: missing.length > 0 };
}

try {
  const rows = auditCategories(await loadBackup());
  const { text, blocked } = formatReport(rows);
  console.log(text);
  if (blocked) process.exitCode = 1;
} catch (error) {
  console.error(`Could not audit canvas balance: ${error.message}`);
  process.exitCode = 1;
}

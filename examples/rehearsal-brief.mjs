import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const allowedCategories = new Set(['Problem', 'Proof', 'Offer', 'Close']);
const activeStates = new Set(['Draft', 'Sharpening', 'Rehearsed']);
const stateWeights = { Draft: 2, Sharpening: 7, Rehearsed: 10 };

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

function daysUntil(value, anchor = '2026-05-01') {
  const target = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return 999;
  return Math.round((target - new Date(`${anchor}T00:00:00Z`)) / 86400000);
}

function priority(item) {
  const dueBoost = Math.max(0, 4 - Math.max(daysUntil(item.date), 0)) * 4;
  return item.score * 6 + item.metric * 5 + dueBoost + (stateWeights[item.state] ?? 0) - item.effort * 4;
}

function cleanText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeItem(item, index) {
  assert(item && typeof item === 'object' && !Array.isArray(item), `Item ${index + 1} is not an object`);
  assert(allowedCategories.has(item.category), `Item ${index + 1} uses an unknown category`);
  assert(activeStates.has(item.state) || item.state === 'Delivered', `Item ${index + 1} uses an unknown state`);
  return {
    title: cleanText(item.title, `Pitch block ${index + 1}`),
    category: item.category,
    state: item.state,
    score: Number(item.score) || 1,
    effort: Number(item.effort) || 10,
    metric: Number(item.metric) || 1,
    textOne: cleanText(item.textOne, 'Audience unclear'),
    textTwo: cleanText(item.textTwo, 'Proof missing'),
    note: cleanText(item.note, 'Tighten the pitch angle.'),
    date: cleanText(item.date, 'No date'),
  };
}

function buildBrief(backup) {
  assert(backup?.schema === 'pitch-canvas-lite/v3', 'Expected a pitch-canvas-lite/v3 backup');
  assert(Array.isArray(backup.items), 'Backup is missing an items array');
  const queue = backup.items.map(normalizeItem)
    .filter((item) => activeStates.has(item.state))
    .sort((a, b) => priority(b) - priority(a) || daysUntil(a.date) - daysUntil(b.date));
  const lines = [`# ${cleanText(backup.boardTitle, 'Pitch rehearsal brief')}`, '', `Focus queue: ${queue.length} active pitch block${queue.length === 1 ? '' : 's'}`, ''];

  for (const [index, item] of queue.slice(0, 3).entries()) {
    lines.push(`${index + 1}. ${item.title} (${item.category}, ${item.state})`);
    lines.push(`   - audience: ${item.textOne}`);
    lines.push(`   - proof: ${item.textTwo}`);
    lines.push(`   - rehearsal: ${item.date}; priority ${priority(item)}`);
    lines.push(`   - tighten: ${item.note}`);
  }
  return lines.join('\n');
}

try {
  console.log(buildBrief(await loadBackup()));
} catch (error) {
  console.error(`Could not build rehearsal brief: ${error.message}`);
  process.exitCode = 1;
}

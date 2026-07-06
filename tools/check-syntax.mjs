import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// verify-static.mjs only regex-extracts and vm-evaluates small fragments of
// these files (the SPEC object, a couple of named functions), so a parse
// error anywhere else in them can reach production without ever failing CI.
const FILES = [
  'js/main.js',
  'tools/verify-static.mjs',
  'examples/investor-review-backup.mjs',
  'examples/rehearsal-brief.mjs',
];

let failed = false;

for (const file of FILES) {
  try {
    await execFileAsync(process.execPath, ['--check', file]);
    console.log(`ok    ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${file}`);
    console.error((error.stderr || error.message).trim());
  }
}

if (failed) {
  console.error('\nSyntax check failed.');
  process.exit(1);
}

console.log(`\nSyntax OK: ${FILES.length} files parse cleanly.`);

// Smoke test for scripts/build-data.mjs: bad CSV data must fail the build with a clear,
// line-numbered message. Runs the real script as a subprocess against a temporarily corrupted
// data/dishes.csv, then always restores the original file (even on assertion failure).
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV = path.join(ROOT, 'data', 'dishes.csv');
const SCRIPT = path.join(ROOT, 'scripts', 'build-data.mjs');

function run() {
  try {
    execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { ok: true };
  } catch (err) {
    return { ok: false, stderr: (err.stderr ?? '').toString() };
  }
}

function withCorruptedCsv(transform, t) {
  const original = fs.readFileSync(CSV, 'utf8');
  const corrupted = transform(original);
  assert.notEqual(corrupted, original, 'test setup: the replacement did not match anything in dishes.csv');
  fs.writeFileSync(CSV, corrupted);
  try {
    return run();
  } finally {
    fs.writeFileSync(CSV, original);
  }
}

test('build-data: unknown restaurant column value fails the build with a clear message', () => {
  const res = withCorruptedCsv((csv) => csv.replace(/^gauchos,steak-main,/m, 'nope,steak-main,'));
  assert.equal(res.ok, false);
  assert.match(res.stderr, /dishes\.csv line \d+ \(steak-main\), restaurant: "nope" does not match/);
});

test('build-data: bad serve value fails the build with a clear message', () => {
  const res = withCorruptedCsv((csv) => csv.replace(/,hot$/m, ',boiling'));
  assert.equal(res.ok, false);
  assert.match(res.stderr, /serve: "boiling" must be hot, iced or empty/);
});

test('build-data: a clean CSV still builds (sanity check that restore worked)', () => {
  const res = run();
  assert.equal(res.ok, true);
});

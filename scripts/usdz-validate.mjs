// Validates a USDZ for iOS Quick Look: every zip entry stored (method 0),
// every entry's data 64-byte aligned, and the first entry a USD layer.
//
// Usage: node scripts/usdz-validate.mjs <file.usdz> [...]   (exit code 1 on failure)

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readZip } from './lib/zip.mjs';

export function validateUsdz(buf) {
  const errors = [];
  let entries = [];
  try {
    entries = readZip(buf);
  } catch (err) {
    return { ok: false, errors: [err.message], entries };
  }
  if (!entries.length) errors.push('empty archive');
  else if (!/\.(usda|usdc|usd)$/i.test(entries[0].name)) errors.push(`first entry must be a USD layer, got ${entries[0].name}`);
  for (const e of entries) {
    if (e.method !== 0) errors.push(`${e.name}: compressed (method ${e.method}); must be stored`);
    if (!e.aligned) errors.push(`${e.name}: data offset ${e.dataOffset} is not 64-byte aligned`);
  }
  return { ok: errors.length === 0, errors, entries };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let failed = false;
  for (const file of process.argv.slice(2)) {
    const { ok, errors, entries } = validateUsdz(fs.readFileSync(file));
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${file}  (${entries.length} entries)`);
    for (const e of errors) console.log(`      ${e}`);
    failed ||= !ok;
  }
  process.exit(failed ? 1 : 0);
}

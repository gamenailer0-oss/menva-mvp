// Applies a list of exact text replacements to the calendar files, e.g. social/content/roman-urdu-fixes.json:
//   [{ "file": "calendar.json", "id": "<post id>", "field": "caption" | "slides[0].ru" | …, "old": "…", "new": "…" }]
// Each "old" must appear exactly in that field of that post, or the fix is skipped and reported.
//
//   node social/scripts/apply-text-fixes.mjs social/content/roman-urdu-fixes.json [--dry]
// Then run check-calendar.mjs on each changed file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [fixFile, flag] = process.argv.slice(2);
const dry = flag === '--dry';
const fixes = JSON.parse(fs.readFileSync(path.resolve(fixFile), 'utf8'));
const cals = {};
const load = (f) => (cals[f] ||= JSON.parse(fs.readFileSync(path.join(ROOT, 'social/content', f), 'utf8')));

let applied = 0;
const skipped = [];
for (const fx of fixes) {
  const cal = load(fx.file);
  const post = cal.posts.find((p) => p.id === fx.id);
  if (!post) { skipped.push(`${fx.file} ${fx.id}: no such post`); continue; }
  const m = /^slides\[(\d+)\]\.(\w+)$/.exec(fx.field);
  const holder = m ? post.slides[Number(m[1])] : post;
  const key = m ? m[2] : fx.field;
  if (!holder || typeof holder[key] !== 'string') { skipped.push(`${fx.file} ${fx.id} ${fx.field}: no such field`); continue; }
  if (!holder[key].includes(fx.old)) { skipped.push(`${fx.file} ${fx.id} ${fx.field}: text not found: "${fx.old.slice(0, 50)}"`); continue; }
  holder[key] = holder[key].replace(fx.old, fx.new);
  applied++;
}
if (!dry) for (const [f, cal] of Object.entries(cals)) fs.writeFileSync(path.join(ROOT, 'social/content', f), JSON.stringify(cal, null, 2) + '\n');
console.log(`${dry ? 'Would apply' : 'Applied'} ${applied} of ${fixes.length} fixes to ${Object.keys(cals).join(', ')}.`);
if (skipped.length) console.log('Skipped:\n  ' + skipped.join('\n  '));

// Copies runtime dependencies from node_modules into /vendor so the site never
// requests a third-party origin. Versions are pinned exactly in package.json.
//
// Usage: npm install && npm run vendor

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(ROOT, 'node_modules');
const VENDOR = path.join(ROOT, 'vendor');
const pkg = (name) => JSON.parse(fs.readFileSync(path.join(NM, name, 'package.json'), 'utf8')).version;

const THREE_LIBS = 'three/examples/jsm/libs';
const files = {
  // model-viewer bundle (includes three.js)
  'model-viewer.min.js': '@google/model-viewer/dist/model-viewer.min.js',
  // Decoders model-viewer would otherwise fetch from gstatic / jsDelivr. (No meshopt: model-viewer
  // only loads it when a location is set, and our models use Draco.)
  'draco/draco_decoder.js': `${THREE_LIBS}/draco/gltf/draco_decoder.js`,
  'draco/draco_decoder.wasm': `${THREE_LIBS}/draco/gltf/draco_decoder.wasm`,
  'draco/draco_wasm_wrapper.js': `${THREE_LIBS}/draco/gltf/draco_wasm_wrapper.js`,
  'basis/basis_transcoder.js': `${THREE_LIBS}/basis/basis_transcoder.js`,
  'basis/basis_transcoder.wasm': `${THREE_LIBS}/basis/basis_transcoder.wasm`,
  'lottie_canvas.module.js': `${THREE_LIBS}/lottie_canvas.module.js`,
  // Fonts: Latin subsets, woff2
  'fonts/dm-sans-400.woff2': '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2',
  'fonts/dm-sans-500.woff2': '@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2',
  'fonts/dm-sans-600.woff2': '@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2',
  'fonts/instrument-serif-400.woff2': '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  'fonts/instrument-serif-400-italic.woff2': '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
  'fonts/LICENSE-dm-sans.txt': '@fontsource/dm-sans/LICENSE',
  'fonts/LICENSE-instrument-serif.txt': '@fontsource/instrument-serif/LICENSE',
};

fs.rmSync(VENDOR, { recursive: true, force: true });
let total = 0;
for (const [dest, src] of Object.entries(files)) {
  const to = path.join(VENDOR, dest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(NM, src), to);
  total += fs.statSync(to).size;
}

const versions = {
  '@google/model-viewer': pkg('@google/model-viewer'),
  three: pkg('three'),
  '@fontsource/dm-sans': pkg('@fontsource/dm-sans'),
  '@fontsource/instrument-serif': pkg('@fontsource/instrument-serif'),
};
fs.writeFileSync(path.join(VENDOR, 'versions.json'), JSON.stringify(versions, null, 2) + '\n');

// /vendor is served as immutable, so js/viewer.js must reference the exact version in its ?v= query.
const viewerJs = fs.readFileSync(path.join(ROOT, 'js', 'viewer.js'), 'utf8');
const expected = `/vendor/model-viewer.min.js?v=${versions['@google/model-viewer']}`;
if (!viewerJs.includes(expected)) {
  console.error(`js/viewer.js must load '${expected}' — update MODEL_VIEWER_SRC.`);
  process.exit(1);
}
// The loader shows honest byte progress for the first dish, so the script size must match.
const bytes = fs.statSync(path.join(VENDOR, 'model-viewer.min.js')).size;
if (!viewerJs.includes(`MODEL_VIEWER_BYTES = ${bytes};`)) {
  console.error(`js/viewer.js: set MODEL_VIEWER_BYTES = ${bytes};`);
  process.exit(1);
}

console.log(`vendor/: ${Object.keys(files).length} files, ${(total / 1024).toFixed(0)} KB`);
for (const [name, v] of Object.entries(versions)) console.log(`  ${name}@${v}`);

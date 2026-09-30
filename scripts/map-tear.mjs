// Usage: node scripts/map-tear.mjs <glb> "<orbit>" <seedX> <seedY> <x0> <y0> <x1> <y1> <out.json>
//   (pixel coords in the 1200×900 poster render; seed = a pixel inside the tear)
// Map the edge of a see-through hole: pick a pixel grid, flood-fill the "no hit" region that contains
// the seed pixel, and return the 3D hit points bordering it (cm). Writes a ring JSON for prep-obj --patch.
import fs from 'node:fs';
import { createRenderer } from './render.mjs';
const [glb, orbit, seedX, seedY, x0, y0, x1, y1, out] = process.argv.slice(2);
const S = 3;
const r = await createRenderer();
await r.poster(glb, orbit);
const grid = await r.page.evaluate(({ x0, y0, x1, y1, S }) => {
  const mv = document.getElementById('mv'); const rc = mv.getBoundingClientRect(); const g = [];
  for (let y = y0; y <= y1; y += S) { const row = []; for (let x = x0; x <= x1; x += S) { const h = mv.positionAndNormalFromPoint(rc.left + x, rc.top + y); row.push(h ? [h.position.x, h.position.y, h.position.z] : null); } g.push(row); }
  return g;
}, { x0: +x0, y0: +y0, x1: +x1, y1: +y1, S });
const H = grid.length, W = grid[0].length;
const sx = Math.round((seedX - x0) / S), sy = Math.round((seedY - y0) / S);
if (grid[sy][sx]) throw new Error('seed pixel hits geometry — not inside the hole');
const hole = new Set([`${sx},${sy}`]), st = [[sx, sy]];
while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = `${nx},${ny}`; if (!hole.has(k) && !grid[ny][nx]) { hole.add(k); st.push([nx, ny]); } } }
const ring = [];
for (const k of hole) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const p = grid[y + dy]?.[x + dx]; if (p) ring.push({ px: [x + dx, y + dy], p }); } }
const touchesEdge = [...hole].some((k) => { const [x, y] = k.split(',').map(Number); return x === 0 || y === 0 || x === W - 1 || y === H - 1; });
fs.writeFileSync(out, JSON.stringify({ holeCells: hole.size, touchesEdge, ring: ring.map((r) => r.p) }));
console.log('hole cells', hole.size, 'ring points', ring.length, 'touches grid edge', touchesEdge);
process.exit(0);

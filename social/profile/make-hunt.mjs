// Hunt-period profile assets (26 Sep to 4 Oct 2026): a black profile picture and three highlight covers.
// The launch kit is make.mjs. Run: node social/profile/make-hunt.mjs  → social/profile/out/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'social/profile/out');
fs.mkdirSync(OUT, { recursive: true });
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'vendor/fonts', f)).toString('base64');
const css = `@font-face{font-family:S;src:url(${font('instrument-serif-400.woff2')})}
@font-face{font-family:SI;src:url(${font('instrument-serif-400-italic.woff2')})}
@font-face{font-family:D;src:url(${font('dm-sans-500.woff2')})}
*{margin:0;box-sizing:border-box}body{background:#1A1714;color:#F5EFE4;display:flex;align-items:center;justify-content:center;flex-direction:column}
.w{font-family:S;letter-spacing:-.02em;line-height:1}.w i{color:#B5371F;font-style:normal}
.t{font-family:SI;color:#F5EFE4;line-height:1}.s{font-family:D;letter-spacing:.18em;text-transform:uppercase;opacity:.7}`;
const pages = [
  ['profile-picture-hunt.png', 1080, 1080, '<div class="w" style="font-size:300px;margin-top:-40px">menva<i>.</i></div>'],
  ['highlight-hunt.png', 1080, 1920, '<div class="t" style="font-size:260px">Hunt</div>'],
  ['highlight-rules.png', 1080, 1920, '<div class="t" style="font-size:260px">Rules</div>'],
  ['highlight-winners.png', 1080, 1920, '<div class="t" style="font-size:230px">Winners</div>'],
];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const [name, w, h, body] of pages) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>${css}body{width:${w}px;height:${h}px}</style>${body}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('wrote', name);
}
await browser.close();

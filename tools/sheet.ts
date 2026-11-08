// A contact sheet of a live page: frames every few hundred milliseconds laid out on one image, to
// see motion that stills miss (a transition's ghosting, a hint covered as it appears, texts that
// collide for a second). Writes screenshot/sheets/<name>.png unless --out is given.
// Usage: node --no-warnings tools/sheet.ts [--vp desktop|mobile|landscape] [--q 'bot=4834'] [--n 16] [--gap 150]
//          [--key t] [--at-frame 0] [--clip x,y,w,h] [--name zone-change] [--out <file>]
// --key presses a key (after a click on the corner of the scene, so it reaches the game) at frame
// --at-frame; story cards open at load are closed first.

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { VIEWPORTS, withGame } from './browser.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] ?? fallback : fallback;
}

const vp = VIEWPORTS.find((v) => v.name === arg('vp', 'desktop'))!;
const q = arg('q', '');
const n = Number(arg('n', '16'));
const gap = Number(arg('gap', '250'));
const key = arg('key', '');
const keyAt = Number(arg('at-frame', '0'));
const clipArg = arg('clip', '');
const clip = clipArg ? (([x, y, width, height]) => ({ x: x!, y: y!, width: width!, height: height! }))(clipArg.split(',').map(Number)) : undefined;
const out = arg('out', join('screenshot', 'sheets', `${arg('name', 'sheet')}.png`));
mkdirSync(dirname(out), { recursive: true });

await withGame(async (open) => {
  // At 1× the frames are small enough to lay out many on one page.
  const { page, errors } = await open({ ...vp, scale: 1 }, q ? `?${q}` : '');
  await page.waitForSelector('html.live', { state: 'attached', timeout: 60000 });
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  const shots: string[] = [];
  for (let i = 0; i < n; i++) {
    if (key && i === keyAt) { await page.mouse.click(4, vp.height - 4); await page.keyboard.press(key); }
    shots.push((await page.screenshot({ type: 'jpeg', quality: 72, clip })).toString('base64'));
    await page.waitForTimeout(gap);
  }
  const w = clip ? Math.min(clip.width, 360) : vp.width > vp.height ? 360 : 195;
  const cols = Math.max(1, Math.floor(1460 / (w + 2)));
  const sheet = await page.context().newPage();
  await sheet.setViewportSize({ width: cols * (w + 2), height: 300 });
  await sheet.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:2px">` +
    shots.map((s, i) => `<div style="position:relative"><img style="width:${w}px;display:block" src="data:image/jpeg;base64,${s}">` +
      `<span style="position:absolute;left:4px;top:2px;color:#ff0;font:12px sans-serif">${i} · ${i * gap} ms</span></div>`).join('') + '</body>');
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(out);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
});

// Mixed-input fuzz: random shortcut keys, clicks on panel buttons, taps on the scene and view-mode
// flips, for a while, reporting console errors. Mouse and keys mixed on purpose: a button the mouse
// clicked keeps focus, a key then lands on it (bugs keyboard-only or mouse-only tests never see).
// Buttons that replace or reset the reef, and the release, are left alone.
// Usage: node --no-warnings tools/fuzz.ts [--vp desktop|mobile|landscape|small] [--at <bot secs>] [--secs 120] [--ended] [--big]
//   --ended starts from a reef past its ending (the garden, the chronicle, Begin again).

import { runBot } from '../src/game/sim/bot.ts';
import { serialize } from '../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from './browser.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] ?? fallback : fallback;
}
// 'small': a 360×640 phone, a common size the standard viewports leave out.
// 'tiny': 320×568, the narrowest phone still in use.
const EXTRA: Record<string, { name: string; width: number; height: number; scale: number; mobile: boolean }> = {
  small: { name: 'small', width: 360, height: 640, scale: 2, mobile: true },
  tiny: { name: 'tiny', width: 320, height: 568, scale: 2, mobile: true },
};
const vp = EXTRA[arg('vp', 'desktop')] ?? VIEWPORTS.find((v) => v.name === arg('vp', 'desktop'))!;
const at = Number(arg('at', '10000'));
const secs = Number(arg('secs', '120'));
const ended = process.argv.includes('--ended');
/** --big: with the Larger text setting on. */
const big = process.argv.includes('--big');

const KEYS = [' ', 'p', 'b', 'g', 'f', 'e', 'l', 'r', 'c', 'k', 's', 'w', 't', '1', '2', '3', '4', '7', '8', '9', '0', 'Escape', 'Tab', 'Enter', '?', '+', '-'];
const SPARE = /Start over|Load|Paste|Copy save|Save to a file|Release|Begin again/;

await withGame(async (open) => {
  const save = ended ? serialize(runBot((s) => s.carried.length > 0, 12 * 3600).state, Date.now()) : undefined;
  const { page, errors } = await open(vp, ended ? '' : `?bot=${at}`, save ? { save } : {});
  page.on('dialog', (d) => void d.dismiss());
  if (big) {
    await page.evaluate(() => localStorage.setItem('corallum.big', 'on'));
    await page.reload();
  }
  page.setDefaultTimeout(800);
  await page.waitForTimeout(2500);
  let n = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    const r = Math.random();
    if (r < 0.35) await page.keyboard.press(KEYS[Math.floor(Math.random() * KEYS.length)]!);
    else if (r < 0.7) {
      const bs = page.locator('aside.panel button:visible:not([disabled])');
      const c = await bs.count();
      if (c) {
        const b = bs.nth(Math.floor(Math.random() * c));
        if (!SPARE.test((await b.textContent().catch(() => '')) ?? '')) await b.click().catch(() => {});
      }
    } else if (r < 0.95) await page.mouse.click(Math.random() * vp.width, Math.random() * vp.height);
    else await page.keyboard.press('h');
    n++;
    await page.waitForTimeout(60);
  }
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${vp.name}${ended ? ' ended' : ` bot=${at}`}${big ? ' big' : ''}: ${n} actions${errors.length ? '\n' + [...new Set(errors)].join('\n') : ''}`);
  if (errors.length) process.exitCode = 1;
});

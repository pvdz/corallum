// Close-ups of the scene's creatures, for art passes: loads a reef the bot grew to a given time,
// freezes the scene clock, and clips each tappable spot (corallum.spots) at a high device scale.
// Usage: node --no-warnings tools/closeup.ts [--at <bot secs>] [--t <scene secs>] [--scale 3] [--pad 1.6] [--out <dir>] [id ...]
// With no ids it shoots every spot on screen once. Writes <out>/<id>.png (default screenshot/closeup/).
// A spot that is off screen at that moment is listed; try another --t.

import { mkdirSync } from 'node:fs';
import { withGame } from './browser.ts';
import { runBot } from '../src/game/sim/bot.ts';
import { serialize } from '../src/game/sim/save.ts';

const args = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1]!;
  args.splice(i, 2);
  return v;
};
const at = Number(opt('at', '0'));
const t = opt('t', '300');
const scale = Number(opt('scale', '3'));
const pad = Number(opt('pad', '1.6'));
const out = opt('out', 'screenshot/closeup');
const ids = args;
mkdirSync(out, { recursive: true });

const save = at > 0 ? serialize(runBot((s) => s.t >= at, at).state, Date.now()) : undefined;
await withGame(async (open) => {
  const W = 1440, H = 900;
  const { page, errors } = await open({ name: 'closeup', width: W, height: H, scale, mobile: false }, `?t=${t}`, { save });
  await page.waitForTimeout(2500);
  // Story cards and the away summary close first.
  for (let i = 0; i < 6; i++) {
    const b = page.locator('.reader:not([hidden]) button, .away:not([hidden]) button').first();
    if (await b.count() && await b.isVisible()) await b.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  const spots = await page.evaluate(() => window.corallum!.spots);
  const done = new Set<string>();
  for (const sp of spots) {
    if (done.has(sp.id) || (ids.length && !ids.includes(sp.id))) continue;
    if (sp.x < 0 || sp.y < 0 || sp.x > W || sp.y > H) continue;
    done.add(sp.id);
    const r = Math.max(30, (sp.n ?? 40) * pad);
    const x = Math.max(0, sp.x - r), y = Math.max(0, sp.y - r);
    await page.screenshot({ path: `${out}/${sp.id}.png`, clip: { x, y, width: Math.min(2 * r, W - x), height: Math.min(2 * r, H - y) } });
  }
  const missing = (ids.length ? ids : []).filter((id) => !done.has(id));
  console.log(`shot: ${[...done].join(' ') || 'none'}`);
  if (missing.length) console.log(`not on screen: ${missing.join(' ')} (on screen: ${[...new Set(spots.map((s) => s.id))].join(' ')})`);
  if (errors.length) console.log(errors.join('\n'));
});

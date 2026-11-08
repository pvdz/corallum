// Creatures sharing a place: loads a reef the bot grew to each given time, runs the scene at 20×
// speed for a minute, samples the tappable spots (corallum.spots) four times a second, and counts,
// per pair of different creatures, the samples in which their centres lie within 40% of the smaller
// spot's radius. A pair in (nearly) every sample is drawn on top of each other for good (a moray in
// the eel bed, a mantis shrimp on the pistol shrimp's burrow); fish passing over things score low.
// Usage: node --no-warnings tools/collide.ts [--vp desktop|mobile|landscape|small|tiny] [--at 150,900,9000,19000,21000]

import { VIEWPORTS, withGame } from './browser.ts';
import { runBot } from '../src/game/sim/bot.ts';
import { serialize } from '../src/game/sim/save.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] ?? fallback : fallback;
}
const EXTRA: Record<string, { name: string; width: number; height: number; scale: number; mobile: boolean }> = {
  small: { name: 'small', width: 360, height: 640, scale: 2, mobile: true },
  tiny: { name: 'tiny', width: 320, height: 568, scale: 2, mobile: true },
};
const vp = EXTRA[arg('vp', 'desktop')] ?? VIEWPORTS.find((v) => v.name === arg('vp', 'desktop'))!;
const ats = arg('at', '150,900,9000,19000,21000').split(',').map(Number);
const SAMPLES = 240;
// Places, not creatures: Ossel, shells, stars, old stone, debris.
const SKIP = new Set(['ossel', 'old', 'shell', 'star', 'tangle', 'fragment', 'stray', 'raft']);

await withGame(async (open) => {
  for (const at of ats) {
    const save = serialize(runBot((s) => s.t >= at, at).state, Date.now());
    const { page, errors } = await open(vp, '', { save });
    await page.waitForTimeout(2500);
    // Story cards and the away summary close first.
    for (let i = 0; i < 6; i++) {
      const b = page.locator('.reader:not([hidden]) button, .away:not([hidden]) button').first();
      if (await b.count() && await b.isVisible()) await b.click().catch(() => {});
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => { window.corallum!.speed = 20; });
    const hits = new Map<string, number>();
    for (let k = 0; k < SAMPLES; k++) {
      await page.waitForTimeout(250);
      const sp = await page.evaluate(() => window.corallum!.spots.map((p) => ({ id: p.id, x: p.x, y: p.y, n: p.n ?? 20 })));
      const seen = new Set<string>();
      for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
        const a = sp[i]!, b = sp[j]!;
        if (a.id === b.id || SKIP.has(a.id) || SKIP.has(b.id)) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) >= 0.4 * Math.min(a.n, b.n)) continue;
        const key = [a.id, b.id].sort().join('~');
        if (!seen.has(key)) { seen.add(key); hits.set(key, (hits.get(key) ?? 0) + 1); }
      }
    }
    const list = [...hits].sort((a, b) => b[1] - a[1]);
    const stuck = list.filter(([, v]) => v >= SAMPLES * 0.9).map(([k]) => k);
    console.log(`${vp.name} bot=${at}: ${stuck.length ? `ON TOP OF EACH OTHER: ${stuck.join(' ')}` : 'no pair stuck together'}`);
    console.log(`  ${list.map(([k, v]) => `${k}:${v}`).join(' ') || '-'}`);
    if (errors.length) console.log(errors.join('\n'));
    await page.context().close();
  }
});

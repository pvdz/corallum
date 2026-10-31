// Frame cost per zone, headless: loads the game at bot times reaching each zone and reads the
// rolling draw/panel milliseconds (corallum.prof) after a few seconds of running.
// Usage: node --no-warnings tools/perf.ts [--vp desktop|mobile|landscape] [--at 600,5000,...]
// Headless Chromium rasterises in software, so compare runs with each other, not with phones.

import { VIEWPORTS, withGame } from './browser.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] ?? fallback : fallback;
}

const vp = VIEWPORTS.find((v) => v.name === arg('vp', 'desktop'))!;
// Silt Floor, Midnight Water, Twilight Shelf, Sunlit Crown, the Breach.
const times = arg('at', '600,5000,12000,19000,26000').split(',').map(Number);

await withGame(async (open) => {
  for (const at of times) {
    const { page, errors } = await open(vp, `?bot=${at}`);
    await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 60000 });
    await page.waitForTimeout(4000);
    // The browser's own frame work over a window: script, style recalc and layout per frame.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const metrics = async () => Object.fromEntries(((await cdp.send('Performance.getMetrics')) as { metrics: { name: string; value: number }[] }).metrics.map((m) => [m.name, m.value]));
    const frames = () => page.evaluate(() => new Promise<number>((done) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else done(n); }; requestAnimationFrame(f); }));
    const m0 = await metrics();
    const n = await frames();
    const m1 = await metrics();
    const per = (k: string) => ((m1[k]! - m0[k]!) * 1000 / n).toFixed(1);
    const r = await page.evaluate(() => {
      const c = (window as unknown as { corallum: { prof: { draw: number; panel: number }; state: { height: number } } }).corallum;
      return { draw: c.prof.draw, panel: c.prof.panel, height: c.state.height };
    });
    console.log(`${vp.name} bot=${at} ${Math.round(r.height)} m  draw ${r.draw.toFixed(1)} ms  panel ${r.panel.toFixed(1)} ms  | per frame: script ${per('ScriptDuration')} style ${per('RecalcStyleDuration')} layout ${per('LayoutDuration')} ms (${(n / 3).toFixed(0)} fps)`);
    if (errors.length) console.error(errors.join('\n'));
    await page.context().close();
  }
});

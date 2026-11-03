// Console-error sweep through the whole game: loads ?bot=<t> every 1700 s of sim time (Silt Floor to
// past the ending), flips through the tabs and reports any console error.
// Usage: node --no-warnings tools/sweep.ts [desktop|mobile|landscape|tablet|tiny] [extra url params]   (~10 min)
//   e.g. tools/sweep.ts desktop 'truce=bbb&dialects=massive,mucus,brooding' for the other story paths

import { VIEWPORTS, withGame } from './browser.ts';
// Also 'tablet' (768×1024) and 'tiny' (320×568), the extremes of the phone sheet.
const EXTRA: Record<string, (typeof VIEWPORTS)[number]> = {
  tablet: { name: 'tablet', width: 768, height: 1024, scale: 2, mobile: true },
  tiny: { name: 'tiny', width: 320, height: 568, scale: 2, mobile: true },
};
const vp = EXTRA[process.argv[2] ?? ''] ?? VIEWPORTS.find((v) => v.name === (process.argv[2] ?? 'desktop'))!;
const extra = process.argv[3] ? `&${process.argv[3]}` : '';
await withGame(async (open) => {
  for (let at = 300; at <= 30000; at += 1700) {
    const { page, errors } = await open(vp, `?bot=${at}${extra}`);
    try {
      await page.waitForFunction(() => (window as never as { corallum: { state: { height: number } } }).corallum, null, { timeout: 90000 });
      await page.waitForTimeout(2500);
      // Every tab once.
      for (const k of ['2', '3', '4', '1']) { await page.keyboard.press(k); await page.waitForTimeout(400); }
      const h = await page.evaluate(() => (window as never as { corallum: { state: { height: number } } }).corallum.state.height);
      console.log(at, Math.round(h), errors.length ? 'ERR ' + errors.join(' | ').slice(0, 400) : 'ok');
    } catch (e) { console.log(at, 'FAIL', String(e).slice(0, 200), errors.join('|').slice(0, 300)); }
    await page.context().close();
  }
});

// Loads the game at desktop and mobile sizes and fails on any console error or blank canvas.
// Run with: node test/e2e/smoke.ts

import { VIEWPORTS, withGame } from '../../tools/browser.ts';

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
    const { page, errors } = await open(vp, '?t=10');
    await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
    const lit = await page.evaluate(() => {
      const c = document.getElementById('world') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4 * 97) sum += d[i]! + d[i + 1]! + d[i + 2]!;
      return sum;
    });
    const ok = errors.length === 0 && lit > 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}${errors.length ? ': ' + errors.join(' | ') : ''}${lit > 0 ? '' : ' (blank canvas)'}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

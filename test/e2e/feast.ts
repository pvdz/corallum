// A falling feast in a real browser: tap it and the reef eats it; F eats the next one.
// Run with: node --no-warnings test/e2e/feast.ts

import { VIEWPORTS, withGame } from '../../tools/browser.ts';

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
    // ?bot=4309 lands ten seconds into a feast for the default seed (Midnight Water).
    const { page, errors } = await open(vp, '?bot=4309');
    for (let i = 0; i < 30 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    const at = await page.evaluate(() => window.corallum!.feast);
    const before = await page.evaluate(() => ({ c: window.corallum!.state.calcite, k: window.corallum!.state.feasted }));
    if (at) await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ c: window.corallum!.state.calcite, k: window.corallum!.state.feasted, f: window.corallum!.feast }));
    const float = await page.locator('.feast-float').count();
    // Jump to the next window's feast and catch it with the key.
    await page.evaluate(() => {
      const c = window.corallum!;
      for (let i = 0; i < 400 && !c.feast; i++) c.skip(1);
    });
    await page.keyboard.press('f');
    const keyed = await page.evaluate(() => window.corallum!.state.feasted);
    const ok = !!at && after.k > before.k && after.c > before.c * 1.5 && after.f === null && float > 0 && keyed > after.k &&
      errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}: tapped feast ${before.k}→${after.k}, calcite ×${(after.c / before.c).toFixed(2)}, key → ${keyed}` +
      (errors.length ? ' · ' + errors.join(' | ') : ''));
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

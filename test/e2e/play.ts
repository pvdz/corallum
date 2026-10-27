// Interaction test in a real browser: opening band, sweeping, buying, saving, offline catch-up.
// Run with: node --no-warnings test/e2e/play.ts

import assert from 'node:assert/strict';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
    const { page, errors } = await open(vp, '');
    // The first band opens by itself on a new game.
    await page.waitForSelector('.reader:not([hidden]) >> text=Settling', { timeout: 10000 });
    await page.click('.reader:not([hidden]) >> text=Continue');

    // Sweep the water until a polyp is affordable.
    const box = await page.locator('#world').boundingBox();
    assert.ok(box);
    for (let i = 0; i < 40; i++) {
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await page.waitForTimeout(420);
      if (await page.locator('.card.ready').count()) break;
    }
    const polyp = page.locator('.card', { hasText: 'Bud a polyp' });
    await polyp.locator('button.buy').click();
    assert.equal((await polyp.locator('.level').textContent())?.trim(), '×1');

    // Saved, and survives a reload.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.reload();
    await page.waitForSelector('.card >> text=×1');

    // An hour away: rewrite savedAt and reload; the away summary appears.
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('corallum.save')!);
      raw.savedAt -= 3600_000;
      localStorage.setItem('corallum.save', JSON.stringify(raw));
    });
    // The page notices the foreign write on pagehide and does not save over it.
    await page.reload();
    const awayVisible = await page.locator('.away:not([hidden])').count();
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`ok   ${vp.name} (away summary ${awayVisible ? 'shown' : 'MISSING'})`);
    if (!awayVisible) process.exitCode = 1;
  }
});

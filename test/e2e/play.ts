// Interaction test in a real browser: opening band, sweeping, buying (and hold-to-buy), saving,
// offline catch-up.
// Run with: node --no-warnings test/e2e/play.ts

import assert from 'node:assert/strict';
import { runBot } from '../../src/game/sim/bot.ts';
import { serialize } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

await withGame(async (open) => {
  for (const vp of VIEWPORTS.slice(0, 2)) {
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
    await polyp.locator('.level', { hasText: '×1' }).waitFor({ timeout: 3000 });

    // Press and hold keeps buying; letting go does not buy one more.
    await page.evaluate(() => { window.corallum!.state.calcite = 1e6; });
    const btn = (await polyp.locator('button.buy').boundingBox())!;
    await page.mouse.move(btn.x + 10, btn.y + 10);
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
    const held = await page.evaluate(() => window.corallum!.state.levels.polyp);
    assert.ok(held >= 4, `holding bought ${held - 1}`);

    // Saved, and survives a reload.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.reload();
    await page.waitForSelector(`.card >> text=×${held}`);

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
  // A phone on its side, back after a long time in the middle of the game: the summary is
  // taller than the screen, and its button must still be reachable (the card scrolls).
  {
    const save = serialize(runBot((s) => s.t >= 9000, 9000).state, Date.now() - 8 * 3600_000);
    const { page, errors } = await open(VIEWPORTS[2]!, '', { save });
    await page.waitForSelector('.away:not([hidden])', { timeout: 15000 });
    // What a finger needs: the overlay itself scrolls (a script could scroll even an overflow: hidden
    // box), and the card does not start above the top of the screen.
    const tall = await page.evaluate(() => {
      const o = document.querySelector('.away:not([hidden])') as HTMLElement;
      const card = o.querySelector('.reader-card')!.getBoundingClientRect();
      const scrolls = ['auto', 'scroll'].includes(getComputedStyle(o).overflowY) && o.scrollHeight > o.clientHeight;
      o.scrollTop = o.scrollHeight;
      return card.height > innerHeight && card.top >= 0 && scrolls;
    });
    await page.locator('.away:not([hidden]) button', { hasText: 'Return to the reef' }).click({ timeout: 5000 });
    const closed = !(await page.locator('.away:not([hidden])').count());
    const ok = tall && closed && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} landscape: a summary taller than the screen scrolls to its button and closes`);
    if (!ok) process.exitCode = 1;
  }
});

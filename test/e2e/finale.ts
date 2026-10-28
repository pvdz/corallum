// The finale in a real browser: wait for the full moon, release the spawn, carry three
// memories, read the ending through. Run with: node --no-warnings test/e2e/finale.ts
// With SHOTS=<dir> it also saves the choice screen and the first ending page there.

import { VIEWPORTS, withGame } from '../../tools/browser.ts';

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS.slice(0, 2)) {
    // The bot reaches the surface a few minutes before the moon is full.
    const { page, errors } = await open(vp, '?bot=28500');
    await page.waitForFunction(() => window.corallum?.state.height === 4000, null, { timeout: 30000 });
    // Close any story cards that opened on load.
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    // Skip to the full moon.
    await page.evaluate(() => {
      const s = window.corallum!.state;
      const p = (s.t / 1200) % 1;
      window.corallum!.skip(((0.45 - p + 1) % 1) * 1200);
    });
    await page.locator('.away:not([hidden]) button').click();
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.moon-card button.release:not([disabled])').click({ timeout: 5000 });
    const memories = page.locator('.choice-screen .memory');
    for (let i = 0; i < 3; i++) await memories.nth(i * 2).click();
    const shots = process.env.SHOTS;
    if (shots) {
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${shots}/${vp.name}-finale-choice.png` });
    }
    await page.locator('.choice-screen button.release').click();
    if (shots) {
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${shots}/${vp.name}-finale-spawning.png` });
    }
    await page.locator('.ending:not([hidden])').waitFor({ timeout: 10000 });
    if (shots) {
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${shots}/${vp.name}-finale-release.png` });
    }
    const pages: string[] = [];
    for (let i = 0; i < 10; i++) {
      const text = (await page.locator('.ending .finale-text').textContent()) ?? '';
      pages.push(text);
      const btn = page.locator('.ending button');
      const label = await btn.textContent();
      await btn.click();
      if (label === 'The reef lives on') break;
    }
    const endedFlag = await page.evaluate(() => document.documentElement.classList.contains('ended'));
    const ok = endedFlag && pages.length === 6 && errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}: ${pages.length} ending pages${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

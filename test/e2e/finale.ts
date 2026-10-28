// The finale in a real browser: wait for the full moon, release the spawn, carry three
// (or, under a great tide, four) memories, read the ending through. Run with: node --no-warnings test/e2e/finale.ts
// With SHOTS=<dir> it also saves the choice screen and the first ending page there.

import { runBot } from '../../src/game/sim/bot.ts';
import { serialize } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

// A reef that has just reached the surface (independent of how the balance moves the timing).
const { state } = runBot((s) => s.height >= 4000, 12 * 3600);
const save = serialize(state, Date.now());

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS.slice(0, 2)) {
    const { page, errors } = await open(vp, '', { save });
    await page.waitForFunction(() => window.corallum?.state.height === 4000, null, { timeout: 30000 });
    // Close any story cards that opened on load.
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    // Skip to the full moon; on desktop to a great tide one (four memories instead of three).
    const great = vp.name === 'desktop';
    await page.evaluate((great) => {
      const s = window.corallum!.state;
      const cycle = Math.floor(s.t / 1200);
      let k = (s.t / 1200) % 1 < 0.45 ? cycle : cycle + 1;
      while (great ? k % 3 !== 2 : k % 3 === 2) k++;
      window.corallum!.skip((k + 0.45) * 1200 - s.t);
    }, great);
    await page.locator('.away:not([hidden]) button').click();
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.moon-card button.release:not([disabled])').click({ timeout: 5000 });
    const memories = page.locator('.choice-screen .memory');
    const carry = great ? 4 : 3;
    await page.locator('.picked', { hasText: `0 of ${carry}` }).waitFor({ timeout: 3000 });
    for (let i = 0; i < carry; i++) await memories.nth(i * 2).click();
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
    const ok = endedFlag && pages.length === carry + 3 && errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}: ${pages.length} ending pages${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

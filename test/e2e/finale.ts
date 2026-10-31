// The finale in a real browser: wait for the full moon, release the spawn, carry three
// (or, under a great tide, four) memories, read the ending through. Run with: node --no-warnings test/e2e/finale.ts
// With SHOTS=<dir> it also saves the choice screen and the first ending page there.

import { runBot } from '../../src/game/sim/bot.ts';
import { serialize } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

// A reef that has just reached the surface (independent of how the balance moves the timing).
const { state } = runBot((s) => s.height >= 4000, 12 * 3600);
state.asked.silt = '1'; // one of Ossel's questions answered: its line is a page of the ending
const save = serialize(state, Date.now());

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
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
    // Name a figure in the night sky: trace Ossel’s Cup star by star.
    if (great) {
      await page.locator('.sky-row', { hasText: 'Ossel’s Cup' }).locator('.sky-trace').click();
      await page.waitForTimeout(300);
      const stars = await page.evaluate(() => window.corallum!.spots.filter((p) => p.id === 'star').sort((a, b) => a.n! - b.n!));
      for (const p of stars) { await page.mouse.click(p.x, p.y); await page.waitForTimeout(80); }
      const cup = await page.evaluate(() => window.corallum!.state.sky.cup);
      console.log(`${cup ? 'ok  ' : 'FAIL'} a figure traced and named in the night sky (${stars.length} stars)`);
      if (!cup) failed = true;
    }
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
    for (let i = 0; i < 20; i++) {
      const text = (await page.locator('.ending .finale-text').textContent()) ?? '';
      pages.push(text);
      const btn = page.locator('.ending button');
      const label = await btn.textContent();
      await btn.click();
      if (label === 'The reef lives on') break;
    }
    const endedFlag = await page.evaluate(() => document.documentElement.classList.contains('ended'));
    // The garden after the ending: plant a bright child.
    await page.evaluate(() => { window.corallum!.state.calcite = 1e30; });
    await page.waitForTimeout(400);
    await page.locator('.garden-kinds button', { hasText: 'A bright one' }).click().catch(() => {});
    await page.waitForTimeout(200);
    const kinds = await page.evaluate(() => window.corallum!.state.gardenKinds);
    console.log(`${kinds === 'b' ? 'ok  ' : 'FAIL'} ${vp.name}: a bright child planted in the garden`);
    if (kinds !== 'b') failed = true;
    // Release, one per memory, the stars named, the sister reef (once the race reached the surface), Ossel, the last line.
    const sister = await page.evaluate(() => window.corallum!.state.race.decided >= 5 ? 1 : 0);
    const friends = await page.evaluate(() => Object.values(window.corallum!.state.meta.trust).some((n) => n >= 5) ? 1 : 0);
    const named = great ? 1 : 0; // the stars page
    const told = 1; // what you told Ossel
    const ok = endedFlag && pages.length === carry + 4 + sister + friends + named + told && errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}: ${pages.length} ending pages${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

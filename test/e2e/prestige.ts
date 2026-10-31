// A lesser spawning in a real browser: start from a saved reef at 1000 m, release, reload into
// a new seamount, read the lineage note, buy a trait. Also: the copy-your-save nudge. Run: node --no-warnings test/e2e/prestige.ts
// With SHOTS=<dir> it saves the Lineage tab there.

import { runBot } from '../../src/game/sim/bot.ts';
import { serialize } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

const { state } = runBot((s) => s.height >= 1000 && s.t > 3700, 6 * 3600);
const save = serialize(state, Date.now());

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS.slice(0, 2)) {
    const { page, errors } = await open(vp, '', { save });
    page.on('dialog', (d) => void d.accept());
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    // An hours-old reef with no copied save gets a nudge on the Reef tab, gone once copied.
    await page.locator('.tab', { hasText: 'Reef' }).locator('.dot:not([hidden])').waitFor({ timeout: 10000 });
    await page.locator('.tab', { hasText: 'Reef' }).click();
    await page.locator('.backup-note:not([hidden])').waitFor({ timeout: 3000 });
    await page.locator('button', { hasText: 'Copy save' }).click();
    await page.locator('.backup-note').waitFor({ state: 'hidden', timeout: 3000 });
    await page.locator('.tab', { hasText: 'Lineage' }).click();
    // Send it to a cold seamount.
    await page.locator('.spawn-lesser button.seamount', { hasText: 'cold' }).click();
    await page.locator('.spawn-lesser button.buy').click();
    await page.waitForLoadState('load');
    await page.locator('.reader:not([hidden]) >> text=Lesser spawning 1').waitFor({ timeout: 10000 });
    const fresh = await page.evaluate(() => ({ h: window.corallum!.state.height, l: window.corallum!.state.meta.lineage, where: window.corallum!.state.seamount }));
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.tab', { hasText: 'Lineage' }).click();
    await page.locator('.trait', { hasText: 'Deep memory' }).locator('button.buy').click();
    await page.locator('.trait', { hasText: 'Deep memory' }).locator('.level', { hasText: '×1' }).waitFor({ timeout: 3000 });
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${vp.name}-lineage.png` });
    const ok = fresh.h < 1 && fresh.l > 0 && fresh.where === 'cold' && errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}: new reef at ${fresh.h.toFixed(1)} m, ${fresh.l} lineage, ${fresh.where} seamount${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    failed ||= !ok;
  }
  // After the ending: Begin again under the vows of stillness and quiet. The new reef sweeps
  // nothing, keeps no slot for Ossel's requests, and its water card plans no flurries.
  {
    const ended = runBot((s) => s.carried.length > 0, 12 * 3600).state;
    const { page, errors } = await open(VIEWPORTS[1]!, '', { save: serialize(ended, Date.now()) });
    page.on('dialog', (d) => void d.accept());
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    await page.locator('.tab', { hasText: 'Lineage' }).click();
    for (const vow of ['Stillness', 'Quiet']) await page.locator('button', { hasText: new RegExp(`^${vow}$`) }).click();
    await page.locator('.spawn-lesser button.buy').click();
    await page.waitForLoadState('load');
    await page.waitForFunction(() => window.corallum?.state.t !== undefined && window.corallum.state.height < 1, null, { timeout: 10000 });
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    for (let i = 0; i < 4; i++) { await page.mouse.click(200, 500); await page.keyboard.press(' '); await page.waitForTimeout(250); }
    const r = await page.evaluate(() => ({
      vows: window.corallum!.state.vows.join(','),
      sweeps: window.corallum!.state.tally.sweeps,
      ask: !(document.querySelector('.ask') as HTMLElement | null)?.hidden,
      flurry: /flurry/.test(document.querySelector('.water-soon')?.textContent ?? ''),
    }));
    const ok = r.vows === 'still,quiet' && r.sweeps === 0 && !r.ask && !r.flurry && errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} begin again under vows: ${JSON.stringify(r)}${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

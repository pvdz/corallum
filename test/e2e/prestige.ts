// A lesser spawning in a real browser: start from a saved reef at 1000 m, release, reload into
// a new seamount, read the lineage note, buy a trait. Run: node --no-warnings test/e2e/prestige.ts
// With SHOTS=<dir> it saves the Lineage tab there.

import { runBot } from '../../src/game/sim/bot.ts';
import { serialize } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

const { state } = runBot((s) => s.height >= 1000, 6 * 3600);
const save = serialize(state, Date.now());

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
    const { page, errors } = await open(vp, '', { save });
    page.on('dialog', (d) => void d.accept());
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.tab', { hasText: 'Lineage' }).click();
    await page.locator('.spawn-lesser button').click();
    await page.waitForLoadState('load');
    await page.locator('.reader:not([hidden]) >> text=Lesser spawning 1').waitFor({ timeout: 10000 });
    const fresh = await page.evaluate(() => ({ h: window.corallum!.state.height, l: window.corallum!.state.meta.lineage }));
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.tab', { hasText: 'Lineage' }).click();
    await page.locator('.trait', { hasText: 'Deep memory' }).locator('button').click();
    await page.locator('.trait', { hasText: 'Deep memory' }).locator('.level', { hasText: '×1' }).waitFor({ timeout: 3000 });
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${vp.name}-lineage.png` });
    const ok = fresh.h < 1 && fresh.l > 0 && errors.length === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}: new reef at ${fresh.h.toFixed(1)} m, ${fresh.l} lineage${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

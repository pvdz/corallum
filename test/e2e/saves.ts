// Save files in a real browser: "Save to a file" downloads the reef, "Load save from a file"
// brings one back. Run with: node --no-warnings test/e2e/saves.ts

import { readFileSync } from 'node:fs';
import { runBot } from '../../src/game/sim/bot.ts';
import { exportString, importString } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

let failed = false;
await withGame(async (open) => {
  // Download.
  {
    const { page, errors } = await open(VIEWPORTS[0]!, '?bot=600');
    await page.locator('.tab', { hasText: 'Reef' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Save to a file' }).click()]);
    const file = importString(readFileSync((await dl.path())!, 'utf8'));
    const ok = !!file && file.state.t >= 600 && /^corallum-\d{4}-\d\d-\d\d\.txt$/.test(dl.suggestedFilename()) && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} save to a file: ${dl.suggestedFilename()}`);
    failed ||= !ok;
  }
  // Upload.
  {
    const { page, errors } = await open(VIEWPORTS[1]!, '');
    const text = exportString(runBot((s) => s.height >= 20, 3600).state, Date.now());
    for (let i = 0; i < 5 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.tab', { hasText: 'Reef' }).click();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Load save from a file' }).click()]);
    await chooser.setFiles({ name: 'save.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
    await page.waitForFunction(() => (window.corallum?.state.height ?? 0) >= 20, null, { timeout: 10000 });
    const ok = !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} load save from a file`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

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
  // A save that cannot be read is moved aside, and the new reef still saves.
  {
    const { page, errors } = await open(VIEWPORTS[0]!, '', { save: '{"state": {"t": 12, "calc' });
    await page.waitForFunction(() => window.corallum, null, { timeout: 10000 });
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const r = await page.evaluate(() => ({
      aside: localStorage.getItem('corallum.save.unreadable'),
      saved: localStorage.getItem('corallum.save'),
      yielded: document.documentElement.classList.contains('yielded'),
    }));
    const ok = r.aside === '{"state": {"t": 12, "calc' && !!r.saved && r.saved.startsWith('{') && !r.yielded && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} unreadable save kept aside; the new reef saves`);
    failed ||= !ok;
  }
  // Storage full of the journal's pictures: the reef is saved, the pictures go.
  {
    const { page, errors } = await open(VIEWPORTS[0]!, '');
    await page.waitForFunction(() => window.corallum, null, { timeout: 10000 });
    const r = await page.evaluate(() => {
      localStorage.removeItem('corallum.save');
      // Fill storage to the brim with portrait data.
      let chunk = 'x'.repeat(1 << 20);
      let n = 0;
      for (const key of ['corallum.portraits', 'corallum.portraits.close']) {
        let v = '';
        for (;;) {
          try { localStorage.setItem(key, v + chunk); v += chunk; n++; }
          catch { if (chunk.length < 64) break; chunk = chunk.slice(chunk.length / 2); }
        }
      }
      window.dispatchEvent(new Event('pagehide'));
      return { n, saved: !!localStorage.getItem('corallum.save') };
    });
    const ok = r.saved && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} storage full of portraits: the reef still saves`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

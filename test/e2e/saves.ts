// Save files in a real browser: "Save to a file" downloads the reef, "Load a file"
// brings one back; a photo of the reef downloads as a PNG. Run with: node --no-warnings test/e2e/saves.ts

import { readFileSync } from 'node:fs';
import { runBot } from '../../src/game/sim/bot.ts';
import { exportString, importString, serialize } from '../../src/game/sim/save.ts';
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
  // A photo of the reef from view mode: a PNG named after the height, with the shutter's flash.
  {
    const { page, errors } = await open(VIEWPORTS[1]!, '?bot=3000');
    await page.waitForFunction(() => window.corallum, null, { timeout: 30000 });
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    await page.locator('#view').click();
    const shot = page.waitForEvent('download');
    await page.locator('#photo').click();
    const flash = await page.locator('.photo-flash').count();
    const dl = await shot;
    const ok = /^corallum-\d+m\.png$/.test(dl.suggestedFilename()) && flash === 1 && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} a photo of the reef: ${dl.suggestedFilename()}${flash ? ', a flash' : ', no flash'}`);
    failed ||= !ok;
  }
  // Upload.
  {
    const { page, errors } = await open(VIEWPORTS[1]!, '');
    const text = exportString(runBot((s) => s.height >= 20, 3600).state, Date.now());
    for (let i = 0; i < 5 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.tab', { hasText: 'Reef' }).click();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Load a file' }).click()]);
    await chooser.setFiles({ name: 'save.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
    await page.waitForFunction(() => (window.corallum?.state.height ?? 0) >= 20, null, { timeout: 10000 });
    const ok = !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} load save from a file`);
    failed ||= !ok;
  }
  // Loading over a reef with real progress asks first; declined, the reef is kept.
  {
    const here = serialize(runBot((s) => s.t >= 2400, 2400).state, Date.now());
    const { page, errors } = await open(VIEWPORTS[0]!, '', { save: here });
    const text = exportString(runBot((s) => s.height >= 20, 3600).state, Date.now());
    for (let i = 0; i < 20 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    const h0 = await page.evaluate(() => window.corallum!.state.height);
    await page.locator('.tab', { hasText: 'Reef' }).click();
    let asked = '';
    page.once('dialog', (d) => { asked = d.message(); void d.dismiss(); });
    const [c1] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Load a file' }).click()]);
    await c1.setFiles({ name: 'save.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
    await page.waitForTimeout(800);
    const kept = (await page.evaluate(() => window.corallum!.state.height)) === h0;
    page.once('dialog', (d) => void d.accept());
    const [c2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: 'Load a file' }).click()]);
    await c2.setFiles({ name: 'save.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
    await page.waitForFunction((h) => (window.corallum?.state.height ?? h) < h, h0, { timeout: 10000 });
    const ok = /replaces the reef/.test(asked) && kept && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} loading over an established reef asks first; declined, it is kept`);
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
  // Two tabs on one reef: the one that finds another tab's save yields, covers itself and takes no keys.
  {
    const { page } = await open(VIEWPORTS[1]!, '', { save: serialize(runBot((s) => s.t >= 600, 600).state, Date.now() - 5000) });
    await page.waitForFunction(() => window.corallum, null, { timeout: 10000 });
    const other = await page.context().newPage();
    await other.goto(page.url());
    await other.waitForFunction(() => window.corallum, null, { timeout: 10000 });
    // The first tab saves after the second loaded: the second is now behind and yields on its next save.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await other.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    // Enough calcite that P would buy, were the keys still listened to.
    const before = await other.evaluate(() => { window.corallum!.state.calcite = 1e12; return window.corallum!.state.levels.polyp; });
    await other.keyboard.press('p');
    const r = await other.evaluate(() => ({
      covered: getComputedStyle(document.getElementById('yielded')!).display !== 'none',
      polyps: window.corallum!.state.levels.polyp,
    }));
    const ok = r.covered && r.polyps === before;
    console.log(`${ok ? 'ok  ' : 'FAIL'} a tab behind another yields: covered, and P buys nothing`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

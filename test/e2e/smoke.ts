// Loads the game at desktop and mobile sizes and fails on any console error or blank canvas.
// Also turns the sound on (over the opening story) and lets the zone music play a few notes.
// Run with: node test/e2e/smoke.ts

import { MILESTONES } from '../../src/game/content/act1.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

let failed = false;
await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
    const { page, errors } = await open(vp, '?t=10');
    await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
    const lit = await page.evaluate(() => {
      const c = document.getElementById('world') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4 * 97) sum += d[i]! + d[i + 1]! + d[i + 2]!;
      return sum;
    });
    await page.locator('#sound').click();
    await page.waitForTimeout(3000);
    const sound = await page.locator('#sound').getAttribute('aria-pressed');
    // A fresh reef's journal lists everything still to find (it once rendered empty until the first sighting).
    const journalRows = await page.evaluate(() => document.querySelectorAll('.journal .journal-entry').length);
    const ok = errors.length === 0 && lit > 0 && sound === 'true' && journalRows > 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${vp.name}${errors.length ? ': ' + errors.join(' | ') : ''}${lit > 0 ? '' : ' (blank canvas)'}${sound === 'true' ? '' : ' (sound did not turn on)'}${journalRows > 0 ? '' : ' (journal empty)'}`);
    failed ||= !ok;
  }
});
process.exitCode = failed ? 1 : 0;

// Reduced motion keeps the title cards' fade: a milestone announcement must still show.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=200');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const lv = await page.evaluate(() => { const s = window.corallum!.state; s.calcite = 1e12; return s.levels.polyp; });
  const polyp = page.locator('.card', { hasText: 'Bud a polyp' });
  const goal = MILESTONES.polyp.find((m) => m.level > lv)!.level;
  for (let i = lv; i < goal; i++) await polyp.locator('button.buy').click();
  await page.waitForTimeout(1500);
  const opacity = Number(await page.evaluate(() => getComputedStyle(document.getElementById('milestone')!).opacity));
  const ok = opacity > 0.5 && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} reduced motion: milestone card shows (opacity ${opacity})`);
  if (!ok) process.exitCode = 1;
});

// The phone sheet's grabber: a tap draws it up, a drag down puts it back; the scene keeps its framing.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?t=10');
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
  const height = () => page.evaluate(() => document.querySelector('.panel')!.getBoundingClientRect().height);
  const h0 = await height();
  await page.locator('.grabber').tap();
  await page.waitForTimeout(600);
  const h1 = await height();
  const b = (await page.locator('.grabber').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + 8);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + 80, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const h2 = await height();
  const ok = h1 > h0 * 1.5 && Math.abs(h2 - h0) < 2 && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} mobile sheet: ${Math.round(h0)} → ${Math.round(h1)} → ${Math.round(h2)} px${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

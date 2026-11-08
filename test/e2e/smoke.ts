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

// The 320 px phone on its side (568×320) once froze at load: the sheet left the scene no height and
// a renderer's loop ran on NaN. It loads, draws, and answers.
await withGame(async (open) => {
  const { page, errors } = await open({ name: 'tiny-landscape', width: 568, height: 320, scale: 2, mobile: true }, '?bot=2400&t=10');
  await page.waitForSelector('html[data-ready="1"]', { timeout: 20000 });
  const r = await page.evaluate(() => ({ h: window.corallum!.state.height, side: document.querySelector('.panel')!.getBoundingClientRect().left > 200 }));
  const ok = errors.length === 0 && r.h > 0 && r.side;
  console.log(`${ok ? 'ok  ' : 'FAIL'} 568×320 loads with the side panel${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

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
  // Drawn up again, a tap on the scene above it puts it back and is not a sweep.
  await page.locator('.grabber').tap();
  await page.waitForTimeout(600);
  const sweeps = () => page.evaluate(() => (window as unknown as { corallum: { state: { tally: { sweeps: number } } } }).corallum.state.tally.sweeps);
  const s0 = await sweeps();
  await page.touchscreen.tap(195, 60);
  await page.waitForTimeout(600);
  const h3 = await height(), s1 = await sweeps();
  const ok = h1 > h0 * 1.5 && Math.abs(h2 - h0) < 2 && Math.abs(h3 - h0) < 2 && s1 === s0 && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} mobile sheet: ${Math.round(h0)} → ${Math.round(h1)} → ${Math.round(h2)} px; a scene tap closes it (${Math.round(h3)} px, sweeps ${s0} → ${s1})${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// Offline: with the service worker (?sw; it stays out of the other tests), a reef visited once
// opens again with the network gone.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?sw');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum && navigator.serviceWorker.controller, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.context().setOffline(true);
  await page.reload();
  const ok = await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 }).then(() => true, () => false);
  const failed = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e));
  console.log(`${ok && failed.length === 0 ? 'ok  ' : 'FAIL'} offline: the game opens again with the network gone${failed.length ? ': ' + failed.join(' | ') : ''}`);
  if (!ok || failed.length) process.exitCode = 1;
});

// A story that opens while the phone sheet is drawn up shows above it, not under it.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?fresh');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  await page.locator('.grabber').tap();
  const go = page.getByRole('button', { name: 'Continue' });
  await go.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);
  const onTop = await go.evaluate((b) => {
    const r = b.getBoundingClientRect();
    const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!e && (e === b || b.contains(e));
  });
  const ok = onTop && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} a story shows above the tall sheet${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// Hidden means hidden: no element with the hidden attribute still shows on any tab (a class with
// display: flex once brought back empty cards and the vows before any ending).
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?bot=12000');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  const leaks = await page.evaluate(async () => {
    const out = new Set<string>();
    for (const tab of document.querySelectorAll<HTMLButtonElement>('.tab')) {
      tab.click();
      await new Promise((r) => setTimeout(r, 50));
      for (const e of document.querySelectorAll<HTMLElement>('[hidden]')) {
        if (getComputedStyle(e).display !== 'none') out.add(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`);
      }
    }
    return [...out];
  });
  const ok = leaks.length === 0 && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} nothing hidden shows${leaks.length ? ': ' + leaks.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// An iPad upright (820×1180) gets the side panel: every stock value stays inside its own cell
// (at 36vw the panel was 295 px and the values ran into their neighbours' names).
await withGame(async (open) => {
  const { page, errors } = await open({ name: 'tablet', width: 820, height: 1180, scale: 1, mobile: true }, '?bot=12000');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  const spill = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.stock:not(.height)')]
    .filter((r) => !r.hidden)
    .filter((r) => { const v = r.querySelector('.stock-value')!.getBoundingClientRect(), b = r.getBoundingClientRect(); return v.right > b.right + 1 || v.left < b.left - 1; })
    .map((r) => r.className));
  const ok = spill.length === 0 && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} tablet: stock values inside their cells${spill.length ? ': ' + spill.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// The phone sheet's low height: dragged down from the grabber, the reef is framed in two thirds of
// the screen; it is kept over a reload.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?bot=900');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  const sheet = () => page.evaluate(() => document.querySelector('aside.panel')!.className);
  const g = (await page.locator('.grabber').boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + 4);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y + 80, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const low = (await sheet()).includes('low');
  const top = await page.evaluate(() => document.querySelector('aside.panel')!.getBoundingClientRect().top / innerHeight);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  const kept = (await sheet()).includes('low');
  // A tap from low goes to the usual half, a second to tall.
  await page.locator('.grabber').click();
  const half = !/low|tall/.test(await sheet());
  await page.locator('.grabber').click();
  const tall = (await sheet()).includes('tall');
  const ok = low && top > 0.6 && kept && half && tall && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} the phone sheet drops low, stays low over a reload, taps up to half and tall (top ${top.toFixed(2)})${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// A pinch on the scene (outside view mode) belongs to the game: the page itself must not zoom, or
// the layout stays magnified with no way back but another pinch.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?bot=600');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  const cdp = await page.context().newCDPSession(page);
  const pts = (d: number) => [{ x: 195 - d, y: 300, id: 0 }, { x: 195 + d, y: 300, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(20) });
  for (let d = 20; d <= 150; d += 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  const scale = await page.evaluate(() => visualViewport!.scale);
  const ok = scale === 1 && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} a pinch on the scene does not zoom the page (scale ${scale})${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// The Bands tab's dot calls only for a story not yet shown: after loading a reef (all its stories
// listed, none new) and after a new band's card is read, it is off.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=12000');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  const dot = () => page.locator('.tab', { hasText: 'Bands' }).locator('.dot').isVisible();
  const afterLoad = await dot();
  const ok = !afterLoad && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} the Bands tab has no dot after a load${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

// Lineage enough for a trait it could not buy before: the Lineage tab says so until looked at.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=600');
  await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 30000 });
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  const dot = () => page.locator('.tab', { hasText: 'Lineage' }).locator('.dot').isVisible();
  await page.evaluate(() => { (window as unknown as { corallum: { state: { meta: { lineage: number } } } }).corallum.state.meta.lineage = 4; });
  await page.waitForTimeout(800);
  const on = await dot();
  await page.locator('.tab', { hasText: 'Lineage' }).click();
  await page.locator('.tab', { hasText: 'Grow' }).click();
  await page.waitForTimeout(400);
  const off = !(await dot());
  const ok = on && off && errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} the Lineage tab calls when a trait can be bought, and stops once looked at${errors.length ? ': ' + errors.join(' | ') : ''}`);
  if (!ok) process.exitCode = 1;
});

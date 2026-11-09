// Interaction test in a real browser: opening band, sweeping, buying (and hold-to-buy), saving,
// offline catch-up.
// Run with: node --no-warnings test/e2e/play.ts

import assert from 'node:assert/strict';
import { runBot } from '../../src/game/sim/bot.ts';
import { serialize } from '../../src/game/sim/save.ts';
import { VIEWPORTS, withGame } from '../../tools/browser.ts';

await withGame(async (open) => {
  for (const vp of VIEWPORTS.slice(0, 2)) {
    const { page, errors } = await open(vp, '');
    // The first band opens by itself on a new game.
    await page.waitForSelector('.reader:not([hidden]) >> text=Settling', { timeout: 10000 });
    await page.click('.reader:not([hidden]) >> text=Continue');

    // Sweep the water until a polyp is affordable.
    const box = await page.locator('#world').boundingBox();
    assert.ok(box);
    for (let i = 0; i < 40; i++) {
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await page.waitForTimeout(420);
      if (await page.locator('.card.ready').count()) break;
    }
    const polyp = page.locator('.card', { hasText: 'Bud a polyp' });
    await polyp.locator('button.buy').click();
    await polyp.locator('.level', { hasText: '×1' }).waitFor({ timeout: 3000 });

    // Press and hold keeps buying; letting go does not buy one more.
    await page.evaluate(() => { window.corallum!.state.calcite = 1e6; });
    const btn = (await polyp.locator('button.buy').boundingBox())!;
    await page.mouse.move(btn.x + 10, btn.y + 10);
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
    const held = await page.evaluate(() => window.corallum!.state.levels.polyp);
    assert.ok(held >= 4, `holding bought ${held - 1}`);

    // Saved, and survives a reload.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.reload();
    await page.waitForSelector(`.card >> text=×${held}`);

    // An hour away: rewrite savedAt and reload; the away summary appears.
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('corallum.save')!);
      raw.savedAt -= 3600_000;
      localStorage.setItem('corallum.save', JSON.stringify(raw));
    });
    // The page notices the foreign write on pagehide and does not save over it.
    await page.reload();
    const awayVisible = await page.locator('.away:not([hidden])').count();
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`ok   ${vp.name} (away summary ${awayVisible ? 'shown' : 'MISSING'})`);
    if (!awayVisible) process.exitCode = 1;
  }
  // A phone on its side, back after a long time in the middle of the game: the summary is
  // taller than the screen, and its button must still be reachable (the card scrolls).
  {
    const save = serialize(runBot((s) => s.t >= 9000, 9000).state, Date.now() - 8 * 3600_000);
    const { page, errors } = await open(VIEWPORTS[2]!, '', { save });
    await page.waitForSelector('.away:not([hidden])', { timeout: 15000 });
    // What a finger needs: the overlay itself scrolls (a script could scroll even an overflow: hidden
    // box), and the card does not start above the top of the screen.
    const tall = await page.evaluate(() => {
      const o = document.querySelector('.away:not([hidden])') as HTMLElement;
      const card = o.querySelector('.reader-card')!.getBoundingClientRect();
      const scrolls = ['auto', 'scroll'].includes(getComputedStyle(o).overflowY) && o.scrollHeight > o.clientHeight;
      o.scrollTop = o.scrollHeight;
      return card.height > innerHeight && card.top >= 0 && scrolls;
    });
    await page.locator('.away:not([hidden]) button', { hasText: 'Return to the reef' }).click({ timeout: 5000 });
    const closed = !(await page.locator('.away:not([hidden])').count());
    const ok = tall && closed && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} landscape: a summary taller than the screen scrolls to its button and closes`);
    if (!ok) process.exitCode = 1;
  }
  // Back after an update and a long absence: the news and the away summary both want the screen.
  // One card at a time: the summary first, the news when it is closed.
  {
    const st = runBot((s) => s.t >= 3000, 3000).state;
    st.meta.seen = st.meta.seen.filter((k) => !k.startsWith('news:'));
    const { page, errors } = await open(VIEWPORTS[1]!, '', { save: serialize(st, Date.now() - 3 * 3600_000) });
    await page.waitForSelector('.away:not([hidden])', { timeout: 15000 });
    const shown = () => page.locator('.reader:not([hidden])').count();
    const atOnce = await shown();
    await page.locator('.away:not([hidden]) button', { hasText: 'Return to the reef' }).click();
    const news = await page.locator('.reader:not([hidden]) h2').first().textContent();
    const ok = atOnce === 1 && (await shown()) === 1 && !!news && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} one card at a time: away summary, then the news (${news})`);
    if (!ok) process.exitCode = 1;
  }

  // Back after a long time and closed in a hurry (Escape), Ossel's gift is not lost: the haul is taken.
  {
    const st = runBot((s) => s.t >= 9000, 9000).state;
    st.meta.seen = [...st.meta.seen, 'news:seen'];
    const { page, errors } = await open(VIEWPORTS[0]!, '', { save: serialize(st, Date.now() - 8 * 3600_000) });
    await page.waitForSelector('.away:not([hidden]) .welcome-gift', { timeout: 15000 });
    const c0 = await page.evaluate(() => window.corallum!.state.calcite);
    await page.keyboard.press('Escape');
    const gained = (await page.evaluate(() => window.corallum!.state.calcite)) / c0;
    const ok = gained > 1.2 && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} an untaken welcome gift: closing takes the haul (calcite ×${gained.toFixed(2)})`);
    if (!ok) process.exitCode = 1;
  }

  // A dream (a quarter hour slept forward) is summed up as a dream, not as time away.
  {
    const { page, errors } = await open(VIEWPORTS[0]!, '?bot=4000');
    await page.waitForFunction(() => window.corallum?.state.t !== undefined, null, { timeout: 30000 });
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    await page.evaluate(() => { window.corallum!.state.meta.dreams = 1; });
    await page.locator('button', { hasText: /^Dream/ }).click();
    const title = await page.locator('.away:not([hidden]) h2').innerText({ timeout: 5000 });
    const ok = /dreamed/i.test(title) && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} a dream's summary: "${title}"`);
    if (!ok) process.exitCode = 1;
  }

  // A device asleep with the page open: the frame clock stands still (macOS, Linux, Android) while
  // the wall clock runs on. Two hours on the wall and none on the frame clock is two hours away.
  {
    const { page, errors } = await open(VIEWPORTS[0]!, '', { save: serialize(runBot((s) => s.t >= 3000, 3000).state, Date.now()) });
    await page.waitForFunction(() => window.corallum?.state.t !== undefined, null, { timeout: 30000 });
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    const t0 = await page.evaluate(() => window.corallum!.state.t);
    await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 2 * 3600_000; });
    await page.waitForSelector('.away:not([hidden])', { timeout: 5000 }).catch(() => {});
    const gained = (await page.evaluate(() => window.corallum!.state.t)) - t0;
    const away = await page.locator('.away:not([hidden])').count();
    const ok = gained > 7000 && away === 1 && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} a device asleep: ${Math.round(gained)} s of the reef's time, away summary ${away ? 'shown' : 'missing'}`);
    if (!ok) process.exitCode = 1;
  }

  // Keys after the mouse: a button the mouse clicked keeps focus, and must not swallow the
  // shortcuts (P after a tab click buys; Space after the sound button sweeps, sound stays on).
  {
    const { page, errors } = await open(VIEWPORTS[0]!, '?bot=3000');
    await page.waitForFunction(() => window.corallum?.state.t !== undefined, null, { timeout: 30000 });
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    await page.evaluate(() => { window.corallum!.state.calcite = 1e12; });
    const polyps = () => page.evaluate(() => window.corallum!.state.levels.polyp);
    const p0 = await polyps();
    await page.locator('button.tab', { hasText: 'Bands' }).click();
    await page.locator('button.tab', { hasText: 'Grow' }).click();
    await page.keyboard.press('p');
    const bought = (await polyps()) - p0;
    await page.locator('#sound').click();
    const sweeps0 = await page.evaluate(() => window.corallum!.state.tally.sweeps);
    await page.keyboard.press(' ');
    const sound = await page.locator('#sound').getAttribute('aria-pressed');
    const swept = (await page.evaluate(() => window.corallum!.state.tally.sweeps)) - sweeps0;
    // A sweep by key shows its number, as a tap does.
    const numbered = await page.locator('.float:not(.feast-float)').count() > 0;
    // A folding header the mouse clicked keeps focus: Space sweeps and does not fold it back.
    await page.locator('section.shoals > header').click();
    const folded = () => page.evaluate(() => document.querySelector('section.shoals')!.classList.contains('folded'));
    const f0 = await folded();
    await page.waitForTimeout(600); // the last sweep's cooldown
    const sw1 = await page.evaluate(() => window.corallum!.state.tally.sweeps);
    await page.keyboard.press(' ');
    const f1 = await folded(), sw2 = await page.evaluate(() => window.corallum!.state.tally.sweeps);
    const headerOk = f1 === f0 && sw2 - sw1 === 1;
    // N greets creatures in view one after another, each counted as touched as a tap would.
    const touchedNow = () => page.evaluate(() => window.corallum!.state.meta.seen.filter((k) => k.startsWith('t:')).length);
    const t0 = await touchedNow();
    for (let i = 0; i < 3; i++) await page.keyboard.press('n');
    const greeted = (await touchedNow()) - t0;
    const ok = bought === 1 && sound === 'true' && swept === 1 && numbered && headerOk && greeted >= 2 && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} keys after the mouse: P buys (${bought}), Space sweeps (${swept}${numbered ? ', a number shown' : ', NO number'}), sound stays ${sound === 'true' ? 'on' : 'off'}, a clicked header ${headerOk ? 'keeps its fold' : 'took the Space'}, N greets ${greeted} creatures`);
    if (!ok) process.exitCode = 1;
  }
  // The back gesture with a story card open closes the card and stays in the game; a card closed
  // by its button leaves no extra history entry behind.
  {
    const { page, errors } = await open(VIEWPORTS[1]!, '?bot=900');
    await page.waitForFunction(() => window.corallum, null, { timeout: 30000 });
    for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.locator('.reader:not([hidden]) button').first().click();
    await page.locator('.tab', { hasText: 'Bands' }).click();
    await page.locator('.band').first().click();
    await page.locator('.reader:not([hidden])').waitFor({ timeout: 3000 });
    await page.waitForTimeout(400);
    const url = page.url();
    await page.evaluate(() => history.back());
    await page.locator('.reader:not([hidden])').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const closed = (await page.locator('.reader:not([hidden])').count()) === 0 && page.url() === url;
    await page.locator('.band').first().click();
    await page.waitForTimeout(400);
    await page.locator('.reader:not([hidden]) button').first().click();
    await page.waitForTimeout(500);
    const clean = (await page.evaluate(() => history.state)) === null;
    const ok = closed && clean && !errors.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} Back closes a story card (${closed ? 'closed, still here' : 'NOT closed'}), its button leaves ${clean ? 'no' : 'an extra'} history entry`);
    if (!ok) process.exitCode = 1;
  }
});

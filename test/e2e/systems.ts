// The newer systems through their cards, on one page: send an expedition and call it home, take a
// resident in, answer a riddle and the shoals' signal, pick up a shell, make a wish, shelter under a weed raft, break off old stone, close up against warm water, send the feeders into the rising. Each must change the state.

import { withGame, VIEWPORTS } from '../../tools/browser.ts';
import { RIDDLES } from '../../src/game/content/act3.ts';

let failed = false;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed = true;
};

await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=12000&at=60');
  page.setDefaultTimeout(4000);
  await page.waitForTimeout(2000);
  const dismiss = async () => {
    for (let i = 0; i < 12 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click().catch(() => {});
  };
  const st = () => page.evaluate(() => window.corallum!.state);
  await dismiss();

  // An expedition: send, then call home (glow made plentiful).
  await page.evaluate(() => { const s = window.corallum!.state; s.expedition.site = ''; s.glow = 1e9; });
  await page.waitForTimeout(300);
  await page.locator('.card.expedition button').click();
  check((await st()).expedition.site !== '', 'expedition sent');
  await page.waitForTimeout(300);
  await page.locator('.card.expedition button').click();
  check((await st()).expedition.site === '', 'shoals called home');
  await dismiss();

  // A resident: let go of the first, then take it back.
  const res0 = (await st()).residents.length;
  if (res0 > 0) {
    await page.locator('.resident.living button').first().click();
    check((await st()).residents.length === res0 - 1, 'resident let go');
    await page.locator('.resident:not(.living):not([hidden]) button').first().click();
    check((await st()).residents.length === res0, 'resident taken in');
  }

  // One waiting choice is open at a time; the others wait folded to their line, and a tap opens one.
  const unfold = async (box: ReturnType<typeof page.locator>) => {
    if (await box.evaluate((e) => e.classList.contains('later'))) await box.click();
  };
  // A riddle (reset so one is asked), answered rightly.
  await page.evaluate(() => { const s = window.corallum!.state; for (const k of Object.keys(s.riddles)) (s.riddles as Record<string, string>)[k] = ''; });
  await page.waitForTimeout(400);
  const lin = (await st()).meta.lineage;
  const box = page.locator('section.riddle');
  check(await box.isVisible(), 'riddle card shows');
  // Timed ones (a wish, a signal, a spawning) open beside it and are not counted.
  const openChoices = await page.locator('.page-grow > section.moment:not([hidden]):not(.later):not(.timed)').count();
  check(openChoices <= 1, `one waiting choice open at a time (${openChoices})`);
  await unfold(box);
  const asked = await box.locator('.truce-text').textContent();
  const r = RIDDLES.find((x) => x.ask === asked)!;
  await box.locator('button').nth(r.right).click();
  check((await st()).meta.lineage === lin + 2, 'riddle answered for lineage');

  // The rising: jump into one and send the feeders in.
  await page.evaluate(() => { const s = window.corallum!.state; s.t = Math.ceil(s.t / 1800) * 1800 + 920; s.rose = -1; });
  await page.waitForTimeout(400);
  const c0 = (await st()).calcite;
  await page.locator('.rise-row button').click();
  check((await st()).rose >= 0 && (await st()).calcite > c0, 'feeders sent into the rising');

  // The grain of the stone: unset the last band's grain, then set it again on the card.
  const g0 = (await st()).grains.length;
  await page.evaluate(() => { window.corallum!.state.grains.pop(); });
  await page.waitForTimeout(400);
  await unfold(page.locator('section.grain'));
  await page.locator('section.grain button').first().click();
  check((await st()).grains.length === g0 && (await st()).grains.at(-1) === 'dense', 'a band set with its grain');

  // The sport: unchoose it, then keep the first one this strain throws.
  await page.evaluate(() => { window.corallum!.state.sport = ''; });
  await page.waitForTimeout(400);
  await unfold(page.locator('section.sport'));
  await page.locator('section.sport button:not([hidden])').first().click();
  check((await st()).sport !== '', 'the strain\'s sport chosen');

  // A dream: the reef sleeps a quarter of an hour forward, and says what happened.
  await page.evaluate(() => { window.corallum!.state.meta.dreams = 1; });
  await page.waitForTimeout(400);
  const t0 = (await st()).t;
  await page.locator('.prep-row .dream').click();
  check((await st()).t >= t0 + 900 && (await st()).meta.dreams === 0, 'a dream sleeps the reef forward');
  await page.locator('.away:not([hidden]) button').last().click().catch(() => {});
  await dismiss();

  // Ossel's question: answered, remembered, and answered back.
  await unfold(page.locator('section.ossel-asks'));
  await page.locator('section.ossel-asks button').first().click();
  check((await st()).asked.silt === '0', 'Ossel asked, and answered');
  await dismiss();

  // The shoals' signal: repeat the pattern.
  const pattern = await page.evaluate(() => window.corallum!.signal());
  check(!!pattern, 'a signal comes');
  if (pattern) {
    await page.waitForTimeout(400 + pattern.length * 650 + 700);
    const answered = (await st()).signal.answered;
    for (const i of pattern) await page.keyboard.press(['7', '8', '9', '0'][i]!);
    await page.waitForTimeout(300);
    check((await st()).signal.answered === answered + 1, 'signal answered by keys');
  }
  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
});

await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=17000&at=150');
  page.setDefaultTimeout(4000);
  await page.waitForTimeout(2000);
  for (let i = 0; i < 12 && (await page.locator('.reader:not([hidden])').count()); i++)
    await page.locator('.reader:not([hidden]) button').first().click().catch(() => {});
  await page.evaluate(() => { window.corallum!.state.meta.shells = []; window.corallum!.shell(); });
  await page.waitForTimeout(600);
  // Moving the clock can bring a story (a trip coming home): close it so the tap reaches the sand.
  for (let i = 0; i < 12 && (await page.locator('.reader:not([hidden])').count()); i++)
    await page.locator('.reader:not([hidden]) button').first().click().catch(() => {});
  await page.waitForTimeout(200);
  const p = await page.evaluate(() => window.corallum!.spots.find((q) => q.id === 'shell'));
  if (p) await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.corallum!.state.meta.shells.length)) === 1, 'shell picked up');
  // A fish in trouble: free it.
  await page.evaluate(() => window.corallum!.tangle());
  await page.waitForTimeout(500);
  const tg = await page.evaluate(() => window.corallum!.spots.find((q) => q.id === 'tangle'));
  if (tg) await page.mouse.click(tg.x, tg.y);
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.corallum!.state.tally.freed)) === 1, 'a fish freed from a jelly’s threads');
  // Old stone on the tips: tap a knob to break it off.
  const k = await page.evaluate(() => window.corallum!.spots.find((q) => q.id === 'old'));
  if (k) await page.mouse.click(k.x, k.y);
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.corallum!.state.tally.pruned)) === 1, 'a knob of old stone broken off');
  // Warm water: close the polyps, then open them again.
  await page.locator('.heat-row:not(.rise-row) .heat-toggle').click();
  check((await page.evaluate(() => window.corallum!.state.closed)) === true, 'polyps closed against warm water');
  await page.locator('.heat-row:not(.rise-row) .heat-toggle').click();
  check((await page.evaluate(() => window.corallum!.state.closed)) === false, 'polyps opened to the sun');
  check(errors.length === 0, 'no console errors (Sunlit)');
});
await withGame(async (open) => {
  // At the Breach: wait for shooting stars, and make a wish for the line.
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=24400&at=60');
  page.setDefaultTimeout(4000);
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const t = window.corallum!.state.t; window.corallum!.skip(1200 - ((t + 640) % 1200) + 20); });
  for (let i = 0; i < 12 && (await page.locator('.away:not([hidden]) button, .reader:not([hidden]) button').count()); i++)
    await page.locator('.away:not([hidden]) button, .reader:not([hidden]) button').first().click().catch(() => {});
  const before = await page.evaluate(() => window.corallum!.state.meta.lineage);
  await page.locator('.wish button', { hasText: 'For the line' }).click();
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.corallum!.state.meta.lineage)) === before + 1, 'a wish on falling stars, for the line');
  // A weed raft drifting over: shelter the young under it.
  await page.evaluate(() => window.corallum!.raft());
  await page.waitForTimeout(500);
  for (let i = 0; i < 12 && (await page.locator('.away:not([hidden]) button, .reader:not([hidden]) button').count()); i++)
    await page.locator('.away:not([hidden]) button, .reader:not([hidden]) button').first().click().catch(() => {});
  const ra = await page.evaluate(() => window.corallum!.spots.find((q) => q.id === 'raft'));
  if (ra) await page.mouse.click(ra.x, ra.y);
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.corallum!.state.tally.rafts)) === 1, 'the young sheltered under a weed raft');
  check(errors.length === 0, 'no console errors (Breach)');
});
await withGame(async (open) => {
  // The Midnight Water: call a lost shoal home. The Twilight Shelf: catch a drifting fragment.
  for (const [q, hook, id, read, what] of [
    ['?bot=4000&at=60', 'stray', 'stray', 'levels.shoal', 'a lost shoal called home'],
    ['?bot=9000&at=60', 'fragment', 'fragment', 'fragments', 'a drifting fragment taken in'],
  ] as const) {
    const { page, errors } = await open(VIEWPORTS[0]!, q);
    await page.waitForTimeout(2000);
    for (let i = 0; i < 12 && (await page.locator('.reader:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button').first().click().catch(() => {});
    const get = () => page.evaluate((r) => r.split('.').reduce((o: any, k) => o[k], window.corallum!.state) as number, read);
    const before = await get();
    await page.evaluate((h) => (window.corallum as any)[h](), hook);
    await page.waitForTimeout(500);
    for (let i = 0; i < 12 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++)
      await page.locator('.reader:not([hidden]) button, .away:not([hidden]) button').first().click().catch(() => {});
    const p = await page.evaluate((x) => window.corallum!.spots.find((s) => s.id === x), id);
    if (p) await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(200);
    check((await get()) === before + 1, what);
    check(errors.length === 0, `no console errors (${hook})`);
    await page.close();
  }
});
// The Twilight Shelf: an upwelling waits, the water box says so, and U turns the current into it (a haul).
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=12000');
  await page.waitForFunction(() => window.corallum?.state.t !== undefined, null, { timeout: 60000 });
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  for (let n = 0; n < 200 && !(await page.locator('.current-row.upwelling').count()); n++) {
    await page.evaluate(() => window.corallum!.skip(5));
    await page.waitForTimeout(40);
  }
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  const said = await page.locator('.water').first().innerText();
  const c0 = await page.evaluate(() => window.corallum!.state.calcite);
  await page.mouse.click(300, 400);
  await page.keyboard.press('u');
  await page.waitForTimeout(300);
  const caught = (await page.evaluate(() => window.corallum!.state.calcite)) > c0 * 1.05 && !(await page.locator('.current-row.upwelling').count());
  check(/upwelling/.test(said) && caught, 'an upwelling shown in the water box, caught with U');
  check(errors.length === 0, 'no console errors (upwelling)');
});
// An ask done in the panel leads there on a tap: "Read a band" opens the Bands tab at the reading.
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[1]!, '?bot=4000');
  await page.waitForFunction(() => window.corallum?.state.t !== undefined, null, { timeout: 60000 });
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  await page.evaluate(() => { const s = window.corallum!.state; s.request.kind = 'read'; s.request.n = 1; s.request.base = s.readings.length; });
  await page.locator('.ask.goes').waitFor({ timeout: 3000 });
  await page.locator('.ask-text').click();
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const card = document.querySelector('.card.reading') as HTMLElement, pages = document.querySelector('.pages')!.getBoundingClientRect();
    const b = card.getBoundingClientRect();
    return { tab: document.querySelector('.tab.on')?.textContent ?? '', inView: b.bottom > pages.top && b.top < pages.bottom };
  });
  check(r.tab.startsWith('Bands') && r.inView, 'an ask to read leads to the Bands tab, at the reading');
  check(errors.length === 0, 'no console errors (ask)');
});

// The night sky on the narrowest phone: every figure can be traced by tapping its stars in order
// (a real touch: the browser snaps a tap to a button near it, so a star close to a corner button
// toggled the view and moved the sky away mid-figure).
await withGame(async (open) => {
  const { page, errors } = await open({ name: 'tiny', width: 320, height: 568, scale: 2, mobile: true }, '?bot=23500');
  page.setDefaultTimeout(4000);
  await page.waitForTimeout(2500);
  for (let i = 0; i < 12 && (await page.locator('.reader:not([hidden])').count()); i++)
    await page.locator('.reader:not([hidden]) button').first().click().catch(() => {});
  const rows = page.locator('.sky-row');
  const n = await rows.count();
  const missed: string[] = [];
  for (let i = 0; i < n; i++) {
    const name = (await rows.nth(i).locator('strong').textContent()) ?? `figure ${i}`;
    await rows.nth(i).locator('.sky-trace').click();
    await page.waitForTimeout(300);
    const stars = await page.evaluate(() => window.corallum!.spots.filter((p) => p.id === 'star').sort((a, b) => a.n! - b.n!));
    for (const p of stars) { await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(80); }
    const named = await page.evaluate((k) => Object.values(window.corallum!.state.sky).filter(Boolean).length >= k, i + 1);
    if (!named) missed.push(name);
    // Whatever happened, back to the panel for the next figure.
    if (await page.evaluate(() => document.documentElement.classList.contains('view-mode'))) await page.locator('#view-mode').click();
    await page.waitForTimeout(200);
  }
  check(n > 0 && missed.length === 0, `320 px phone: all ${n} figures traced by touch${missed.length ? ` (missed: ${missed.join(', ')})` : ''}`);
  check(errors.length === 0, 'no console errors (sky, 320 px)');
});
// The whole climb replayed (Shift+T) from the Twilight Shelf: the dark lower zones pass, a tap ends
// it, and it leaves nothing behind: no arrival (zone title, story), nothing new in the journal (the
// bot's reef has never seen the Silt Floor's creatures, which the replay shows).
await withGame(async (open) => {
  const { page, errors } = await open(VIEWPORTS[0]!, '?bot=12000');
  await page.waitForFunction(() => window.corallum, null, { timeout: 60000 });
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.keyboard.press('Escape');
  await page.waitForTimeout(6000);
  const bright = () => page.evaluate(() => {
    const src = document.querySelector('canvas') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i]! + d[i + 1]! + d[i + 2]!;
    return sum / (d.length / 4) / 3;
  });
  const seen0 = await page.evaluate(() => window.corallum!.state.meta.seen.length);
  const b0 = await bright();
  await page.keyboard.press('Shift+T');
  await page.waitForTimeout(3500);
  const b1 = await bright();
  await page.mouse.click(400, 400);
  await page.waitForTimeout(4000);
  const b2 = await bright();
  const after = await page.evaluate(() => ({
    seen: window.corallum!.state.meta.seen.length,
    title: !!document.querySelector('#zone-title.show'),
    story: !!document.querySelector('.reader:not([hidden])'),
  }));
  check(b1 < b0 * 0.7 && b2 > b0 * 0.8, `the whole climb replays the dark lower zones and a tap ends it (brightness ${b0.toFixed(0)} → ${b1.toFixed(0)} → ${b2.toFixed(0)})`);
  check(after.seen === seen0 && !after.title && !after.story, `the replay leaves nothing behind (seen ${seen0} → ${after.seen}${after.title ? ', a zone title' : ''}${after.story ? ', a story' : ''})`);
  check(errors.length === 0, 'no console errors (the whole climb)');
});
process.exitCode = failed ? 1 : 0;

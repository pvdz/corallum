// The newer systems through their cards, on one page: send an expedition and call it home, take a
// resident in, answer a riddle and the shoals' signal, pick up a shell, break off old stone, close up against warm water, send the feeders into the rising. Each must change the state.

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

  // A riddle (reset so one is asked), answered rightly.
  await page.evaluate(() => { const s = window.corallum!.state; for (const k of Object.keys(s.riddles)) (s.riddles as Record<string, string>)[k] = ''; });
  await page.waitForTimeout(400);
  const lin = (await st()).meta.lineage;
  const box = page.locator('section.riddle');
  check(await box.isVisible(), 'riddle card shows');
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
  await page.locator('section.grain button').first().click();
  check((await st()).grains.length === g0 && (await st()).grains.at(-1) === 'dense', 'a band set with its grain');

  // The sport: unchoose it, then keep the first one this strain throws.
  await page.evaluate(() => { window.corallum!.state.sport = ''; });
  await page.waitForTimeout(400);
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
process.exitCode = failed ? 1 : 0;

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentFragment, takeFragment, currentTangle, freeTangle, visitor, visited, setDay, currentFeast, wishOpen, makeWish, flare, prune, oldKnobs, inMilky, guarding, lucky, currentThorn, dayOf, catchUpwelling, currentUpwelling, setCurrent as turnCurrent, currentSwell, rideSwell, dailyGift, dream, heatLeft, inHeat, cyclesBetween, chooseSport, canFeedRising, feedRising, risingHaul, act1Done, advance, calciteRate, gift, knownBonus, rates, assign, bloomHold, breach, breachReady, buy, canBreach, ended, memoriesAvailable, moonFull, moonPhase, spawnTarget, untilFullMoon, nextTier, speak, sunlight, calciteHold, choose, cost, glowHold, heightCap, heightForBands, bandMetres, idleShoals, maxed, murmurHold, nextMeeting, planktonHold, raspMax, read, reassign, sandHold, setRasp, siltHold, sweep, timeUntil } from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';
import { newGame, type GameState } from '../../src/game/sim/state.ts';
import { GIFT, LUCKY } from '../../src/game/content/creatures.ts';
import { HEAT } from '../../src/game/content/act4.ts';
import { RISING } from '../../src/game/content/act2.ts';
import { SWELL } from '../../src/game/content/events.ts';
import { OLD } from '../../src/game/content/act1.ts';
import { WISH } from '../../src/game/content/sky.ts';
import { MILKY } from '../../src/game/content/act2.ts';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));
const clone = (s: GameState): GameState => structuredClone(s);

/** A mid-act state with every kind of upgrade bought, upstream stocks far from settled. */
function midGame(): GameState {
  const { state } = runBot((s) => s.levels.vent >= 1 && s.levels.lure >= 1, 3 * 3600);
  state.glow = 0;
  return state;
}

/** An Act II state with shoals on every job, readings bought, everything off equilibrium. */
function act2Game(): GameState {
  const { state } = runBot((s) => s.readings.length >= 3 && s.jobs.scout > 0, 6 * 3600, { ventures: false });
  state.glow = 0;
  state.plankton = 0;
  state.levels.skeleton += 3; // the reef is mid-rise
  return state;
}

test('offline (one call) equals online (many 1/60 s frames)', () => {
  const a = midGame();
  const b = clone(a);
  advance(a, 600);
  for (let i = 0; i < 600 * 60; i++) advance(b, 1 / 60);
  assert.ok(rel(a.calcite, b.calcite) < 1e-6, `${a.calcite} vs ${b.calcite}`);
  assert.ok(rel(a.glow, b.glow) < 1e-9);
  assert.ok(rel(a.height, b.height) < 1e-9);
  assert.ok(rel(a.earned.calcite, b.earned.calcite) < 1e-6);
});

test('Act II: offline equals online with glow, plankton, murmurs and height all moving', () => {
  const a = act2Game();
  const b = clone(a);
  advance(a, 900);
  for (let i = 0; i < 900 * 30; i++) advance(b, 1 / 30);
  for (const k of ['calcite', 'glow', 'plankton', 'murmurs', 'height'] as const)
    assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
});

test('Act II saturates: every stock settles at its hold', () => {
  const s = act2Game();
  const week = advance(clone(s), 7 * 86400);
  const month = advance(clone(s), 30 * 86400);
  assert.ok(rel(week.plankton, planktonHold(s)) < 1e-9);
  assert.ok(rel(week.calcite, calciteHold(s)) < 1e-9);
  assert.ok(rel(month.murmurs, murmurHold(s)) < 1e-9);
  assert.equal(week.calcite, month.calcite);
});

test('band heights: zones end exactly at their boundaries', () => {
  let sum = 0;
  const tops = new Set<number>();
  for (let l = 0; l < 200; l++) {
    sum += bandMetres(l);
    assert.ok(rel(heightForBands(l + 1), sum) < 1e-12);
    tops.add(heightForBands(l + 1));
  }
  for (const boundary of [60, 3000, 3800, 3980, 4000]) assert.ok(tops.has(boundary), `no band ends at ${boundary}`);
  assert.equal(heightForBands(20), 60);
  assert.equal(heightForBands(400), 4000);
});

/** A Twilight Shelf state: Rasp grazing, sand bars up, silt far from settled. */
function act3Game(): GameState {
  const { state } = runBot((s) => s.height >= 3350, 12 * 3600, { ventures: false });
  state.silt = 0;
  state.glow = 0;
  state.levels.skeleton += 1;
  return state;
}

test('Act III: offline equals online with silt, sand and every other stock moving', () => {
  const a = act3Game();
  const b = clone(a);
  advance(a, 600);
  for (let i = 0; i < 600 * 20; i++) advance(b, 1 / 20);
  for (const k of ['calcite', 'glow', 'plankton', 'murmurs', 'height', 'silt', 'sand'] as const)
    assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
});

test('Act III saturates: silt and sand settle at their holds', () => {
  const s = act3Game();
  const week = advance(clone(s), 7 * 86400);
  assert.ok(rel(week.silt, siltHold(s)) < 1e-9);
  assert.ok(rel(week.sand, sandHold(s)) < 1e-6);
  assert.ok(rel(week.calcite, calciteHold(s)) < 1e-9);
});

test('truce: meetings come in order, after their band, paid in murmurs', () => {
  const s = newGame(1);
  s.murmurs = 1e6;
  assert.equal(nextMeeting(s), undefined);
  s.bands.push('grinding', 'sand', 'shelf-edge');
  assert.equal(nextMeeting(s)?.id, 'terms');
  assert.equal(choose(s, 'story', 'a'), false);
  assert.ok(choose(s, 'terms', 'b'));
  assert.equal(raspMax(s), 2);
  assert.ok(choose(s, 'story', 'a'));
  const sand = s.sand;
  assert.ok(choose(s, 'wall', 'a'));
  assert.ok(s.sand > sand);
  assert.equal(nextMeeting(s), undefined);
});

test('story gates hold the reef back', () => {
  const s = newGame(1);
  assert.equal(heightCap(s), 3000);
  s.readings.push('inside-the-wall');
  assert.ok(heightCap(s) < 3800);
  s.truce.wall = 'b';
  assert.ok(heightCap(s) >= 3800 && heightCap(s) < 3980);
  s.dialects.spawn = 'broadcast';
  assert.equal(heightCap(s), 4000);
  // The band that would cross the cap is not for sale.
  const s2 = newGame(1);
  while (heightForBands(s2.levels.skeleton + 1) <= 3000) s2.levels.skeleton++;
  assert.ok(maxed(s2, 'skeleton'));
});

test('shoals: new ones join the last job; scouting opens with the murmur band', () => {
  const s = newGame(1);
  s.height = 100;
  s.glow = 1e6;
  assert.ok(buy(s, 'shoal'));
  assert.equal(s.jobs.feed, 1);
  assert.equal(reassign(s, 'feed', 'scout'), false);
  s.bands.push('murmur');
  assert.ok(reassign(s, 'feed', 'scout'));
  assert.ok(buy(s, 'shoal'));
  assert.equal(s.jobs.scout, 2);
  assert.ok(assign(s, 'scout', -1));
  assert.equal(idleShoals(s), 1);
  assert.ok(assign(s, 'light', 1));
  assert.equal(idleShoals(s), 0);
  assert.equal(assign(s, 'light', 1), false);
});

test('readings: in order, paid in murmurs, only once the murmur band is read', () => {
  const s = newGame(1);
  s.murmurs = 1e6;
  assert.equal(read(s, 'city'), false);
  s.bands.push('murmur');
  assert.equal(read(s, 'lattice-songs'), false);
  assert.ok(read(s, 'city'));
  assert.equal(read(s, 'city'), false);
  assert.ok(s.murmurs < 1e6);
});

test('offline saturates at the hold: a week equals a month', () => {
  const s = midGame();
  const week = advance(clone(s), 7 * 86400);
  const month = advance(clone(s), 30 * 86400);
  assert.ok(rel(week.calcite, calciteHold(s)) < 1e-9);
  assert.ok(rel(week.glow, glowHold(s)) < 1e-9);
  assert.equal(week.calcite, month.calcite);
});

test('a month offline is cheap to compute, even late with slow stocks still creeping', () => {
  // Late game: bloom creeps toward its hold long after glow has settled; steps must not stay
  // as short as glow's (that made a week away take over a minute).
  for (const s of [midGame(), act4Game()]) {
    const t0 = performance.now();
    advance(s, 30 * 86400);
    assert.ok(performance.now() - t0 < 100, `${(performance.now() - t0).toFixed(0)} ms`);
  }
});

test('buying spends the right currency and raises cost', () => {
  const s = newGame(1);
  s.calcite = 100;
  const c = cost(s, 'polyp');
  assert.ok(buy(s, 'polyp'));
  assert.equal(s.calcite, 100 - c);
  assert.ok(cost(s, 'polyp') > c);
  s.calcite = 0;
  assert.equal(buy(s, 'polyp'), false);
});

test('timeUntil is consistent with advance', () => {
  const s = midGame();
  s.calcite = 0;
  const target = calciteHold(s) * 0.5;
  const eta = timeUntil(s, 'calcite', target);
  assert.ok(Number.isFinite(eta));
  const at = advance(clone(s), eta);
  assert.ok(rel(at.calcite, target) < 0.02, `${at.calcite} vs ${target}`);
  assert.equal(timeUntil(s, 'calcite', calciteHold(s) * 2), Infinity);
});

test('bands are read in height order and the act completes', () => {
  const { state } = runBot(act1Done, 6 * 3600);
  assert.ok(act1Done(state));
  assert.deepEqual(state.bands, ['wake', 'silt', 'bands', 'moon', 'thousandfold', 'forgetting', 'beaks', 'rise']);
  assert.equal(state.act, 2);
});

/** A Sunlit Crown state: bloom far from settled, a dialect spoken. */
function act4Game(): GameState {
  const { state } = runBot((s) => s.height >= 3880, 16 * 3600, { ventures: false });
  state.bloom = 0;
  state.glow = 0;
  state.levels.skeleton += 1;
  return state;
}

test('Act IV: offline equals online with bloom moving', () => {
  const a = act4Game();
  assert.ok(a.dialects.form);
  const b = clone(a);
  advance(a, 600);
  for (let i = 0; i < 600 * 20; i++) advance(b, 1 / 20);
  for (const k of ['calcite', 'bloom', 'height', 'silt'] as const)
    assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
  // Closed against warm water, nothing in the rates changes with time: bloom settles at its hold.
  a.closed = true;
  const week = advance(clone(a), 7 * 86400);
  assert.ok(rel(week.bloom, bloomHold(a)) < 1e-9);
});

test('warm spells: an open reef bleaches, offline equals online across the edges, and a month skips whole cycles exactly', () => {
  const a = act4Game();
  a.t = Math.ceil(a.t / HEAT.period) * HEAT.period - 100; // a warm spell begins in 100 s
  a.closed = false;
  const b = clone(a);
  advance(a, 600);
  for (let i = 0; i < 600 * 20; i++) advance(b, 1 / 20);
  for (const k of ['calcite', 'bloom'] as const) assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
  const warm = clone(b);
  warm.t = Math.ceil(warm.t / HEAT.period) * HEAT.period + 10;
  const shut = clone(warm);
  shut.closed = true;
  assert.ok(rates(shut).bloomK < rates(warm).bloomK, 'closed polyps do not bleach');
  // A month in one call (cycles skipped) against a month in sub-cycle calls (every cycle stepped).
  const month = advance(clone(a), 30 * 86400);
  const slow = clone(a);
  while (slow.t < month.t - 1e-6) advance(slow, Math.min(1700, month.t - slow.t));
  for (const k of ['calcite', 'bloom', 'height'] as const) assert.ok(rel(month[k], slow[k]) < 1e-6, `${k}: ${month[k]} vs ${slow[k]}`);
  assert.ok(rel(month.earned.calcite, slow.earned.calcite) < 1e-6);
});

test('the rising: the feeders go in once per rising, for a haul by the share feeding', () => {
  const s = act2Game();
  assert.ok(s.jobs.feed > 0);
  s.t = Math.ceil(s.t / HEAT.period) * HEAT.period + RISING.start + 10;
  assert.ok(canFeedRising(s));
  const half = clone(s);
  half.jobs.light += half.jobs.feed - Math.floor(half.jobs.feed / 2);
  half.jobs.feed = Math.floor(half.jobs.feed / 2);
  const c0 = s.calcite, want = risingHaul(s);
  assert.ok(rel(feedRising(s), want) < 1e-12 && rel(s.calcite, c0 + want) < 1e-12);
  assert.equal(feedRising(s), 0, 'once per rising');
  assert.ok(risingHaul(half) < want);
  s.t += HEAT.period;
  assert.ok(feedRising(s) > 0, 'the next one comes');
  s.t += RISING.length;
  assert.equal(canFeedRising(s), false);
  // Deep larder: twice into the same rising, not three times.
  s.meta.traits['deep-larder'] = 1;
  s.t += HEAT.period - RISING.length;
  assert.ok(feedRising(s) > 0 && feedRising(s) > 0);
  assert.equal(feedRising(s), 0);
});

test('the sport: only at the Twilight Shelf, only of the strain kept, once', () => {
  const s = newGame(1);
  s.strain = 'blue';
  s.height = 2999;
  assert.equal(chooseSport(s, 'ice'), false);
  s.height = 3000;
  assert.equal(chooseSport(s, 'amber'), false, 'not a gold sport on a blue reef');
  const glow = rates(s).glowP;
  assert.ok(chooseSport(s, 'ice'));
  assert.equal(chooseSport(s, 'lamp'), false);
  s.levels.symbiont = 3;
  const plain = clone(s);
  plain.sport = '';
  assert.ok(rel(rates(s).glowP, rates(plain).glowP * 1.25) < 1e-12 && glow >= 0);
});

test('cyclesBetween counts every spell that overlaps the absence, partial ones included', () => {
  const s = act4Game();
  const P = HEAT.period;
  const k = Math.ceil(s.t / P) * P;
  assert.deepEqual(cyclesBetween(s, k + 300, k + P - 1), { heat: 0, risings: 0 });
  assert.equal(cyclesBetween(s, k + 100, k + 300).heat, 1, 'left mid-spell');
  assert.equal(cyclesBetween(s, k + 300, k + 3 * P + 1).heat, 3);
  // On a shallow seamount the spells last twice as long.
  s.seamount = 'shallow';
  assert.equal(cyclesBetween(s, k + 300, k + 400).heat, 1);
  s.t = k + 300;
  assert.ok(inHeat(s) && rel(heatLeft(s), 180) < 1e-12);
});

test('dreams: one with each new day, at most three kept, each spent once', () => {
  const s = midGame();
  s.meta.lastDay = 0;
  for (let d = 1; d <= 5; d++) dailyGift(s, d);
  assert.equal(s.meta.dreams, 3);
  assert.ok(dream(s) && dream(s) && dream(s));
  assert.equal(dream(s), false);
});

test('swells: a tap on the crest pays once, a tap between crests misses', () => {
  const s = newGame(3);
  s.height = 3990;
  let sw = null;
  for (let i = 0; i < 400 && !sw; i++) { s.t += 1; sw = currentSwell(s); }
  assert.ok(sw);
  s.t = sw!.start + SWELL.lead + SWELL.gap; // the second crest
  rideSwell(s);
  assert.equal(s.swell.caught, 0b10);
  rideSwell(s);
  s.t += SWELL.gap / 2;
  assert.equal(rideSwell(s), 0, 'between crests');
  s.t = sw!.start + SWELL.lead + 4 * SWELL.gap + SWELL.slack * 0.9;
  rideSwell(s);
  assert.equal(s.swell.caught, 0b10010, 'the last crest, just late');
});

test('upwellings: caught once, only with the current turned toward them', () => {
  const s = act3Game();
  let up = null;
  for (let i = 0; i < 600 && !up; i++) { s.t += 1; up = currentUpwelling(s); }
  assert.ok(up);
  turnCurrent(s, -up!.side);
  assert.equal(catchUpwelling(s), 0, 'turned away');
  turnCurrent(s, up!.side * 2);
  assert.ok(catchUpwelling(s) > 0);
  assert.equal(catchUpwelling(s), 0, 'once');
});

test("the day's sea: the same for everyone on a day, and it changes the rates", () => {
  const seen = new Set<string>();
  for (let d = 20000; d < 20060; d++) seen.add(dayOf(d));
  assert.ok(seen.size >= 5, 'the days vary');
  assert.equal(dayOf(20391), dayOf(20391));
  const s = midGame();
  s.meta.today = '';
  const base = rates(s).glowP;
  s.meta.today = 'bright';
  assert.ok(rel(rates(s).glowP, base * 1.2) < 1e-12);
});

test('a thorny seamount: intruders twice as often', () => {
  const count = (sm: 'plain' | 'thorny') => {
    const s = act3Game();
    s.seamount = sm;
    s.thorned = -1;
    let n = 0, last = -1;
    for (let i = 0; i < 4 * 3600; i += 5) {
      s.t += 5;
      const th = currentThorn(s);
      if (th && th.k !== last) { n++; last = th.k; }
    }
    return n;
  };
  const plain = count('plain'), thorny = count('thorny');
  assert.ok(thorny >= plain * 1.8 && thorny <= plain * 2.2, `${plain} vs ${thorny}`);
});

test('fanning shoals: only on the shelf, they sweep silt, and a trip takes them first and brings them back', () => {
  const low = act2Game();
  assert.equal(assign(low, 'fan', 1), false, 'not below the shelf');
  const s = act3Game();
  const k0 = rates(s).siltK;
  while (idleShoals(s) < 2 && (s.jobs.feed > 0)) reassign(s, 'feed', 'light');
  s.jobs.feed -= 2; // two shoals free
  assert.ok(assign(s, 'fan', 1) && assign(s, 'fan', 1));
  assert.ok(rel(rates(s).siltK - k0, 0.006) < 1e-9);
  const total = s.levels.shoal;
  const idle = idleShoals(s);
  assert.equal(idle + s.jobs.feed + s.jobs.light + s.jobs.scout + s.jobs.fan, total);
});

test('sweep combos: quick sweeps pay more, up to double; a pause resets', () => {
  const s = midGame();
  s.t += 100;
  const one = sweep(s);
  s.t += 0.5;
  const two = sweep(s);
  assert.ok(rel(two, one * 1.1) < 0.01, `${one} ${two}`);
  for (let i = 0; i < 20; i++) { s.t += 0.5; sweep(s); }
  assert.equal(s.combo, 11);
  s.t += 5;
  sweep(s);
  assert.equal(s.combo, 1);
});

test('flaring the lure: half the glow for a burst, then a cooldown', () => {
  const s = act2Game();
  s.glow = glowHold(s);
  const c0 = s.calcite, g0 = s.glow;
  assert.ok(flare(s) > 0 && s.calcite > c0);
  assert.equal(s.glow, g0 / 2);
  assert.equal(flare(s), 0, 'cooling down');
  s.t += 61;
  assert.ok(flare(s) > 0);
});

test('dialects: one per tier, in order, after their band, paid in bloom', () => {
  const s = newGame(1);
  s.bloom = 1e9;
  assert.equal(nextTier(s), undefined);
  s.bands.push('form', 'craft', 'way-of-spawning');
  assert.equal(speak(s, 'sweepers'), false);
  assert.ok(speak(s, 'plating'));
  assert.equal(speak(s, 'massive'), false);
  assert.ok(speak(s, 'mucus'));
  assert.ok(speak(s, 'brooding'));
  assert.equal(nextTier(s), undefined);
  s.bands.push('storm');
  assert.ok(speak(s, 'chorus'));
  assert.deepEqual(s.dialects, { form: 'plating', craft: 'mucus', spawn: 'brooding', song: 'chorus' });
});

test('the moon: full for a window each cycle; untilFullMoon lands in it', () => {
  let fullFrames = 0;
  for (let t = 0; t < 1200; t += 1) if (moonFull(t)) fullFrames++;
  assert.ok(fullFrames > 150 && fullFrames < 230, `${fullFrames}`);
  for (const t of [0, 100, 500, 599, 700, 1100]) {
    const wait = untilFullMoon(t);
    assert.ok(moonFull(t + wait + 1e-6), `t=${t} wait=${wait} phase=${moonPhase(t + wait)}`);
    if (wait > 1) assert.ok(!moonFull(t + wait - 1));
  }
});

test('the Breach: needs the surface, the spawn, the full moon and exactly three memories', () => {
  const s = newGame(1);
  for (const b of ['wake', 'bands', 'thousandfold', 'grinding', 'colour']) s.bands.push(b);
  s.height = 4000;
  s.spawn = spawnTarget(s);
  s.t = 0;
  assert.ok(breachReady(s));
  assert.equal(canBreach(s), false);
  s.t = untilFullMoon(0) + 1;
  assert.ok(canBreach(s));
  assert.equal(breach(s, ['vent', 'ossel']), false);
  assert.equal(breach(s, ['vent', 'ossel', 'rain']), false, 'rain has not happened');
  assert.equal(breach(s, ['vent', 'vent', 'ossel']), false);
  assert.ok(memoriesAvailable(s).length >= 5);
  assert.ok(breach(s, ['vent', 'ossel', 'rasp']));
  assert.ok(ended(s));
  assert.equal(canBreach(s), false);
  // The lineage remembers the ending and what was carried, across runs.
  assert.equal(s.meta.endings, 1);
  assert.deepEqual([...s.meta.carriedEver].sort(), ['ossel', 'rasp', 'vent']);
});

test('pacing: the whole game takes the bot 6–11 h whatever the path', () => {
  for (const opts of [
    {},
    { truce: { terms: 'b', story: 'b', wall: 'b' }, dialects: { form: 'massive', craft: 'fluorescent', spawn: 'brooding', song: 'lullaby' } },
  ] as const) {
    const { state } = runBot(ended, 14 * 3600, opts);
    assert.ok(ended(state) && state.t > 6 * 3600 && state.t < 11 * 3600, `${JSON.stringify(opts)}: ${state.t}s`);
  }
});

test('shoal jobs: light-swimmers still matter high up (the lure does not saturate)', async () => {
  const { jobGain } = await import('../../src/game/sim/economy.ts');
  const { state } = runBot((x) => x.height >= 3400, 8 * 3600);
  assert.ok(jobGain(state, 'light') > 0.005, `light: ${jobGain(state, 'light')}`);
  assert.ok(jobGain(state, 'feed') > 0.005, `feed: ${jobGain(state, 'feed')}`);
});

test('upgradeGain: multipliers report their settled worth; the lattice reports hold', async () => {
  const { upgradeGain, calciteHold } = await import('../../src/game/sim/economy.ts');
  const { state } = runBot((x) => x.height >= 3400, 8 * 3600);
  const g = upgradeGain(state, 'sandbar');
  assert.ok(g > 0.05 && g < 0.5, `sandbar ${g}`);
  const next = { ...state, levels: { ...state.levels, lattice: state.levels.lattice + 1 } };
  assert.ok(Math.abs(upgradeGain(state, 'lattice') - (calciteHold(next) / calciteHold(state) - 1)) < 1e-12);
});

test('great tide moons: every third full moon carries four memories', async () => {
  const { greatMoon, carryAt, untilGreatMoon, moonFull } = await import('../../src/game/sim/economy.ts');
  const P = 1200;
  const fulls = [0, 1, 2, 3, 4, 5].map((k) => k * P + P / 2);
  const plain = newGame(1);
  assert.deepEqual(fulls.map((t) => carryAt(plain, t)), [3, 3, 4, 3, 3, 4]);
  // A Tide-reader lineage rides a great tide every full moon.
  plain.meta.traits['tide-reader'] = 1;
  assert.deepEqual(fulls.map((t) => carryAt(plain, t)), [4, 4, 4, 4, 4, 4]);
  for (const t of [0, 700, 1500, 2400, 2950, 3700]) {
    const w = untilGreatMoon(t);
    assert.ok(greatMoon(t + w) && moonFull(t + w), `from ${t}: ${w}`);
    assert.ok(w <= 3 * P);
  }
  // Under a great moon the Breach wants four.
  const s = newGame(1);
  for (const b of ['wake', 'bands', 'thousandfold', 'grinding', 'colour']) s.bands.push(b);
  s.height = 4000;
  s.spawn = spawnTarget(s);
  s.t = 2 * P + P / 2;
  assert.equal(breach(s, ['vent', 'ossel', 'rasp']), false);
  assert.ok(breach(s, ['vent', 'ossel', 'rasp', 'thousandfold']));
});

test('the journal feeds the reef: +2% calcite per creature seen, +1% more once touched', () => {
  const s = newGame(5);
  s.levels.polyp = 10;
  const base = calciteRate(s);
  s.meta.seen.push('c:jelly', 'c:rattail', 't:jelly', 'f:feast', 'did:photo');
  assert.ok(Math.abs(knownBonus(s) - 1.05) < 1e-12);
  assert.ok(Math.abs(calciteRate(s) / base - 1.05) < 1e-9);
});

test('gifts: a touched neighbour gives its own stock once per cooldown, calcite when the reef makes none', () => {
  const s = newGame(5);
  s.levels.polyp = 10;
  s.levels.symbiont = 5;
  s.t = 1000;
  s.luckySpan = Math.floor(s.t / LUCKY.span); // no lucky neighbour in this test
  const r = rates(s);
  const g = gift(s, 'jelly');
  assert.equal(g?.stock, 'glow');
  assert.ok(Math.abs(g!.amount - Math.min(r.glowP * GIFT.seconds, GIFT.holdShare * r.glowP / r.glowK)) < 1e-9);
  assert.equal(gift(s, 'jelly'), null, 'cooling down');
  // The Rasp give sand, but this reef makes none yet: calcite instead.
  assert.equal(gift(s, 'rasp')?.stock, 'calcite');
  s.t += GIFT.cooldown;
  assert.equal(gift(s, 'jelly')?.stock, 'glow', 'again after the cooldown');
  // A rare visitor gives several times a common one's calcite.
  const common = gift(s, 'rattail')!.amount;
  assert.ok(Math.abs(gift(s, 'giant-squid')!.amount / common - GIFT.rare) < 1e-9);
});

test('old stone: fills toward its cap the same away as stepped (across skipped warm spells); a knob breaks off in place', () => {
  const away = newGame(3), stepped = newGame(3);
  for (const s of [away, stepped]) s.height = 3850;
  advance(away, 6 * HEAT.period);
  for (let i = 0; i < 6 * HEAT.period / 60; i++) advance(stepped, 60);
  assert.ok(Math.abs(away.old - stepped.old) < 1e-9, `${away.old} vs ${stepped.old}`);
  assert.ok(Math.abs(away.old - OLD.max * (1 - Math.exp(-OLD.k * 6 * HEAT.period))) < 1e-9);
  assert.ok(away.old < OLD.max);
  const s = away;
  const n = oldKnobs(s);
  const before = s.oldSlots.slice(0, n);
  assert.ok(prune(s, before[1]!) > 0);
  assert.deepEqual(s.oldSlots.slice(0, n - 1).sort(), before.filter((x) => x !== before[1]).sort(), 'the others stay where they were');
  assert.equal(prune(s, before[1]!), 0, 'gone');
  assert.equal(s.tally.pruned, 1);
});

test('a heavy seamount gathers old stone three times as fast; met, its trial doubles what a knob pays on later reefs', () => {
  const plain = newGame(4), heavy = newGame(4);
  heavy.seamount = 'heavy';
  advance(plain, 300);
  advance(heavy, 300);
  const k = OLD.k;
  assert.ok(Math.abs(heavy.old - OLD.max * (1 - Math.exp(-3 * k * 300))) < 1e-9);
  assert.ok(Math.abs(plain.old - OLD.max * (1 - Math.exp(-k * 300))) < 1e-9);
  const a = newGame(5), b = newGame(5);
  for (const s of [a, b]) { s.levels.polyp = 5; s.old = 2; }
  b.meta.seen.push('trial:heavy');
  const pa = prune(a, a.oldSlots[0]!), pb = prune(b, b.oldSlots[0]!);
  assert.ok(Math.abs(pb / pa - 2) < 1e-9, `${pb / pa}`);
});

test('a milky sea: in the Midnight Water, for a minute in each period, sweeps gather glow too', () => {
  const s = newGame(6);
  s.height = 500;
  s.levels.symbiont = 4;
  s.t = MILKY.start + MILKY.period + 10;
  assert.ok(inMilky(s));
  const g0 = s.glow;
  sweep(s);
  assert.ok(Math.abs(s.glow - g0 - rates(s).glowP * MILKY.glowSeconds) < 1e-9);
  s.t += MILKY.length;
  assert.ok(!inMilky(s));
  s.height = 10;
  s.t = MILKY.start + 10;
  assert.ok(!inMilky(s), 'not on the Silt Floor');
});

test('guard shoals: in the light, four on guard drive intruders off by themselves; not below it', () => {
  const s = newGame(8);
  s.levels.shoal = 6;
  s.height = 3000;
  assert.equal(assign(s, 'guard', 1), false, 'not on the shelf');
  s.height = 3850;
  for (let i = 0; i < 4; i++) assert.ok(assign(s, 'guard', 1));
  assert.equal(idleShoals(s), 2);
  assert.ok(guarding(s));
});

test('lucky neighbours: now and then a creature is lucky; touched, it gives at once and ×5, once per span', () => {
  const s = newGame(9);
  s.levels.polyp = 10;
  // Find a span of time when the jelly is lucky.
  s.t = 0;
  while (!lucky(s, 'jelly')) s.t += LUCKY.span;
  const normal = newGame(9);
  normal.levels.polyp = 10;
  normal.t = s.t;
  normal.luckySpan = Math.floor(s.t / LUCKY.span); // already claimed in this span: an ordinary touch
  s.gifts.jelly = s.t; // even cooling down
  const g = gift(s, 'jelly')!, n = gift(normal, 'jelly')!;
  assert.ok(Math.abs(g.amount / n.amount - LUCKY.mult) < 1e-9, `${g.amount / n.amount}`);
  assert.ok(!lucky(s, 'jelly'), 'claimed for this span');
  assert.ok(s.meta.seen.includes('g:jelly'));
});

test('shooting stars at the Breach: one wish per shower; for the line at most three times a reef', () => {
  const s = newGame(13);
  s.height = 3990;
  s.t = WISH.period - WISH.offset + 5;
  assert.ok(wishOpen(s));
  const l0 = s.meta.lineage;
  assert.equal(makeWish(s, 'line'), 1);
  assert.equal(s.meta.lineage, l0 + 1);
  assert.ok(!wishOpen(s), 'once per shower');
  for (let i = 0; i < 3; i++) { s.t += WISH.period; makeWish(s, 'line'); }
  assert.equal(s.meta.lineage, l0 + WISH.lineMax);
  s.t += WISH.period;
  assert.ok(makeWish(s, 'tablet') >= 1000, 'a shard while any are lost');
  s.height = 3000;
  assert.ok(!wishOpen(s), 'only at the Breach');
});

test('a silent seamount is not held at the Midnight Water by a Reading it cannot read', () => {
  const s = newGame(31);
  assert.ok(heightCap(s) <= 3000);
  s.seamount = 'silent';
  assert.ok(heightCap(s) > 3000);
});

test('a gleaming seamount: no feasts fall, and lucky neighbours come three times as often', () => {
  const plain = newGame(41), gleam = newGame(41);
  gleam.seamount = 'gleaming';
  for (const s of [plain, gleam]) s.bands.push('beaks');
  let a = 0, b = 0, feastsP = 0, feastsG = 0;
  for (let k = 0; k < 4000; k++) {
    plain.t = gleam.t = k * 120 + 10;
    if (lucky(plain, 'jelly')) a++;
    if (lucky(gleam, 'jelly')) b++;
    if (currentFeast(plain)) feastsP++;
    if (currentFeast(gleam)) feastsG++;
  }
  assert.equal(feastsG, 0);
  assert.ok(feastsP > 0);
  assert.ok(b > 2 * a, `${b} vs ${a}`);
});

test("today's visitor: one of the zone's creatures; its first touch today brings +1 lineage, once", () => {
  const s = newGame(51);
  s.height = 500;
  s.levels.polyp = 3;
  setDay(s, 20400);
  const v = visitor(s)!;
  assert.ok(v);
  const l0 = s.meta.lineage;
  gift(s, v);
  gift(s, v);
  assert.equal(s.meta.lineage, l0 + 1);
  setDay(s, 20401);
  assert.ok(!visited(s));
});

test('a creature in trouble: one per slot, freed once for a burst', () => {
  const s = newGame(61);
  s.height = 500;
  s.levels.polyp = 5;
  let found = false;
  for (s.t = 0; s.t < 5000 && !found; s.t += 5) found = !!currentTangle(s);
  assert.ok(found);
  assert.ok(freeTangle(s) > 0);
  assert.equal(currentTangle(s), null);
  assert.equal(freeTangle(s), 0);
});

test('drifting fragments: on the shelf and in the light, taken in one per slot, at most five, each calcite ×1.03', () => {
  const s = newGame(81);
  s.height = 3300;
  s.levels.polyp = 10;
  const base = calciteRate(s);
  let taken = 0;
  for (s.t = 0; s.t < 40000 && taken < 7; s.t += 5) if (currentFragment(s) && takeFragment(s)) taken++;
  assert.equal(s.fragments, 5);
  assert.ok(Math.abs(calciteRate(s) / base - 1.03 ** 5) < 1e-9);
});

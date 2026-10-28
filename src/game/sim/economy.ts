// Rates, time advance and purchases. Pure functions over GameState.
//
// The economy is a DAG of stocks, each obeying dx/dt = P - k*x:
//   glow     — from symbionts and light shoals; fades.
//   plankton — herded by feeding shoals; eaten fast.
//   height   — relaxes toward the target set by skeleton bands.
//   silt     — falls on the reef on the Twilight Shelf; swept by current and the Rasp.
//   murmurs  — heard by scouting shoals; fade slowly back into the stone.
//   sand     — ground by the Rasp; settles slowly.
//   calcite  — polyps × lure(glow) × feeding(plankton) × reach(height) × smother(silt);
//              dissolves (and is eaten by the Rasp).
// Counts are constant between purchases, so the upstream stocks have exact closed forms and
// calcite's production is a known function of time. Within each sub-step advance() integrates
// calcite exactly using Simpson's mean of that production; once every upstream stock has
// settled the production is constant and the rest of any span is a single exact step — so a
// month offline costs a few hundred iterations and ends exactly where the dynamics settle.

import { ACT1, BANDS_ACT1, MILESTONES, type Milestone } from '../content/act1.ts';
import { ACT2, BANDS_ACT2, READINGS, type Job, type ReadingId } from '../content/act2.ts';
import { ACT3, BANDS_ACT3, MEETINGS, type Choice, type Meeting, type MeetingId } from '../content/act3.ts';
import { ACT4, BANDS_ACT4, DIALECTS, TIERS, type DialectId, type DialectTier } from '../content/act4.ts';
import { ACT5, BANDS_ACT5, MEMORIES, type Memory, type MemoryId } from '../content/act5.ts';
import { act, actAt, LAST_PLAYABLE_ACT, SURFACE } from '../content/acts.ts';
import { LINEAGE, type TraitId } from '../content/lineage.ts';
import { FEAST } from '../content/events.ts';
import type { Band, Currency, UpgradeDef, UpgradeId } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades.ts';
import { equilibrium, relax } from './ode.ts';
import { mulberry32 } from './rng.ts';
import type { GameState } from './state.ts';

export const BANDS: readonly Band[] = [...BANDS_ACT1, ...BANDS_ACT2, ...BANDS_ACT3, ...BANDS_ACT4, ...BANDS_ACT5];

export type Rates = {
  glowP: number;
  glowK: number;
  planktonP: number;
  planktonK: number;
  murmurP: number;
  murmurK: number;
  siltP: number;
  siltK: number;
  sandP: number;
  sandK: number;
  bloomP: number;
  bloomK: number;
  spawnP: number;
  spawnK: number;
  /** Calcite production before the lure, feeding, reach and smother multipliers. */
  calciteBase: number;
  calciteK: number;
  lureMax: number;
  reachPower: number;
  heightTarget: number;
};

/**
 * Calcite/s once plankton and glow have settled at what the reef can hold: the honest way to
 * compare shoal jobs, whose effect arrives through those stocks.
 */
export function steadyCalciteRate(s: GameState): number {
  const r = rates(s);
  return calciteRate({ ...s, plankton: planktonHold(s, r), glow: glowHold(s, r), silt: siltHold(s, r), bloom: bloomHold(s, r) });
}

/**
 * What one more level of an upgrade does for calcite once things settle, as a fraction (+0.12 =
 * 12% more). For the lattice it is the change in what the reef can hold instead.
 */
export function upgradeGain(s: GameState, id: UpgradeId): number {
  const next: GameState = { ...s, levels: { ...s.levels, [id]: s.levels[id] + 1 } };
  if (id === 'lattice') return calciteHold(next) / calciteHold(s) - 1;
  const base = steadyCalciteRate(s);
  return base > 0 ? steadyCalciteRate(next) / base - 1 : 0;
}

/** How much more calcite (as a fraction) one more shoal on this job would bring, once settled. */
export function jobGain(s: GameState, job: 'feed' | 'light'): number {
  const base = steadyCalciteRate(s);
  const more = steadyCalciteRate({ ...s, jobs: { ...s.jobs, [job]: s.jobs[job] + 1 } });
  return base > 0 ? more / base - 1 : 0;
}

/** The Rasp dial setting at which the reef holds the most calcite. */
export function bestRasp(s: GameState): number {
  const keep = s.rasp;
  let best = 0, bestHold = -Infinity;
  for (let n = 0; n <= raspMax(s); n++) {
    s.rasp = n;
    const h = calciteHold(s);
    if (h > bestHold) { bestHold = h; best = n; }
  }
  s.rasp = keep;
  return best;
}

// ---------- Milestones ----------

/** The multiplier from every milestone reached at this level. */
export function milestoneMult(id: 'polyp' | 'symbiont', level: number): number {
  let m = 1;
  for (const ms of MILESTONES[id]) if (level >= ms.level) m *= ACT1.milestoneFactor;
  return m;
}

/** The next milestone above this level, if any. */
export function nextMilestone(id: 'polyp' | 'symbiont', level: number): Milestone | undefined {
  return MILESTONES[id].find((ms) => ms.level > level);
}

function trait(s: GameState, id: TraitId): number {
  return s.meta.traits[id];
}

/** Reef settling rate (1/s): how fast height follows the laid bands. */
export function settleRate(s: GameState): number {
  return ACT1.settleRate * (trait(s, 'settling') ? 2 : 1);
}

function has(s: GameState, id: ReadingId): boolean {
  return s.readings.includes(id);
}

export function speaks(s: GameState, id: DialectId): boolean {
  return s.dialects.form === id || s.dialects.craft === id || s.dialects.spawn === id;
}

/** Sunlight per symbiont colony; zero below the Sunlit Crown. */
export function sunlight(s: GameState, target = heightForBands(s.levels.skeleton)): number {
  if (target < ACT4.from) return 0;
  return ACT4.sunBase * (1 + (target - ACT4.from) / ACT4.sunGrowthPer) *
    ACT4.canopySun ** s.levels.canopy * (speaks(s, 'plating') ? 2 : 1);
}

export function raspMax(s: GameState): number {
  return s.levels.grounds * ACT3.raspPerGround + (s.truce.terms === 'a' ? 4 : s.truce.terms === 'b' ? 2 : 0);
}

export function rates(s: GameState): Rates {
  const lv = s.levels;
  const vent = lv.vent;
  const lightGlow = ACT2.lightGlow * (has(s, 'shoal-pact') ? 2 : 1);
  const target = heightForBands(lv.skeleton);
  const rasp = Math.min(s.rasp, raspMax(s));
  const onShelf = target >= ACT3.from;
  return {
    glowP: (ACT1.symbiontGlow * lv.symbiont * milestoneMult('symbiont', lv.symbiont) * (1 + ACT2.lightAmplify * s.jobs.light) +
      lightGlow * s.jobs.light) * 1.5 ** trait(s, 'glimmer'),
    glowK: ACT1.glowFade,
    planktonP: ACT2.feedRate * s.jobs.feed * (has(s, 'tidebooks') ? 2 : 1) * ACT3.channelPlankton ** lv.channel *
      (speaks(s, 'sweepers') ? 3 : 1),
    planktonK: ACT2.planktonEaten * (has(s, 'slow-currents') ? 0.6 : 1),
    murmurP: ACT2.scoutRate * s.jobs.scout * (has(s, 'beaked') ? 1.5 : 1),
    murmurK: ACT2.murmurFade,
    siltP: onShelf
      ? ACT3.siltFall * (1 + (target - ACT3.from) / ACT3.siltGrowthPer) * (s.truce.wall === 'a' ? 0.6 : 1)
      : 0,
    siltK: ACT3.naturalSweep + ACT3.flowSweep * lv.sandbar + LINEAGE.glassSweep * trait(s, 'glass-gardeners') + (ACT3.raspSweep * rasp * (s.truce.story === 'a' ? 2 : 1) * (s.truce.terms === 'b' ? 1.5 : 1)) * (speaks(s, 'mucus') ? 2 : 1),
    sandP: ACT3.raspSand * rasp * (s.truce.terms === 'a' ? 1.25 : 1),
    sandK: ACT3.sandSettle,
    bloomP: sunlight(s, target) * lv.symbiont * ACT4.pigmentBloom ** lv.pigment * ACT4.meadowBloom ** lv.meadow *
      (speaks(s, 'fluorescent') ? 1.5 : 1),
    bloomK: ACT4.bloomFade,
    spawnP: target >= ACT5.from
      ? lv.polyp * ACT5.spawnRate * ACT5.ripenSpawn ** lv.ripen * (speaks(s, 'broadcast') ? 2 : 1) *
        (1 + sunlight(s, target) * lv.symbiont / 100)
      : 0,
    spawnK: ACT5.spawnFade,
    calciteBase:
      (ACT1.trickle + ACT1.polypRate * lv.polyp * milestoneMult('polyp', lv.polyp) * (has(s, 'city') ? 1.5 : 1)) *
      ACT1.ventBoost ** vent *
      (has(s, 'inside-the-wall') ? 2 : 1) *
      (s.truce.wall === 'b' ? 1.25 : 1) *
      ACT3.sandbarCalcite ** lv.sandbar *
      (speaks(s, 'massive') ? 1.5 : 1) *
      1.5 ** trait(s, 'deep-memory'),
    calciteK:
      ACT1.dissolve * ACT1.latticeFactor ** lv.lattice * ACT1.ventAcid ** vent *
      (has(s, 'lattice-songs') ? 0.7 : 1) * (speaks(s, 'massive') ? 0.5 : 1) +
      (speaks(s, 'mucus') ? 0 : ACT3.raspEat * rasp * (s.truce.terms === 'b' ? ACT3.politeEat : 1)),
    lureMax: ACT1.lureMax + ACT1.lureMaxPerPattern * lv.lure + (has(s, 'fear') ? 1 : 0) + (speaks(s, 'fluorescent') ? 2 : 0),
    reachPower: ACT2.reachPower + (s.truce.story === 'b' ? 0.05 : 0),
    heightTarget: target,
  };
}

// ---------- Bands ----------
// Band l adds metres that depend on the zone it is laid in: 3 m on the Silt Floor, a growing
// stride through the Midnight Water (clipped so the zone ends exactly at its boundary), then a
// fixed stride per later zone. Costs grow per band by the zone's factor. Both are tabulated
// once; there are only a few hundred bands in the whole game.

const MAX_BANDS = 400;
/** Fixed band stride for each act after the second (index = act number). */
const STRIDE: Record<number, number> = { 3: 30, 4: 6, 5: 1 };
const COST_GROWTH: Record<number, number> = { 1: 1.55, 2: 1.155, 3: 1.2, 4: 1.135, 5: 1.028 };

const BAND_TOP = new Float64Array(MAX_BANDS + 1);
const BAND_COST = new Float64Array(MAX_BANDS + 1);
{
  BAND_COST[0] = 1;
  for (let l = 0; l < MAX_BANDS; l++) {
    const h = BAND_TOP[l]!;
    const zone = actAt(h);
    let m: number;
    if (zone === 1) m = ACT1.bandMetres;
    else if (zone === 2) m = ACT1.bandMetres * ACT2.bandGrowth ** Math.max(0, l - ACT2.bandGrowthFrom);
    else m = STRIDE[zone] ?? 1;
    const end = act(zone).to;
    BAND_TOP[l + 1] = Math.min(h + m, end);
    BAND_COST[l + 1] = BAND_COST[l]! * COST_GROWTH[zone]!;
  }
}

/** Reef height the first n bands raise the reef to. */
export function heightForBands(n: number): number {
  return BAND_TOP[Math.max(0, Math.min(MAX_BANDS, n))]!;
}

/** Metres the l-th band (0-based) adds. */
export function bandMetres(l: number): number {
  return heightForBands(l + 1) - heightForBands(l);
}

/**
 * The glow lure. Higher up the water is brighter and a reef's light stands out less, so the glow
 * it takes to lure half the food grows with height: glow stays worth having all the way up.
 */
export function lure(r: Rates, glow: number, height = 0): number {
  const half = ACT1.lureHalf * (1 + Math.max(0, height) / 60) ** ACT2.lureHalfPower;
  return 1 + (r.lureMax * glow) / (glow + half);
}

export function feeding(plankton: number): number {
  return 1 + Math.sqrt(Math.max(0, plankton)) / ACT2.planktonDiv;
}

export function reach(height: number, power: number = ACT2.reachPower): number {
  return Math.max(1, height / ACT2.reachFrom) ** power;
}

export function photo(bloom: number): number {
  return 1 + Math.sqrt(Math.max(0, bloom)) / ACT4.bloomDiv;
}

export function smother(silt: number): number {
  return 1 / (1 + Math.max(0, silt) / ACT3.smotherHalf);
}

function production(r: Rates, glow: number, plankton: number, height: number, silt: number, bloom: number): number {
  return r.calciteBase * lure(r, glow, height) * feeding(plankton) * reach(height, r.reachPower) * smother(silt) * photo(bloom);
}

/** Instantaneous calcite production per second. */
export function calciteRate(s: GameState, r = rates(s)): number {
  return production(r, s.glow, s.plankton, s.height, s.silt, s.bloom);
}

/** Net change per second right now. */
export function calciteNet(s: GameState, r = rates(s)): number {
  return calciteRate(s, r) - r.calciteK * s.calcite;
}
export function glowNet(s: GameState, r = rates(s)): number {
  return r.glowP - r.glowK * s.glow;
}
export function planktonNet(s: GameState, r = rates(s)): number {
  return r.planktonP - r.planktonK * s.plankton;
}
export function murmurNet(s: GameState, r = rates(s)): number {
  return r.murmurP - r.murmurK * s.murmurs;
}
export function siltNet(s: GameState, r = rates(s)): number {
  return r.siltP - r.siltK * s.silt;
}
export function sandNet(s: GameState, r = rates(s)): number {
  return r.sandP - r.sandK * s.sand;
}

/** Where each stock settles if nothing is bought: the reef's natural hold. */
export function calciteHold(s: GameState, r = rates(s)): number {
  const p = production(
    r, equilibrium(r.glowP, r.glowK), equilibrium(r.planktonP, r.planktonK), r.heightTarget,
    equilibrium(r.siltP, r.siltK), equilibrium(r.bloomP, r.bloomK),
  );
  return equilibrium(p, r.calciteK);
}
export function glowHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.glowP, r.glowK);
}
export function planktonHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.planktonP, r.planktonK);
}
export function murmurHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.murmurP, r.murmurK);
}
export function siltHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.siltP, r.siltK);
}
export function sandHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.sandP, r.sandK);
}
export function bloomHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.bloomP, r.bloomK);
}
export function spawnHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.spawnP, r.spawnK);
}
export function spawnNet(s: GameState, r = rates(s)): number {
  return r.spawnP - r.spawnK * s.spawn;
}
export function bloomNet(s: GameState, r = rates(s)): number {
  return r.bloomP - r.bloomK * s.bloom;
}

const EQ_EPS = 1e-12;
/** Sub-step length as a fraction of the fastest upstream time constant. */
const STEP_FRACTION = 0.03;

function settledAt(x: number, eq: number): boolean {
  return Math.abs(x - eq) <= EQ_EPS * Math.max(1, eq);
}

type Upstream = 'glow' | 'plankton' | 'height' | 'silt' | 'bloom';

/**
 * Advance the world by dt simulated seconds. Mutates and returns s. `stepFraction` trades
 * accuracy for speed in look-ahead probes; the game itself always uses the default.
 */
export function advance(s: GameState, dt: number, stepFraction = STEP_FRACTION): GameState {
  if (!(dt > 0)) return s;
  const r = rates(s);
  const kH = settleRate(s);
  const up: { key: Upstream; P: number; k: number; eq: number }[] = [
    { key: 'glow', P: r.glowP, k: r.glowK, eq: equilibrium(r.glowP, r.glowK) },
    { key: 'plankton', P: r.planktonP, k: r.planktonK, eq: equilibrium(r.planktonP, r.planktonK) },
    { key: 'height', P: kH * r.heightTarget, k: kH, eq: r.heightTarget },
    { key: 'silt', P: r.siltP, k: r.siltK, eq: equilibrium(r.siltP, r.siltK) },
    { key: 'bloom', P: r.bloomP, k: r.bloomK, eq: equilibrium(r.bloomP, r.bloomK) },
  ];
  const maxStep = stepFraction / Math.max(...up.map((u) => u.k));
  const at = (x: Record<Upstream, number>) => production(r, x.glow, x.plankton, x.height, x.silt, x.bloom);
  let left = dt;
  while (left > 0) {
    const settled = up.every((u) => settledAt(s[u.key], u.eq));
    const h = settled ? left : Math.min(left, maxStep);
    let p: number;
    if (settled) {
      for (const u of up) s[u.key] = u.eq;
      p = at(s);
    } else {
      const x0 = { glow: s.glow, plankton: s.plankton, height: s.height, silt: s.silt, bloom: s.bloom };
      const xm = { ...x0 }, x1 = { ...x0 };
      for (const u of up) {
        xm[u.key] = relax(x0[u.key], u.P, u.k, h / 2);
        x1[u.key] = relax(x0[u.key], u.P, u.k, h);
      }
      // Simpson's mean of the production curve over the step.
      p = (at(x0) + 4 * at(xm) + at(x1)) / 6;
      for (const u of up) s[u.key] = x1[u.key];
    }
    s.calcite = relax(s.calcite, p, r.calciteK, h);
    s.earned.calcite += p * h;
    left -= h;
  }
  s.earned.glow += r.glowP * dt;
  s.earned.murmurs += r.murmurP * dt;
  s.murmurs = relax(s.murmurs, r.murmurP, r.murmurK, dt);
  s.sand = relax(s.sand, r.sandP, r.sandK, dt);
  s.spawn = relax(s.spawn, r.spawnP, r.spawnK, dt);
  // Snap the last sliver so "reached the goal" is reachable in finite time.
  if (r.heightTarget - s.height < 1e-3) s.height = r.heightTarget;
  s.t += dt;
  s.act = Math.max(s.act, actAt(s.height));
  readBands(s);
  return s;
}

function readBands(s: GameState): void {
  for (const b of BANDS)
    if (s.height >= b.metres && !s.bands.includes(b.id)) s.bands.push(b.id);
}

export function upgrade(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((u) => u.id === id)!;
}

export function cost(s: GameState, id: UpgradeId): number {
  const u = upgrade(id);
  const l = s.levels[id];
  if (id === 'skeleton') {
    const discount = (has(s, 'walls') ? 0.75 : 1) * (speaks(s, 'branching') ? 0.6 : 1);
    return Math.ceil(u.baseCost * BAND_COST[Math.min(MAX_BANDS, l)]! * discount);
  }
  const discount = id === 'polyp' ? 0.85 ** trait(s, 'quick-budding') : 1;
  const [from, gentle] = u.growthAfter ?? [Infinity, u.growth];
  const scale = l <= from ? u.growth ** l : u.growth ** from * gentle ** (l - from);
  return Math.ceil(u.baseCost * scale * discount);
}

/**
 * Height the reef can currently grow to: the top of the last act with content. Story gates
 * hold it back further: the Twilight Shelf opens once Ossel's wall has been read, and the
 * shelf's last band waits for the choice about that wall.
 */
export function heightCap(s: GameState): number {
  let cap = act(LAST_PLAYABLE_ACT).to;
  if (!has(s, 'inside-the-wall')) cap = Math.min(cap, act(2).to);
  if (!s.truce.wall) cap = Math.min(cap, act(3).to - 1);
  if (!s.dialects.spawn) cap = Math.min(cap, act(4).to - 1);
  return cap;
}

export function maxed(s: GameState, id: UpgradeId): boolean {
  if (id === 'skeleton') {
    const next = heightForBands(s.levels.skeleton + 1);
    if (next > heightCap(s) || next <= heightForBands(s.levels.skeleton)) return true;
  }
  return s.levels[id] >= upgrade(id).maxLevel;
}

export function revealed(s: GameState, id: UpgradeId): boolean {
  let { level, earned, height, band } = upgrade(id).reveal;
  if (s.levels[id] > 0) return true;
  // Lineage traits that change the order things open in.
  if (id === 'shoal' && trait(s, 'early-shoals')) height = 20;
  if ((id === 'grounds' || id === 'sandbar') && trait(s, 'rasp-kin')) band = 'eyes';
  if (band !== undefined && !s.bands.includes(band)) return false;
  if (level && s.levels[level[0]] < level[1]) return false;
  if (earned !== undefined && s.earned.calcite < earned) return false;
  if (height !== undefined && s.height < height) return false;
  return true;
}

export function canAfford(s: GameState, id: UpgradeId): boolean {
  return !maxed(s, id) && revealed(s, id) && s[upgrade(id).currency] >= cost(s, id);
}

export function buy(s: GameState, id: UpgradeId): boolean {
  if (!canAfford(s, id)) return false;
  const c = cost(s, id);
  const cur: Currency = upgrade(id).currency;
  s[cur] -= c;
  s.levels[id] += 1;
  if (id === 'shoal') s.jobs[jobOpen(s, s.lastJob) ? s.lastJob : 'feed'] += 1;
  return true;
}

// ---------- Shoals ----------

export function idleShoals(s: GameState): number {
  return s.levels.shoal - s.jobs.feed - s.jobs.light - s.jobs.scout;
}

/** Move one shoal into (delta +1, from the idle pool) or out of (delta -1) a job. */
export function jobOpen(s: GameState, job: Job): boolean {
  return job !== 'scout' || readingsRevealed(s);
}

export function assign(s: GameState, job: Job, delta: 1 | -1): boolean {
  if (delta > 0) {
    if (!jobOpen(s, job)) return false;
    if (idleShoals(s) <= 0) return false;
    s.jobs[job] += 1;
    s.lastJob = job;
    return true;
  }
  if (s.jobs[job] <= 0) return false;
  s.jobs[job] -= 1;
  return true;
}

/** Move one shoal from one job straight to another. */
export function reassign(s: GameState, from: Job, to: Job): boolean {
  if (from === to || s.jobs[from] <= 0 || !jobOpen(s, to)) return false;
  s.jobs[from] -= 1;
  s.jobs[to] += 1;
  s.lastJob = to;
  return true;
}

// ---------- Readings ----------

export function reading(id: ReadingId) {
  return READINGS.find((r) => r.id === id)!;
}

/** The next Reading on offer: they are deciphered in order, one band at a time. */
export function nextReading(s: GameState) {
  return READINGS.find((r) => !s.readings.includes(r.id));
}

/** Murmurs a Reading costs (halved by the Kept readings trait). */
export function readingCost(s: GameState, r: { cost: number }): number {
  return r.cost * (trait(s, 'kept-readings') ? 0.5 : 1);
}

/** Murmurs it takes to learn a meeting's words. */
export function meetingWords(s: GameState, m: { words: number }): number {
  return m.words * (trait(s, 'kept-readings') ? 0.5 : 1);
}

export function readingsRevealed(s: GameState): boolean {
  return s.bands.includes('murmur') || s.readings.length > 0;
}

export function read(s: GameState, id: ReadingId): boolean {
  const next = nextReading(s);
  if (!readingsRevealed(s) || !next || next.id !== id || s.murmurs < readingCost(s, next)) return false;
  s.murmurs -= readingCost(s, next);
  s.readings.push(id);
  return true;
}

// ---------- The Rasp and the truce ----------

/** Set how many Rasp may graze (clamped to what the grounds allow). */
export function setRasp(s: GameState, n: number): void {
  s.rasp = Math.max(0, Math.min(raspMax(s), Math.round(n)));
}

export function meeting(id: MeetingId): Meeting {
  return MEETINGS.find((m) => m.id === id)!;
}

/** The meeting waiting to happen: in order, once its band is read and the last was decided. */
export function nextMeeting(s: GameState): Meeting | undefined {
  for (const m of MEETINGS) {
    if (s.truce[m.id]) continue;
    return s.bands.includes(m.after) ? m : undefined;
  }
  return undefined;
}

/** Make a truce choice: pays the murmurs it took to learn the words. */
export function choose(s: GameState, id: MeetingId, choice: Choice): boolean {
  const m = nextMeeting(s);
  if (!m || m.id !== id || s.murmurs < meetingWords(s, m)) return false;
  s.murmurs -= meetingWords(s, m);
  s.truce[id] = choice;
  // Ossel's wall, ground down: a flood of warm sand.
  if (id === 'wall' && choice === 'a') s.sand += 50000;
  setRasp(s, s.rasp);
  return true;
}

// ---------- Dialects ----------

export function dialect(id: DialectId) {
  return DIALECTS.find((d) => d.id === id)!;
}

/** The tier waiting for a choice: in order, once its band is read. */
export function nextTier(s: GameState) {
  for (const t of TIERS) {
    if (s.dialects[t.tier]) continue;
    return s.bands.includes(t.band) ? t : undefined;
  }
  return undefined;
}

/** Choose a dialect for its tier, paid in bloom. Permanent. */
export function speak(s: GameState, id: DialectId): boolean {
  const d = dialect(id);
  const t = nextTier(s);
  if (!t || t.tier !== d.tier || s.bloom < t.cost) return false;
  s.bloom -= t.cost;
  s.dialects[d.tier] = id;
  return true;
}

export function dialectOf(s: GameState, tier: DialectTier): DialectId | '' {
  return s.dialects[tier];
}

// ---------- The Spawning Moon and the Breach ----------

/** 0..1 through the lunar cycle; full at 0.5. */
export function moonPhase(t: number): number {
  return (((t / ACT5.moonPeriod) % 1) + 1) % 1;
}

export function moonFull(t: number): boolean {
  return Math.abs(moonPhase(t) - 0.5) <= ACT5.fullWindow;
}

/** Every few cycles the full moon brings a great tide: the spawn can carry one more memory. */
export function greatMoon(t: number): boolean {
  return Math.floor(t / ACT5.moonPeriod) % ACT5.greatEvery === ACT5.greatEvery - 1;
}

/** Whether a release at time t rides a great tide (always, for a Tide-reader lineage). */
export function greatTide(s: GameState, t = s.t): boolean {
  return trait(s, 'tide-reader') > 0 || greatMoon(t);
}

/** Memories a release at time t may carry. */
export function carryAt(s: GameState, t = s.t): number {
  return greatTide(s, t) ? ACT5.greatCarry : ACT5.carry;
}

/** Seconds until the next full moon that is a great tide (0 while one is full). */
export function untilGreatMoon(t: number): number {
  // Walk from one full moon to the next until one is great.
  let at = moonFull(t) ? t : t + untilFullMoon(t) + 1e-6;
  for (let k = 0; k <= ACT5.greatEvery; k++) {
    if (greatMoon(at)) return at - t;
    at = (Math.floor(at / ACT5.moonPeriod) + 1 + 0.5 - ACT5.fullWindow) * ACT5.moonPeriod + 1e-6;
  }
  return Infinity;
}

/** Seconds until the moon is next full (0 while it is). */
export function untilFullMoon(t: number): number {
  if (moonFull(t)) return 0;
  const p = moonPhase(t);
  const start = 0.5 - ACT5.fullWindow;
  return ((start - p + 1) % 1) * ACT5.moonPeriod;
}

export function spawnTarget(s: GameState): number {
  return ACT5.target * (speaks(s, 'brooding') ? 0.6 : 1);
}

export function memoryAvailable(s: GameState, m: Memory): boolean {
  if (m.needs.band && !s.bands.includes(m.needs.band)) return false;
  if (m.needs.reading && !s.readings.includes(m.needs.reading as ReadingId)) return false;
  return true;
}

export function memoriesAvailable(s: GameState): Memory[] {
  return MEMORIES.filter((m) => memoryAvailable(s, m));
}

export function ended(s: GameState): boolean {
  return s.carried.length > 0;
}

/** Everything but the moon is ready: at the surface with enough spawn. */
export function breachReady(s: GameState): boolean {
  return !ended(s) && s.height >= SURFACE && s.spawn >= spawnTarget(s);
}

export function canBreach(s: GameState): boolean {
  return breachReady(s) && moonFull(s.t);
}

/** The finale: release the spawn under the full moon, carrying exactly as many memories as it allows. */
export function breach(s: GameState, memories: MemoryId[]): boolean {
  if (!canBreach(s)) return false;
  const unique = [...new Set(memories)];
  if (unique.length !== carryAt(s)) return false;
  for (const id of unique) {
    const m = MEMORIES.find((x) => x.id === id);
    if (!m || !memoryAvailable(s, m)) return false;
  }
  s.released = s.spawn;
  s.spawn = 0;
  s.carried = unique;
  s.breachedAt = s.t;
  s.meta.carriedEver = [...new Set([...s.meta.carriedEver, ...unique])];
  s.meta.endings++;
  return true;
}

// ---------- Look-ahead ----------

/** Seconds until `amount` of a currency is held if nothing is bought; Infinity if never. */
export function timeUntil(s: GameState, cur: Currency | 'murmurs' | 'spawn', amount: number): number {
  const have = s[cur];
  if (have >= amount) return 0;
  const r = rates(s);
  if (cur === 'glow') return solveRelax(have, r.glowP, r.glowK, amount);
  if (cur === 'murmurs') return solveRelax(have, r.murmurP, r.murmurK, amount);
  if (cur === 'sand') return solveRelax(have, r.sandP, r.sandK, amount);
  if (cur === 'bloom') return solveRelax(have, r.bloomP, r.bloomK, amount);
  if (cur === 'spawn') return solveRelax(have, r.spawnP, r.spawnK, amount);
  if (calciteHold(s, r) <= amount) return Infinity;
  // Calcite's production drifts with glow and plankton; probe forward in growing exact steps.
  const probe: GameState = { ...s, earned: { ...s.earned }, bands: [] };
  let t = 0;
  for (let step = 1; t < 1e8; step = Math.min(step * 1.5, 3600)) {
    const before = probe.calcite;
    advanceStocks(probe, step);
    if (probe.calcite >= amount) {
      // Linear interpolation inside the last step is plenty for a countdown label.
      return t + (step * (amount - before)) / (probe.calcite - before);
    }
    t += step;
  }
  return Infinity;
}

function solveRelax(x0: number, p: number, k: number, target: number): number {
  const eq = equilibrium(p, k);
  if (eq <= target) return Infinity;
  return Math.log((eq - x0) / (eq - target)) / k;
}

/** advance() without height, bands or time — for look-ahead probes. */
function advanceStocks(s: GameState, dt: number): void {
  const { height, t, act } = s;
  advance(s, dt, 0.5);
  s.height = height;
  s.t = t;
  s.act = act;
}

// ---------- Hand sweep ----------

export function canSweep(s: GameState): boolean {
  return s.t - s.lastSweep >= ACT1.sweepCooldown;
}

/** Sweep the tentacles by hand: a small burst that matters early and fades into noise later. */
export function sweep(s: GameState): number {
  if (!canSweep(s)) return 0;
  const gain = ACT1.sweepFlat + calciteRate(s) * ACT1.sweepSeconds;
  s.calcite += gain;
  s.earned.calcite += gain;
  s.lastSweep = s.t;
  return gain;
}

// ---------- Falling feasts ----------

export type Feast = { k: number; start: number; x: number; kind: number };

/** Feast slot k: when in it the feast starts, where it falls (0..1 across) and what it is. */
function feastAt(seed: number, k: number): Feast {
  const r = mulberry32((seed ^ 0x6fea57) + Math.imul(k, 0x9e3779b1));
  return { k, start: k * FEAST.period + r() * (FEAST.period - FEAST.life), x: 0.15 + r() * 0.7, kind: Math.floor(r() * 3) };
}

/** The feast sinking past right now, if there is one still uneaten. */
export function currentFeast(s: GameState): Feast | null {
  if (!s.bands.includes(FEAST.band)) return null;
  const k = Math.floor(s.t / FEAST.period);
  if (k <= s.feasted) return null;
  const f = feastAt(s.seed, k);
  return s.t >= f.start && s.t < f.start + FEAST.life ? f : null;
}

/** Eat the current feast: a burst of calcite. Returns the amount (0 if there is none). */
export function feast(s: GameState): number {
  const f = currentFeast(s);
  if (!f) return 0;
  const gain = calciteRate(s) * FEAST.seconds;
  s.calcite += gain;
  s.earned.calcite += gain;
  s.feasted = f.k;
  s.feasts++;
  return gain;
}

export function act1Done(s: GameState): boolean {
  return s.height >= ACT1.goalMetres;
}

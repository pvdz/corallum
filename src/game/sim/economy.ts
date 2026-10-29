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
import { ACT2, BANDS_ACT2, daughterCount, READINGS, type Job, type ReadingId } from '../content/act2.ts';
import { ACT3, BANDS_ACT3, FAVOURS, MEETINGS, type FavourId, type Choice, type Meeting, type MeetingId } from '../content/act3.ts';
import { ACT4, BANDS_ACT4, DIALECTS, OTHERS, TIERS, type DialectId, type DialectTier } from '../content/act4.ts';
import { ACT5, BANDS_ACT5, MEMORIES, type Memory, type MemoryId } from '../content/act5.ts';
import { act, actAt, ACTS, LAST_PLAYABLE_ACT, SURFACE } from '../content/acts.ts';
import { CREATURES, GIFT, TRUST, giftOf, trustLevel, type CreatureId, type GiftStock } from '../content/creatures.ts';
import { BOONS, LINEAGE, SEAMOUNTS, type BoonId, type Seamount, type SeamountId, type TraitId } from '../content/lineage.ts';
import { FEAST, THORN, WELCOME, intruderOf } from '../content/events.ts';
import { homesAt, RESIDENTS, type ResidentId } from '../content/residents.ts';
import { WORKS, type WorkId } from '../content/works.ts';
import { SISTER } from '../content/sister.ts';
import { DIARY_TEXT } from '../content/diary.ts';
import { SHARD, SHARD_LINES, type ShardSource } from '../content/shards.ts';
import { REQUEST, REQUESTS, type RequestKind } from '../content/requests.ts';
import { MOMENTS, type MomentId } from '../content/moments.ts';
import { WATER, WATERS, type Water } from '../content/waters.ts';
import { EXPEDITION, ROAM, ROAM_TALES, SITES, VISIT, type Site, type SiteId } from '../content/expeditions.ts';
import type { Band, Currency, UpgradeDef, UpgradeId } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades.ts';
import { equilibrium, relax } from './ode.ts';
import { mulberry32 } from './rng.ts';
import { HISTORY_MAX, HISTORY_STEP, type GameState } from './state.ts';

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

/**
 * The best Rasp dial setting: the most calcite per second once the silt has settled (more Rasp
 * clear more silt), among the settings whose hold still covers the next band twice over (each Rasp
 * also eats stone, which lowers what the reef can hold). If none does, the one that holds most.
 */
export function bestRasp(s: GameState): number {
  return raspSettings(s).forIncome;
}

/** The dial's two good settings: most calcite per second now, and most calcite held (for being away). */
export function raspSettings(s: GameState): { forIncome: number; forHold: number } {
  const keep = s.rasp;
  const need = 2 * cost(s, 'skeleton');
  let best = 0, bestRate = -Infinity, mostHeld = 0, mostHold = -Infinity;
  for (let n = 0; n <= raspMax(s); n++) {
    s.rasp = n;
    const rate = steadyCalciteRate(s);
    const hold = rate / rates(s).calciteK;
    if (hold > mostHold) { mostHold = hold; mostHeld = n; }
    if (hold >= need && rate > bestRate) { bestRate = rate; best = n; }
  }
  s.rasp = keep;
  return { forIncome: bestRate > -Infinity ? best : mostHeld, forHold: mostHeld };
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

/** How a moment was met ('a' or 'b'). */
export function chose(s: GameState, id: MomentId, c: 'a' | 'b'): boolean {
  return s.moments[id] === c;
}

/** A hard seamount's trial met by this line (kept in meta.seen as 'trial:<id>'). */
export function passed(s: GameState, id: SeamountId): boolean {
  return s.meta.seen.includes(`trial:${id}`);
}

/** Meet this seamount's trial once the reef has grown to its goal. Returns true the moment it is met. */
function trialCheck(s: GameState): boolean {
  const tr = seamount(s).trial;
  if (!tr || s.height < tr.goal || passed(s, s.seamount)) return false;
  s.meta.seen.push(`trial:${s.seamount}`);
  remember(s, 'trial', tr.reward.split(':')[0]!);
  return true;
}

function lives(s: GameState, id: ResidentId): boolean {
  return s.residents.includes(id);
}

/** Both of a pairing live in the reef. */
export function paired(s: GameState, a: ResidentId, b: ResidentId): boolean {
  return lives(s, a) && lives(s, b);
}

function found(s: GameState, id: SiteId): boolean {
  return s.relics.includes(id);
}

/** A relic's effect is in play: found on this reef, or brought along as the heirloom. */
function relic(s: GameState, id: SiteId): boolean {
  return found(s, id) || s.heirloom === id;
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

/**
 * Every creature the lineage has ever seen adds a little calcite (the journal, meta.seen 'c:…'),
 * and a little more once it has been touched ('t:…').
 */
export const KNOWN_BONUS = 0.02;
export const TOUCH_BONUS = 0.01;
export function knownBonus(s: GameState): number {
  let seen = 0, touched = 0;
  for (const k of s.meta.seen) {
    if (k.startsWith('c:')) seen++;
    else if (k.startsWith('t:')) touched++;
  }
  return 1 + KNOWN_BONUS * seen + TOUCH_BONUS * touched;
}

/** This run's seamount and how it bends the numbers. */
export function seamount(s: GameState): Seamount {
  return SEAMOUNTS.find((m) => m.id === s.seamount) ?? SEAMOUNTS[0]!;
}

export function rates(s: GameState): Rates {
  const lv = s.levels;
  const sm = seamount(s);
  const vent = lv.vent;
  const lightGlow = ACT2.lightGlow * (has(s, 'shoal-pact') ? 2 : 1);
  const target = heightForBands(lv.skeleton);
  const rasp = Math.min(s.rasp, raspMax(s));
  const onShelf = target >= ACT3.from;
  return {
    glowP: (ACT1.symbiontGlow * lv.symbiont * milestoneMult('symbiont', lv.symbiont) * (1 + ACT2.lightAmplify * s.jobs.light) +
      lightGlow * s.jobs.light * seasoned(s)) * 1.5 ** trait(s, 'glimmer') * (chose(s, 'squid', 'b') ? 1.2 : 1) * (chose(s, 'vent-crack', 'b') ? 1.15 : 1) * (sm.glow ?? 1) * (passed(s, 'dark') ? 1.25 : 1) * (boon(s, 'warm-heart') ? 1.3 : 1),
    glowK: ACT1.glowFade * (chose(s, 'squid', 'a') ? 0.8 : 1),
    planktonP: seasoned(s) * ACT2.feedRate * s.jobs.feed * (has(s, 'tidebooks') ? 2 : 1) * ACT3.channelPlankton ** lv.channel *
      (speaks(s, 'sweepers') ? 3 : 1) * (lives(s, 'feather-duster') ? 1.3 : 1),
    planktonK: ACT2.planktonEaten * (has(s, 'slow-currents') ? 0.6 : 1) * (relic(s, 'terraces') ? 0.75 : 1) * (chose(s, 'angler', 'b') ? 0.85 : 1),
    murmurP: ACT2.scoutRate * s.jobs.scout * (has(s, 'beaked') ? 1.5 : 1) * (relic(s, 'wells') ? 1.25 : 1) * (chose(s, 'lost-shoal', 'b') ? 1.2 : 1) * (passed(s, 'silent') ? 1.3 : 1),
    murmurK: ACT2.murmurFade * (relic(s, 'wells') ? 0.5 : 1),
    siltP: onShelf
      ? ACT3.siltFall * (1 + (target - ACT3.from) / ACT3.siltGrowthPer) * (s.truce.wall === 'a' ? 0.6 : 1) * sm.silt * (passed(s, 'buried') ? 0.8 : 1) * 0.85 ** s.works.breakwater
      : 0,
    siltK: ACT3.naturalSweep + (lives(s, 'pistol-shrimp') ? 0.04 : 0) + 0.02 * s.favours.clear + ACT3.flowSweep * lv.sandbar + LINEAGE.glassSweep * trait(s, 'glass-gardeners') + (ACT3.raspSweep * rasp * (s.truce.story === 'a' ? 2 : 1) * (s.truce.terms === 'b' ? 1.5 : 1)) * (speaks(s, 'mucus') ? 2 : 1),
    sandP: ACT3.raspSand * rasp * (s.truce.terms === 'a' ? 1.25 : 1) * (relic(s, 'midden') ? 1.3 : 1) * (lives(s, 'sea-cucumber') ? 1.4 : 1) * (chose(s, 'turtle', 'b') ? 1.25 : 1) * (has(s, 'rasp-song') ? 1.3 : 1) * (chose(s, 'young-rasp', 'b') ? 1.15 : 1) * (paired(s, 'pistol-shrimp', 'sea-cucumber') ? 1.2 : 1),
    sandK: ACT3.sandSettle,
    bloomP: sunlight(s, target) * lv.symbiont * ACT4.pigmentBloom ** lv.pigment * ACT4.meadowBloom ** lv.meadow *
      (speaks(s, 'fluorescent') ? 1.5 : 1) * (lives(s, 'damselfish') ? 1.3 : 1) * (chose(s, 'storm', 'b') ? 1.15 : 1) * 1.15 ** s.works.terrace * (has(s, 'light-walls') ? 1.25 : 1) * (chose(s, 'first-light', 'a') ? 1.15 : 1) * (paired(s, 'feather-duster', 'damselfish') ? 1.15 : 1),
    bloomK: ACT4.bloomFade * (chose(s, 'turtle', 'a') ? 0.8 : 1),
    spawnP: target >= ACT5.from
      ? lv.polyp * ACT5.spawnRate * ACT5.ripenSpawn ** lv.ripen * (speaks(s, 'broadcast') ? 2 : 1) *
        (1 + sunlight(s, target) * lv.symbiont / 100) * (chose(s, 'bird', 'b') ? 1.1 : 1) * (has(s, 'last-spawning') ? 1.25 : 1) * 1.15 ** s.works.pool
      : 0,
    spawnK: ACT5.spawnFade * (chose(s, 'bird', 'a') ? 0.8 : 1) * (chose(s, 'first-light', 'b') ? 0.85 : 1),
    calciteBase:
      (ACT1.trickle + ACT1.polypRate * sm.polyp * (passed(s, 'hungry') ? 1.1 : 1) * lv.polyp * milestoneMult('polyp', lv.polyp) * (has(s, 'city') ? 1.5 : 1)) *
      (ACT1.ventBoost * sm.ventBoost) ** vent *
      (has(s, 'inside-the-wall') ? 2 : 1) *
      (s.truce.wall === 'b' ? 1.25 : 1) *
      ACT3.sandbarCalcite ** lv.sandbar *
      (speaks(s, 'massive') ? 1.5 : 1) *
      1.5 ** trait(s, 'deep-memory') *
      knownBonus(s) * shardBonus(s) *
      (lives(s, 'goby') ? 1.15 : 1) * (chose(s, 'whale-fall', 'a') ? 1.1 : 1) * 1.05 ** s.works.garden *
      (boon(s, 'currents') ? 1.15 : 1),
    calciteK:
      ACT1.dissolve * sm.dissolve * ACT1.latticeFactor ** lv.lattice * (ACT1.ventAcid * sm.ventAcid) ** vent * (vent > 0 && chose(s, 'vent-crack', 'a') ? 0.8 : 1) *
      (has(s, 'lattice-songs') ? 0.7 : 1) * (chose(s, 'brittle', 'a') ? 0.9 : 1) * (chose(s, 'cleaners', 'b') ? 0.9 : 1) * (boon(s, 'roots') ? 0.85 : 1) * (speaks(s, 'massive') ? 0.5 : 1) +
      (speaks(s, 'mucus') ? 0 : ACT3.raspEat * rasp * (s.truce.terms === 'b' ? ACT3.politeEat : 1) * (lives(s, 'guard-crab') ? 0.5 : 1) * (chose(s, 'young-rasp', 'a') ? 0.8 : 1) * (paired(s, 'guard-crab', 'goby') ? 0.8 : 1)),
    lureMax: ACT1.lureMax + ACT1.lureMaxPerPattern * lv.lure + (has(s, 'fear') ? 1 : 0) + (speaks(s, 'fluorescent') ? 2 : 0) +
      (relic(s, 'lamp-hall') ? 1 : 0) + 0.5 * s.works.spire + (chose(s, 'angler', 'a') ? 0.5 : 0),
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
const COST_GROWTH: Record<number, number> = { 1: 1.55, 2: 1.19, 3: 1.28, 4: 1.2, 5: 1.035 };

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
 * Shoals coming home from an expedition change the rates, so time is split at that moment.
 */
export function advance(s: GameState, dt: number, stepFraction = STEP_FRACTION): GameState {
  if (!(dt > 0)) return s;
  const ex = s.expedition;
  if (ex.site && ex.back < s.t + dt) {
    const first = Math.max(0, ex.back - s.t);
    flow(s, first, stepFraction);
    homecoming(s);
    return flow(s, dt - first, stepFraction);
  }
  return flow(s, dt, stepFraction);
}

function flow(s: GameState, dt: number, stepFraction: number): GameState {
  if (!(dt > 0)) return s;
  const r = rates(s);
  const kH = settleRate(s);
  // The line's record: the exact moment this reef reaches the surface, if it happens in this step.
  // Height relaxes to its target in closed form, so the crossing time is solvable.
  const surfaceAt = r.heightTarget >= SURFACE && s.height < SURFACE - 1e-3 && kH > 0
    ? s.t + Math.log((r.heightTarget - s.height) / (r.heightTarget - (SURFACE - 1e-3))) / kH
    : Infinity;
  // The race with the sister reef: each mark this step crosses is judged at its exact moment.
  while (s.race.decided < SISTER.marks.length) {
    const B = SISTER.marks[s.race.decided]!;
    const target = Math.min(r.heightTarget, SURFACE);
    if (s.height >= B - 1e-3) {
      judgeMark(s, s.t);
      continue;
    }
    if (!(kH > 0) || target < B - 1e-3) break;
    const at = s.t + Math.log((r.heightTarget - s.height) / (r.heightTarget - (B - 1e-3))) / kH;
    if (!(at <= s.t + dt)) break;
    judgeMark(s, at);
  }
  const up: { key: Upstream; P: number; k: number; eq: number }[] = [
    { key: 'glow', P: r.glowP, k: r.glowK, eq: equilibrium(r.glowP, r.glowK) },
    { key: 'plankton', P: r.planktonP, k: r.planktonK, eq: equilibrium(r.planktonP, r.planktonK) },
    { key: 'height', P: kH * r.heightTarget, k: kH, eq: r.heightTarget },
    { key: 'silt', P: r.siltP, k: r.siltK, eq: equilibrium(r.siltP, r.siltK) },
    { key: 'bloom', P: r.bloomP, k: r.bloomK, eq: equilibrium(r.bloomP, r.bloomK) },
  ];
  const at = (x: Record<Upstream, number>) => production(r, x.glow, x.plankton, x.height, x.silt, x.bloom);
  let left = dt;
  while (left > 0) {
    // Steps are sized by the fastest stock still moving: one that has settled no longer limits
    // them (otherwise a slow stock creeping in keeps the steps as short as the fastest one's).
    let kMax = 0;
    for (const u of up) if (!settledAt(s[u.key], u.eq)) kMax = Math.max(kMax, u.k);
    const settled = kMax === 0;
    const h = settled ? left : Math.min(left, stepFraction / kMax);
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
  if (surfaceAt <= s.t + dt && (s.meta.fastest === 0 || surfaceAt < s.meta.fastest)) s.meta.fastest = surfaceAt;
  // Growth chart: one height sample per HISTORY_STEP of sim time (offline catch-up included; the
  // samples during a long absence all show the height at its end, which is what the reef was).
  const before = Math.floor(s.t / HISTORY_STEP);
  s.t += dt;
  const after = Math.floor(s.t / HISTORY_STEP);
  for (let k = before; k < after && k - before < HISTORY_MAX; k++) {
    s.history.push(Math.round(s.height * 10) / 10);
    if (s.history.length > HISTORY_MAX) s.history = s.history.filter((_, i) => i % 2 === 0);
  }
  s.act = Math.max(s.act, actAt(s.height));
  readBands(s);
  trialCheck(s);
  keepRequest(s);
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
    const discount = (has(s, 'walls') ? 0.75 : 1) * (speaks(s, 'branching') ? 0.6 : 1) * (relic(s, 'gate') ? 0.85 : 1);
    return Math.ceil(u.baseCost * BAND_COST[Math.min(MAX_BANDS, l)]! * discount * waterFactor(s, id) * (boon(s, 'quick-stone') ? 0.9 : 1));
  }
  const discount = (id === 'polyp' ? 0.85 ** trait(s, 'quick-budding') : 1) * (id === 'shoal' && passed(s, 'lonely') ? 0.8 : 1);
  const [from, gentle] = u.growthAfter ?? [Infinity, u.growth];
  const scale = l <= from ? u.growth ** l : u.growth ** from * gentle ** (l - from);
  return Math.ceil(u.baseCost * scale * discount * waterFactor(s, id));
}

// ---------- The water's moods ----------

const STILL = WATERS[0]!;

/**
 * The water in time slot k (the current one by default): seeded per reef, drawn from the kinds that
 * come in the reef's zone, still before the reef has risen out of the silt.
 */
export function waterAt(s: GameState, k = Math.floor(s.t / WATER.period)): Water {
  if (!s.bands.includes(WATER.band)) return STILL;
  const zone = actAt(s.height);
  const pool = WATERS.filter((w) => w.zones.includes(zone));
  const r = mulberry32((s.seed ^ 0x3a7e1) + Math.imul(k, 0x85ebca6b));
  let x = r() * pool.reduce((a, w) => a + w.weight, 0);
  for (const w of pool) if ((x -= w.weight) < 0) return w;
  return STILL;
}

/** Seconds until the water turns. */
export function untilWaterTurns(s: GameState): number {
  return (Math.floor(s.t / WATER.period) + 1) * WATER.period - s.t;
}

/** A water's price factor for this reef (Water-wise deepens it). */
function deep(s: GameState, w: Water): number {
  return w.factor < 1 ? w.factor - 0.1 * trait(s, 'water-wise') : 1;
}

function waterFactor(s: GameState, id: UpgradeId): number {
  const w = waterAt(s);
  return w.upgrades.includes(id) ? deep(s, w) : 1;
}

function murmurFactor(s: GameState): number {
  const w = waterAt(s);
  return w.murmurs ? deep(s, w) : 1;
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

export type CapReason = 'reading' | 'wall' | 'spawn-dialect' | 'surface';

/** What holds the reef where it is (the lowest story gate), or 'surface' at the top. */
export function capReason(s: GameState): CapReason {
  if (!has(s, 'inside-the-wall')) return 'reading';
  if (!s.truce.wall) return 'wall';
  if (!s.dialects.spawn) return 'spawn-dialect';
  return 'surface';
}

export function maxed(s: GameState, id: UpgradeId): boolean {
  if (id === 'skeleton') {
    const next = heightForBands(s.levels.skeleton + 1);
    if (next > heightCap(s) || next <= heightForBands(s.levels.skeleton)) return true;
  }
  if (id === 'shoal' && s.levels.shoal >= (seamount(s).shoalCap ?? Infinity)) return true;
  if (id === 'daughter' && s.levels.daughter >= daughterCount(s.levels.polyp)) return true;
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
  return s.levels.shoal - s.jobs.feed - s.jobs.light - s.jobs.scout - awayShoals(s);
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

// ---------- Expeditions ----------

/** Shoals seasoned by their journeys: feeding and light-swimming grow a little with every trip. */
export function seasoned(s: GameState): number {
  return 1 + EXPEDITION.seasoned * Math.min(EXPEDITION.seasonedMax, s.relics.length + s.tally.roams);
}

/** Shoals away at a ruin. */
export function awayShoals(s: GameState): number {
  const ex = s.expedition;
  return ex.site ? ex.feed + ex.light + ex.scout + idleAway(s) : 0;
}
/** Idle shoals that went along (they come back idle): the trip's size minus the ones taken from jobs. */
function idleAway(s: GameState): number {
  const ex = s.expedition;
  return Math.max(0, ex.n - ex.feed - ex.light - ex.scout);
}

/** A roam: a quarter of the shoals, ten minutes, no relic. */
function roamSite(s: GameState): Site {
  return {
    id: 'roam' as SiteId, name: ROAM.name, metres: ROAM.from, hint: ROAM.hint, relic: '', effect: ROAM.effect, text: '',
    shoals: Math.max(ROAM.minShoals, Math.floor(s.levels.shoal * ROAM.share)), seconds: ROAM.seconds,
  };
}

/** How long a trip takes this reef (Old maps halves it). */
export function tripSeconds(s: GameState, x: Site): number {
  return x.seconds * (trait(s, 'old-maps') ? 0.5 : 1) * (boon(s, 'near-ruins') ? 0.5 : 1);
}

/** The trip the shoals are on now (a ruin, or a roam of the size that left), if any. */
export function tripSite(s: GameState): Site | undefined {
  const ex = s.expedition;
  if (!ex.site) return undefined;
  if (ex.site === 'roam') return { ...roamSite(s), shoals: ex.n };
  if (ex.site === 'visit') return { ...roamSite(s), id: 'visit' as SiteId, name: VISIT.name, hint: VISIT.hint, effect: VISIT.effect, seconds: VISIT.seconds, shoals: ex.n };
  return SITES.find((v) => v.id === ex.site);
}

/**
 * Where the shoals could go next: the first ruin not yet found once the reef has reached it, else
 * a roam through the dark (from 150 m, with shoals enough to spare).
 */
export function nextSite(s: GameState): Site | undefined {
  const x = SITES.find((v) => !found(s, v.id));
  if (x && s.height >= x.metres && s.levels.shoal > 0) return x;
  // The sister reef near your depth: a visit, once per zone.
  if (s.levels.shoal >= ROAM.minShoals * 2 && Math.abs(sisterAt(s.t) - gaugeAt(s.height)) < VISIT.near && !s.visits.includes(actAt(s.height))) {
    return { ...roamSite(s), id: 'visit' as SiteId, name: VISIT.name, hint: VISIT.hint, effect: VISIT.effect, seconds: VISIT.seconds };
  }
  return s.height >= ROAM.from && s.levels.shoal >= ROAM.minShoals * 2 ? roamSite(s) : undefined;
}

/** Whether the shoals can set out for the next ruin now. */
export function canSend(s: GameState): boolean {
  const x = nextSite(s);
  return !!x && !s.expedition.site && s.levels.shoal >= x.shoals;
}

/** Send shoals to the next ruin: idle ones first, then scouts, light-swimmers, feeders. */
export function send(s: GameState): boolean {
  const x = nextSite(s);
  if (!x || !canSend(s)) return false;
  let need = x.shoals - Math.min(x.shoals, idleShoals(s));
  const took = { feed: 0, light: 0, scout: 0 };
  for (const j of ['scout', 'light', 'feed'] as const) {
    const n = Math.min(need, s.jobs[j]);
    s.jobs[j] -= n;
    took[j] = n;
    need -= n;
  }
  s.expedition = { site: x.id, back: s.t + tripSeconds(s, x), ...took, n: x.shoals };
  if ((x.id as string) === 'visit') s.visits.push(actAt(s.height));
  return true;
}

/** The shoals come home: back to the jobs they left, with a relic and what they heard. */
function homecoming(s: GameState): void {
  const ex = s.expedition;
  const x = SITES.find((v) => v.id === ex.site);
  const roam = ex.site === 'roam', visit = ex.site === 'visit';
  const seconds = (roam ? ROAM.seconds : visit ? VISIT.seconds : x?.seconds ?? 0) * (trait(s, 'old-maps') ? 0.5 : 1) * (boon(s, 'near-ruins') ? 0.5 : 1);
  const heard = EXPEDITION.heard * ex.n * seconds;
  s.jobs.feed += ex.feed;
  s.jobs.light += ex.light;
  s.jobs.scout += ex.scout;
  s.expedition = { site: '', back: 0, feed: 0, light: 0, scout: 0, n: 0 };
  s.murmurs += heard;
  s.earned.murmurs += heard;
  if (roam) {
    s.tally.roams++;
    // A tale from the dark, and a little of what it brought (seeded by the reef and the roam).
    const tale = ROAM_TALES[mulberry32((s.seed ^ 0x7a1e) + Math.imul(s.tally.roams, 0x9e3779b1))() * ROAM_TALES.length | 0]!;
    if (tale.pay === 'shard') dig(s, 'expedition');
    else {
      dig(s, 'roam');
      if (tale.pay === 'murmurs') s.murmurs += heard * 0.5;
      else if (tale.pay === 'glow') s.glow += rates(s).glowP * 60;
      else burst(s, 60);
    }
    remember(s, 'roam', tale.text);
    return;
  }
  if (visit) {
    s.meta.lineage += VISIT.lineage;
    remember(s, 'visit');
    return;
  }
  if (!x) return;
  if (!found(s, x.id)) {
    s.relics.push(x.id);
    remember(s, 'relic', x.relic.toLowerCase());
  }
  dig(s, 'expedition');
}

// ---------- Residents ----------

/** Homes in the reef (by height), and the animals that may ask for one by now. */
export function homes(s: GameState): number {
  const n = homesAt(s.height);
  return n > 0 ? n + (chose(s, 'cleaners', 'a') ? 1 : 0) + trait(s, 'open-house') : 0;
}
export function residentsAsking(s: GameState) {
  return homes(s) > 0 ? RESIDENTS.filter((r) => s.height >= r.metres) : [];
}

/** Take a resident in (if there is a free home) or let it go. */
export function house(s: GameState, id: ResidentId): boolean {
  if (lives(s, id)) {
    s.residents = s.residents.filter((r) => r !== id);
    return true;
  }
  if (!residentsAsking(s).some((r) => r.id === id) || s.residents.length >= homes(s)) return false;
  s.residents.push(id);
  if (!s.diary.some((d) => d.endsWith(`|resident|${RESIDENTS.find((r) => r.id === id)!.name}`))) remember(s, 'resident', RESIDENTS.find((r) => r.id === id)!.name);
  return true;
}

/** Move shoals one at a time between feeding and light while that raises settled calcite. */
export function balanceFeedLight(s: GameState): boolean {
  let moved = false;
  for (let moves = 0; moves < 6; moves++) {
    const base = steadyCalciteRate(s);
    let best: ['feed' | 'light', 'feed' | 'light'] | null = null;
    let bestRate = base * 1.0005;
    for (const [from, to] of [['feed', 'light'], ['light', 'feed']] as const) {
      if (s.jobs[from] === 0) continue;
      const r = steadyCalciteRate({ ...s, jobs: { ...s.jobs, [from]: s.jobs[from] - 1, [to]: s.jobs[to] + 1 } });
      if (r > bestRate) { bestRate = r; best = [from, to]; }
    }
    if (!best || !reassign(s, best[0], best[1])) return moved;
    moved = true;
  }
  return moved;
}

// ---------- Readings ----------

export function reading(id: ReadingId) {
  return READINGS.find((r) => r.id === id)!;
}

/** The next Reading on offer: they are deciphered in order, one band at a time. */
export function nextReading(s: GameState) {
  if (seamount(s).noReadings) return undefined;
  const r = READINGS.find((x) => !s.readings.includes(x.id));
  // A late Reading waits until its zone's band has been read.
  return r && (!r.after || s.bands.includes(r.after)) ? r : undefined;
}

/** Murmurs a Reading costs (halved by the Kept readings trait). */
export function readingCost(s: GameState, r: { cost: number }): number {
  return r.cost * (trait(s, 'kept-readings') ? 0.5 : 1) * seamount(s).readings * murmurFactor(s);
}

/** Murmurs it takes to learn a meeting's words. */
export function meetingWords(s: GameState, m: { words: number }): number {
  return m.words * (trait(s, 'kept-readings') ? 0.5 : 1) * murmurFactor(s);
}

export function readingsRevealed(s: GameState): boolean {
  return s.bands.includes('murmur') || s.readings.length > 0;
}

export function read(s: GameState, id: ReadingId): boolean {
  const next = nextReading(s);
  if (!readingsRevealed(s) || !next || next.id !== id || s.murmurs < readingCost(s, next)) return false;
  s.murmurs -= readingCost(s, next);
  s.readings.push(id);
  remember(s, 'reading', next.title);
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

// ---------- Moments ----------

/** The first moment the reef has reached and not yet answered. */
export function nextMoment(s: GameState) {
  return MOMENTS.find((m) => !s.moments[m.id] && s.height >= m.metres);
}

/** Answer a moment. Permanent for this reef. */
export function meet(s: GameState, id: MomentId, c: 'a' | 'b'): boolean {
  const m = nextMoment(s);
  if (!m || m.id !== id) return false;
  s.moments[id] = c;
  const mo = MOMENTS.find((x) => x.id === id)!;
  remember(s, 'moment', `${mo.title}: ${mo[c].label.toLowerCase()}.`);
  if (id === 'lost-shoal' && c === 'a') {
    const n = Math.max(0, Math.min(3, (seamount(s).shoalCap ?? Infinity) - s.levels.shoal));
    s.levels.shoal += n;
    s.jobs[jobOpen(s, s.lastJob) ? s.lastJob : 'feed'] += n;
  }
  return true;
}

// ---------- Your own bands ----------

/** Write a line into the reef's own bands (content/diary.ts), at the time and height it happens. */
export function remember(s: GameState, key: string, arg = '', at = s.t): void {
  s.diary.push(`${Math.round(at)}|${Math.round(s.height)}|${key}|${arg.replaceAll('|', '/')}`);
  if (s.diary.length > DIARY_TEXT.max) s.diary.splice(0, s.diary.length - DIARY_TEXT.max);
}

// ---------- The sister reef ----------

/** The sister reef's place on the gauge (0 seamount … 1 surface) at sim time t. */
export function sisterAt(t: number): number {
  const sc = SISTER.schedule;
  for (let i = 1; i < sc.length; i++) {
    const [t1, f1] = sc[i]!, [t0, f0] = sc[i - 1]!;
    if (t <= t1) return f0 + ((f1 - f0) * (t - t0)) / (t1 - t0);
  }
  return 1;
}

/** 0 (seamount) … 1 (surface): each zone an equal share, linear within it (as the gauge draws it). */
export function gaugeAt(h: number): number {
  const n = actAt(Math.min(h, SURFACE));
  const a = ACTS[n - 1]!;
  return (n - 1 + Math.min(1, Math.max(0, (h - a.from) / (a.to - a.from)))) / ACTS.length;
}

/** Judge the next mark, reached at sim time `at`: won if the sister is still below it then. */
function judgeMark(s: GameState, at: number): void {
  const i = s.race.decided;
  const mark = SISTER.marks[i]!;
  s.race.decided++;
  // The line's best time to this mark.
  const best = s.meta.records[i] ?? 0;
  if (!best || at < best) s.meta.records[i] = at;
  const where = mark >= SURFACE ? 'the surface' : (ACTS.find((a) => a.from === mark)?.name ?? `${mark} m`);
  if (sisterAt(at) < gaugeAt(mark) - 1e-9) {
    s.race.won++;
    s.meta.lineage += SISTER.lineage[i]!;
    remember(s, 'ahead', where, at);
  } else remember(s, 'behind', where, at);
}

// ---------- Great works ----------

/** A work the reef can see: built in its zone, or begun already. */
export function workOpen(s: GameState, id: WorkId): boolean {
  const w = WORKS.find((x) => x.id === id)!;
  return s.works[id] > 0 || (actAt(s.height) === w.zone && s.height >= w.from);
}

/** The next stage's price (null once all are built). */
export function workCost(s: GameState, id: WorkId): Partial<Record<Currency, number>> | null {
  return WORKS.find((x) => x.id === id)!.stages[s.works[id]] ?? null;
}

export function canBuild(s: GameState, id: WorkId): boolean {
  const c = workCost(s, id);
  return !!c && workOpen(s, id) && (Object.entries(c) as [Currency, number][]).every(([k, v]) => s[k] >= v);
}

/** Build the next stage: pays both currencies. */
export function build(s: GameState, id: WorkId): boolean {
  if (!canBuild(s, id)) return false;
  for (const [k, v] of Object.entries(workCost(s, id)!) as [Currency, number][]) s[k] -= v;
  s.works[id]++;
  const wk = WORKS.find((x) => x.id === id)!;
  remember(s, 'work', `${wk.stageNames[s.works[id] - 1]!.toLowerCase()} of ${wk.name.toLowerCase()}`);
  return true;
}

// ---------- Favours of the Rasp ----------

export function favourOpen(s: GameState): boolean {
  return !!s.truce.terms;
}

export function favourCost(s: GameState, id: FavourId): number {
  const f = FAVOURS.find((x) => x.id === id)!;
  return Math.ceil(f.cost * f.growth ** s.favours[id]);
}

export function favourMaxed(s: GameState, id: FavourId): boolean {
  return s.favours[id] >= FAVOURS.find((x) => x.id === id)!.max || (id === 'path' && maxed(s, 'shoal'));
}

/** Ask a favour: paid in sand, done at once. */
export function askFavour(s: GameState, id: FavourId): boolean {
  if (!favourOpen(s) || favourMaxed(s, id) || s.sand < favourCost(s, id)) return false;
  s.sand -= favourCost(s, id);
  s.favours[id]++;
  if (id === 'path') {
    s.levels.shoal += 2;
    s.jobs[jobOpen(s, s.lastJob) ? s.lastJob : 'feed'] += 2;
  } else if (id === 'carry') {
    const gain = calciteRate(s) * 180;
    s.calcite += gain;
    s.earned.calcite += gain;
  }
  return true;
}

// ---------- Dialects ----------

export function dialect(id: DialectId) {
  return DIALECTS.find((d) => d.id === id)!;
}

/** The tier waiting for a choice: in order, once its band is read. */
/** Bloom a dialect tier costs now (clear water lowers it). */
export function tierCost(s: GameState, t: { cost: number }): number {
  const w = waterAt(s);
  return t.cost * (w.dialects ? deep(s, w) : 1);
}

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
  if (!t || t.tier !== d.tier || s.bloom < tierCost(s, t)) return false;
  s.bloom -= tierCost(s, t);
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
  if (m.needs.relic && !s.relics.includes(m.needs.relic as SiteId)) return false;
  if (m.needs.moment) {
    const c = s.moments[m.needs.moment as MomentId];
    if (!c || (m.needs.momentChoice && c !== m.needs.momentChoice)) return false;
  }
  if (m.needs.shards && s.meta.shards.length < m.needs.shards) return false;
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
  s.tally.sweeps++;
  dig(s, 'sweep');
  return gain;
}

// ---------- Gifts from neighbours ----------

/**
 * A touched creature's gift: GIFT.seconds of the reef's production of its stock (calcite when the
 * reef makes none of it yet), once per GIFT.cooldown per creature. Null while it is cooling down.
 */
export function gift(s: GameState, id: CreatureId): { stock: GiftStock; amount: number } | null {
  s.tally.touches++;
  s.meta.trust[id] = (s.meta.trust[id] ?? 0) + 1;
  dig(s, 'touch');
  if (s.t - s.gifts[id] < GIFT.cooldown) return null;
  const r = rates(s);
  let stock = giftOf(id);
  const made = stock === 'glow' ? r.glowP : stock === 'plankton' ? r.planktonP : stock === 'sand' ? r.sandP : 0;
  const k = stock === 'glow' ? r.glowK : stock === 'plankton' ? r.planktonK : r.sandK;
  if (!(made > 0)) stock = 'calcite';
  // Food feeds what the zone lives by: bloom in the light, the spawn at the surface (as feasts do).
  const pay = feastPay(s);
  if (stock === 'calcite' && pay !== 'calcite') stock = pay;
  // Never more than a share of what the reef can hold of it (P/k), or it would only wash away.
  // Rare visitors give more: catching one is luck as well as attention.
  const rare = CREATURES.find((c) => c.id === id)?.note.startsWith('Rare.') ? GIFT.rare : 1;
  const amount = (boon(s, 'welcome') ? 2 : 1) * TRUST.gift[trustLevel(s.meta.trust[id] ?? 0)]! * (chose(s, 'whale-fall', 'b') ? 2 : 1) * rare * (stock === 'calcite' ? calciteRate(s, r) * GIFT.seconds
    : stock === 'bloom' ? r.bloomP * GIFT.seconds : stock === 'spawn' ? r.spawnP * GIFT.seconds
    : Math.min(made * GIFT.seconds, GIFT.holdShare * made / k));
  if (!(amount > 0)) return null;
  s.gifts[id] = s.t;
  if (stock === 'calcite') {
    s.calcite += amount;
    s.earned.calcite += amount;
  } else if (stock === 'glow') {
    s.glow += amount;
    s.earned.glow += amount;
  } else if (stock === 'plankton') s.plankton += amount;
  else if (stock === 'bloom') s.bloom += amount;
  else if (stock === 'spawn') s.spawn += amount;
  else s.sand += amount;
  return { stock, amount };
}

// ---------- Shards of Thousandfold ----------

/**
 * Search the silt after an action: by chance (seeded by the reef and how many searches it has
 * made), a shard the line has not found yet. Returns its index, or -1.
 */
export function dig(s: GameState, source: ShardSource): number {
  const left = SHARD_LINES.map((_, i) => i).filter((i) => !s.meta.shards.includes(i));
  if (!left.length) return -1;
  const r = mulberry32((s.seed ^ 0x5a4d) + Math.imul(++s.tally.digs, 0x2c1b3c6d));
  if (r() >= SHARD.chance[source]) return -1;
  const i = left[Math.floor(r() * left.length)]!;
  s.meta.shards.push(i);
  remember(s, 'shard', SHARD_LINES[i]!);
  return i;
}

/** Calcite for the shards the line holds: a little each, more for the whole tablet. */
export function shardBonus(s: GameState): number {
  const n = s.meta.shards.length;
  return 1 + SHARD.each * n + (n >= SHARD_LINES.length ? SHARD.whole : 0);
}

// ---------- Other reefs spawning ----------

/** Whether this full moon's spawning choice is open (any zone below the Breach, once per moon). */
export function othersSpawning(s: GameState): boolean {
  return actAt(s.height) <= 4 && s.height >= 1 && moonFull(s.t) && Math.floor(s.t / ACT5.moonPeriod) !== s.others.last;
}

/** How much lineage the full-moon spawning can bring on one reef. */
export function othersCap(s: GameState): number {
  return OTHERS.maxJoins + (trait(s, 'moon-born') ? 2 : 0);
}

/** Meet the other reefs' spawning: feed on it (bloom) or add your own (lineage). */
export function meetOthers(s: GameState, how: 'feed' | 'join'): boolean {
  if (!othersSpawning(s)) return false;
  if (how === 'join' && s.others.joined >= othersCap(s)) return false;
  s.others.last = Math.floor(s.t / ACT5.moonPeriod);
  if (how === 'feed') burst(s, OTHERS.seconds);
  else {
    s.others.joined++;
    s.meta.lineage += 1;
  }
  return true;
}

// ---------- Boons ----------

/** Requests a first reef keeps to be offered a boon (later reefs are offered one at once). */
export const BOON_REQUESTS = 10;

/** The three boons offered to this reef (seeded), while none is chosen; none for a first reef. */
export function boonsOffered(s: GameState): typeof BOONS[number][] {
  // A first reef earns its boon by keeping ten of Ossel's requests.
  if (s.boon || (s.meta.spawnings === 0 && s.request.done < BOON_REQUESTS)) return [];
  const r = mulberry32(s.seed ^ 0xb0b0);
  const pool = [...BOONS];
  const out: typeof BOONS[number][] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]!);
  return out;
}

export function chooseBoon(s: GameState, id: BoonId): boolean {
  if (!boonsOffered(s).some((b) => b.id === id)) return false;
  s.boon = id;
  if (id === 'lamps') {
    s.levels.shoal += 4;
    s.jobs.feed += 4;
  }
  return true;
}

function boon(s: GameState, id: BoonId): boolean {
  return s.boon === id;
}

// ---------- Before you go ----------

/** Ready the reef for an absence: the Rasp dial at its best for holding, a trip sent if one is open. */
export function prepareAway(s: GameState): ('rasp' | 'trip')[] {
  const done: ('rasp' | 'trip')[] = [];
  if (raspMax(s) > 0) {
    const hold = raspSettings(s).forHold;
    if (hold !== s.rasp) {
      setRasp(s, hold);
      done.push('rasp');
    }
  }
  if (canSend(s) && send(s)) done.push('trip');
  return done;
}

// ---------- Welcome back ----------

/** The haul of stone offered after `away` seconds: a share of what the reef makes, capped. */
export function welcomeHaul(s: GameState, away: number): number {
  return calciteRate(s) * WELCOME.share * Math.min(away, WELCOME.cap);
}

/** Take one welcome-back gift. Returns what it brought (calcite, or shards found). */
export function welcome(s: GameState, choice: 'haul' | 'search', away: number): number {
  if (choice === 'haul') {
    const gain = welcomeHaul(s, away);
    s.calcite += gain;
    s.earned.calcite += gain;
    return gain;
  }
  let n = 0;
  for (let i = 0; i < WELCOME.digs; i++) if (dig(s, 'roam') >= 0) n++;
  return n;
}

// ---------- Ossel's requests ----------

/** The count a request kind watches. */
function requestCount(s: GameState, kind: RequestKind): number {
  switch (kind) {
    case 'bud': return s.levels.polyp;
    case 'glimmer': return s.levels.symbiont;
    case 'bands': return s.levels.skeleton;
    case 'feast': return s.feasts;
    case 'touch': return s.tally.touches;
    case 'sweep': return s.tally.sweeps;
    case 'shoals': return s.levels.shoal;
    case 'sandbar': return s.levels.sandbar;
    case 'pigment': return s.levels.pigment;
    case 'ripen': return s.levels.ripen;
    case 'roam': return s.tally.roams;
    case 'work': return Object.values(s.works).reduce((a, b) => a + b, 0);
    case 'intruder': return s.tally.intruders;
    case 'read': return s.readings.length;
  }
}

/** Kinds that can be done here now (nothing held by a gate, maxed out or not yet open). */
function requestOpen(s: GameState, kind: RequestKind): boolean {
  const zone = actAt(s.height);
  if (!REQUESTS.find((r) => r.kind === kind)!.zones.includes(zone)) return false;
  switch (kind) {
    case 'bands': return !maxed(s, 'skeleton');
    case 'feast': return s.bands.includes(FEAST.band);
    case 'shoals': return revealed(s, 'shoal') && !maxed(s, 'shoal');
    case 'sandbar': case 'pigment': case 'ripen': return revealed(s, kind) && !maxed(s, kind);
    case 'glimmer': return revealed(s, 'symbiont') && !maxed(s, 'symbiont');
    case 'roam': return !s.expedition.site && nextSite(s)?.id === ('roam' as SiteId);
    case 'work': return WORKS.some((w) => workOpen(s, w.id) && workCost(s, w.id) !== null);
    case 'intruder': return untilThorn(s) < Infinity;
    case 'read': return !!nextReading(s);
    default: return true;
  }
}

/** The current request: what, how many, and how far along. */
export function currentRequest(s: GameState) {
  const q = s.request;
  if (!q.kind) return null;
  const def = REQUESTS.find((r) => r.kind === q.kind)!;
  return { def, n: q.n, got: Math.min(q.n, requestCount(s, q.kind) - q.base) };
}

/** Pay a kept request and ask the next. Returns the pay (0 if nothing changed). */
function keepRequest(s: GameState): number {
  const q = s.request;
  let paid = 0;
  const prev = q.kind;
  if (q.kind && (requestCount(s, q.kind) - q.base >= q.n || !requestOpen(s, q.kind))) {
    if (requestCount(s, q.kind) - q.base >= q.n) {
      paid = burst(s, REQUEST.seconds * (1 + REQUEST.streakBonus * Math.min(REQUEST.streakMax, q.streak)));
      q.paid = paid;
      q.done++;
      q.streak++;
      if (q.done % 5 === 0) remember(s, 'request', String(q.done));
    }
    q.kind = '';
  }
  if (!q.kind && s.levels.polyp >= REQUEST.fromPolyps) {
    // Not the same kind twice running when there is a choice.
    const all = REQUESTS.filter((r) => requestOpen(s, r.kind));
    const open = all.length > 1 ? all.filter((r) => r.kind !== prev) : all;
    if (open.length) {
      const r = mulberry32((s.seed ^ 0x0a5e11) + Math.imul(q.done + 1, 0x27d4eb2d));
      // The very first is always to bud: the first thing a new reef can do.
      const pick = q.done === 0 && open.some((x) => x.kind === 'bud') ? REQUESTS.find((x) => x.kind === 'bud')! : open[Math.floor(r() * open.length)]!;
      q.kind = pick.kind;
      q.n = pick.n(q.done);
      q.base = requestCount(s, pick.kind);
    }
  }
  return paid;
}

/** A burst of the zone's currency: `seconds` of its production. Returns the amount. */
function burst(s: GameState, seconds: number): number {
  const pay = feastPay(s);
  const r = rates(s);
  let gain: number;
  if (pay === 'bloom') {
    gain = r.bloomP * seconds;
    s.bloom += gain;
  } else if (pay === 'spawn') {
    gain = r.spawnP * seconds;
    s.spawn += gain;
  } else {
    gain = calciteRate(s, r) * seconds;
    s.calcite += gain;
    s.earned.calcite += gain;
  }
  return gain;
}

/** Whether Ossel can be asked for something else now. */
export function canSkipRequest(s: GameState): boolean {
  return !!s.request.kind && s.t - s.request.skipped >= REQUEST.skipEvery;
}

/** Ask for something else: the current request is dropped (unpaid) and another kind is picked. */
export function skipRequest(s: GameState): boolean {
  if (!canSkipRequest(s)) return false;
  const q = s.request;
  const open = REQUESTS.filter((r) => r.kind !== q.kind && requestOpen(s, r.kind));
  if (!open.length) return false;
  // Seeded by the moment of asking, so the same skip on the same reef picks the same.
  const r = mulberry32((s.seed ^ 0x51c1) + Math.imul(Math.floor(s.t), 0x27d4eb2d));
  const pick = open[Math.floor(r() * open.length)]!;
  q.skipped = s.t;
  q.streak = 0;
  q.kind = pick.kind;
  q.n = pick.n(q.done);
  q.base = requestCount(s, pick.kind);
  return true;
}

/** Check the request right after a purchase or a touch (the game loop also checks every frame). */
export function checkRequest(s: GameState): number {
  return keepRequest(s);
}

// ---------- Thorn stars ----------

export type Thorn = { k: number; start: number; side: number; kind: 'thorn-star' | 'dragonfish' };

/** The intruder now, if any: a thorn star on the shelf and in the light, a dragonfish in the Midnight Water. */
export function currentThorn(s: GameState): Thorn | null {
  const kind = intruderOf(actAt(s.height));
  if (!kind || (kind === 'dragonfish' && s.levels.shoal === 0)) return null;
  const k = Math.floor(s.t / THORN.period);
  if (k <= s.thorned) return null;
  const r = mulberry32((s.seed ^ 0x7a0e) + Math.imul(k, 0x9e3779b1));
  const start = k * THORN.period + r() * (THORN.period - THORN.life);
  return s.t >= start && s.t < start + THORN.life ? { k, start, side: r() < 0.5 ? -1 : 1, kind } : null;
}

/** Seconds until the next intruder comes (0 while one is here; Infinity where none come). */
export function untilThorn(s: GameState): number {
  const kind = intruderOf(actAt(s.height));
  if (!kind || (kind === 'dragonfish' && s.levels.shoal === 0)) return Infinity;
  if (currentThorn(s)) return 0;
  for (let k = Math.floor(s.t / THORN.period); k < Math.floor(s.t / THORN.period) + 3; k++) {
    if (k <= s.thorned) continue;
    const r = mulberry32((s.seed ^ 0x7a0e) + Math.imul(k, 0x9e3779b1));
    const start = k * THORN.period + r() * (THORN.period - THORN.life);
    if (start > s.t) return start - s.t;
  }
  return Infinity;
}

/** Guard crabs (thorn stars) or a finished lantern spire (dragonfish) drive it off in its last second. */
export function crabThorn(s: GameState): Thorn | null {
  const th = currentThorn(s);
  const guarded = th && (trait(s, 'thorn-wise') > 0 || (th.kind === 'thorn-star' ? lives(s, 'guard-crab') : s.works.spire >= 3));
  return th && guarded && s.t >= th.start + THORN.life - 1 ? th : null;
}

/** Pry the thorn star off (share 1) or let the crabs (crabShare). Returns the pay. */
export function pryThorn(s: GameState, share = 1): number {
  const th = currentThorn(s);
  if (!th) return 0;
  s.thorned = th.k;
  s.tally.intruders++;
  return burst(s, THORN.seconds * share);
}

// ---------- Falling feasts ----------

export type Feast = { k: number; start: number; x: number; kind: number };
export type FeastPay = 'calcite' | 'bloom' | 'spawn';

/** What a feast is and pays, by zone: carrion feeds calcite; sargassum in the light feeds bloom;
 * a swarm of moon plankton at the surface feeds the spawn. */
export function feastPay(s: GameState): FeastPay {
  const zone = actAt(s.height);
  return zone >= 5 && !ended(s) ? 'spawn' : zone === 4 ? 'bloom' : 'calcite';
}

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

/** Seconds until the next feast starts falling (0 while one is falling; Infinity before feasts come). */
export function untilFeast(s: GameState): number {
  if (!s.bands.includes(FEAST.band)) return Infinity;
  if (currentFeast(s)) return 0;
  for (let k = Math.floor(s.t / FEAST.period); k < Math.floor(s.t / FEAST.period) + 3; k++) {
    if (k <= s.feasted) continue;
    const f = feastAt(s.seed, k);
    if (f.start > s.t) return f.start - s.t;
  }
  return Infinity;
}

/** Shared table: the feast the scavengers take for the reef now, in its last second in reach. */
export function tableFeast(s: GameState): Feast | null {
  if (!trait(s, 'shared-table')) return null;
  const f = currentFeast(s);
  return f && s.t >= f.start + FEAST.life - 1 ? f : null;
}

/**
 * Eat the current feast: a burst of the zone's currency (feastPay), times `share` (the shared
 * table brings half). Returns the amount (0 if none).
 */
export function feast(s: GameState, share = 1): number {
  const f = currentFeast(s);
  if (!f) return 0;
  const gain = burst(s, FEAST.seconds * share * (chose(s, 'brittle', 'b') ? 1.5 : 1));
  s.feasted = f.k;
  s.feasts++;
  if (s.feasts === 1) remember(s, 'feast');
  dig(s, 'feast');
  return gain;
}

export function act1Done(s: GameState): boolean {
  return s.height >= ACT1.goalMetres;
}

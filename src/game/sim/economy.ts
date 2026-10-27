// Rates, time advance and purchases. Pure functions over GameState.
//
// The economy is a DAG of stocks, each obeying dx/dt = P - k*x:
//   glow     — from symbionts and light shoals; fades.
//   plankton — herded by feeding shoals; eaten fast.
//   murmurs  — heard by scouting shoals; fade slowly back into the stone.
//   calcite  — polyps × lure(glow) × feeding(plankton); dissolves.
//   height   — relaxes toward the target set by skeleton bands.
// Counts are constant between purchases, so the upstream stocks have exact closed forms and
// calcite's production is a known function of time. Within each sub-step advance() integrates
// calcite exactly using Simpson's mean of that production; once glow and plankton have
// settled the production is constant and the rest of any span is a single exact step — so a
// month offline costs a few hundred iterations and ends exactly where the dynamics settle.

import { ACT1, BANDS_ACT1, UPGRADES, type Band, type Currency, type UpgradeDef, type UpgradeId } from '../content/act1.ts';
import { ACT2, BANDS_ACT2, READINGS, type Job, type ReadingId } from '../content/act2.ts';
import { act, actAt, LAST_PLAYABLE_ACT } from '../content/acts.ts';
import { equilibrium, relax } from './ode.ts';
import type { GameState } from './state.ts';

export const BANDS: readonly Band[] = [...BANDS_ACT1, ...BANDS_ACT2];

export type Rates = {
  glowP: number;
  glowK: number;
  planktonP: number;
  planktonK: number;
  murmurP: number;
  murmurK: number;
  /** Calcite production before the lure and feeding multipliers. */
  calciteBase: number;
  calciteK: number;
  lureMax: number;
  heightTarget: number;
};

function has(s: GameState, id: ReadingId): boolean {
  return s.readings.includes(id);
}

export function rates(s: GameState): Rates {
  const lv = s.levels;
  const vent = lv.vent;
  const lightGlow = ACT2.lightGlow * (has(s, 'shoal-pact') ? 2 : 1);
  return {
    glowP: ACT1.symbiontGlow * lv.symbiont + lightGlow * s.jobs.light,
    glowK: ACT1.glowFade,
    planktonP: ACT2.feedRate * s.jobs.feed * (has(s, 'tidebooks') ? 2 : 1),
    planktonK: ACT2.planktonEaten * (has(s, 'slow-currents') ? 0.6 : 1),
    murmurP: ACT2.scoutRate * s.jobs.scout * (has(s, 'beaked') ? 1.5 : 1),
    murmurK: ACT2.murmurFade,
    calciteBase:
      (ACT1.trickle + ACT1.polypRate * lv.polyp * (has(s, 'city') ? 1.5 : 1)) *
      ACT1.ventBoost ** vent *
      (has(s, 'inside-the-wall') ? 2 : 1),
    calciteK:
      ACT1.dissolve * ACT1.latticeFactor ** lv.lattice * ACT1.ventAcid ** vent *
      (has(s, 'lattice-songs') ? 0.7 : 1),
    lureMax: ACT1.lureMax + ACT1.lureMaxPerPattern * lv.lure + (has(s, 'fear') ? 1 : 0),
    heightTarget: heightForBands(lv.skeleton),
  };
}

/** Metres the l-th band (0-based) adds. */
export function bandMetres(l: number): number {
  return ACT1.bandMetres * ACT2.bandGrowth ** Math.max(0, l - ACT2.bandGrowthFrom);
}

export function heightForBands(n: number): number {
  const g = ACT2.bandGrowth;
  const flat = Math.min(n, ACT2.bandGrowthFrom + 1);
  const grown = n - flat;
  // Closed form of the geometric tail: bands 20.. add 3·g^1, 3·g^2, ...
  const tail = grown > 0 ? (ACT1.bandMetres * g * (g ** grown - 1)) / (g - 1) : 0;
  return ACT1.bandMetres * flat + tail;
}

export function lure(r: Rates, glow: number): number {
  return 1 + (r.lureMax * glow) / (glow + ACT1.lureHalf);
}

export function feeding(plankton: number): number {
  return 1 + Math.sqrt(Math.max(0, plankton)) / ACT2.planktonDiv;
}

export function reach(height: number): number {
  return Math.max(1, height / ACT2.reachFrom) ** ACT2.reachPower;
}

/** Instantaneous calcite production per second. */
export function calciteRate(s: GameState, r = rates(s)): number {
  return r.calciteBase * lure(r, s.glow) * feeding(s.plankton) * reach(s.height);
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

/** Where each stock settles if nothing is bought: the reef's natural hold. */
export function calciteHold(s: GameState, r = rates(s)): number {
  const g = equilibrium(r.glowP, r.glowK);
  const p = equilibrium(r.planktonP, r.planktonK);
  return equilibrium(r.calciteBase * lure(r, g) * feeding(p) * reach(r.heightTarget), r.calciteK);
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

const EQ_EPS = 1e-12;
/** Sub-step length as a fraction of the fastest upstream time constant. */
const STEP_FRACTION = 0.05;

function settledAt(x: number, eq: number): boolean {
  return Math.abs(x - eq) <= EQ_EPS * Math.max(1, eq);
}

/** Advance the world by dt simulated seconds. Mutates and returns s. */
export function advance(s: GameState, dt: number): GameState {
  if (!(dt > 0)) return s;
  const r = rates(s);
  const kH = ACT1.settleRate;
  const glowEq = equilibrium(r.glowP, r.glowK);
  const plEq = equilibrium(r.planktonP, r.planktonK);
  const hEq = r.heightTarget;
  const maxStep = STEP_FRACTION / Math.max(r.glowK, r.planktonK, kH);
  const prod = (g: number, p: number, h: number) => r.calciteBase * lure(r, g) * feeding(p) * reach(h);
  let left = dt;
  while (left > 0) {
    const settled = settledAt(s.glow, glowEq) && settledAt(s.plankton, plEq) && settledAt(s.height, hEq);
    const h = settled ? left : Math.min(left, maxStep);
    let p: number;
    if (settled) {
      s.glow = glowEq;
      s.plankton = plEq;
      s.height = hEq;
      p = prod(glowEq, plEq, hEq);
    } else {
      const g0 = s.glow, q0 = s.plankton, h0 = s.height;
      const half = (x: number, P: number, k: number, t: number) => relax(x, P, k, t);
      const gm = half(g0, r.glowP, r.glowK, h / 2), qm = half(q0, r.planktonP, r.planktonK, h / 2), hm = half(h0, kH * hEq, kH, h / 2);
      const g1 = half(g0, r.glowP, r.glowK, h), q1 = half(q0, r.planktonP, r.planktonK, h), h1 = half(h0, kH * hEq, kH, h);
      // Simpson's mean of the production curve over the step.
      p = (prod(g0, q0, h0) + 4 * prod(gm, qm, hm) + prod(g1, q1, h1)) / 6;
      s.glow = g1;
      s.plankton = q1;
      s.height = h1;
    }
    s.calcite = relax(s.calcite, p, r.calciteK, h);
    s.earned.calcite += p * h;
    left -= h;
  }
  s.earned.glow += r.glowP * dt;
  s.earned.murmurs += r.murmurP * dt;
  s.murmurs = relax(s.murmurs, r.murmurP, r.murmurK, dt);
  // Snap the last sliver so "reached the goal" is reachable in finite time.
  if (hEq - s.height < 1e-3) s.height = hEq;
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
  const discount = id === 'skeleton' && has(s, 'walls') ? 0.75 : 1;
  const l = s.levels[id];
  const [from, gentle] = u.growthAfter ?? [Infinity, u.growth];
  const scale = l <= from ? u.growth ** l : u.growth ** from * gentle ** (l - from);
  return Math.ceil(u.baseCost * scale * discount);
}

/** Height the content currently goes up to; bands past it wait for the next act. */
export const HEIGHT_CAP = act(LAST_PLAYABLE_ACT).to;

export function maxed(s: GameState, id: UpgradeId): boolean {
  if (id === 'skeleton' && heightForBands(s.levels.skeleton) >= HEIGHT_CAP) return true;
  return s.levels[id] >= upgrade(id).maxLevel;
}

export function revealed(s: GameState, id: UpgradeId): boolean {
  const { level, earned, height } = upgrade(id).reveal;
  if (s.levels[id] > 0) return true;
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

export function readingsRevealed(s: GameState): boolean {
  return s.bands.includes('murmur') || s.readings.length > 0;
}

export function read(s: GameState, id: ReadingId): boolean {
  const next = nextReading(s);
  if (!readingsRevealed(s) || !next || next.id !== id || s.murmurs < next.cost) return false;
  s.murmurs -= next.cost;
  s.readings.push(id);
  return true;
}

// ---------- Look-ahead ----------

/** Seconds until `amount` of a currency is held if nothing is bought; Infinity if never. */
export function timeUntil(s: GameState, cur: Currency | 'murmurs', amount: number): number {
  const have = s[cur];
  if (have >= amount) return 0;
  const r = rates(s);
  if (cur === 'glow') return solveRelax(have, r.glowP, r.glowK, amount);
  if (cur === 'murmurs') return solveRelax(have, r.murmurP, r.murmurK, amount);
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
  advance(s, dt);
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

export function act1Done(s: GameState): boolean {
  return s.height >= ACT1.goalMetres;
}

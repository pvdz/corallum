// Rates, time advance and purchases. Pure functions over GameState.
//
// The economy is a DAG of stocks, each obeying dx/dt = P - k*x:
//   glow    — P from symbionts, fades at glowFade.
//   calcite — P from polyps, multiplied by the lure (a saturating function of glow);
//             dissolves at `dissolve`, slowed by lattice, sped up by the vent.
//   height  — relaxes toward the target set by skeleton bands.
// Within a sub-step the counts are constant; glow is integrated exactly and calcite uses the
// mean lure over the step (second-order). Once glow sits at equilibrium the lure is constant
// and the rest of any span is a single exact step — so a month offline costs a few iterations
// and ends exactly where the dynamics settle.

import { ACT1, BANDS_ACT1, UPGRADES, type Currency, type UpgradeDef, type UpgradeId } from '../content/act1.ts';
import { equilibrium, relax } from './ode.ts';
import type { GameState } from './state.ts';

export type Rates = {
  glowP: number;
  glowK: number;
  /** Calcite production before the lure multiplier. */
  calciteBase: number;
  calciteK: number;
  lureMax: number;
  heightTarget: number;
};

export function rates(s: GameState): Rates {
  const lv = s.levels;
  const vent = lv.vent;
  return {
    glowP: ACT1.symbiontGlow * lv.symbiont,
    glowK: ACT1.glowFade,
    calciteBase: (ACT1.trickle + ACT1.polypRate * lv.polyp) * ACT1.ventBoost ** vent,
    calciteK: ACT1.dissolve * ACT1.latticeFactor ** lv.lattice * ACT1.ventAcid ** vent,
    lureMax: ACT1.lureMax + ACT1.lureMaxPerPattern * lv.lure,
    heightTarget: ACT1.bandMetres * lv.skeleton,
  };
}

export function lure(r: Rates, glow: number): number {
  return 1 + (r.lureMax * glow) / (glow + ACT1.lureHalf);
}

/** Instantaneous calcite production per second. */
export function calciteRate(s: GameState, r = rates(s)): number {
  return r.calciteBase * lure(r, s.glow);
}

/** Net calcite change per second right now (production minus dissolution). */
export function calciteNet(s: GameState, r = rates(s)): number {
  return calciteRate(s, r) - r.calciteK * s.calcite;
}

export function glowNet(s: GameState, r = rates(s)): number {
  return r.glowP - r.glowK * s.glow;
}

/** Where calcite settles if nothing is bought: the reef's natural hold. */
export function calciteHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.calciteBase * lure(r, equilibrium(r.glowP, r.glowK)), r.calciteK);
}

export function glowHold(s: GameState, r = rates(s)): number {
  return equilibrium(r.glowP, r.glowK);
}

const EQ_EPS = 1e-12;

/** Advance the world by dt simulated seconds. Mutates and returns s. */
export function advance(s: GameState, dt: number): GameState {
  if (!(dt > 0)) return s;
  const r = rates(s);
  const glowEq = equilibrium(r.glowP, r.glowK);
  const maxStep = 0.05 / r.glowK;
  let left = dt;
  while (left > 0) {
    const settled = Math.abs(s.glow - glowEq) <= EQ_EPS * Math.max(1, glowEq);
    const h = settled ? left : Math.min(left, maxStep);
    const g0 = s.glow;
    const g1 = settled ? glowEq : relax(g0, r.glowP, r.glowK, h);
    // Mean lure over the step from Simpson's rule on the relaxing glow curve.
    const gm = settled ? glowEq : relax(g0, r.glowP, r.glowK, h / 2);
    const meanLure = (lure(r, g0) + 4 * lure(r, gm) + lure(r, g1)) / 6;
    const p = r.calciteBase * meanLure;
    s.calcite = relax(s.calcite, p, r.calciteK, h);
    s.earned.calcite += p * h;
    s.earned.glow += r.glowP * h;
    s.glow = settled ? glowEq : g1;
    left -= h;
  }
  s.height = relax(s.height, ACT1.settleRate * r.heightTarget, ACT1.settleRate, dt);
  // Snap the last sliver so "reached the goal" is reachable in finite time.
  if (r.heightTarget - s.height < 1e-3) s.height = r.heightTarget;
  s.t += dt;
  readBands(s);
  return s;
}

function readBands(s: GameState): void {
  for (const b of BANDS_ACT1)
    if (s.height >= b.metres && !s.bands.includes(b.id)) s.bands.push(b.id);
}

export function upgrade(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((u) => u.id === id)!;
}

export function cost(s: GameState, id: UpgradeId): number {
  const u = upgrade(id);
  return Math.ceil(u.baseCost * u.growth ** s.levels[id]);
}

export function maxed(s: GameState, id: UpgradeId): boolean {
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
  return true;
}

/** Seconds until `amount` of a currency is held if nothing is bought; Infinity if it never is. */
export function timeUntil(s: GameState, cur: Currency, amount: number): number {
  const have = s[cur];
  if (have >= amount) return 0;
  const r = rates(s);
  if (cur === 'glow') return solveRelax(have, r.glowP, r.glowK, amount);
  if (calciteHold(s, r) <= amount) return Infinity;
  // Calcite's production drifts with glow; integrate forward in coarse exact steps.
  const probe: GameState = { ...s, earned: { ...s.earned }, bands: [] };
  let t = 0;
  for (let step = 1; t < 1e7; step = Math.min(step * 1.5, 3600)) {
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
  const { height, t } = s;
  advance(s, dt);
  s.height = height;
  s.t = t;
}

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

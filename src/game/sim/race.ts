// The race's geometry: where a racer is on the gauge at a time, and where a height is on it.

import { ACTS, actAt, SURFACE } from '../content/acts.ts';
import { SISTER } from '../content/sister.ts';

/** The sister reef's place on the gauge (0 seamount … 1 surface) at sim time t. */
export function sisterAt(t: number, sc: readonly (readonly [number, number])[] = SISTER.schedule): number {
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

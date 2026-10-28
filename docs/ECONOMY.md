# Economy — Corallum

## Laws
- Stocks: `dx/dt = P − k·x` → `x(t) = P/k + (x0 − P/k)·e^{−kt}` (src/game/sim/ode.ts `relax`).
  Leak k models dissolution, drift, predation. Equilibrium P/k is the natural offline cap.
- Growth (reef height, colony maturity): logistic toward a purchased target (`logistic`).
- Resources form a DAG: each rate depends only on earlier resources, so advancing in order
  with piecewise-constant upstream values over short sub-steps is exact enough, and long
  offline spans converge to equilibrium.
- No purchases while offline. A week offline equals a month offline.

## Pacing targets (to be validated by the bot playthrough)
| Act | Target active time |
|---|---|
| I | 30–45 min |
| II | 1.5–2 h |
| III | 2–3 h |
| IV | 3–4 h |
| V | 1–2 h |
| Spawnings | 3–4 over the game; each run faster than the last |

## Height
`heightTarget = Σ bandMetres(l)` over skeleton levels, with `bandMetres(l) = 3 · g^max(0, l − 19)`:
3 m per band through Act I, then growing geometrically so Act II's 3,000 m is ~40 bands.

## Act II stocks (all dx/dt = P − kx; upstream of calcite)
- plankton: P = feed shoals × rate, k fast (eaten). Multiplier on calcite: 1 + √plankton/8.
- glow: + light shoals × rate.
- murmurs: P = scout shoals × rate, k slow (voices fade back into the stone).
Calcite's production is f(glow(t), plankton(t)); advance() takes Simpson's mean of f over
each sub-step while upstream stocks relax, then one exact step once they have settled.

(Tables of costs and rates get filled in as content is written.)

## Falling feasts (active play only)
After the band "What falls" (95 m), each 300 s slot holds one feast at a seeded moment
(`mulberry32(seed, k)`), visible for 45 s. Eating it adds 90 s of calcite production (`feast()`), once
per window (`state.feasted`). Offline catch-up never eats feasts, and the bot ignores them, so the
pacing targets and the offline cap are untouched; a watching player gets roughly +30% calcite.

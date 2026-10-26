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

(Tables of costs and rates get filled in as content is written.)

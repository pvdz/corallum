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
Calcite's production is f(glow(t), plankton(t), height, silt, bloom); while upstream stocks relax,
advance() takes Simpson's rule over each sub-step of both f and f·e^{−k(h−τ)} (what is made early
decays for the rest of the step), so the calcite update is fourth order; then one exact step once
everything upstream has settled. (Relaxing with the plain mean of f was only second order: with
the photo term √bloom swinging calcite ×200 that gave 1e-5 offline/online gaps.)

(Tables of costs and rates get filled in as content is written.)

## Falling feasts (active play only)
After the band at 42 m (late Silt Floor), each 300 s slot holds one feast at a seeded moment
(`mulberry32(seed, k)`), visible for 45 s. Eating it adds 90 s of calcite production (`feast()`), once
per window (`state.feasted`). Offline catch-up never eats feasts, and the bot ignores them, so the
pacing targets and the offline cap are untouched; a watching player gets roughly +30% calcite.

## The journal (lineage-wide)
calcite × (1 + 0.02·seen + 0.01·touched), counting creatures in meta.seen ('c:' and 't:'). A
constant within a run, so offline stays exact. Shared table (a way): a feast left to sink is
eaten for 0.5 × its value in its last second in reach, while watching.
Gifts (active only): touching a creature gives 30 s of its stock's production (glow for the
glowing ones, sand from the Rasp, plankton from shoals, calcite otherwise or when the reef makes
none), capped at 0.3 × what the reef holds of it, ×3 from rare visitors, once per 180 s per creature (state.gifts).

## Milestones (polyps and glimmerseed)
Each milestone doubles everything its kind makes (`ACT1.milestoneFactor`, `MILESTONES` in content/act1.ts):
polyps at 10, 25, 50, 100, 150, 200; glimmerseed at 10, 25, 50, 100. To keep the pacing, band cost
growth per zone became {1: 1.55, 2: 1.165, 3: 1.22, 4: 1.11, 5: 1.022} (was 1.3/1.2/1.11/1.14/1.03),
polyp cost growth 1.2 (was 1.17), glimmerseed 1.18. Bot: Act I 22 min, Act II to 2h00, Act III to
4h26, end 8h28 (default path); every truce/dialect path ends 7h24–8h40. The polite-Rasp terms now eat
90% of the calcite the others do (it was none: with milestones that path finished 2 h early), and
keeping Ossel is calcite ×1.25 (was ×1.5). `STEP_FRACTION` 0.03 keeps offline == online within 1e-6.

## Glow stays worth having (shoal jobs)
The lure's half-saturation glow grows with height: `lureHalf × (1 + h/60)^1.6` (brighter water, less
contrast), and each light-swimming shoal also amplifies glimmerseed glow by 8%. Feeding and light now
both pay (one more shoal ≈ +1–3% calcite each, shown on the job rows via `jobGain`). The bot places
feeders/light-swimmers by marginal settled calcite (`balanceFeedLight`). Band cost growth retuned to
{1: 1.55, 2: 1.16, 3: 1.2, 4: 1.11, 5: 1.021}; bot 8h08 default, paths 7h07–8h13.
Tuning note: band costs compound across zones (each zone continues from the last band's cost), so
changing an early zone's growth moves every later zone too: Act I 1.55→1.45 took the whole game from
8h08 to 5h08. Late Act I is a slower stretch (2–4 purchases/min for minutes 13–21, two story bands
in it); accepted for now.

## Seagrass meadows (Act IV sand sink)
`meadow`: paid in sand (8000 × 1.3^n, max 12), bloom ×1.15 each. Sand used to pile up at its hold
once sand bars outgrew it; now the Rasp dial matters in Act IV too (more grazers, more sand, less
calcite held). Band growth for zones 4 and 5 retuned to 1.135 / 1.028; bot 8h08, paths 7h13–8h35.

## Expeditions (Act II–III)
A trip removes `shoals` from the jobs for `seconds`; the return is a breakpoint: `advance` splits
dt at `expedition.back`, so offline equals stepped online (test/sim/expedition.test.ts). Pay on
return: murmurs = 0.5 × shoals × seconds, plus the relic's multiplier (economy.ts `found()`).

## Residents (Act III–V)
Homes = count of [3000, 3400, 3800] ≤ height. Effects are plain multipliers in `rates()` (`lives()`),
so offline needs nothing new.

## Readings spread out
Reading costs 40/900/1800/3000/4500/6000/8000/7000/7500 murmurs (were 25…16000 with five under
1100, so five stories landed within four minutes). Now one every 5–15 min through Act II. Act II
band growth 1.155. Bot: 7h48 default, paths 7h08–8h28.

## Lamp-nets (Midnight Water)
Upgrade `net` (glow, 20 000 × 3^level, max 6): planktonP × 1.05^level. Plankton feeds calcite strongly, so
the nets are dear; with them the band cost growth sits at {2: 1.195, 3: 1.315, 4: 1.225} (bot 7h28).

## Warm water (Sunlit Crown)
HEAT: period 1800 s, warm for the first 240 s, from the purchased height ≥ 3800 m. bloomP × (closed ? 0.5 :
warm ? 1.6 : 1); bloomK × (warm and open ? 5 : 1). Rates change at the edges, so `advance` splits time
there (like an expedition's return). An open reef never settles; a long absence repeats one cycle, so
once a whole cycle ends where it began (1e-12) the remaining whole cycles are skipped (`skipCycles`,
earnings scaled): a month away costs ~10–20 ms instead of ~150.

## Seamounts and the Rasp dial (2026-10-29)
A lesser spawning chooses where to settle (content/lineage.ts SEAMOUNTS): plain; warm (each vent
tier ×1.07 stronger, acid ×1.3: faster while watching, weaker offline); cold (dissolve ×0.5, polyps
×0.92: slower while watching, holds twice as much offline); crowded (Readings ×0.6, silt ×1.4).
Bot full game: plain 8h08, warm 7h08, cold 8h48, crowded 8h28.
Found while balancing them: `bestRasp` maximised what the reef holds, but late on the hold is ~60×
the next band, so income is what matters; fewer Rasp let silt choke the polyps. It now picks the
most settled calcite/s among settings whose hold covers the next band twice. That sped the whole
game ~2 h; band growth for zones 3–5 retuned to 1.24 / 1.16 / 1.035 (bot 8h08 again).

## Rebalance (2026-10-29)
After expeditions, residents, moments, the water, requests, shards, works and the sister race the bot finished in ~4h. Band cost growth per zone raised (Midnight 1.155→1.18, later 1.19; Twilight later 1.31, Sunlit 1.22; Twilight 1.24→1.28, Sunlit 1.16→1.2): bot 7h28 (3000 m at 1h50, 3800 m at 4h29, surface 7h16).

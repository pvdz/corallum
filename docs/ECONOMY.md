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
the nets are dear; with them the band cost growth sits at {2: 1.2, 3: 1.315, 4: 1.225} (bot 7h28 after the later bonuses).

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

## Old stone
`old` follows dx/dt = P − k·old with k = 1/1500 s⁻¹, P = 6k (cap six knobs; closed form, also
over skipped warm-spell cycles). Each whole unit is a knob on a branch tip; breaking one off pays
`burst(25 s)` of the zone's currency. Away, at most six knobs wait: the cap is the dynamics.

## Milky sea
Midnight Water only, active: from t = 300 s every 1500 s for 60 s. Each sweep then also adds
`glowP × 4 s` of glow (on top of its calcite). Nothing accrues while away.

## Lucky neighbours
Each creature, in each 120 s span of reef time, is lucky with probability 2.5% (seeded by reef seed,
creature id and span). A touch then gives the creature's gift at once (ignoring the cooldown) ×5;
one lucky touch per span. Active only.

## Guard (shoal job)
From 3800 m. With ≥ 4 shoals on guard, every intruder is driven off in its last second for half its
pay (like guard crabs for thorn stars). Guards are taken from feeding, so it costs plankton.

## Grottoes
Sand sink on the shelf: 3000 × 5^level sand, max 2; each +1 resident home.

## Vows
After the line's first ending, a new reef may take vows; at its ending `lineageFor` adds each kept
vow: Haste (surface within 7 h of reef time) +6, Lightness (carry one memory fewer) +4, Solitude
(no resident homes) +4.

## Tangles
Zones 2–4, active only: one slot every 420 s at a seeded moment, there for 35 s. Freed, `burst(40 s)`.

## Today's visitor
Client passes the calendar day; one non-rare creature of the current zone (seeded by day and zone).
Its first touch that day: +1 lineage.

## Later works
Listening dome (Midnight, 1500 m): scouts ×1.25 per stage. Grazing lawn (Twilight, 3400 m): sand ×1.15
per stage. Both three stages, ×10 per stage in calcite.

## Height settles with an overshoot (2026-10-31)
Height relaxes toward `target + 0.6 × the last band's metres` at `settleRate` and stops on the
target (economy.ts `settleAim`). Plain relaxation to the target crept through the last metre for
minutes (from 30 m below, 40·ln(30 000) ≈ 7 min to cross 3000 m, most of it showing "2999 m"); with the
overshoot one band's rise takes ~39 s (40·ln(1.6/0.6)) and ends on the target, still easing in (0.25 took ~64 s and, in real play, held the first zone change a minute after its band was bought). The greedy bot went 7h28 → 7h08 (the
creeping was dead time); the saver is unchanged at 3h08 (a bug's number: see the correction below).

## Seamounts, measured (bot, no lineage, 2026-10-31, before the settle overshoot)
Whole game / 3000 m / 3800 m. Hard seamounts are trials (reach the goal, then spawn early); a full
ending there is not expected, and a real second reef carries traits.

| seamount | ending | 3000 m | 3800 m | trial goal |
|---|---|---|---|---|
| plain | 7h28 | 1h29 | 4h18 | – |
| warm | 6h08 | 1h21 | 3h42 | – |
| cold | 7h48 | 1h32 | 4h25 | – |
| crowded | 7h09 | 1h16 | 4h02 | – |
| hungry | 10h28 | 2h29 | 6h34 | 3000 |
| silent | not in 20 h (3780 m at 19 h) | 3h04 | – | 2800 |
| lonely | not in 20 h (3989 m) | 3h26 | 11h56 | 3000 |
| buried | 7h51 | 1h29 | 4h50 | 3600 |
| dark | 9h48 | 2h07 | 5h57 | 2500 |
| shallow | 7h08 | 1h29 | 4h18 | 3950 |
| thorny | 7h08 | 1h29 | 4h01 | 3700 |
| heavy | 9h08 | 2h01 | 5h25 | 3000 |
| gleaming | 7h08 | 1h25 | 3h59 | 3500 |
| tidal | 7h28 | 1h29 | 4h18 | 4000 |

Every trial goal is reached; the whole game on silent and lonely is a wall rather than a climb
(silent has no Readings' multipliers; lonely caps shoals at 8). Fine as trials; revisit if a
player is expected to finish there.

## Correction (2026-11-08): the saver's 3h08 was a bug
`timeUntil` (the countdowns on cards; the saver bot's "is the band under ten minutes away?") probed
ahead on a *shallow* copy of the state. When the probe passed the shoals' homecoming, `homecoming`
wrote through the shared nested objects: the returning shoals were added to the real `jobs` again
(12 light shoals per call in one measured case), a roam counted, a diary line written; a visit trip
would have added lineage. The saver called it every tick, so its shoals multiplied: hence 3h08. Real
players had the same inflation whenever shoals were away and a card showed a countdown (glow in the
Twilight measured 2.1M against ~35k). With a whole copy the saver takes **7h08, the same as the
greedy bot** (test/sim/expedition.test.ts guards it; save.ts clamps jobs inflated by old saves). The
section below is history: read "saver" there as the bug's number. The game's real length by bot is
about seven hours either way; sweeping and attention shorten it.

## How long the game really takes: the greedy bot overstates it (2026-10-31)
The pacing yardstick (and `pacing: … 6–11 h` in the tests) is the default bot, which always buys the
cheapest thing it can afford and so never saves for a band. `tools/bot.ts --saver` holds its calcite
when the next band is under ten minutes away, as a player watching the band card would:

| bot | sweeps every tick | never sweeps |
|---|---|---|
| greedy (default) | 7h08 (7h28 before the settle overshoot) | 8h28 (before) |
| saver | 3h08 | 3h48 (before) |

(saver + sweeps: 3000 m at 1h07, 3800 m at 2h14, the surface at 3h07.) An attentive player who saves
could finish in three to four hours of play, not seven to nine. Real players sit between the two,
and time away is capped by the holds. The panel's "best buy" badge ranks calcite upgrades by
payback; it valued a band at nothing (its gain is height, and the steady rate held height fixed), so a player following it played like the greedy bot. Since 2026-10-31 a band is valued at its settled height, and the badge names it through most of the Midnight Water (a band paid back 4–5× sooner than a polyp there). Raising band cost growth is the wrong lever: at
{2: 1.24, 3: 1.36, 4: 1.27, 5: 1.05} the saver only goes 3h08 → 3h48 while the greedy bot goes
7h28 → 30h (it starves the bands). Kept as it is: by play style the game takes three to seven and a
half hours of play, most players somewhere between.

# Design — Corallum

## Principles (every feature is checked against these)
1. Growth shows up in the world: the reef, water colour and creatures change, not just counters.
2. Every act adds a new *verb* (a new kind of decision), not just a bigger number.
3. Real trade-offs: allocation and branching choices with opportunity cost; more than one viable route.
4. Rhythm: short "can afford something" beats inside longer goals; no dead walls longer than the
   act's pacing target (measured by a headless bot playthrough).
5. Prestige changes how you play (Lineage traits open new strategies), not just a multiplier.
6. Respect time: offline progress, nothing lost to absence, no click-grinding as main income.
7. Clarity: show rates, time-to-afford, and what an upgrade does before you buy it.
8. Juice: every purchase gets visible and audible feedback.
9. The story is told through the mechanics (reading bands, the Rasp truce, the memory choice).
10. It ends: a real finale, then an optional epilogue garden.

## Acts and verbs
| Act | Zone | New resource | New verb |
|---|---|---|---|
| I | The Silt Floor (4000 m) | Calcite, Glow | grow polyps, build vent chimneys |
| II | The Midnight Water | Plankton | assign shoals: feed / light / scout bands |
| III | The Twilight Shelf | Current | shape flow with reef walls; manage silt drift; Rasp truce |
| IV | The Sunlit Crown | Sunlight | choose a reef dialect (branching tree) |
| V | The Breach | Spawn | pour everything in; choose memories; finale |

Prestige: **Lesser Spawning** → new seamount, keep **Lineage** traits and decoded bands.

## Presentation
- Canvas world (procedural: water gradient by depth, marine snow, coral growth via space
  colonisation, glow, boids, kelp, caustics near the surface). Camera climbs with reef height.
- DOM panels overlaid: desktop side panel; mobile bottom sheet with tabs.
- System font stacks only (no network). Display: Iowan/Palatino/Georgia/DejaVu Serif.
- Reduced-motion and quality tiers.

## Depth and acts
Reef height is how far the reef has climbed the seamount's flank; depth = 4000 m − height.
Acts follow the real ocean zones:

| Act | Zone | Reef height | Depth |
|---|---|---|---|
| I | The Silt Floor | 0–60 m | 4000–3940 m |
| II | The Midnight Water | 60–3000 m | 3940–1000 m |
| III | The Twilight Shelf | 3000–3800 m | 1000–200 m |
| IV | The Sunlit Crown | 3800–3980 m | 200–20 m |
| V | The Breach | 3980–4000 m | 20–0 m |

Each act is its own scene (palette, creatures, a fresh coral crown entering from below);
the previous act's scene is gone below the frame.

## Act II — The Midnight Water
- **Shoals** of lanternfish come to the light: bought with **glow** (glow becomes a currency
  as well as the lure).
- **The verb: allocation.** Each shoal is assigned to one job, changeable any time:
  - *Feed* — herd plankton to the polyps → **Plankton** stock → calcite multiplier
    `1 + √plankton / 8` (sublinear, never caps).
  - *Light* — swim in the reef's glow pattern → more **glow** production.
  - *Scout* — dive into the silt to listen at buried bands → **Murmurs** stock.
- **Readings**: one-off purchases with murmurs. Each deciphers a buried Thousandfold band:
  a piece of lore plus an effect. This is how Act II's story is told.
- Trade-off: plankton grows the economy, light buys more shoals, scouting buys knowledge and
  permanent effects. No allocation is right for the whole act.

## Act III — The Twilight Shelf (3000–3800 m)
Entry requires the last Act II Reading (*Inside the wall*): the story turn opens the shelf.

- **Silt** (stock on the reef): the shelf collects the Long Silt sliding downslope.
  `dS/dt = F − (κ_flow·Q + κ_rasp·R)·S`; calcite is multiplied by `1 / (1 + S/S0)` (smothering).
- **The Rasp dial** (verb 1): the player sets how many Rasp grazers to admit, 0..Rmax.
  Each clears silt, grinds dead stone into **sand**, and eats calcite (an extra leak ρ·R).
  Too few: smothered. Too many: they eat the reef's store. The optimum moves as you grow.
- **Sand** (stock): produced by Rasp, settles slowly. Buys **sand bars** (more flow Q, which
  sweeps silt) and **feeding channels** (plankton ×).
- **The truce** (verb 2: choosing): three meetings with the Rasp, each unlocked by learning
  enough of their words (paid in **murmurs**, so scouting stays useful). Each meeting is a
  permanent choice between two terms, with economic and story consequences; the third is
  whether to give Ossel's wall to the Rasp. The choices colour the ending.
- **Grazing grounds** (calcite): raise Rmax.

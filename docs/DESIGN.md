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

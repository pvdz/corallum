# Plan: "Corallum" — an incremental canvas game

## Context
Empty repo at /workspace (no commits). The user wants a beautiful, detail-lush incremental game
(resource/upgrade-tree optimisation) running in an HTML5 canvas, served by a Node server on
localhost, playable on mobile and desktop, with a deep story and a clear final goal, and with
offline gains that are capped *by the game's own dynamics* and exactly computable. I'll work on it
autonomously for days, restarted often, so the repo must carry its own plan, progress log and
working rules. This turn's deliverable: the plan on disk (docs/), CLAUDE.md, folder skeleton,
a booting "hello canvas" server, test + screenshot harness, first commit.

**Originality is a requirement (user, 2026-10-26):** no lore, names or specific story beats copied
from existing games. The first draft ("Emberroot": dead sun, ember sacrifice, light-spirit in a
world-tree, moth cult, "the Choir") leaned on Dark Souls, Ori, Hollow Knight and Bloodborne and
was discarded. Every new name or story beat gets checked against games I know, and the result
goes into docs/STORY.md ("Originality check" table). CLAUDE.md makes this a standing rule, and I
save it as a feedback memory.

Stack follows my settled prior preferences (memory: project-gallastica-stack, no-npx, no-rm,
no-subagents): **zero npm deps, no build step.** Node 24.22 strips TS natively
(`module.stripTypeScriptTypes` verified present); the server type-strips `.ts` for the browser on
the fly. `tsc` 7.0.2 global for `--noEmit` typecheck only. Playwright global, browsers in
/opt/playwright-browsers (chromium-1248). No network needed; system fonts only (no Google Fonts),
so typography uses careful system font stacks + canvas-drawn display lettering.

## The game (design summary — full version goes to docs/DESIGN.md + docs/STORY.md)
**Premise.** A deep-sea world. For four hundred years the **Long Silt**, a slow grey snowfall of
ground stone, has buried every reef in the sea. In this world a reef is memory: every polyp lays
down a thin calcite band of what it witnessed, so the buried reefs are drowned archives. You are
the first living polyp of a new reef, settled on a seamount 4,000 m down. Grow the reef upward
through the zones of the sea. **End goal, visible from the first minute as a faint silver ripple
far above: breach the surface on the night of the Spawning Moon and release the reef's spawn,
carrying the archive into a new sea.**

**Lore arc (told by the bands of buried reefs your reef grows into and "reads"):**
- The old reef-city **Thousandfold** remembered everything and grew without end.
- It walled out the **Rasp**, beaked grazers that grind dead coral into sand (based on real
  parrotfish) and kept reefs from choking on their own growth.
- Without them it grew over its own currents, smothered, and was ground down by the sea; the
  Long Silt *is* Thousandfold's own skeleton.
- Your narrator is **Ossel**, the last living polyp of a dead reef wall. Ossel's memories turn out
  to be incomplete, and some of them false.
- Theme: remembering vs. forgetting. A reef that keeps everything calcifies and dies. In the
  finale you choose which recovered memories the spawn carries, which shapes the epilogue.
  Rebuilding a truce with the Rasp is a mid-game turn.

**Acts = depth zones the camera climbs:**
1. *The Silt Floor* (abyss) — Calcite + Glow (luminous symbionts); polyps, vent chimneys.
2. *The Midnight Water* — lanternfish shoals and glass shrimp as partners; Plankton; allocate
   shoals between feeding, lighting and scouting buried bands.
3. *The Twilight Shelf* — Currents: shape flow with reef walls; silt drift as a pressure; the Rasp truce.
4. *The Sunlit Crown* — Sunlight (photosynthetic symbionts), colour returns; reef "dialects"
   (a branching choice tree).
5. *The Breach* — surface, the Spawning Moon; pour everything into the spawn; finale + memory choice.

**Prestige: "Lesser Spawnings."** Before the reef can reach the surface, you can release a
partial spawn that settles on a new seamount. The run starts over deep down but keeps
**Lineage** (inherited traits, permanent upgrade currency) and newly decoded bands. A full game
is about 3–4 spawnings; total playtime target ~10–20h active over several days.

**Originality check (initial, to be kept in docs/STORY.md):**
- Underwater depth progression is a common setting (Subnautica, Abzû, Beyond Blue, Endless
  Ocean), and Abzû has underwater ruins and restoring sea life. I avoid a human diver, ancient
  machines and "restore the ocean" as the goal.
- Coral Island has a reef-cleanup side activity (farming sim), a loose overlap of topic only.
- I know no game with these elements: a coral colony as the protagonist, reefs as calcite memory
  archives, the Long Silt, Thousandfold, the Rasp, Ossel, Lesser Spawnings / Lineage, or a
  surface-spawning finale where you choose memories.
- "Corallum" is a real biology term for a coral skeleton; I know no game by that name. Small
  indie titles can't be ruled out, so names stay easy to change (all strings live in one content file).

**Design principles (go into docs/DESIGN.md; every feature is checked against them):**
1. Growth shows up in the world: the reef, water colour and creatures change, not just counters.
2. Every act adds a new *verb* (a new kind of decision), not just a bigger number.
3. Real trade-offs: allocation and branching choices with opportunity cost; more than one viable route.
4. Rhythm: short "can afford something" beats inside longer goals; no dead walls longer than the
   current act's pacing target (measured by a headless bot playthrough, M6).
5. Prestige changes how you play (Lineage traits open new strategies), not just a multiplier.
6. Respect time: offline progress, nothing lost to absence, no click-grinding as main income.
7. Clarity: show rates, time-to-afford, and what an upgrade does before you buy it.
8. Juice: every purchase gets visible and audible feedback.
9. The story is told through the mechanics (reading bands, the Rasp truce, the memory choice).
10. It ends: a real finale, then an optional epilogue garden.

**Offline, capped naturally & computable.** Every stock obeys `dx/dt = P − k·x` (production
minus dissolution/drift/predation), so it rises toward the equilibrium `P/k` along a closed form
`x(t) = P/k + (x0 − P/k)·e^{−kt}`. Growth processes (reef height, colony maturity) are logistic
toward a target set by purchases. Couplings are a DAG (each resource depends only on earlier
ones), so offline is advanced exactly by an exponential integrator in a bounded number of steps.
Beyond ~6 time constants everything sits at equilibrium, so a week offline == a month offline.
No purchases happen offline. Tests assert offline(t) ≈ stepped online(t) and saturation.

**Visuals (all procedural, no image assets):** depth-graded water colour (black-violet abyss →
teal → sunlit turquoise), god rays and caustics near the surface, marine snow, a seeded
branching coral growth (space-colonisation algorithm) as the centrepiece that visibly grows,
additive bioluminescent glow (offscreen downsampled blur pass), fish-shoal boids, drifting
jellies, swaying kelp and anemones, parallax buried-reef silhouettes, the moon's ripple above.
Quality tiers auto-adjust to keep 60fps on mobile. Procedural WebAudio ambience (optional,
muted by default).

**Layout.** Desktop: world canvas with a side panel. Mobile portrait: world on top, bottom sheet
with tabs. Breakpoints by aspect/width; touch + mouse + keyboard; devicePixelRatio aware.

## Architecture
```
CLAUDE.md                 agent working rules (restart protocol, commands, conventions, originality rule)
docs/PLAN.md              this plan, milestones + checklist (the source of truth)
docs/DESIGN.md  STORY.md (incl. originality check)  ECONOMY.md (formulas, pacing)  PROGRESS.md (append-only log + "NOW:" line)
src/server/server.ts      http static server, on-the-fly TS strip, `node src/server/server.ts` → :8080
src/game/sim/             pure deterministic sim: state, advance(dt), offline, save/load (no DOM, no Math.random/Date.now)
src/game/content/         data: resources, upgrades, acts, lore bands, all names/strings
src/game/render/          canvas renderer: water, terrain, coral growth, particles, glow, surface
src/game/ui/              panel/bottom-sheet UI, input, layout breakpoints
src/game/audio/           procedural ambience
src/client/main.ts  index.html
test/sim/*.test.ts        node --test (economy, offline equivalence, save round-trip, determinism lint)
test/e2e/*.ts             playwright smoke (desktop + mobile viewport, no console errors)
tools/screenshot.ts       playwright → screenshot/YYYY-MM-DD-HH-MM/{desktop,mobile}-*.png; debug URL params jump to states
screenshot/               committed screenshot series
```
**UI (user-decided):** canvas for the world (water, reef, particles, glow); styled DOM panels
overlaid for upgrades, story text and buttons, made to look seamless with the canvas.

**Language (user-decided):** everything is TypeScript, run via Node's native type stripping —
the server type-strips with `module.stripTypeScriptTypes` before serving to the browser. **Never
compile to JS**, no emitted `.js`, no bundler. So only erasable syntax is allowed (no enums,
namespaces, parameter properties; `import type`; `.ts` extensions in imports), enforced by
tsconfig `erasableSyntaxOnly` + `verbatimModuleSyntax` + `allowImportingTsExtensions` +
`noEmit`. `tsc` 7.0.2 is already globally installed.

## Milestones (each ends with tests green, screenshots, commit)
- **M0 Scaffold (this turn):** docs, CLAUDE.md, folders, server, empty animated canvas, test runner,
  screenshot tool, `.gitignore`, package.json scripts (no deps), first commit + first screenshot
  series. Memory writes (plan mode blocks them until approval): feedback memory for the
  originality rule; project memory for Corallum (premise, stack, user decisions: DOM-over-canvas
  UI, strip-types TS with no JS compile), plus a MEMORY.md index line.
- **M1 Core sim + Act I playable:** calcite/glow economy, ODE integrator, offline + save/load, basic UI.
- **M2 Visual pass I:** abyss water, seamount terrain, coral growth, glow, marine snow, mobile layout.
- **M3 Acts II–III** (shoals, plankton, currents, silt, Rasp truce) + lore-band reader UI.
- **M4 Lesser Spawning prestige + Lineage tree.**
- **M5 Acts IV–V**, dialects, the Breach, ending + memory choice, epilogue.
- **M6 Polish:** audio, balance sim (headless "bot" playthrough timing each act), perf tiers,
  accessibility (reduced motion, text scale), codex.
Ongoing: bug fixes, tests, screenshot series after visual changes.

## Restart protocol (into CLAUDE.md)
On every (re)start: read CLAUDE.md → docs/PROGRESS.md "NOW:" line → `git status`/`git log -5`.
Commit small and often so an outage loses little; update PROGRESS.md before each commit.

## Verification
- `node --test test/sim` green; `tsc --noEmit -p .` clean.
- `node src/server/server.ts` serves on localhost; playwright smoke loads desktop (1440×900) and
  mobile (390×844) with zero console errors.
- `node tools/screenshot.ts` writes a timestamped series under screenshot/; I look at the PNGs.

## Checklist
Tick items as they land; keep this list honest. Add items freely.

### M0 Scaffold
- [x] docs, CLAUDE.md, folders, package.json, tsconfig, .gitignore
- [x] server.ts with on-the-fly type stripping
- [x] opening abyss scene (seeded, time-pure)
- [x] closed-form integrators + tests, determinism grep test
- [x] Playwright harness, smoke test, screenshot tool, first screenshot series
- [x] first commit

### M1 Core sim + Act I
- [x] GameState type, versioned save/load (localStorage + export string), migration hook
- [x] economy DAG: Calcite, Glow, polyps; costs, rates; advance(state, dt)
- [x] offline: advance on load from saved wall-clock; "while you were away" summary
- [x] tests: offline == stepped online, saturation, save round-trip
- [x] basic DOM panel: resources with rates, upgrade cards with time-to-afford
- [x] first lore band
- [x] time compression: headless bot (src/game/sim/bot.ts, tools/bot.ts), ?bot/?skip/?speed, corallum.skip()
- [x] M1 leftovers: tap-to-sweep feedback on the reef itself (render/taps.ts: ripple, food motes drawn into the crown, crown flare); keyboard shortcuts

### M6 Polish (in progress)
- [x] procedural audio: zone pad + surf, purchase chimes, sweep bubble, story tone, choice and release cues; toggle top-left, off by default, remembered
- [x] accessibility: prefers-reduced-motion slows ambient animation; keyboard shortcuts (Space, P, B, G); text scale = browser zoom
- [x] codex: "Your reef" summary in the Bands tab
- [x] Ossel's whispers (content/whispers.ts): contextual one-line hints over the water, once per lineage
- [x] early polyps cluster at the reef foot until the stone can host them
- [x] real-speed playtest of the first 3 minutes: a purchase every 4–6 s, a story every 40–60 s
- [x] perf: panel countdown probes were 19–25 ms/frame in Acts IV–V → coarse probes, one card per frame (<1 ms); glows use cached sprites; `corallum.prof` shows draw/panel ms
- Backlog (goal: keep adding features and gameplay):
  - [x] keyboard play for the shoals' signal (7–0)
  - [x] a chronicle of the line's endings (which memories each time) in the Lineage tab
  - [x] more creatures: frogfish (Twilight), sea snake (Sunlit), pelican (Breach)
  - [x] the Rasp elder: riddles about the story for lineage
  - [x] a Midnight moment: hunters in the dark (shelter the shoals, or light the water)
  - [x] Ossel's lines change once mistakes are found
  - [x] after the ending: a page of this reef's numbers
  - [x] journal: each zone's completion shown as a small ring
  - [x] a whale fall that can be visited by the shoals (Midnight trip variant)
  - [x] a sixth ruin in the Sunlit Crown: the sun gate (bloom ×1.2)
  - [x] a seventh resident for the Breach: an anemone with its clownfish
  - [x] a Twilight moment: the slope gives way
  - [x] each hard seamount has a moment of its own
  - [x] warm water in the Sunlit Crown: open (sun ×1.6, bleaching) or closed (sun ×0.5)
  - [x] Sun-shy trait: an open reef closes itself in warm water
  - [x] the rising in the Midnight Water and Twilight Shelf: send the feeders in for a haul
  - [x] Breach creatures: sailors, storm petrels, sea sparkle
  - [x] trip encounters: four seeded forks with two ways each
  - [x] a sixth hard seamount: shallow (warm spells ×2 long), its trial and moment
  - [x] an eighth resident: cleaner wrasse (gifts ×2, back twice as soon)
  - [x] four more Midnight moments (fire-body, seep, the rising stops, a shoal breaking up)
  - [x] traits Deep larder (two risings' worth) and Grain-sense (habit)
  - [x] the strain's sport at 3000 m: two variants per strain
  - [x] the grain of the stone: every tenth band, dense / quick / bright
  - [x] calcite step made fourth order (decay-weighted Simpson)
  - [x] the night sky at the Breach: name six figures by tracing their stars (spawn ×1.04 each, ending page, feat)
- [ ] perf on a real phone (unmeasured: headless is software-rendered). Tools ready: `--lan` prints the network address, `?fps` shows a readout; see README "Trying it on a phone"
- [x] rebalance pacing after the feature push (bot fell to ~4h): band cost growth 2: 1.18, 3: 1.28, 4: 1.2 → bot 7h28; test bound back to 6–11 h

### M4 Lesser Spawning prestige + Lineage — landed 2026-10-27
- [x] sim: lineage by height, seven traits, meta kept across runs, seen stories suppressed on reruns
- [x] UI: Lineage tab (release / begin again, trait shop), lineage band note on each new seamount
- [x] bot can spawn; one spawning at 1000 m finishes the game sooner (6h23 vs 8h08)
- [x] tests: sim + browser (injected save)

### M5 Act V (The Breach) + ending — landed 2026-10-27
- [x] sim: spawn stock, ripen, the Spawning Moon (20 min cycle, full window), breach with 3 of 12 memories
- [x] UI: spawn stock, moon card, memory choice screen, ending sequence (release, 3 epilogues, Ossel closing, last line), replay in Reef tab
- [x] scene: The Breach (night sky, moon in phase, glitter path, reef breaking the surface, spawn rising from polyps, surface slick, far reefs spawning)
- [x] bot plays the whole game: ~8–9 h on every path; browser finale test
- [x] after the ending: "Begin again" (a spawning with +10 lineage) in the Lineage tab; the ended reef keeps living

### M3c Act IV (Sunlit Crown) — landed 2026-10-27
- [x] sim: sunlight, bloom (photo multiplier + currency), pigments, canopy, 3 tiers × 3 dialects
- [x] bot speaks dialects; every path 1h48–2h14
- [x] UI: bloom stock, dialect card; band text variant when Ossel was kept
- [x] scene: Sunlit Crown (surface glare, caustics, young reefs, reef fish, larvae); coral form follows the Form dialect (fan / branching / massive dome / plating tables)

### M3b Act III (Twilight Shelf) — landed 2026-10-27
- [x] sim: silt (smother), sand, Rasp dial, sand bars, channels, grazing grounds, three truce meetings, story gates
- [x] per-zone band tables (3 m / growing / 30 m / 6 m / 1 m strides; cost growth per zone)
- [x] bot plays the dial (best hold) and truce; Act III ≈ 2h45m whatever the truce path
- [x] UI: silt/sand stocks, Rasp slider, truce card with choices, truce outcomes in the band list
- [x] scene: Twilight Shelf (light shafts, silted slope, Rasp, sand bars, Ossel's wall → dune or living branch)
- [x] the Rasp react to the truce: trusting ones graze at the reef foot, polite ones keep off its stone

### M3 Act II (Midnight Water) — landed 2026-10-27
- [x] sim: shoals + jobs, plankton, murmurs, Readings, reach, band growth; bot plays to 3000 m in ~1h50m
- [x] UI: shoal job steppers, Readings card, stock rows, zone bar with depth
- [x] scene: Midnight Water (shoals show their jobs, plankton, flashes, comb jellies, siphonophore); zone crossfade + title card
- [x] Act II: the last Reading gates the Twilight Shelf
- [x] glass shrimp in the Midnight Water

### M2 Visual pass I
- [x] coral growth: branching structure (space colonisation) instead of a pillar; bands visible as growth rings
- [x] glow post-process (downsampled additive blur) and quality tiers (bloom drops on slow frames)
- [x] camera framing that climbs as the reef grows; parallax buried-reef silhouettes (render/ruins.ts: Thousandfold's drowned towers at three depths, sinking through the frame as the reef rises)
- [x] creatures: drifting jellies, brittle stars; vent chimney with plume when vent bought
- [x] deep fish (Act I: a slow rattail near the floor)
- [x] purchase juice: polyp flash ring, band sweep, symbiont sparkles, lure rings, lattice shimmer, vent flare
- [x] purchase juice: sound (M6 audio)
- [x] compact mobile cards (two cards visible at 390×844)

# Corallum — working rules

An incremental game: a coral reef grows from 4,000 m down to the surface to spawn under the
Spawning Moon. Canvas world + DOM panels, served by a zero-dependency Node server on localhost.
The agent works on this autonomously for days and is restarted often.
**Mandate (user, 2026-10-31):** the agent is lead designer and developer, working solo for about a
week to bring the game to a releasable product. It chooses the work (features, feel, performance,
animation, bugs) and works down the **Release checklist** in `docs/PLAN.md`; release-readiness
outranks adding more content.

## On every (re)start
1. Read this file, then the `NOW:` line and last entry of `docs/PROGRESS.md`.
2. `git status` and `git log --oneline -5`. Uncommitted work is yours from before the restart:
   finish it or commit it, never discard it.
3. Check the open checklist in `docs/PLAN.md`, then carry on.

## Docs (keep them true; they are the memory between restarts)
- `docs/PLAN.md` — milestones and checklist. Source of truth for what's next.
- `docs/PROGRESS.md` — `NOW:` line + append-only log. Update before every commit.
- `docs/DESIGN.md` — design principles, acts and verbs. `docs/STORY.md` — lore + originality check.
- `docs/ECONOMY.md` — formulas and pacing targets.
These were written by the agent, not the user; fix them when wrong.

## Commands
- `node src/server/server.ts [--port 8080] [--lan]` — run the game at http://localhost:8080/
- `tsc --noEmit -p tsconfig.json` — typecheck (global tsc; never `npx`)
- `node --test "test/sim/**/*.test.ts"` — unit tests
- `node --no-warnings test/e2e/smoke.ts` — desktop + mobile load, no console errors
- `node --no-warnings test/e2e/play.ts` — clicks through: band reader, sweep, buy, reload, offline summary
- `node --no-warnings test/e2e/prestige.ts` — a lesser spawning from an injected save (harness `open(vp, q, { save })`)
- `node --no-warnings test/e2e/finale.ts` — full moon, release, three memories, ending (SHOTS=<dir> saves screens)
- `node --no-warnings test/e2e/feast.ts` — tap a falling feast, catch the next with F (`corallum.feast` gives its position)
- `node --no-warnings test/e2e/saves.ts` — save to a file / load save from a file
- `node --no-warnings test/e2e/systems.ts` — expedition send + call home, a resident, a riddle, the signal by keys, a shell
- Browser debug: `?at=<sec>` starts the scene clock there (rare creatures, day/night), `?fps`, `?bot=` (with `&truce=`, `&dialects=`, `&seamount=`), `?t=` (frozen).
- `node tools/bot.ts [--truce aab] [--dialects form,craft,spawn] [--to <m>]` — headless time-compressed
  playthrough of the whole game; prints milestone times. Browser: `?bot=<sec>&truce=..&dialects=..`
- `node --no-warnings tools/perf.ts [--vp mobile] [--at 600,5000,...]` — draw/panel ms and browser script/style/layout per frame, per zone
- `node --no-warnings tools/sweep.ts [desktop|mobile|landscape] ['truce=bbb&dialects=..']` — console errors at 18 bot times through the game (~10 min)
- `node --no-warnings tools/overlaps.ts [bot secs] [keys]` — overlay texts (title, whisper, notes, gauge…) colliding, on every viewport
- `node --no-warnings tools/fuzz.ts [--vp mobile] [--at <sec>] [--secs 120] [--ended]` — random keys, panel clicks, scene taps mixed; console errors
- `node --no-warnings tools/share.ts` — regenerates the link preview image (`src/client/icons/share.jpg`, og:image)
- `node --no-warnings tools/screenshot.ts [--t <sec>] --shot <tag>=<url params> ...`
  — writes `screenshot/YYYY-MM-DD-HH-MM/{desktop,mobile,landscape}-<name>.png`. Look at them.

## Hard rules
- **TypeScript only, never compiled.** Node strips types; the server strips them for the
  browser. No emitted JS, no bundler, no npm dependencies. Only erasable syntax: no `enum`,
  `namespace`, parameter properties; use `import type`; import with `.ts` extensions.
- **Original lore.** No names, lore or story beats copied from existing games. Check each new
  name/beat and record it in the originality table in `docs/STORY.md`. All player-facing
  strings live in `src/game/content/`.
- **Deterministic sim.** `src/game/sim` and `src/game/content` never use `Math.random`,
  `Date.now`, `performance.now` or the DOM (enforced by `test/sim/determinism.test.ts`).
  Use `mulberry32` from `src/game/sim/rng.ts`. Renderers draw as a pure function of (state, t).
- **Offline is computed, capped by the dynamics.** Stocks follow `dx/dt = P − kx`, growth is
  logistic toward purchased targets (`src/game/sim/ode.ts`). Never add an artificial time cap.
- Must work at desktop (1440×900) and mobile portrait (390×844) sizes.
- No `rm` in the repo; no sub-agents; Playwright and tsc are global installs.
- `/tmp` vanishes; keep anything that matters in the repo.

## Workflow
- Small commits, often, with tests + typecheck green. Update PROGRESS.md in the same commit.
- More than one session may work in this checkout at once: commit by path (`git commit -- <paths>`),
  never `git add -A`; read `git log` and the PROGRESS tail before picking work, so it is not done twice.
- After visible changes take a screenshot series and commit it (`screenshot/` is tracked).
- Test what could really break (offline == stepped online is the key invariant); no tests of the obvious, no slow tests. Pacing/time balance is secondary for now (user, 2026-10-29): features and graphic detail first.
- Comments describe the current state, not history.

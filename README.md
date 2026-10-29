# Corallum

An incremental game about a coral reef climbing four thousand metres through a buried sea to
spawn under the Spawning Moon.

    node src/server/server.ts      # then open http://localhost:8080/  (--lan to serve your network)

Requires Node 24+. No dependencies, no build step: the TypeScript sources run as-is (Node strips
the types; the server does the same for the browser).

## The game
For four hundred years the Long Silt has buried every reef in the sea. You are the first polyp
of a new one. Grow through five zones of the ocean — the Silt Floor, the Midnight Water, the
Twilight Shelf, the Sunlit Crown and the Breach — read the bands of the dead city Thousandfold,
make a truce with the Rasp, choose what kind of reef to be, and on the night of the Spawning Moon
decide which three memories your children carry into a new sea.

- Offline progress is exact and capped by the reef itself: every store fills toward what the
  reef can hold, so a week away equals a month away.
- Lesser spawnings start over on a new seamount with Lineage traits.
- Milestones double polyps and glimmerseed at set counts; every card shows what its next level is
  worth to your reef right now, and shoal jobs show what one more feeder or light-swimmer adds.
- Every creature can be touched: most answer in their own way (eels duck, an octopus inks, a
  lure goes dark), and now and then one shares a little of what it lives by. The journal keeps a portrait of each as you first saw it; seen and touched
  creatures each add a little calcite, and ones touched often become friends. Feats across runs, seamounts with their own look and
  numbers, and a view mode (H) for the reef on the whole screen, where the wheel, a pinch or
  + / − zoom in up to 3× to look closer.
- Falling feasts sink past now and then for those who watch; under a great tide moon the spawn
  carries four memories instead of three.
- The water turns every ten minutes and makes one kind of growing cheaper (with a forecast);
  Ossel asks for small things and pays for them; moments ask how you meet what happens to the reef.
- Shoals can be sent to Thousandfold's ruins for relics, or roam the dark; residents move into
  your branches (some pairs live well together); every zone has a great work to build in stages
  from two kinds of wealth; the Rasp grant favours for sand.
- A sister reef climbs the next seamount on its own schedule: reach each zone first for lineage.
- Little active things for those who watch: the shoals' signal (a memory game), intruders to drive off
  in every zone, the Rasp elder's riddles, a fork halfway to each ruin, and the full-moon choice.
- A choice in every act: the glimmerseed strain, the current, four tiers of dialects; and after the
  ending, an epilogue garden and a chronicle of the line's endings.
- Shards of an old tablet turn up in the silt; the reef keeps its own bands, a diary of the run.
- Lesser spawnings: boons on each new seamount, hard seamounts that teach the whole line
  something, Ways that automate or bend the systems, and the line's best times.
- Each zone has its own rhythm to catch while you watch: flurries on the Silt Floor (sweeps ×3), the
  rising in the Midnight Water (send the feeders in), upwellings on the Twilight Shelf (turn the
  current to them), warm water in the Sunlit Crown (stay open for sun, or close up before you
  bleach), and swells at the Breach (tap the crown on each crest).
- Build choices that run the length of a reef: the grain of every tenth band (dense, quick or
  bright), the glimmerseed's sport at the Twilight Shelf, lamp-nets for the shoals.
- Ossel asks the reef seven questions on the way up and remembers the answers to the end; at the
  Breach the reef names the stars after its own life, tracing them star by star.
- Each day brings a mild boon (the day's sea) and a dream (sleep the reef a quarter hour forward);
  optional notifications when something waits while the tab is in the background.
- The line remembers: moments marked with the way an earlier reef went, stars it named, a chart of
  every reef it has seeded, and the Long Silt thinning with each ending.
- Old stone: grey knobs gather on the tips (away too, up to six); tap one to let it go, and now and
  then it held one of the reef's own memories. A heavy seamount, a trait and a Reading build on it.
- Lucky neighbours (golden sparks) give five times as much when touched; milky seas in the Midnight
  Water let sweeps gather light; shoals can stand guard in the light; a far storm at the Breach;
  wishes on shooting stars; grottoes for more residents; a fourth Form, Pillars.
- After an ending, a new reef may take vows (haste, lightness, solitude, stillness) for lineage.
- The reef's own bands can be read as rings in a cross-section of its stone.
- Keys: Space sweeps, 1–4 tabs, F feast, E expedition, L flare the lure, R the rising, C close up, S ride a swell, K old stone, W wish, T time-lapse,
  7–0 the signal, P / B / G buy, H view mode, ? for the list.
- Desktop, phone portrait and phone landscape. Sound is procedural and off by default.

## Trying it on a phone
Run `node src/server/server.ts --lan`; it prints an address on your network to open on the
phone. Add `?fps` to the URL for a frame-rate and draw-time readout, and `?bot=12000` to jump
into a later zone (the Twilight Shelf) without playing up to it (`?bot` games are not saved).
"Add to Home Screen" installs it to open full-screen like an app (web manifest).
If a phone struggles, turn off "Full resolution" in the Reef tab (renders at 1×: a quarter of the pixels on a 2× screen).
If frames run slow for a few seconds the glow pass switches itself off ("bloom off" in the readout).

## Development
See `CLAUDE.md` for commands (tests, browser tests, the balance bot, screenshots) and `docs/`
for the plan, design, story (with its originality check) and economy.

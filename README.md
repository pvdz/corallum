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
  creatures each add a little calcite. 29 feats across runs, seamounts with their own look and
  numbers, and a view mode (H) for the reef on the whole screen, where the wheel, a pinch or
  + / − zoom in up to 3× to look closer.
- Falling feasts sink past now and then for those who watch; under a great tide moon the spawn
  carries four memories instead of three.
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

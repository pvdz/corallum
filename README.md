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
- Desktop, phone portrait and phone landscape. Sound is procedural and off by default.

## Development
See `CLAUDE.md` for commands (tests, browser tests, the balance bot, screenshots) and `docs/`
for the plan, design, story (with its originality check) and economy.

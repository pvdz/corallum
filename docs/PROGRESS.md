# Progress log

NOW: M6 polish — audio (procedural WebAudio ambience + purchase sounds, muted by default), accessibility (reduced motion, text scale), codex. Then a full playtest pass in the browser at real speed for feel.

Append newest entries at the bottom. One entry per working session or milestone step:
date, what landed, what is half-done, what's next.

## 2026-10-26
- Plan approved. Story rewritten from scratch after an originality check (see STORY.md).
- M0 scaffold landed: server with type stripping, abyss scene, ODE integrators + tests,
  Playwright smoke + screenshot tool, first screenshots in screenshot/2026-10-26-14-22/.
- Noted for M2: on mobile the polyp is tiny; scale scene features by min(w,h) more aggressively.

## 2026-10-27
- M1 landed: Act I economy (calcite/glow/height, 6 upgrades, 8 lore bands), exact offline advance
  (Simpson-mean lure over 0.6 s sub-steps until glow settles, then one exact step), saves with
  field-wise validation + export string, DOM panel (stocks, cards with ETA / "beyond what the reef
  can hold", band reader, away summary), tap-to-sweep, debug params.
- Balance (tools/bot.ts): greedy bot finishes Act I in ~23 min with sweeps, ~30 min without.
  Humans will be slower; target 30–45 min. Hold is far above late costs, so the lattice/retention
  trade-off is weak in Act I — revisit when Act II exists.
- 18 unit tests. Screenshots: screenshot/2026-10-27-18-29/.
- M2 mostly landed: space-colonisation coral (render/coral.ts), shared reef drawer (render/reef.ts),
  jellies/brittle stars/vent (render/life.ts), purchase effects, portable bloom, compact mobile cards.
- Act II landed (sim + UI + Midnight Water scene, render/midnight.ts). Reach multiplier
  (calcite × (height/60)^0.85) was needed: without it Act II took 12h+ for the bot. Height is
  now an upstream stock in advance(). Band laying stops at 3000 m until Act III exists.
- Saves: a page that sees a foreign write to the save stops writing (multi-tab safety).
- 24 unit tests + 2 browser tests. Screenshots: screenshot/2026-10-27-18-45/.
- Act III landed: sim + UI + Twilight Shelf scene (render/twilight.ts); shoals moved to
  render/shoals.ts. Balance notes: silt must not start before the tools against it exist
  (deadlock at 3000 m); the truce 'a'/'b' paths were within 6 min of each other after giving
  'b' +2 Rasp. Story gates: Shelf opens on 'inside-the-wall'; its last band waits for the wall choice.
- Bot full run to 3800 m: ~4h45m (Act I 23m, Act II 1h35m, Act III 2h45m).
- Act IV landed: sim + UI + Sunlit Crown scene (render/sunlit.ts). Lessons: canopy bought with
  bloom that multiplies bloom ran away (Act IV in 20 min); additive glows burn to white on a bright
  background, so the sunlit scene uses glowScale 0 and no bloom pass. Polyp settling order now
  keeps a minimum spacing. Coral generator takes a form (fan/branching/massive/plating).
- Bot full run to 3980 m: ~6h30m–6h55m depending on dialects.
- Act V landed: spawn, moon, breach, memory choice, ending, Breach scene (render/breach.ts),
  finale UI (ui/finale.ts). The whole game is playable start to finish; bot ~8–9 h.
  Ending text waits 6.5 s after the release so the spawning is seen first.
- Prestige landed (sim/prestige.ts, content/lineage.ts, Lineage tab). The harness can now seed a
  save into a page: open(vp, query, { save }).

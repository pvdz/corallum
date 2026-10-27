# Progress log

NOW: Act III design (Twilight Shelf: currents, silt drift, the Rasp truce) in docs/DESIGN.md + STORY.md, then sim. Remaining M2 items in PLAN.md are small polish.

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

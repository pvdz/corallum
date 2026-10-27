# Progress log

NOW: M2 visual pass — start with branching coral growth in src/game/render/ (replace the pillar in abyss.ts drawColumn).

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

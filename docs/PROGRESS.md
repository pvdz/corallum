# Progress log

NOW: Polish backlog in PLAN.md M6. Ideas not yet planned: more lineage traits that open strategies (not multipliers).

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
- M6: audio (audio/audio.ts), perf (panel probes were 25 ms/frame), keyboard + reduced motion,
  rattail + glass shrimp. Screenshots: screenshot/2026-10-27-19-30/.
- Whispers, codex, Ossel's wall on the Silt Floor, Rasp truce behaviour, landscape layout,
  foot polyps. Screenshots: screenshot/2026-10-27-19-33/, 2026-10-27-19-35/.

## 2026-10-28 — drowned towers
- render/ruins.ts: Thousandfold's dead towers at three parallax depths behind the Silt Floor (far two),
  Midnight Water and Twilight Shelf. Tops sit at fixed metres, so they sink through the frame as the
  reef climbs: the first sense of the camera rising. Broken crowns lit from above, stubs, growth bands,
  a few lights still burning in the Midnight stone. Same seed in every scene so towers line up across fades.
- In near-black water nearer stone is drawn lighter (lit), in blue water darker; outlines dropped (they
  read as stray squiggles under the vignette).
- render/taps.ts: a sweep shows a ripple where you tapped and six food motes curving into the reef's
  crown (scenes expose `crownAt`), which flares as they land. Space-bar sweeps start beside the crown.
- Save-export nudge: once a reef is an hour old (or has spawned) and no save was copied in 3 days
  (wall clock in localStorage `corallum.exported`), the Reef tab gets a dot and a note. Copying clears it.
  Covered in test/e2e/prestige.ts.
- Zone music (audio.ts THEMES): a slow generative bell melody over each zone's pad (its own scale,
  register, tempo and rests: sparse minor in the Silt Floor, brighter major in the Sunlit Crown).
  Scheduled ahead on the AudioContext clock. The sound button now sits above the story reader, so
  sound can be turned on during the opening story; smoke test turns sound on at every viewport.
- Act II bands: "What falls" (95 m), "Glass" (240 m), "Ossel dreams" (500 m) fill the 14–18 min
  silences between bands; glass shrimp now appear in the Midnight scene once "Glass" is laid.
- Later bands to break 30–46 min silences: "How the Rasp end" (3725 m), "Storm" (3965 m),
  "Describe it" (3985 m), "The waiting fish" (3995 m). After the wall choice Ossel only speaks in
  `kept` variants. Act V now has a band every ~20–25 min for the bot.
- Opening: on a brand-new reef the first story waits 3.5 s (panel.holdStories) so the title over
  the dark water is the first thing seen; the opening band's kicker reads "A seamount, 4,000 m down".
  This covers the "title/intro card" idea. Thousandfold towers in the Sunlit Crown: dropped (that
  scene is bright and busy enough).
- Trait "Glass gardeners" (12 lineage): glass shrimp clear silt like six Rasp (siltK +0.18) without
  eating calcite. Opens a no-Rasp route through the Twilight Shelf (hold at 0 Rasp beats the best
  dial without the trait), at the cost of the Rasp's sand. Test in prestige.test.ts.
- Panel: Murmurs leaves the stock list once every Reading and truce word is paid for; rates that
  round to zero print +0.00 (no "−0.00/s"); test/sim/format.test.ts.
- render/shrimp.ts: glass shrimp shared by the Midnight Water and the Twilight Shelf; with Glass
  gardeners, seven shrimp pick silt along the slope (ReefView.gardeners).
- Perf: the drowned towers cost ~20 ms/frame (headless, mobile size) in the Silt Floor and Midnight
  Water; they now render into a cache redrawn only when the near layer moves a whole pixel, lights
  drawn live on top. Silt Floor 25→3 ms, Midnight 33→11 ms.
- Clarity: the dialect card and the truce's words bar show time-to-afford ("in 3m 2s"), like the
  upgrade cards.
- Midnight Water: the drowned towers' lights burn brighter the more shoals scout (listening at the
  old stone), dim when none do.
- Phone testing: `?fps` overlay (fps, draw/panel ms, bloom state, canvas size); `--lan` prints the
  network addresses; README section "Trying it on a phone". Whisper sound cue.
- Bands tab: newest first; on load, truce and dialect choices sit just above the band that opened
  them. The "Your reef" summary no longer squeezes into the compact mobile card grid.
- Falling feasts (content/events.ts, sim currentFeast/feast, render/feast.ts): from "What falls"
  (95 m) a carcass (fish, squid or krill cloud) sinks past the reef once per 5 min slot at a
  seeded moment; tap it or press F for 90 s of calcite; motes stream to the crown, a rising chime
  plays, Ossel whispers about the first one. Active only: offline and the bot ignore it.
  Tests: test/sim/feast.test.ts, test/e2e/feast.ts (`corallum.feast` gives its screen position).

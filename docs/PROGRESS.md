# Progress log

NOW: Open-ended goal (user): add content, gameplay and graphics, keep going. Latest: tidal seamount, lucky/kind days, ghosts in every zone, the first larva, squalls, Ossel's far light in the Midnight Water, sister spawns with you, wishes/garden e2e. Bot ~7h28; 7 browser tests + sim tests green. Run e2e with `timeout 400` per test (a run once stalled when the machine paused).

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
- Sunlit Crown: a whale crosses far off in the haze every 3.5 min (80 s crossing, alternating
  direction), drawn behind the larvae and shoals.
- Phone landscape: each stock is two lines (name and value share one), so the stock grid takes less of the short panel.
- Ossel's wall on the Silt Floor redrawn: a slumped banded mound with smooth swells, broken branch stumps, bands that follow its shape, and Ossel as one pale breathing polyp on it (was a sawtooth block).
- Vent redrawn: knobbly sulphide spires (a side spire per tier), rust and sulphur crust flecks, tube worms crowding the foot (more per tier), heat glows at each mouth; plume uses cached glow sprites instead of 46 gradients a frame.
- Endings remembered across runs: meta.endings and meta.carriedEver; the memory choice marks memories
  "carried before", and "Your reef" shows "Endings: n · k of 12 memories carried so far".
- Whispers: early hints (two polyps, first band, first glimmerseed) only while still news; none after the spawn is released (one spoke over the spawning).
- Upgrade cards: polyp and glimmerseed show what one more really adds after every multiplier (+327k calcite/s late, not the base +0.3).
- Hold a buy button to keep buying (after 450 ms, every 110 ms while affordable; the release does not add one). In the play test.
- Tab title shows the reef's height ("641 m · Corallum"), "spawned" after the ending.
- Reef tab: "Soft glow" checkbox turns the bloom pass off for slow phones (remembered as corallum.glow); Midnight draw 11→4 ms headless with it off.
- The Breach: after the "Air" band the reef's top shows as a dark hump at the waterline (growing over the last metres) with a shore bird standing on it, pecking; it flies off when the spawn is released. Drawn after the glow pass.
- Core loop: milestones. Polyps double at 10/25/50/100/150/200, glimmerseed at 10/25/50/100, each
  named ("A thicket", "A beacon"…) with its own announcement over the water and a chime; cards
  show "+3.4 calcite/s · ×2 at 50". Rebalanced band cost curves to keep the bot at 8h28 (see
  ECONOMY.md); polite Rasp terms and Keep Ossel toned down to keep paths within ~1 h.
- Milestones show on the reef: each polyp milestone fills the polyps out (+6%), each glimmerseed milestone strengthens the reef's light (+15%).
- Core loop: shoal jobs are a real allocation. Job rows show what one more feeder / light-swimmer is
  worth in settled calcite ("one more: +2.1% calcite"). Light was a trap (the lure saturated); now the
  lure needs more glow higher up and light-swimmers amplify glimmerseed glow. The bot allocates by
  marginal gain. Retuned band costs (ECONOMY.md).
- Multiplier cards (lattice, lure, vent, sand bars, channels, pigments, canopy) show what the next level is worth now, settled: "· now +13% calcite" (lattice: "+39% held").
- Rasp dial says where calcite holds most ("holds most at 14" / "the most it can hold"); bestRasp moved into the sim; the eating figure counts polite Rasp correctly.
- Ending lineage scales with the spawn released (10 + 4 per doubling over target; `state.released`),
  shown on the moon card. Tried making "wait a moon" a decision: the spawn's 1 h time constant means
  it is already near its hold at the surface, so a wait adds ~+1; the card only mentions the next
  moon when it would add 2+. A real Act V decision still needs a different lever.
- Trait "Old habits" (9 lineage): while the page is open the reef buds polyps / hosts glimmerseed itself when one costs under 10% of its calcite (habitPurchase, ≤4/s); never offline. Reef-tab switch once owned.
- Act V decision: great tide moons. Every third full moon (cycle % 3 == 2) is a great tide; a
  release under it carries four memories (one more epilogue page) instead of three. The moon card
  names it and counts down to the next one, so the choice is "release now with three, or wait up to
  40 min for four". Drawn larger and warmer in the sky. Tests: sim + finale e2e (desktop releases
  under a great tide, 7 pages).
- Craft dialects are visible (render/craft.ts): fluorescent polyps (vivid green/magenta, a little glow even in daylight), mucus nets (glistening threads with caught motes streaming downcurrent), sweeper tentacles (long stinging arms from the outer lower branches). Sunlit Crown and the Breach.
- Spawn dialects show at the release: brooding lets go fewer, bigger, warmer larvae that wobble up; fragmenting also breaks branch pieces off that tumble down; broadcast as before. The bird's stone hump is drawn behind the reef; the night dome (massive) darker and the glimmerseed-milestone glow boost halved (+8%/tier) so the Breach is not overexposed.
- Grow tab: upgrades finished for good (lattice, lure, vent…) move to the end of the list as one-line cards, so live choices stay near the top on phones.
- Perf: at most 18 shoals drawn (was 30; the rebalance gives ~29 by Act II), Midnight 19→13–15 ms headless; tower lights smaller. Breach release is ~1500 sprite draws/frame (bundles, specks, tips) — cheap on a GPU, left as is.
- Lineage tab: the spawning card lists what its lineage would buy ("Enough for: Deep memory ×2, Quick budding, …"), cheapest first.
- "Your reef" shows time on this reef, calcite gathered and feasts caught (state.feasts).
- Silt Floor: four sea lilies (stalked crinoids) sway on the floor, feathery arms open to the current.
- Midnight Water: an anglerfish drifts across the upper water every ~3 min, lure pulsing.
- Falling feasts start at 42 m (band "A sound in the old band"), to fill the late Silt Floor lull for players who watch; "What falls" (95 m) still tells what they are.
- Zone bar: story bands in the current zone are ticks on the height bar (bright once laid, title on hover).
- Act IV: seagrass meadows, a sand sink (bloom ×1.15 each, up to 12), drawn as seagrass patches spreading on the sunlit sand. Retuned zones 4–5.
- After the spawning: your children settle — tiny pink reefs appear one by one in the deep below the Breach, dozens within the hour (the epilogue garden).
- Sound: the sunlit whale calls (two long sliding tones) as it sets off across the Crown.
- Band "Too much light" (3815 m) splits the 30 min silence at the start of the Sunlit Crown; longest story gap is now ~29 min (before the surface).
- Perf: water/light-shaft backgrounds of four scenes paint into a half-resolution cache 5×/s (render/layer.ts, time snapped so ?t frames stay exact). Headless phone size: Silt Floor 12→4.7 ms, Midnight 14→9.6, Twilight 23→15. Found by skipping layers one at a time: the water was ~16 ms of the Twilight frame.
- Readings no longer arrive five at once: costs spread so they come every 5–15 min through Act II. The finale browser test now builds its own surfaced reef with the bot instead of a hard-coded ?bot time.
- Midnight Water: the seamount's dark flank along the bottom anchors the reef early on, sinking away as it climbs.
- Lineage tab: traits grouped as Gifts (stronger numbers) and Ways (new routes: Lamps in the snow, Rasp kin, Glass gardeners, Old habits).
- Way trait "Tide-reader" (16 lineage): every full moon is a great tide, so the spawn always carries four memories (greatTide/carryAt take the state).
- Tried batching reef branch strokes by width (1200 → ~40 stroke calls): no gain headless (raster-bound, not call-bound); reverted.
- The last Reading (the gate into the Twilight Shelf) no longer leaves the reef capped at 3000 m for 22 min: last costs 7000/7500, wait ~5 min.
- A band card held by a story gate says which: "Held · until your scouts read “Inside the wall”" / the wall decision / the spawning dialect (capReason in the sim, GATE_TEXT in content).
- Reef tab: "Calmer motion" switch (ambient animation ×0.3, like the system reduced-motion setting).
- Fix: with reduced motion (system or Calmer motion) the zone title, milestone and whisper cards never appeared (their fade was disabled with all animation); they now keep their fade.
- Away summary names the bands laid while you were gone (“It laid down a band worth reading: …”).
- Away summary says when the stores filled ("after about 1h 13m"), so the value of a denser lattice is visible.
- Twilight Shelf: a manta glides through the light shafts every ~4 min.
- Reef tab: "Save to a file" downloads corallum-YYYY-MM-DD.txt and "Load save from a file…" reads one back (easier than the clipboard on phones; also clears the backup nudge). New browser test test/e2e/saves.ts.
- Prestige: a lesser spawning chooses where to settle (plain / warm / cold / crowded seamount), each bending the next run (active vs idle-friendly, story speed vs silt). The Rasp dial's best setting is now judged by settled calcite/s within a safe hold (it was max hold, which choked reefs with silt late on); Rasp card says "best now: N". Retuned zones 3–5.
- Warm and cold seamounts tint the deep water of the Silt Floor (red / ice-blue near the floor).
- Rasp card shows both good settings when they differ: most calcite/s (while watching) and most held (before going away).
- Whisper teaching the dial's trade-off before going away; whisper conditions checked at most once a second (some are costly).
- Perf fix (real bug): advance sized its sub-steps by the fastest stock even after it had settled, so a slow stock creeping in (late bloom) made a day of offline catch-up cost ~10 s (a week >1 min). Steps now follow the fastest stock still moving: a day 10 s → 6 ms. Sim suite 94 s → 1.8 s.
- Tests pruned (user: no tests of the obvious, don't worry about timing yet): per-act pacing tests, seamount pacing, trivial checks (cooldown, hidden buys, k=0, formatter, duplicate round trips). Kept: one whole-game pacing guard; the month-offline test now uses a late-game reef (it would have caught the bug above).
- Graphics: glass sponges (Silt Floor), garden eel colony ducking in waves (Twilight slope), a green turtle grazing the seagrass meadows (Sunlit Crown), shooting stars over the Breach.
- Creature journal: scenes report each creature they draw (render/sightings.ts); the first sighting shows "Seen for the first time: …" top-left and is kept across spawnings (meta.seen 'c:<id>'). Bands tab card "Creatures seen · n of 18" lists notes, unseen ones by zone.
- Sunlit Crown: a 10-minute day — dusk, a blue night (veil behind and over the reef, plankton sparks, moonlit surface, the reef's own glow returns, reef fish shelter), dawn.
- Twilight Shelf: an octopus rests sand-coloured on the slope, then crawls a short way flushing red (journal: 19 creatures).
- Feasts pay in the zone's currency: carrion → calcite (Acts I–III), a drifting sargassum mat → bloom (Sunlit Crown), a rising swarm of moon plankton → spawn (the Breach, kept to the open water beside the reef).
- Nudibranchs (render/slugs.ts): seven bright sea slugs creep along the reef's own branch paths (tip toward trunk and back) in the Twilight Shelf and Sunlit Crown; one tip per reef column so they spread out. Journal: 20 creatures.
- Name your reef (Reef tab): shown under the title, in the tab title and in "Your reef"; kept across spawnings with a generation numeral (Mara, Mara II, …).
- Reef: encrusting life on the older stone (sponges, breathing tunicate cups, crusts), sparse in the Midnight Water, colourful and thick in the Sunlit Crown.
- View mode (eye button top-left, or H): hides the panel; the scene reframes to the whole screen (a full-height portrait of the reef on phones). Frozen ?t pages redraw on layout changes.
- Silt Floor: a herd of four sea pigs walks across the silt every ~3 min (journal: 21 creatures).
- Journal pays: every creature the lineage has seen adds +2% calcite (knownBonus, constant between purchases so offline stays exact); shown on the journal card.
- The Breach: a pod of three dolphins arcs out of the moonlit water every ~75 s, with splash rings (journal: 22 creatures).
- Sunlit Crown: an anemone with two clownfish weaving around it (journal: 23 creatures).
- Midnight Water: a vampire squid drifts past, cloak of arms opening and closing, glowing fin tips (journal: 24 creatures).
- Feats (content/feats.ts): 24 goals across runs (heights, polyps, feasts, readings, truce, meadows, seeing every creature of a zone, endings, seamounts), each +1 lineage once per lineage; toast top-left; list in the Lineage tab.
- The Breach: glowing surf, blue plankton sparks running outward along the waterline from the reef's emerged top with each wave.
- Tap a creature to name it: large creatures (anglerfish, vampire squid, manta, octopus, whale, turtle, clownfish, dolphins) record where they were drawn each frame (sightings.spot); a tap shows a label with the journal note beside it (the sweep still happens).
- Sunlit Crown: dappled light on the coral, caustic glints drifting over the branches by day (fading at night).
- Tap Ossel on the Silt Floor: it answers with one of eight lines, in turn (OSSEL_LINES in content/whispers.ts).
- Depth gauge: a slim bar at the scene's edge, one segment per zone in its colour, a glowing marker and label at the reef's height.
- Fix: the coral generator could stack dozens of nodes on one spot (a node pulled the same way
  each iteration budded onto its own last child), which drew as a hard white disc once glints or
  glows landed there. A node no longer buds where it already has a child.
- Rain on the Sunlit Crown after the band "Rain": a one-minute shower every five, rings on the surface.
- Reef tab: scientific number notation switch (1.23e9).
- View mode has a camera button: saves the scene as a PNG named after the reef and its height.
- Twilight Shelf: three swaying sea fans (gorgonians) on the slope.
- Grow tab ends with "Coming up: <next hidden upgrade> — <what opens it>".
- Midnight Water: a whale fall (spine, ribs, skull, small pink lights living on it) on the seamount's flank early in the zone (journal: 25).
- The Breach: six moon jellies drift under the surface either side of the reef (journal: 26).
- Perf: reef branches cached in the reef's bounding box once the reef has held still for 30 frames (drawn directly while it settles); branch sway (~1 px) dropped. Headless phone size: Midnight 10.8→6.1 ms, Twilight 17.9→11.8; Silt Floor and Breach unchanged (their reefs move or are small, where a cache costs more than it saves — measured by A/B in one session).
- "Your reef" growth chart: height sampled every 5 min of sim time (state.history, thinned to ≤240 points), zones as equal bands. Fix: saves dropped numbers inside arrays (loader kept only strings); now keeps finite numbers too.
- Tried folding the bloom pass's two full-screen composites into one (combine at quarter size): Twilight −2.5 ms but Silt Floor/Midnight +13 ms, reproducibly (headless software raster); reverted. Bloom is ~6–7 ms of the Twilight frame; the Soft glow switch remains the lever for slow phones.
- Silt Floor: a flurry of the Long Silt for 30 s in every 4 min (a second, faster, slanting fall). ? key shows all shortcuts.
- Lineage tab "Your line": each earlier reef (name and generation, height let go at or spawned, seamount, Form dialect), kept in meta.ancestors.
- Taps in the dark zones (Silt Floor, Midnight Water) also set off a burst of blue plankton sparks.
- Finale: the memory choice centres in the scene area on desktop (it overlapped the panel); at the Breach only the moon whisper may speak (others talked over the spawning).
- Feats already earned when a reef loads (older saves) are granted together with one note instead of a long queue of toasts.
- Crowded seamount: half-buried old reefs (humps with dead branches and faint lights) around the Silt Floor.
- Cold seamount: a brine pool on the Silt Floor (shimmering surface, ring of mussels); in the journal (27).
- Warm seamount: a field of five black smokers on the Silt Floor, smoking, hot at the mouth; in the journal (28).
- Reef tab: volume slider (remembered as corallum.volume).
- Midnight Water: a near layer of marine snow in front of the reef (bigger, softer, faster) for depth.
- Accessibility: zone titles, milestones, journal/feat notes, whispers and creature labels are polite live regions; the story reader is a labelled modal dialog.
- Escape closes the story card, the away summary or the memory choice.
- Opening screen: journal notes wait until the title has faded, and the depth gauge appears with the first metre of stone (both collided with the title/hint on phones).
- Twilight Shelf: a cleaning station, a mottled grouper hanging beside the reef with two cleaner wrasse darting over it (tappable; journal: 29).
- Sunlit Crown: two seahorses holding on to the seagrass with 3+ meadows (tappable; journal: 30).
- Midnight Water: a pyrosome drifts across, waves of light running along its tube (tappable; journal: 31).
- Feats: 27 (+ Every kind of stone, A name, A picture).
- Fix: feats were checked inside the journal's title-faded gate, so none could be earned in a new reef's first 25 s; they now have their own once-a-second check. Verified in the browser: naming and a photo earn their feats; Every kind of stone counts earlier reefs on other seamounts.
- Soak (not kept as a test, ~1 min): 15 s at 400× from four points of the playthrough (Silt Floor, Twilight, Sunlit, Breach), tapping and closing stories: no console errors across hours of sim time.
- Zone-crossing check (manual, not kept): buying bands at speed through Silt→Midnight, Twilight→Sunlit and Sunlit→Breach with crossfades and title cards: no console errors; at 3000 m the Reading gate held as it should.
- Zone change as one moment: motes stream upward through the crossfade, a rising chord plays, any whisper clears, whispers wait out the fade, and the band's story opens 4 s later (title, story, whisper and notes all appeared at once before).
- Midnight Water: a rare giant squid, once every 20 min of scene time, a long dim shape with trailing arms (tappable; journal: 32).
- Rare sightings, one per deep zone: a dumbo octopus over the Silt Floor (every 15 min), a whale shark across the Twilight Shelf (every 18 min); journal: 34.
- Sunlit Crown rare sighting: an ocean sunfish (mola) every 16 min (journal: 35). Dumbo octopus drawn in front of the reef.
- Journal grouped by zone with per-zone counts; unseen entries hint 'Rare: watch for it.' or 'Only on a cold/warm seamount.'
- First sighting of a rare creature: note reads 'A rare sighting' with its own chime.
- Debug ?at=<sec> starts the live scene clock at a time; verified the rare-sighting note with the giant squid (?bot=4000&at=612).
- Breach perf: layer-skip timings were noise (whole scene 4.7 ms this run vs 11.6 earlier; skipping layers measured slower). No clear target; left as is.
- Sunlit polyps pull in by day (×0.8) and open wide to feed at night (×1.15), as real corals do.
- The Breach has a tide: the surface rises and falls over 3 min of scene time; the reef stays put (placed against the still level), so low water bares more of the crown and its stone, high water covers it.
- Mobile stock grid: second lines wrap instead of being cut off with an ellipsis (the hold amount was hidden).
- Rasp card text in two clear lines: what the Rasp do now, then 'Best for income: 48 ✓ · best before going away: 18'.
- After the spawning, dawn comes up over the Breach (rose and gold from the horizon over 3 min, stars fading), matching the epilogue.
- Phones vibrate a tick per purchase, a pulse for milestones and feats (navigator.vibrate; on by default on touch devices, Reef-tab switch, hidden where unsupported). Unverified on hardware.
- Journal and Feats cards fold to their heading (tap/Enter to open). Fix: both cards rendered empty until the first creature/feat, because their change-check started equal to the empty state.
- Reef tab grouped: Saves, Sound, Display, Start over.
- Twilight Shelf: a turbidity current every 3.5 min, a silt cloud rolling down the slope over everything on it (thicker when the reef is silted).
- Midnight Water: the migration, every 8 min for 40 s hundreds of small lights rise past the reef (+~5 ms/frame while it lasts); in the journal (36).
- The panel takes a tint from each zone (--zone-tint), set on load and at every zone change.
- Web app manifest + mobile meta tags: Add to Home Screen opens Corallum full-screen (standalone), dark splash. No service worker (the game needs its local server anyway).
- Lesser spawning send-off: 3.4 s of pink spawn rising over the reef being left while the screen darkens, with a line of text, then the new seamount (new reef saved first; 0.6 s under reduced motion).
- Sunlit Crown: a bait ball every 7 min (45 s, by day), small silver fish swirling, hunters darting through; journal: 37.
- Reef tab: 'How the reef grows' (content/guide.ts), five lines on calcite, bands, holding, zones and the goal; folded by default.
- Midnight Water: each Reading wakes more of the lights in Thousandfold's drowned towers (1 per tower before any, all after nine). Subtle, since the towers sink out of frame as the reef climbs.
- Reading a band makes every light in the drowned towers flare for ~2 s before settling to the new level.
- Reef effects for story moments: a truce or dialect choice sends two rose-gold rings out from the reef; a Reading sends blue light climbing the reef from foot to crown.
- Silt Floor: squat lobsters clinging to the vent chimney (more per vent tier); journal: 38. Choice rings verified rose.
- Reef photos carry a caption in the corner: name, height, zone.
- Polyp and glimmerseed cards show a thin bar toward the next milestone.
- Reef tab 'Full resolution' switch: off renders at 1× device pixels. Headless phone size: 21.8 ms → 2.7 ms draw (glow had also auto-switched off).
- Automatic quality: slow frames are counted in seconds (3 s triggers a step): first the glow pass goes, then rendering drops to 1× for the session ('auto 1×' in ?fps). Under 6× CPU throttling: 4 → 12 fps within ~7 s.
- Moon card: the next four full moons as a strip, great tides marked in gold.
- Refactor: player settings moved to client/settings.ts (setting(key, fallback, onChange(value, initial))), replacing eight hand-written localStorage blocks; same keys and values, so existing settings carry over. Verified toggles persist across reload.
- The line's record: fastest climb to the surface in reef time (meta.fastest), set by the sim at the exact crossing time (closed-form height), so offline catch-up records it exactly too; shown in Your line; beating it shows 'A new record'.
- Away summary as a headline plus labelled rows (calcite, glow, rose, new bands, when full) and the lattice tip; a zone title waits until the away summary or a story is closed.
- Lineage way 'Shared table' (8): a feast left to sink is eaten by the scavengers in its last second in reach, half the meal (LINEAGE.tableShare), while watching; an idle route past tapping. feast(s, share), tableFeast(s); unit + feast e2e.
- Floor detail (render/ground.ts): silt ripples, pebbles, shell bits, burrows and (abyss) sea-cucumber tracks under the abyss ridge and the twilight shelf, painted once per size into a cropped canvas, down to the framed scene's bottom. The abyss reef's own light lies in a pool on the silt at its foot, by symbionts and lure.
- Twilight grouper redrawn: spiny dorsal and soft rays, rounded swaying tail, a slow gape under the upper jaw, gill cover lifting with it, fanning pectoral, mottling clipped to the body, gold eye. Cleaner wrasse now fish-shaped with tail, pale belly and the black stripe.
- Touching creatures: render/sightings.ts records the last touch (startle/startled); garden eels drop into their burrows near the tap and come back up slowly (two colonies, each tappable), the octopus blanches, inks and flushes dark, deep jellies flash a light round the rim. corallum.spots lists tappable creatures for tests.
- More touch reactions: the pyrosome passes a bright wave down its length, the vampire squid throws out a glowing mucus cloud and flares its cape, the bait ball bursts and re-forms, the clownfish dive into their anemone. Guide line 'Neighbours'.
- Feat 'A light touch': touch eight different creatures (meta.seen 't:<id>', recorded on tap).
- Touch: the anglerfish's lure flares and goes out, returning warily; a touched seahorse pales and draws in; touching the whale plays its call.
- Moon (render/draw.ts drawMoon): soft grey seas, rimmed craters, limb darkening on the lit part, earthshine on the dark; the Breach redraws the disc after the glow pass so the seas show. Sweeper tentacles (craft.ts) taper, sag and weave, reach out and draw back, with beads of stinging cells and a lit knobbed tip.
- Audio cue 'touch': a quiet high pair when a creature is touched.
- Touch: the manta barrel-rolls showing its pale belly; the grouper shuts its mouth and its cleaners scatter; the dumbo octopus flaps hard and bobs up.
- Touch: the dolphins answer with an encore, a higher leap of the pod from where they were touched.
- Silt Floor creatures are all tappable now (brittle stars, sea pigs, glass sponges, sea lilies, rattail, tube worms, squat lobsters). Tube worms snap their plumes in, nearest first; sea lilies fold their arms; brittle stars curl.
- Tappable: comb jellies (combs beat bright and fast), glass shrimp (tail-flip backwards), the siphonophore (a flash runs down the chain), whale fall, nudibranchs, moon jellies, the shore bird.
- The Rasp are tappable: the nearest turns to look and lets fall a trickle of white sand. Creature labels now sit above the creature, clear of its body (below when there is no room), so the reaction stays visible.
- Ossel's whisper 'touch': after four creatures are seen and none touched, a hint that most will answer a touch.
- Whale fall alive: bacterial mats, red bone-eating worm fuzz swaying along the spine, a hagfish weaving through the ribs, a crab on the skull.
- Photo journal (client/portraits.ts): the first good look at each tappable creature is cropped from the canvas (112 px JPEG) and kept in localStorage 'corallum.portraits' (memory only in ephemeral sessions; cleared by reset). The journal is rows now: portrait, name, note; unknown entries are one-line hints.
- Tappable (and portrait-able): one lanternfish shoal, sunlit reef fish, the warm seamount's smokers, the cold seamount's brine pool.
- Moon craters reworked: small asymmetric pits with a lit rim and one bright rayed crater (the first version read as a smiling face at full moon).
- Touch: the turtle ducks and dives a little; the mola sculls hard and tips to look; the giant squid pulls back into the dark (for the rest of that crossing).
- Plankton sparks on a tap now also light up under the Breach's surface (until the dawn after the release) and in the Sunlit Crown at night (Scene.darkAt).
- Journal: '· touched' after the names of creatures you have touched.
- Ossel's wall (Twilight): a slumped knobbly mound lit from above, broken branch stumps, bands with silt on their ledges, borer holes, dull sponge crusts, and Ossel's breathing light near the crest.
- Stock sub-lines wrap instead of being cut off with an ellipsis (landscape phones, the spawn line on desktop).
- Feat 'Known to all': touch 25 different creatures.
- Sunlit night: the water itself turns moonlit navy (cached, keyed by the quantised night), the sun's glare and shafts fade into a moon glow and three thin silver shafts; the veils are rebalanced so the floor goes dim and the reef's own light shows.
- Sunlit night: the Rasp sleep at the reef's foot in mucus bubbles (as parrotfish do), up to five, tappable.
- Fold arrows on collapsible cards stay on the line of the title's last word.
- Growth chart (Your reef): zone bands in their colours with names, a soft fill under the height line, a dot for now; 90 px tall.
- Touch: sunlit reef fish near the touch dart away and ease back; sea pigs pull their feelers in.
- Daughter colonies (render/daughters.ts): from 100 polyps, one small seeded branching colony per 15 polyps (up to 10) settles on the floor around the reef's foot in the Twilight and Sunlit scenes, newest smallest.
- The vertical migration is tappable while it passes.
- Mobile: the lesser-spawning card stacks its parts (title, text, seamounts, button below) instead of squeezing them into the upgrade-card grid.
- Touching pays a little: +1% calcite per creature touched (knownBonus), on top of +2% per creature seen; Ossel does not count. ECONOMY.md: journal and Shared table.
- Journal heading counts creatures touched.
- Stocks explain themselves: hover (title) or tap a stock for a short note under the stocks (content/guide.ts STOCK_NOTES); tap again to close, gone after 8 s.
- Touch: the warm seamount's smokers belch a burst of smoke with a flare; the brine pool rings out from the touch.
- Touch: every lanternfish shoal is tappable; a wave of light runs out through the shoal's photophores from the touch.
- View-mode zoom: wheel, two-finger pinch (midpoint pans) or + / − / 0, up to 3×. The scene is drawn under the transform so detail stays sharp (render/scene.ts zoom.k; the reef's branch cache is bypassed while zoomed; bloom draws in screen space). Taps, creature spots, feasts and labels map through toWorld/toScreen; portraits wait for 1×; leaving view mode resets the zoom.
- corallum.zoom (debug); pinch verified by CDP two-point touch events on the mobile viewport (spread ×3 → zoom 3).
- Marine snow specks (draw.ts speck) are squares at 1× and round when zoomed.
- Zoomed in, the floor detail paints directly (its 1× cache would be soft). Zoomed draw is ~26 ms headless at 3× (caches bypassed); 1× unchanged.
- Sunlit night: sea fireflies (ostracods) lay rising strings of blue pearls over the reef; a new journal creature (39), tappable: touched, every string flares.
- Journal hint 'Only after dark.' for unseen night creatures. Error sweep: ?bot every 2500 s to 30000 on desktop and mobile, touching every creature on screen, zooming in view mode: no console errors.
- Ossel's whispers point at neighbours worth touching (lanternfish, octopus, clownfish, dolphins), in their own zone, once seen and not yet touched.
- Album: tap (or Enter on) a journal portrait to see it large with its name, note and zone; tap or Escape closes. Portraits are 160 px now.
- Feeding channels are visible: one groove per channel cut in the Twilight slope toward the reef's foot, with sand banks and plankton streaming along it (ReefView.channels).
- Sunlit upgrades show on the reef: each pigment adds encrusting colour (denser, and a new hue every two: rose, gold, green, …); each canopy spread opens the polyps a little wider (ReefView.pigments, canopy).
- The aragonite lattice shows: crystal glints twinkling at fixed places along the branches, eight per level (ReefView.lattice).
- Gifts from neighbours: touching a creature now and then (180 s each) brings 30 s of its stock's production (glow, sand, plankton, else calcite), capped at 30% of what the reef holds; float text from content (GIFT_TEXT). state.gifts holds every creature id so saves keep the cooldowns.
- Creature labels say what the creature shares when touched, or how long until it shares again (content GIFT_WORD); the label is shown after the gift so it is current.
- Touch sounds by kind: a shimmer of high bells for glowing creatures, a gritty crunch for the Rasp, the answering pair for the rest, the whale's call for the whale.
- Late Midnight Water (last quarter of the zone): the first grey light reaches down in faint shafts, foreshadowing the Twilight Shelf.
- Rare visitors already in the journal are announced each time they come by ('Passing now' note, quiet whisper cue), once per visit.
- Rare visitors' gifts are three times a common one's.
- Every full moon, in every zone below the Breach, the reef 'remembers': pink bundles slip from the polyps and drift up into the dark (reef.ts, ReefView.moonFull).
- Ossel's whisper 'moon-deep' at the first full moon below the light.
- A small moon in its current phase above the depth gauge's surface end, all game; its tooltip says when it is next full (content act5 GAUGE_MOON).
- Breach sky: a faint Milky Way band (soft dust, a dark lane, ~700 faint stars), cached once per size, fading with the dawn.
- Sunlit storms (after the band 'Storm'): 50 s in every 12 min, the surface torn white, the light greys and shakes, sand stirred on the surge, broken branches tumbling past.
- The Breach: after 'The waiting fish' band, bright reef fish crowd under the crown turning slow circles, and spread out to feed after the release.
- Midnight marine snow thins to a third after the band 'Above the snowline'.
- Gauge moon has a faint rim so a new moon reads as a shape. Fixed the series' sunlit-night shots (were day).
- Close-up portraits: zoomed 2× or more in view mode, a creature large in view (radius ≥ 60 px) gets a sharper portrait, once per creature (corallum.portraits.close). Measured zoom cost: steady ~2.6 ms at 1× view, ~3.6 ms zoomed (the 20 ms readings were a post-relayout transient).
- Refactor: view-mode zoom moved to client/zoom.ts (createZoom: apply, toWorld, toScreen, zoomAt, pinchDown, reset); main.ts 1132 → 1068 lines. Smoke, play, feast, pinch and wheel checks pass.
- Touching a creature ticks the phone's vibration (double tick with a gift), when vibration is on.
- Audio: the Sunlit Crown's ambience crackles quietly with snapping shrimp (random high-passed clicks).
- Audio: the Breach's dolphins whistle as each leap begins (cue 'dolphin').
- Purchase flourishes for pigment (colour sparks washing up the reef), canopy (gold bloom over the crown), ripen (pink lights in the polyps) and floor works (meadow/sandbar/channel/grounds: a puff at the foot).
- Flourishes made legible in daylight: pigment is a band of rose-gold-green light climbing the reef plus painted sparks; floor works paint puffs of sand (green for meadows). corallum.flourish(kind) plays one for checks.
- Caustics moved into the reef (reef.drawCaustics(rgb, belowY)); the Breach gets silver moonlight caustics on the stone under the surface (by moon phase), warm ones after the dawn.
- Feat 'A closer look': a close-up portrait taken in zoomed view mode (meta.seen 'did:closeup').
- Upgrade cards carry small line icons (ui/icons.ts, inline SVG per upgrade).
- Your line: a little chart of the generations, one small coral per reef as tall as it grew (gauge spacing), tinted by seamount, a moon over those that spawned at the surface, the living reef last.
- Expeditions: from 150 m the shoals can be sent to a ruin (content/expeditions.ts, five sites in order). They leave their jobs (idle first, then scout, light, feed), come back at an exact sim moment (advance splits there, offline == online tested) to the same jobs, with murmurs and a relic: a story card in the Bands list and a lasting effect. Panel card with progress and time left; the Shoals header counts those away; whisper 'ruin'; feat 'Out in the black' (every relic). In the world the away shoals stream off to the edge of the water as small lamp clusters and flicker there.
- Residents: homes in the reef from 3000 m (1, 2 at 3400 m, 3 at 3800 m) for six real coral partners, each one effect (content/residents.ts, economy `house()`); panel section with Take in / Let go, tap a name for its note; drawn on the coral in Twilight, Sunlit and Breach (render/residents.ts: crabs and gobies on branches, feather dusters low on the stone, pistol shrimp and sea cucumbers on the floor, damselfish over the crown), each tappable with a reaction; journal group 'Residents'; feat 'A full house'.
- The bot sends expeditions and keeps residents (shelf: guard crabs, gobies, pistol shrimp; light: damselfish, gobies, feather dusters); option `ventures: false` for tests of other systems. Whole game now 5h48 for the bot (pacing bound widened to 5–11 h; time balance is secondary for now).
- Relics shown in the world: render/relics.ts sets each into the lower branches in every reef scene from the Midnight Water up (white hinge stone, lidded larva cup, the hall's lamp hanging lit, grooved well-stone, one beak).
- The water's moods: content/waters.ts, economy waterAt/untilWaterTurns/tierCost; prices of matching upgrades, Readings/truce words or dialects ×0.7–0.8 for a 10-minute slot. Panel line at the top of Grow (water, turns in, then next), marked cards, whisper 'water', overlay render/waters.ts (motes, sparks, sound rings, sand streaks, glints, shimmer). corallum.water(id) jumps the clock to a slot of that water.
- Moments: content/moments.ts (8), economy nextMoment/meet/chose; effects wired into rates, feasts, gifts, homes and lineageFor (storm 'a' +2); panel card at the top of Grow, answers as stories in Bands; meta.seen 'm:<id>'; the bot answers 'a'. Pacing drift noted: bot now 5h08 default, ~4h50 on the b/massive path (bound 4.5–11 h); rebalance later.
- Hard seamounts: four trial seamounts in content/lineage.ts (rule + goal + reward), enforced in economy (shoalCap in maxed, noReadings in nextReading, polyp/silt factors); trialCheck in advance records 'trial:<id>' in meta.seen; rewards via passed(). Panel: dashed buttons from the second spawning, ✓ when met, a Trial row in the codex; main announces a met trial. Test in prestige.test.ts.
- Ossel's requests: content/requests.ts; economy keepRequest (in advance: pays a burst, asks the next), currentRequest; tally of touches and sweeps; panel line under the water; float + sound when kept; feat 'Asked and done'. The water and request lines keep their slot from the start (play.ts caught the request line pushing cards under a held buy button). Smoke's milestone check aims at the next milestone above the bot's level.
- Shards of Thousandfold: content/shards.ts (12 lines), economy dig() on sweep/feast/touch/homecoming (seeded by tally.digs), meta.shards kept by the line, shardBonus in calcite; tablet card in Bands (canvas: cracked round stone, carved wedges) with the inscription; journal note on a find; feat 'The whole tablet'. Pacing bound now 4–11 h, rebalance item added to PLAN.
- Hard seamounts drawn on the Silt Floor: hungry (a third of the snow, a pale wash), silent (no ruins, darker water), lonely (no ruins, one far light on the horizon), buried (the flurry never stops, pale silt drifts slumping along the floor).

- Rasp favours: content/act3.ts FAVOURS, economy favourOpen/favourCost/favourMaxed/askFavour, state.favours; three buttons under the Rasp dial. 'Clear the silt now' was useless (silt resettles in ~10 s), so the favour turns silt aside for good instead.
- Gifts of food follow the zone's currency (bloom in the Sunlit Crown, spawn in the Breach before the release), so touching neighbours matters late. The Breach's waiting fish are tappable one by one and the crowd bursts outward when touched.
- Automation traits Shoal sense and Rasp sense (lineage.ts; prestige.ts shoalSense/raspSense; balanceFeedLight moved from bot.ts to economy.ts). Client runs them every 30 s while watching and sets the dial for being away on visibilitychange; the habits toggle covers all three.
- Five new memories for the finale, earned by the new systems: The fallen gate and The beak midden (relics), Forget us gently (the whole tablet), The eye in the dark (the squid moment), The sleeping turtle (letting it sleep). Memory needs gained relic/moment/shards.
- Reef colours: content/palettes.ts (Reef, Lagoon, Violet, Ember, Pale moon), meta.palette kept by the line; recolours Sunlit pigments and polyps and the Breach's crust and polyps; swatches in the Reef tab from the first pigment.
- Nurseries: upgrade 'daughter' (act2.ts; daughterCount moved there), +1 lineage each in lineageFor; held, not complete, while it waits for the next daughter (cards drop 'maxed' when buyable again; lonely seamount shoals use the same 'held' text). Tended daughters drawn larger with a glow.
- Setting 'Larger text' (html.big: the panel, reader, whispers and notes at zoom 1.15; relayout on change). No overflow at 390 px.
- Roaming: content/expeditions.ts ROAM; nextSite falls back to a roam; expedition state records its size n (save migration fills n for an old mid-trip ruin); tripSite() for the panel and the world view; tally.roams; shard source 'roam' (35%). Test: a roam home offline == online with jobs restored.
- Audio cues 'water' (a slow swell when the water turns), 'depart' (shoals setting out), 'shard' (two struck notes a fourth apart).
- Great works: content/works.ts, economy workOpen/workCost/canBuild/build, state.works; cards with two-currency price, stage pips and an eta for both; render/works.ts (spire in Midnight, breakwater in Twilight, terrace in Sunlit); the bot builds them.
- Guide (Reef tab) explains the water, Ossel's requests, moments, expeditions, shards, residents, great works and hard seamounts.
- Away summary lists relics brought home, roams and shards found while away.
- Trust with neighbours: meta.trust per creature (gift() counts every touch), TRUST levels in creatures.ts, gifts ×1/1.5/2; journal and touch label show the level; feats 'A friend in the deep', 'Old friends'.
- The sister reef: content/sister.ts schedule; economy sisterAt/gaugeAt/judgeMark (marks judged at the closed-form crossing time inside flow); state.race; gauge marker; note per mark; codex row. Test race.test.ts (offline == stepped, a win and a loss). Spire glow prices lowered (stage 2 was above the glow hold at ~800 m).
- Records of the line: meta.records (best sim time to each sister mark, set in judgeMark); codex row 'Line’s best'; a note when a reef beats one.
- The Breach shows the sister reef on the horizon once it nears the surface (a low dark crown rising, lit tips when it breaks the water); ReefView.sister.
- Late Readings: three more (act2.ts, `after` band gate in nextReading): sand ×1.3, bloom ×1.25, spawn ×1.25; feat 'Every band read' now needs 12.
- Lineage ways for the new systems: Old maps (tripSeconds halves trips), Open house (+1 home), Water-wise (deep(): discounts 0.1 deeper; the water line shows the real factor).
- Sections appearing during play (shoals, expedition, residents, works, a moment) rise in with a brief glow (panel setShown, CSS .fresh).
- Every memory carried across the line's endings adds a closing page to the ending (ENDING.everything) and the feat 'Nothing lost, nothing kept'.
- Whispers for great works, residents, the sister reef ahead, the first shard and growing trust.
- Moments shown in the Sunlit Crown: the turtle let sleep rests in the branches at night; the storm's branch let go grows as a colony far off on the sand (daughters.ts drawColony; ReefView.moments).
- Four more moments (vent cracks 45 m, another light 900 m, a young Rasp 3450 m, first light 3982 m): twelve in all.
- Rebalance: band cost growth raised in zones 2–4; bot back to 7h28 for the whole game; pacing test bound restored to 6–11 h.
- Your own bands: state.diary ('t|h|key|arg' strings, capped 200), economy remember() hooked into feasts, homecoming, meet, house, build, dig, trialCheck, requests, read, judgeMark; client adds first sightings; Bands tab card (content/diary.ts).
- While shoals search a ruin, its silhouette shows faintly where their lights hang (gate ring, terrace steps, hall pillars, wells, the pale midden); roams show only the dark.
- Great works for the Silt Floor (the vent garden: small chimneys) and the Breach (the spawning pool: a stone rim under the surface). The garden is ×1.05 a stage (×1.1 pushed the b/massive path under 6 h). Bot: 6h50 default, 6h11 b/massive.
- The water line forecasts two slots ahead ('then the same, then carrying').
- A map of Thousandfold in the Bands tab (content CITY_MAP, panel drawCity): wall rings from above, searched ruins lit and named, roam paths, the roam count.
- Feats: Wanderers, Builder, Met them all, First to the light, Every hard place.
- Welcome back: events.ts WELCOME, economy welcomeHaul/welcome; two gift buttons in the away summary after ≥1 h away.
- Screenshot series 2026-10-29-10-38: all zones, three viewports, after today's features.
- Requests can be swapped ('Ask another', ↻) once every five minutes.
- First-minute tidy: works open at a height inside their zone (garden 30 m … pool 3982 m); the water line says only 'the deep does not change yet' before it turns; Ossel's first request comes at once and is always 'Bud 3 polyps' (no empty slot, no later shift).
- Full-moon spawning choice in every zone below the Breach (texts per zone; feed pays the zone's currency via burst); first made for the Sunlit Crown: act4.ts OTHERS, economy othersSpawning/meetOthers, state.others; card with two choices; sunlit drawOthersSpawn (pink bundles rising).
- Resident pairings (residents.ts PAIRS, economy paired()): three pairs with a bonus each; the Residents box names live pairings or hints at them.
- Midnight band cost growth 1.18 → 1.19 (pairings and the full-moon choice had pulled the bot to 6h08); bot 7h30 / 7h08.
- The ending gains a page about the sister reef (ahead or behind at the surface).
- A fifth hard seamount: dark (glow ×0.3, goal 2500 m, Lamp-born: glow ×1.25 after); drawn darker on the Silt Floor.
- Four more lineage stories (spawnings 6–9).
- Perf (6× CPU throttle, mobile, Sunlit): everything on (residents, relics, works, water overlay, spawning) 20.1 ms vs 17.4 ms draw; perch/relic node lookups cached per grown height (no measurable change: the cost is drawing).
- The lantern spire redrawn: lumpy stacked-block shaft with staggered joints, shell lamps hung on threads, a lit crown.
- The sun terrace redrawn: shaded fronts, stone seams, algae tufts swaying on top.
- The vent garden's chimneys: larger, banded, glowing at the mouth.
- Tapping Ossel: a word about what is going on first (trip, sister ahead/behind, the water, lodgers, shards), each once a session, then the old lines.
- Thorn stars: events.ts THORN, economy currentThorn/crabThorn/pryThorn (slots like feasts), state.thorned; render/thorn.ts on the coral in Twilight and Sunlit; tap to pry, guard crabs take it at the end for half; journal creature 'thorn-star'; corallum.thorn() jumps to one.
- Dragonfish (Midnight intruder, events.ts intruderOf; render/thorn.ts drawDragonfish): tap to drive off, a finished spire dazzles it away for half; journal creature.
- Test chaos.test.ts: a whole game of random choices (moments, residents, favours, works, request swaps, trips, full-moon choices, intruders) plus a month away keeps every stock and rate finite and non-negative (0.6 s).
- Boons: lineage.ts BOONS, economy boonsOffered/chooseBoon, state.boon; card at the top of Grow on reefs after the first; the bot takes the first.
- 'Soon' line in the water box: the next feast, intruder and full moon with countdowns (economy untilFeast/untilThorn); fixed min-height so it never shifts the cards.
- New creature: the cuttlefish (Sunlit, by day): colour bands running down the mantle, rippling fin, W-pupil; touched it flashes white, jets back and inks.
- New creature: the tripod fish on the Silt Floor (stilts of fin-rays, feelers into the current; touched it lifts off and resettles).
- New creature: hatchetfish in the Midnight Water (silver keel-bellied school, belly lights; touched they flare and scatter).
- New creature: a moray eel in a hole in the Twilight slope (gaping as it breathes; touched it pulls back in).
- New creature: flying fish in the Breach (a few burst out, glide on long ribbed wing-fins, drop back; tapped they glide farther).
- Reef tab card 'What shapes this reef': every lasting effect in play (boon, relics, residents, pairings, moments, works, favours, hard places learned), one line each.
- Ways: Thorn-wise, Moon-born (othersCap); the full-moon card says how much lineage is left on this reef.
- A first reef earns the boon offer by keeping ten requests ('Ossel is pleased').
- Palettes Violet, Ember and Pale moon are earned by feats (A friend in the deep, First to the light, Four memories); locked swatches dim with the feat's name.
- The sister reef seen from the Midnight Water and the Twilight Shelf: when near your depth, its faint crown far off on the right, above or below by how far ahead it is (render/sister.ts; ReefView.gauge).
- 'max' button on repeatable upgrade cards (polyps, glimmerseed, bands, shoals): buys as many as can be afforded.
- Way 'Layering': while watching, the reef lays a band itself when it costs under a tenth of its calcite (habitPurchase).
- Lineage tab: automation traits grouped as Habits (Old habits, Layering, Shoal sense, Rasp sense).
- Requests can also ask to roam, raise a work stage, drive off an intruder or read a band (tally.intruders).
- The ending names the neighbours the line knows well (familiar or more), come to watch.
- The tab title gets a '●' when something waits (a feast, an intruder, a moment, the full-moon choice, a boon).
- Seasoned shoals: each trip (relic or roam) makes feeding and light-swimming 2% stronger, up to +40%; shown in the Shoals header.
- 'Before you go' button (under the request line): sets the Rasp dial for holding and sends a trip if one is open (economy prepareAway); says what it did.
- Visiting the sister reef: a trip offered when it is near your depth, once per zone, +1 lineage on return (expeditions.ts VISIT, state.visits, diary line).
- Audio cues 'intruder' (two low notes a tritone apart) and 'moment' (a soft rising third) when one appears.
- Roam tales: eight seeded tales (expeditions.ts ROAM_TALES), each with a small reward (calcite, glow, murmurs or a sure shard roll); shown in the return note and the diary.
- Heirlooms: spawnLesser(s, where, heirloom); state.heirloom; relic() used for effects (found() for progress); 'What it carries' in the spawning card; test in prestige.test.ts.
- Ossel's mistakes: content/ossel.ts (5), claims as whispers ('claim-<id>'), corrections told when the proof is found (meta.seen 'o:<id>'), kept in the Bands list (panel.keepStory), diary line, codex count.
- Request streaks: each kept in a row adds +10% to the next pay (up to +50%); a swap breaks it; shown on the request line.
- Four more moments (a blizzard of snow 120 m, a lamp drifting 2600 m, eggs in the dead stone 3600 m, the last night under water 3988 m): sixteen; tripFactor() gathers trip-length effects.
- Pacing: Twilight 1.31, Sunlit 1.22 band growth (the new moments had pulled the b/massive path under 6 h); bot 8h28 / 7h48.
- The quick cousin: a faster racer (sister.ts COUSIN, 5 h) for lines that have reached an ending; double lineage per mark; orange gauge marker; diary line; codex.
- Setting 'Fewer words from Ossel': only story whispers (claims, the moon).
- New creature: the barreleye (Midnight): clear dome head, green tube eyes looking up; touched they swing forward.
- New creature: the nautilus (Twilight): striped spiral shell, trailing tentacles; touched it pulls in and sinks.
- New creature: a blacktip reef shark patrolling the Sunlit Crown by day; touched it turns away fast.
- Trust grows at most once a minute per creature (state.trusted) — it was tappable up in seconds; a new friend of the line gives +1 lineage with a note.
- The touch shard roll moved inside the once-a-minute trust growth (spam taps found shards).
- Each friend of the line adds +2% calcite (knownBonus).
- Feats with a count show progress (e.g. 'Send the shoals roaming ten times (3 of 10)').
- The line's old reefs: on later seamounts, up to three pale silhouettes of earlier reefs that climbed past this height, in the Midnight and Twilight water (render/ghosts.ts; ReefView.ancestors).
- Phone landscape: the water, request and before-you-go lines compact on short screens.
- Calling the shoals home early: ↩ on the trip card, 5 glow per second left (economy callHome); test.
- 'New in the sea': a one-time card after this update for saves older than ten minutes (guide.ts NEWS; meta.seen id).
- New creature: a giant isopod trundling across the Silt Floor; touched it rolls into a ball.
- Request line: kicker (with the streak) on its own row, text full width, no bar for one-step asks.
- The current (Twilight verb): act3.ts CURRENT, state.current, setCurrent; a five-step control in the Rasp box; the bot picks the best each half minute. Bot 8h08 / 7h28.
- The current drawn on the shelf: faint streaks running with it, longer and faster with the setting.
- economy.ts split: sim/modifiers.ts (trait, chose, passed, lives, paired, found, relic, has, speaks, boon), sim/water.ts (water slots and price factors), sim/race.ts (sisterAt, gaugeAt); economy re-exports what callers used.
- Secret feats (??? until earned): Old friends talking (tap Ossel ten times), A picture in the dark, Just watching (five minutes of view mode).
- A fourth dialect tier, Song (band 'storm', 400k bloom): Lullaby, Chorus, Call.
- The Song shown around the crown in the Sunlit Crown and the Breach (render/song.ts): lullaby glow, chorus lights, call rings.
- Rain at the Breach (after the Rain band): a shower every five minutes, streaks and rings on the surface.
- Rain sound at the Breach: soft low drops while a shower falls (audio.setRain).
- Companion: meta.companion, ☆/★ in the journal on touched creatures; gifts ×2 at half the cooldown; shown on the touch label.
- The shoals' signal: a little memory game (events.ts SIGNAL, economy currentSignal/answerSignal, state.signal); panel card with four lamps; corallum.signal() jumps to one; test.
- Signal lamps also flash in the water around the crown.
- The epilogue garden: act5.ts GARDEN, economy plant/plantCost, state.garden, +1 begin-again lineage each; card after the ending; colonies drawn in the Breach shallows.
- Drill snail: the Silt Floor's intruder (from 20 m), tap to pick it off.
- The Song dialect colours the melody in the shallows: lullaby slower and longer, chorus doubled a third above, call answers phrases with a high root.
- Gulls: the Breach's intruder (before the release), circling and dipping; wave off for a spawn burst.
- Glimmerseed strain: Act I's three-way choice at 15 m (act1.ts STRAINS, state.strain, chooseStrain); specks take the strain's colour; the bot takes gold.
- Turtle hatchlings paddle across the Breach's surface at dawn after the release; touched they dive.
- The fork on a ruin trip: press on (×1.5 time, a sure shard) or come home; forkOpen/takeFork, expedition.fork; test.
- Each memory the line has ever carried: +1% calcite on every reef (knownBonus), listed in What shapes this reef.
- New creature: a dugong grazing the Sunlit meadows (four or more); touched it rises to breathe.
- Secret ending page 'remembered' (all Ossel's mistakes found + whole tablet) and a hidden feat.
- A new day's gift: first visit each local calendar day pays 10 minutes of the zone's currency and a shard roll (economy dailyGift; meta.lastDay; client passes the day).
- Sunlit night: the sun terrace is drawn under the night overlay (it stayed daylight-bright).
- Your reef card: this reef's feasts, intruders, signals, trips and requests.
- Breach upgrade 'Raise a sand cay' (sand, max 6, spawn ×1.1 each), drawn as low islands by the reef.
- The chronicle (Lineage tab): one line per ending (seamount, hours, memories); meta.chronicle written in breach().
- New creatures: frogfish (Twilight slope, gulps when touched), banded sea snake (Sunlit, rising to breathe).
- New creature: a pelican at the Breach after dawn, gliding then plunging.
- The Rasp elder's riddles: act3.ts RIDDLES (3), economy currentRiddle/answerRiddle, state.riddles (fixed keys so saves keep them); card in Grow; the bot answers right.
- Moment 'Hunters in the dark' (650 m): shoals cost ×0.9, or light shoals ×1.2 glow. Backlog in PLAN done.
- Ossel's tap lines turn humbler once two mistakes have been found (OSSEL_LINES_TRUE).
- The ending: a page of this reef's numbers before the last line.
- Journal: a progress ring per zone.
- Trip to the whale fall (once per reef after the whale-fall moment): 10 min, 5 minutes of calcite; bones drawn in the far water.
- Perf (6× throttle, mobile, Sunlit): day 15.4 ms, night 21 ms. Skipping each newer layer group (creatures, residents/relics/works/song, craft, meadows, night, others' spawning) saves ≤1 ms each; the night cost is the reef's own glow. No single culprit; auto quality steps cover slow phones.
- Touch sounds by kind: glowing ones shimmer, birds cry, shelled ones click, fish bubble.
- A sixth ruin: the sun gate (3850 m, 28 shoals, 30 min; relic: bloom ×1.2), on the city map and drawn as a doorway; Act IV offline test fixture without ventures.
- Seventh resident: a host anemone with its clownfish (from 3980 m, spawn ×1.15), drawn high on the reef.
- Moment 'The slope gives way' (3500 m).
- Feats: A garden at dawn, The elder's respect, Fluent, Kept close.
- The line's title (Lineage header), from the memory its endings carried most (act5.ts LINE_TITLES).
- Rare: a milky sea in the Midnight Water (every 40 min, for 2), touch stirs swirls; journal entry.
- Rare sights: a sardine run on the Twilight Shelf (every 30 min, a minute); the green flash at the Breach's sunrise after the release.
- Rare: a squadron of eagle rays in the Sunlit Crown by day (every 25 min).
- Sea sparkle at the Breach before dawn: blue glints where waves break.
- Three more riddles (after the Rasp's own band, the midden, the sun gate): six in all.
- Refactor: the choice cards (strain, boon, riddle, fork, signal, full moon) moved to ui/choices.ts; el/button to ui/dom.ts; panel.ts 2163 → 1993 lines.
- Shells: content/shells.ts (8), economy currentShell/pickShell, meta.shells, knownBonus; drawn on the Sunlit sand with a glint, tap to keep (spot id 'shell'); shelf card in Bands; corallum.shell(); test.
- Seamount tints carried into the Midnight Water and the Twilight Shelf (faint screen-space overlay per seamount).
- Ambient calls: fish grunts on the Twilight Shelf, a vent rumble on the Silt Floor (audio zoneCall).
- Ways: Shell-finder, Signal-wise.
- The vent-crack moment shown: a glowing fissure down the chimney (left open) or a pale patch (grown over).
- A companion shows as a small warm light circling the crown.
- The drifting lamp, taken in (moment), hangs lit in the branches.
- Pin a card (📌): its wait shows in the tab title.
- Flurries on the Silt Floor drive sweeps ×3 (act1.ts FLURRY, economy inFlurry/untilFlurry; abyss drawFlurry on the sim clock; Soon line).
- Each hard seamount has a moment of its own (moments.ts `seamount`, nextMoment filters on it): krill, echo, far light, drifts, eyes.
- Warm water (act4.ts HEAT; economy inHeat/untilHeat/heatLeft/closeUp/heatEdge/skipCycles; state.closed): a row in the water box with a Close up / Open toggle; Sunlit scene haze + bleached palette + pulled-in polyps; Ossel whispers at the first one. advance splits at heat edges; a month away skips whole repeated cycles (tested against stepped cycles).
- Sun-shy trait (habit, 8 lineage): closedNow() = chosen closed, or warm water with the trait; rates, panel and scene read it.
- The night sky (content/sky.ts FIGURES; economy skyOpen/figureOpen/nameFigure/named; state.sky): sky card in choices.ts, breach.ts drawFigures + 'star' spots with an index, main.ts tracing/tapStar; ending page + 'stars' feat; finale e2e traces Ossel's Cup.
- The rising (act2.ts RISING; economy inRising/untilRising/risingLeft/canFeedRising/risingHaul/feedRising; state.rose, tally.risings): rise row in the water box, render/rising.ts stream in midnight + twilight, Ossel whisper, systems e2e. A plankton-rate version was tried first and dropped: fast plankton steps made a month offline 2.7 s.
- Keys: R sends the feeders into the rising, C closes/opens the polyps (main.ts sendFeeders/setClosed, also the panel hooks); feat 'Into the rising' (ten risings).
- Breach creatures: by-the-wind sailors (a fleet drifting across, bobs when tapped), storm petrels (patter on the water, lift off when tapped), sea sparkle (night wavelets flash blue; a touch sends a flare ring out) in render/surface.ts.
- Grain of the stone (act1.ts GRAIN/GRAINS; economy grainsWaiting/chooseGrain/grainMult; state.grains): card in choices.ts, tinted rings on the Silt Floor (ReefLayout.grains), bot picks dense, dense, quick. The grains changed the bot's Act IV state and exposed a 2e-5 offline gap: the calcite step relaxed with the plain mean production (2nd order). Now Simpson of the decay-weighted production (4th order): the gap is 3e-9.
- The sport (act1.ts SPORT/SPORTS; economy sportOpen/chooseSport; state.sport): card in choices.ts (only the strain's two shown; `.boon-choices .choice[hidden]` now really hides), specks take its colour, bot keeps amber/ice/ultraviolet.
- Your reef (Reef tab) lists the glimmerseed and its sport, the grains, the stars named and risings fed on.
- Traits: Deep larder (way, 10: the feeders go into each rising twice; state.roseN) and Grain-sense (habit, 6: prestige.ts grainSense, run in the habit tick).
- Audio: 'rising' (low swell climbing, bells rising out of it) and 'heat' (wavering tone) cues as each begins (not on load mid-way).
- Four Midnight moments filling 900–2800 m: fire-body (glow / murmurs), seep (plankton / dissolve), rising-stop (rising ×1.25 / glow fade), split-shoal (+2 shoals / +1 lineage).
- The fire-body kept (moment 'a') hangs glowing below the crown in the Midnight scene.
- Away summary: warm spells (open → bleached, with the advice; closed; sun-shy) and risings missed while away (economy cyclesBetween; events.ts AWAY_CYCLES).
- Resident cleaner wrasse (3400 m): neighbours' touch gifts ×2 and their cooldown ×0.5; drawn as a dancing pair at a station on a mid branch, darting round when touched.
- systems e2e: the Sunlit page is bot=17000 (the bot now reaches the Breach by 19000 s), and story cards are closed after moving the clock to a shell.
- Tab dot marks a rising waiting. Hard seamount 'shallow' (Seamount.heat ×2 → economy heatLength used everywhere a spell's length was), trial to 3950 m → passed('shallow') halves open bleaching; moment 'heatwave' (bloom fade ×0.85 / calcite ×1.1).
- The line remembers moment answers (meta.seen 'm:<id>:<a|b>'): the moment card marks a way chosen before; feat 'Both ways' (every moment both ways, across the line).
- Trip encounters (expeditions.ts ENCOUNTERS, ForkId; economy currentEncounter/takeFork; homecoming reads the way): passage, squid, lights, sponges. The fork card fills from the encounter.
- Setting 'notify' (off by default; asks permission when turned on, turns itself off if refused): main.ts notifyWaiting checks once a second and notifies only while the tab is hidden, each thing once as it begins.
- Four more riddles (rule, ripple, end, children): ten in all, each about a band already read.
- The line remembers its stars (meta.seen 'sky:<id>'): later Breaches draw those figures as faint dotted outlines and the sky card says 'named before'.
- Dreams (events.ts DREAM; meta.dreams; economy dream; dailyGift adds one, max 3): a Dream (n) button in the prep row; main.ts runs catchUp(900).
- Sea pens on the Silt Floor (render/life.ts drawSeaPens; a glowing creature for gifts): touched, a green wave runs up each in turn.
- Ossel's requests: three more kinds (rising, signal, star); the bot skips them as it does touches.
- Ossel's questions (content/ossel.ts QUESTIONS; state.asked; economy osselAsks/answerOssel; diary 'asked'): a card in choices.ts, the reply as a story, one ending page of what you told Ossel.
- finale e2e: the save has one of Ossel's questions answered (its ending page is counted); reads up to 20 pages.
- The reseeded sea: the chronicle card draws every ending as a reef islet on a spiral chart (ui/drawings.ts drawSeaChart; SEAMOUNT_TINT shared with the line chart).
- Rare oarfish in the Twilight (twilight.ts drawOarfish: every 25 min for 90 s, head-up silver ribbon with a rippling red crest; touched it hurries off). Note: tools/screenshot `--t` freezes the clock and overrides `at`.
- Night on the Twilight Shelf (twilight.ts nightAt, same 10-minute day as the Sunlit Crown): a veil behind and lightly in front of the reef, polyps open wider and glow, plankton sparks blue.
- Twilight nights: garden eels sleep in their burrows (a few stay half out); flashlight fish (night only) wander left of the reef, lamps shuttering; touched, they all go dark and relight one by one.
- Swells at the Breach (events.ts SWELL; economy currentSwell/untilSwell/rideSwell; state.swell): breach.ts drawSwell (humps + timing ring), tap near the crown or S, Soon line, tab dot.
- SWELL's tolerance is `slack` (the determinism lint rejects the other word in sim/content). Two commits went in with that lint red: chain commits on `node --test` itself, not on a grep of it.
- Rare giant larvacean in the Midnight Water (every 22 min for 110 s, high in the open water); touched, the tadpole bolts and the empty house sags. Frame costs checked across zones: 2–7 ms draw headless.
- The shoals' signal keeps a streak (state.signal.right/streak): answered in the very next slot, each pays +15% more, up to +90%; a wrong answer breaks it. Shown after the answer.
- Lamp-nets (upgrade 'net', Midnight, glow): feeding ×1.05 each, max 6, drawn as glowing webs between branches. Pacing had already slipped under 6 h on some path before this (unnoticed: a commit chained on grep); band cost growth retuned, bot 7h28, all 61 sim tests green.
- Feats: Every crest (all five of a swell set), Six in a row (signal streak), Ossel heard it all (four questions).
- Upwellings (act3.ts UPWELL; economy currentUpwelling/catchUpwelling; state.upwelled): caught by setting the current toward it (main setCurrent hook), the line under the dial says so, twilight.ts drawUpwell plume, tab dot.
- Moments pups (3880: thorn stars driven off for half / bloom ×1.1) and king-tide (3995: spawn ×1.1 / spawn fade ×0.85).
- The sheltered shark pups (moment 'a') circle the reef in the Sunlit scene.
- Resident pair 'Clean water' (cleaner wrasse + feather dusters): plankton ×1.15.
- Forget a trait (prestige.ts forgetTrait/forgetRefund, FORGET_SHARE 0.8): a Forget button on each bought trait, asks once ('Forget it? (+N)') then forgets on the second press within 4 s.
- prestige e2e buys a trait with `button.buy` (each trait card now also has a Forget button).
- The day's sea (events.ts DAYS; economy dayOf/setDay, meta.today; rates read it): set on load with the daily gift (never in bot/frozen sessions), a 'Today:' line in the water box.
- Moonbow at the Breach (breach.ts drawMoonbow): a minute after each shower, if the moon is bright; a rare sight for the journal.
- The Rasp elder shows on the slope (twilight.ts drawElder: pale, worn beak) while a riddle is asked.
- Audio: 'upwell' (rising bubbles) and 'swell' (two long surges) as each begins.
- Boons: Clear voices (Readings and words ×0.8), Kind shallows (open bleaching ×0.5); nine boons now. Rasp elder and upwell/swell sounds before this.
- Seventh ruin 'harbour' (3982 m, 30 shoals, 20 min; mooring ring: spawn ×1.15): relic drawing, its look on the trip, and a memory 'The harbour' for the spawn to carry (24 memories).
- Mantis shrimp at a burrow on the Twilight slope (twilight.ts drawMantis): banded, eyes swivelling apart; touched, it strikes with a flash and a ring.
- Vent shrimp crowd the vent chimney (life.ts drawVentShrimp, more per tier); touched, they scatter and drift back.
- Hard seamount 'thorny' (Seamount.thorns 0.5 → economy thornPeriod in currentThorn/untilThorn); trial to 3700 m → passed('thorny') pays intruders ×1.5; moment 'outbreak' (calcite ×1.1 / thorn stars off for half).
- On a thorny seamount, thorn stars dot the Twilight slope all the time (twilight.ts drawSlopeThorns).
- Grow tab: a strip of chips (panel.ts renderWaitBar) when two or more choice cards are open, named by their kickers; a tap scrolls to the card.
- Trip encounters: six now (+ a fast current: ride ×0.7; a field of larvae: feed ×1.2, a shard chance).
- Lantern shark in the Midnight Water (every ~4 min, low across; belly lights; touched, lights out and it slips away).
- The sea heals: siltP × 0.95^min(6, endings); abyss snow loses a tenth of its flakes per ending; a 'The sea' row in Your reef.
- Again (ossel.ts AGAIN): on a new reef after an ending, Ossel says one of five lines (by endings reached), once each (meta.seen 'again:n').
- README brought up to date with the zone rhythms, run-long choices, Ossel's questions, the sky, the day's sea, dreams, notifications and keys.
- Upgrade 'sweeten' (Breach, bloom): spawn ×1.1 each, max 6; the bot buys 4; bot 7h48.
- Whispers for the upwelling, swells, the first grain, the unnamed stars and a kept dream.
- Sweetened spawn bundles turn from pink toward amber as they rise at the release.
- Job 'fan' (act2.ts JOBS; act3.ts FAN; jobOpen needs the shelf; siltK + 0.003 × fanners; trips take fanners first, homecoming returns them; shoals drawn sand-coloured).
- Ossel's fifth question at 3990 m ('remember': what will you tell them about me).
- Christmas tree worms on the Sunlit reef (sunlit.ts drawTreeWorms, after the slugs so nothing covers them): touched, all vanish and come back one by one. Full browser suite green before this.
- Rare meteor shower over the Breach (breach.ts drawMeteors: 40 s every 20 min, streaks from the moon's side; touched, a fireball).
- Sweep combos (ACT1.comboGap/Step/Max; state.combo): the float shows the multiplier.
- Sweep combo: more motes per sweep in a run; feat 'Eleven in a row'.
- Flare the lure (act1.ts FLARE; economy canFlare/flare; state.lastFlare): Flare button in the prep row with its cooldown, key L.
- Whisper 'flare' when the glow first sits full.
- Zone guides (guide.ts ZONE_GUIDE): the first time the line enters zones 2–5, a short card of what is new there (meta.seen 'zone:n'), five seconds after the zone's title.
- The Reef tab's guide covers rhythms, glow (flare), shoal jobs, Ossel's questions, the sky and the daily things.
- The elder's blessing: every riddle right on one reef → sand ×1.2 for the run (economy elderBlessed), said after the last answer; feat 'The elder's blessing'.
- A turtle surfaces to breathe beside the Breach crown every three minutes (breach.ts drawBreathingTurtle).
- Palettes Old beak (feat: the elder's blessing) and Surf (feat: every crest).
- The cold seep (moment) stays in the Midnight scene: white mats and rising bubbles, or chalk-crusted once built over.
- The anglerfish the reef shared the dark with (moment 'b') hangs beside the crown in the Midnight scene.
- The cleaners' ledge (moment 'a') stays on the Twilight reef with three striped shrimp waving their antennae.
- The Rasp nursery (moment eggs 'a'): a stone lip on the Twilight slope with young Rasp darting round it.
- Affordable calcite upgrades show 'pays back in …' (price / (gain × steady calcite rate)) where the wait was; the Fan job row stays hidden below the shelf (.job[hidden]).
- 'Best buy' mark on the calcite upgrade with the shortest payback (recomputed once per round of eta updates).
- A dream now shows one of eight short dreams (events.ts DREAM.dreams) with the away summary.
- Lighting the way for the sister (sister.ts lightSpeed/lightLineage; economy sisterNow/lightOpen/lightSister; race.lit/declined): sisterNow replaces sisterAt for the sister everywhere (marks, gauge, visits, whispers); ending 'sisterLit'.
- When lit, the far sister reef (when near on the gauge, Twilight) sends a thread of light up from her crown.
- Cloud shadows slide over the Sunlit Crown by day (sunlit.ts drawCloudShadow, every 140 s for 40 s).
- The cloud shadow is a tall soft ellipse, darker (0.42), so it reads over sand and reef.
- Old stone (act1.ts OLD; economy oldKnobs/prune; state old/oldSlots/pruned, tally.pruned): grey knobs fill the branch tips toward six (dx/dt = P − kx, away too), tap one to break it off for 25 s of the zone's currency. Request 'prune', feat Light stone, whisper, guide row; reef.ts drawOld (spaced tips, falling piece); systems e2e taps one.
- A far storm at the Breach (breach.ts lightningAt/drawLightning): every third shower, four strikes with a forked bolt to the horizon, the sky lit; thunder cue (audio thunder) ~2 s after each; codex 'far-storm'.
- Trait Light-boned (way, max 2): old stone gathers 40% faster (oldK) and pays 30% more per level.
- Requests can have a singular phrasing (one): 'Lay down a band.', 'Call one more shoal.', 'Let a knob of old stone go.'; the prune request waits until old stone is gathering (old ≥ 0.5).
- Three moments: heavy-crown (250 m: old stone ×1.5 or dissolve ×0.92), cold-slide (3050 m: upwellings ×1.5 or silt +0.02/s), dust (3750 m: bloom ×1.1 or plankton ×1.15). Bot 7h28.
- The dust moment leaves a rust-red haze and falling motes in the Sunlit Crown (sunlit.ts drawDust).
- Sunlit creatures: a giant clam on the sand (mantle shimmering; touched, it closes and slowly opens) and a trumpetfish hanging head-down in the branches (touched, it swings level and drifts off). Full e2e suite green.
- Hard seamount 'heavy' (lineage.ts Seamount.old): old stone gathers ×3, polyps feed ×0.7; trial 3000 m → Stone-light (old stone pays ×2 after); moment 'bowed' (500 m: dissolve ×0.9 or old stone ×1.5). Sea chart tint.
- Every fourth knob of old stone let go held one of the reef's own bands (economy oldHeld; diary.ts diaryLine shared with the panel): shown as a journal note ahead of the queue.
- Once the cold-slide moment is met, every seven minutes a river of cold water pours down the Twilight slope for 50 s (twilight.ts drawColdSlide).
- Three trip encounters (expeditions.ts): wall (stop and listen: ×1.4 time, hear ×2), hunter (scatter: ×1.1, hear ×0.5; dazzle: half the glow, ×0.8), store (break it open: ×1.4, five minutes of calcite at homecoming).
- A near foreground in the Twilight Shelf and Sunlit Crown (render/foreground.ts): a sea fan and weed blades in the bottom corners, dark, swaying, painted at quarter resolution so they read out of focus.
- A milky sea in the Midnight Water (act2.ts MILKY; economy inMilky/untilMilky/milkyGlow): a minute in every 25, the water glows and each sweep gathers 4 s of glow. Soon line, whisper, shimmer cue, midnight.ts drawMilky wash and sparkles; sim test.
- The near foreground also in the Silt Floor and Midnight Water, near-black with small lights on the fan that blur into soft bokeh.
- The near foreground at the Breach too (under the surface, dark blue).
- Feat Wading in light: 40 sweeps through a milky sea (tally.milky).
- Corallites: small pits with pale rims along every thick branch (reef.ts drawBranches; drawn into the branch cache).
- The map of Thousandfold shows a trip under way: a dotted way to the ruin and the shoals' lights out along it and home (drawings.ts drawCity trip; redrawn each 1% of the trip).
- Upgrade Hollow a grotto (act3.ts, sand 3000×5^l, max 2): +1 resident home each; reef.ts drawGrottoes (arched hollows in a mound at the foot, eyes glinting); icon.
- Resident: a boxer crab (3400 m): intruders driven off pay ×1.5; drawn at the reef's foot waving its two anemones (shakes them when touched).
- Resident pair All claws (boxer crab + guard crabs): intruders driven off pay ×1.3 more. Systems e2e green.
- At the release every knob of old stone lets go, one after another, and tumbles down (ReefView old.fall); after the ending no old stone gathers (oldKnobs 0 once ended).
- Boons Bright water (milky seas last twice as long) and Brittle tips (old stone ×2).
- Sweeps startle the small fish: lanternfish and Sunlit reef fish near a sweep dart away from it and drift back (sightings.ts poke/pushed).
- Two more of Ossel's questions: grey (700 m, about letting old stone go) and sister (2600 m, race or company); guide says seven.
- Golden hours in the Sunlit Crown: an amber wash at dusk and a rose one at dawn, strongest near the surface (sunlit.ts drawGoldenHour).
- A fifth shoal job, guard (Sunlit Crown on, act3.ts GUARD): with 4 on guard any intruder is driven off in its last second, for half (economy guarding). Guard shoals ring the crown (shoals.ts); expeditions take guards too; sim test.
- Whisper 'guard': in the light, with an intruder at the reef and no guard set, Ossel suggests four shoals on guard.
- Palettes Milky sea (feat Wading in light) and Light stone (feat Light stone).
- Readings The night the sea burned (5200: milky sweeps ×2 glow) and The kept stone (26000 after first-words: old stone ×1.5), with Ossel's line about weight. Bot 7h08.
- Rare creatures: a gulper eel crossing the Midnight Water (11 min; touched, its mouth balloons) and a sixgill shark gliding low along the Twilight slope (13 min; touched, it turns down).
- Lucky neighbours (creatures.ts LUCKY; economy lucky): in each 2-minute span a creature may be lucky (seeded by reef, creature, span; 2.5%), drawn with golden sparks (main.ts drawLucky, one per kind). Touched, its gift comes at once ×5 (once per span), the codex keeps g:<id>; feat Touched by luck (five). Away summary mentions the old stone knobs waiting. Full e2e suite green before this.
- The journal marks creatures touched while lucky with a golden ✦.
- A fourth Form dialect, Pillars (calcite ×1.25, plankton ×1.5): coral.ts form 'pillar' (attractors in five upright columns from a shared foot), its looks in the Sunlit Crown and at the Breach. speak() ignores an unknown dialect (the bot param could pass fewer than four tiers).
- Ossel's sixth mistake, strong (600 m: 'Strength is keeping'), corrected by the Reading The kept stone.
- A fourth kind of falling feast: a jelly fall (feast.ts drawJellyFall; feastAt picks of four).
- Ossel's requests: milky (sweep through the next milky sea n times; asked when one is within 10 min) and lucky (touch a lucky one). Bot 7h08.
- The release is more visible: bundles bigger and pinker, drifting wide as they rise, and the water goes pink at the height of it. Ossel no longer asks questions after the ending.
- NEWS updated (news:2026-10-29c) for the recent additions.
- Your own bands as a cross-section of the stone (drawings.ts drawRings): one ring per diary entry (last 60), the first at the heart, tinted by kind; tap a ring to read it. Redrawn when the card opens.
- Panel words moved into content/ui.ts (UI: headings, settings, saves, the away card; 54 strings); whisper speakers into whispers.ts.
- Client and finale words moved into content/ui.ts as well (24 more).
- Vows (lineage.ts VOWS; state vows/surfacedAt; economy vowKept/vowLineage): after the line's first ending, a new reef may take Haste (surface within 7 h: +6), Lightness (carry one fewer: +4), Solitude (no homes: +4); paid in lineageFor at the ending. Spawn card toggles, codex row (kept/broken), guide line; prestige test.
- The ending has a page for the reef's vows, kept and broken.
- Feat Every vow kept (hidden).
- Ossel's light rises and flickers while it speaks (sightings.ts spoke/speaking; Silt Floor and the Twilight wall).
- Reef fish cast soft shadows on the Sunlit sand by day (sunlit.ts drawFishShadows). Full e2e suite green.
- Vow Stillness (+5): sweep() does nothing on that reef.
- Shooting stars at the Breach run on the reef's clock (sky.ts WISH; economy meteorShower/wishOpen/makeWish): every 20 min for 90 s; one wish per shower (four minutes of spawn, a lost shard, or +1 lineage at most three times a reef); a wish card; the renderer draws the sim's shower. Sim test.
- Memory The weight let go (needs the Reading The kept stone; line title 'the line that let go').
- A second Midnight great work, the listening dome (from 1500 m; calcite+glow; scouts hear ×1.25 per stage); works.ts drawDome (ring of stones, shell by stages, murmur rings). Bot 7h08.
- A wish shows as one bright star falling into the crown, which flares (effect 'wish'); a run of bells when a shower begins.
- Each ending the line has reached stands far off in the Sunlit Crown: up to five pale distant colonies (sunlit.ts, drawColony).
- Moment visuals: the slope that gave way leaves a pale rubble fan (scoured: a channel); the young Rasp fed sleeps by the reef's foot; the big-eyed fish lit up stays by the crown (dark seamount).
- Two more of the elder's riddles (burning, weight), after the new Readings.
- The king tide leaves a wrack line of dried weed and salt across the crown above the water (breach.ts drawWrack).
- Trait Lucky line (way, 8): lucky neighbours twice as often.
- Time-lapse (T, or the Reef tab): the reef regrows from the start of its zone to now in 8 s (main.ts lapseHeight overrides the view height).
- The dark beyond the reef's light (draw.ts drawDarkness): in the Silt Floor and Midnight Water the water dims away from the crown; the lit circle widens with the glow lure.
- Calmer motion (setting or system reduced motion) reaches the renderers (ReefView calm): lightning becomes a slow soft glow with no flicker.
- The next twenty minutes as a strip under the water's forecast (panel almanac): a mark for each thing coming, labelled above and below, its full text as a tooltip.
- The garden: each child planted is quick, bright or deep (act5.ts GARDEN.kinds; state gardenKinds → next reef's nursed): per child, bands ×0.97, glow ×1.04 or dissolving ×0.97 on the next reef; children drawn in their kind's colours; codex row; prestige test.
- Four more of the reef's own bands in the long Midnight Water (900, 1550, 2200, 2750 m).
- Sweeps swirl the marine snow away from them (Silt Floor, Midnight Water).
- Feats Every kind (garden) and Three wishes.
- Fix: a silent seamount (no Readings) is no longer capped at 3000 m by the Reading gate it could never open; it climbs on, slowly.
- Twelve shells (murex, nautilus, tusk, top shell added); drawn larger, each kind its own shape (ribbed scallop, starred sand dollar, banded spires, spiral whorls, spotted cowrie).
- Bands tab: Moments met across the line (each moment and the ways the line has met it; unmet ones show their depth, hard places' stay hidden).
- Keys K (let a knob of old stone go) and W (wish when stars fall).
- The shelf of kept shells shows each shell drawn (render/shells.ts drawShellShape, shared with the sand), its name as the tooltip.
- Ossel can be heard in the light too: the sand it became glitters on the Sunlit floor and in the Breach shallows (draw.ts drawOsselSand, tappable, flickers as it speaks), so its after-ending lines are reachable. Almanac labels stack in up to three rows without overlapping.
- Hard seamount 'gleaming' (lineage.ts lucky/noFeasts): lucky neighbours ×3, no falling feasts; trial 3500 m → Fortune's child (lucky ×1.5 after); its moment The water like glass (glow ×1.15 or dissolve ×0.9); chart tint; sim test.
- Full browser suite green. A suite run once stalled at browser launch for 35 min: run e2e loops with `timeout 300` per test.
- Trait Star-gazer (way, 7): shooting-star showers twice as often.
- Today's visitor (economy visitor/visited; meta.day): one non-rare creature of the reef's zone each calendar day; its first touch that day brings +1 lineage; named on the Today line, a journal note when touched; sim test.
- Today's visitor wears a slow silver halo in the world until touched.
- Rasp favour Grind a hollow (20000 sand, once): +1 resident home.
- Resident: a decorator crab (3000 m): lucky neighbours ×1.5; drawn at the reef's foot in its sponge and weed (freezes when touched).
- Four more dreams (twelve).
- Resident pair A busy station (decorator crab + cleaner wrasse): gifts ×1.3.
- With a mouse, polyps near the pointer pull their tentacles in (sightings.ts hover/shy; reef.ts).
- Rare at the Breach: a humpback breaching far off every 15 min (leap, flipper out, a hill of spray and rings).
- Rare on the Silt Floor: a ghost shark (chimaera) gliding low over the silt every 12 min. Almanac rows measure labels where they really sit; a label with no room keeps only its dot.
- Two more trip encounters: a lamp still burning (carry it home: a minute of glow) and a cloud of eggs (feed: a minute of plankton).
- A second Twilight great work, the grazing lawn (from 3400 m; calcite+sand; sand ×1.15 per stage); works.ts drawLawn. Bot 6h48.
- Palettes Oath (feat Every vow kept) and Silver (feat A week of visitors).
- Tangles (events.ts TANGLE; economy currentTangle/freeTangle; render/tangle.ts): in the Midnight Water to the Sunlit Crown, one slot every 7 min a small fish is caught in a jelly's threads near the reef for 35 s; tap it free for 40 s of the zone's currency. Whisper, request 'free', feat Untangler (10), guide row; sim test.
- At the Breach the tangle slot is a fish stranded on the crown at low water (breach.ts drawStranded; ReefView stranded): tap to toss it back.
- systems e2e frees a tangled fish (debug hook corallum.tangle()).
- On the Silt Floor the rescue slot is a brittle star pinned under a fallen stone (tangle.ts drawPinned): every zone now has a small creature to help.
- Trait Gentle (way, 5): freed creatures pay ×2.
- Rare on the Twilight Shelf: a great herd of Rasp streams along the shelf every 15 min (twilight.ts drawRaspHerd).
- Rare in the Sunlit Crown by day: a barracuda tornado, a slow spiral column of silver fish (every 18 min).
- Fix: floating '+n' texts swallowed taps for their whole rise (#ui > * gave them pointer-events back over .float's none); a quick second tap on the same spot (a sweep, a knob, a feast) now always lands.
- Rare in the Midnight Water: a rising river of firefly squid, blue sparks (every 16 min). Every zone now has a rare spectacle besides its creatures.
- Moments jelly-bloom (1700 m: plankton ×1.1 or glow ×1.1) and last-dark (2900 m: scouts ×1.2 or bands ×0.95). Midnight band growth 1.195 → 1.2 to keep pacing margin (bot 6h28 → 7h28).
- A blue moon (economy blueMoon: every seventh moon cycle): drawn washed in blue, named on the moon card; releasing under it brings +2 lineage (endingLineage); prestige test.
- Vibration only after a real touch on the page (Chrome refused and logged an error when a key or a mouse click triggered it first; the feast test caught it on mobile).
- Drift: in view mode, after 25 s without input, the camera wanders slowly round the reef, zooming in and out (zoom.ts lookAt; off under calmer motion).
- The almanac strip waits until the water has started turning and two things are coming, so a new reef's first cards stay near the top.
- Letting old stone go can turn up a shard of the tablet (chance 0.12).
- A benthic storm on the Silt Floor: every 12 min a low cloud of stirred silt rolls across for a minute (abyss.ts drawBenthicStorm).
- The chronicle marks endings under a blue moon (blue ring on the chart) and with all vows kept (gold ring).
- Trait Helping habit (habit, 6): while watching, a creature left in trouble 20 s is freed by the reef itself for half (economy helpTangle).
- The jelly bloom, once met, leaves small pale bells pulsing through the Midnight Water. Request 'visitor' (touch today's visitor).
- The epilogue garden matures: each child grows to twice its size over the two hours after the release.
- Ossel remembers answers in later whispers (asked-silt at 2000 m, asked-keep at 3600 m, asked-sister once her way is lit).
- Feeding: with plankton in the water, pale motes drift in to the polyps' tentacle tips and vanish there (reef.ts).
- Feat An album: a picture in every zone (did:photo-z<n>).
- Moment fry (3820 m: bloom ×1.1 or plankton ×1.1); sheltered, little clouds of clear fry swirl among the branches.
- Reading The quick one (32000, after first-words): the sister reef grew from the city's other wall, Ossel's sister; visits bring +1 lineage more.
- systems e2e makes a wish at the Breach.
- Her way lit, the sister reef spawns with you at the release: a far pink plume over her seamount (breach.ts drawSisterSpawn).
- finale e2e plants a child of a kind in the garden.
- Ossel can be heard in the Midnight Water too: the old wall's one pale light far below, tappable, flickering as it speaks.
- A squall at the Breach every 25 min for 90 s: the sky darkens, waves rise and quicken, spume blows along the surface and rain drives slantwise (breach.ts squallAt/drawSquall).
- A new reef's first seconds: the larva that will become it drifts down out of the dark and settles (abyss.ts; ReefView age).
- The line's earlier reefs show as far ghosts on the Silt Floor and in the Sunlit Crown too.
- Hard seamount 'tidal': great tides every other moon, spawn ×0.85; trial: reach the surface → Moon-tied (a blue moon brings +4 instead of +2); moment two-seas (3900 m).
- Two more days' seas: a lucky day (lucky neighbours ×2) and a kind day (freed creatures ×2).
- Memory The small ones (needs 5 creatures freed; line title 'the line of small kindnesses').
- With each far whale call in the Midnight Water, a vast dim whale crosses high overhead (midnight.ts drawFarWhale).
- Drifting fragments (events.ts FRAGMENT; economy currentFragment/takeFragment; tangle.ts drawFragment): on the shelf and in the light, one slot every 9 min a broken-off branch of another reef tumbles past for 30 s; tapped, it grows at the reef's foot in its own colours (max 5, calcite ×1.03 each). Whisper, guide row, sim test.
- Trait Foster (way, 6): up to eight fragments (economy fragmentMax). Fragments are taken in small and grow to full size over an hour (state fragmentAt).
- Glinting specks drift in the Sunlit sun shafts by day (sunlit.ts drawShaftMotes).
- Lost shoals (events.ts STRAY; economy currentStray/callStray; tangle.ts drawStray): in the Midnight Water every 15 min a stray shoal's lights flicker far off for 40 s; tapped, it joins the reef (+1 shoal feeding, within the seamount's cap). Whisper, guide row, sim test.
- Ossel's requests: stray (call home a lost shoal) and fragment (catch a drifting fragment); tally.strays.

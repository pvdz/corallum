# Progress log

NOW: Open-ended polish (features, UI, graphics). Recent: neighbours (every creature tappable, most react), photo journal, floor detail, Shared table trait, moon. Ideas: more reactions (turtle, mola, whale shark, giant squid), Breach draw cost (~9 ms headless), portraits for transient creatures.

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

# Design — Corallum

## Principles (every feature is checked against these)
1. Growth shows up in the world: the reef, water colour and creatures change, not just counters.
2. Every act adds a new *verb* (a new kind of decision), not just a bigger number.
3. Real trade-offs: allocation and branching choices with opportunity cost; more than one viable route.
4. Rhythm: short "can afford something" beats inside longer goals; no dead walls longer than the
   act's pacing target (measured by a headless bot playthrough).
5. Prestige changes how you play (Lineage traits open new strategies), not just a multiplier.
6. Respect time: offline progress, nothing lost to absence, no click-grinding as main income.
7. Clarity: show rates, time-to-afford, and what an upgrade does before you buy it.
8. Juice: every purchase gets visible and audible feedback.
9. The story is told through the mechanics (reading bands, the Rasp truce, the memory choice).
10. It ends: a real finale, then an optional epilogue garden.

## Acts and verbs
| Act | Zone | New resource | New verb |
|---|---|---|---|
| I | The Silt Floor (4000 m) | Calcite, Glow | grow polyps, build vent chimneys |
| II | The Midnight Water | Plankton | assign shoals: feed / light / scout bands |
| III | The Twilight Shelf | Current | shape flow with reef walls; manage silt drift; Rasp truce |
| IV | The Sunlit Crown | Sunlight | choose a reef dialect (branching tree) |
| V | The Breach | Spawn | pour everything in; choose memories; finale |

Prestige: **Lesser Spawning** → new seamount, keep **Lineage** traits and decoded bands.

## Presentation
- Canvas world (procedural: water gradient by depth, marine snow, coral growth via space
  colonisation, glow, boids, kelp, caustics near the surface). Camera climbs with reef height.
- DOM panels overlaid: desktop side panel; mobile bottom sheet with tabs.
- System font stacks only (no network). Display: Iowan/Palatino/Georgia/DejaVu Serif.
- Reduced-motion and quality tiers.
- View mode (the eye) gives the reef the whole screen, with zoom; left alone, the camera drifts round the reef and now and then visits a creature on screen (a rare visitor first and at once), follows it and names it, like a documentary. Any input hands the camera back; off under reduced motion and calm.
- A quiet panel (the user finds the HTML panel heavy beside the canvas): what is already known
  steps aside (owned cards hide their flavour, choices that may wait fold with Later and only one waiting choice is open (the one opened by hand, else the first to arrive; a timed one opens beside it while it lasts), the others are one-line rows, full
  residents and the mid-run spawning fold to one line, finished upgrades fold away); feedback
  belongs in the world (flourishes that show by day and night, numbers over the water). With a mouse, the list recedes while the player only watches the sea. The weather card's strip folds away by the water's name, and folded choices keep one dim line of what they ask. Stocks of acts two or more behind the reef step aside into one small line (name and number; chosen by zone, not by rate, so the grid never jumps). The quick buys (Polyp, Band, Glimmer) stand above the scrolling list, so nothing passes under them (on a short screen they are the list's first line and scroll away). New UI
  should earn its room on a phone sheet ~400 px tall.

## Depth and acts
Reef height is how far the reef has climbed the seamount's flank; depth = 4000 m − height.
Acts follow the real ocean zones:

| Act | Zone | Reef height | Depth |
|---|---|---|---|
| I | The Silt Floor | 0–60 m | 4000–3940 m |
| II | The Midnight Water | 60–3000 m | 3940–1000 m |
| III | The Twilight Shelf | 3000–3800 m | 1000–200 m |
| IV | The Sunlit Crown | 3800–3980 m | 200–20 m |
| V | The Breach | 3980–4000 m | 20–0 m |

Each act is its own scene (palette, creatures, a fresh coral crown entering from below);
the previous act's scene is gone below the frame.

## Act II — The Midnight Water
- **Shoals** of lanternfish come to the light: bought with **glow** (glow becomes a currency
  as well as the lure).
- **The verb: allocation.** Each shoal is assigned to one job, changeable any time:
  - *Feed* — herd plankton to the polyps → **Plankton** stock → calcite multiplier
    `1 + √plankton / 8` (sublinear, never caps).
  - *Light* — swim in the reef's glow pattern → more **glow** production.
  - *Scout* — dive into the silt to listen at buried bands → **Murmurs** stock.
- **Readings**: one-off purchases with murmurs. Each deciphers a buried Thousandfold band:
  a piece of lore plus an effect. This is how Act II's story is told.
- **Late Readings**: three more bands wait for later zones (the Rasp's own band after *First words*:
  sand ×1.3; *Light in the old walls* after *Shapes in the light*: bloom ×1.25; *Thousandfold's spawning*
  after *Air*: spawn ×1.25), so scouting stays worth something to the end.
- Trade-off: plankton grows the economy, light buys more shoals, scouting buys knowledge and
  permanent effects. No allocation is right for the whole act.

**Shards of Thousandfold** (lineage-wide collection): sweeps (5%), feasts (30%), touches (4%)
and every expedition's return may turn up one of twelve shards of a carved tablet (seeded by the
reef and its search count). Each is a line of the city's last inscription ("We are Thousandfold,
and we keep everything." … "Forget us gently, and live."), +1% calcite, +10% more for the whole
tablet. Drawn as a cracked round stone in the Bands tab, filling in. Gives the active verbs a
second reason and tells the theme from the city's own mouth.

**Ossel's requests** (from 3 polyps): one small thing at a time to do while watching (bud n
polyps, take in glimmerseed, lay bands, catch a feast, touch neighbours, sweep, call shoals, raise a
sand bar, grow a pigment, ripen), picked from the seed among the kinds that make sense in the zone,
a little more each time. Kept, it pays 120 s of the zone's currency (as a feast does) and the next
comes. Short goals inside the long ones (principle 4); never needed. Feat: 20 in one reef.
Only asks that can come true now are picked (a Reading once readings are open, the signal from five
shoals), never for more than can be had (a seamount's shoal cap, the height cap). An ask done in the
panel leads there on a tap (and glows it); one that waits on the water says when it comes.

**Moments**: twenty-four small happenings on the way up (25 m to 3990 m, at least one per zone), plus one of its own on each
hard seamount (krill on the hungry one, an echo on the silent, the far light on the lonely, the drifts on the buried,
the eyes on the dark), each a choice between two
ways of meeting it, waiting in the Grow tab until answered and never blocking. Most pit active
play against being away or one route against another (e.g. the squid: dim your glow, glow
fades ×0.8, or hold it, glow ×1.2; the storm: let the branch go for +2 lineage, or bind it for
bloom ×1.15; the cleaners: a ledge for one more resident home, or calcite dissolves ×0.9).
Answers go into the Bands list as stories.

**The water's moods** (from 60 m): every 10 sim minutes the water turns, seeded per reef: still,
rich (polyps and glimmerseed ×0.7), slack (bands ×0.8), lamp (shoals, lure ×0.7), carrying (Readings
and truce words ×0.7), a gritty tide (sand works ×0.7), clear (pigments, canopy, dialects ×0.7),
warm (ripening ×0.7), each only in the zones it suits. The panel shows the water, when it turns
and what comes next; cards it lowers are marked. The verb is timing: buy now or save for the
right water. Prices only, so stocks and offline are untouched. Each has a light overlay in the world.

**Great works**: one per zone (the vent garden on the Silt Floor, calcite + glow, calcite ×1.05 a stage;
the spawning pool in the Breach, calcite + bloom, spawn ×1.15 a stage; and) one per middle zone, three stages, each paid in two currencies at once (a new
kind of purchase: both stocks must be ready). The lantern spire (Midnight; calcite + glow; lure
+0.5 a stage), the breakwater (Twilight; calcite + sand; silt ×0.85 a stage), the sun terrace
(Sunlit; bloom + sand; bloom ×1.15 a stage). Offered in their zone; begun ones stay. Each is drawn
growing by stage: a lamp-hung spire, courses of stone upslope, stepped slabs at the reef's foot.

**Ossel's mistakes**: five things Ossel is sure of, said in passing as whispers (the city never
fought; the silt falls from the sky; nobody was shut out; the Rasp killed the city; a wall is never
afraid). A Reading, a band or a relic later proves each wrong, and the correction is told and kept in
the Bands list (the narrator is unreliable by design, and the player finds out how).

**Your own bands**: the reef keeps a diary of the run in its stone (the theme made literal): first
sightings, the first feast, relics, moments, residents, works, shards, readings, the sister race,
trials, every fifth request, each with its time and height. Bands tab, newest first.

**The sister reef**: another child of Ossel's wall on the next seamount grows on a fixed schedule
(the surface at 8 h) and shows as a small cool mark on the depth gauge. Each zone reached before
it brings +1 lineage (the surface +2), judged at the exact crossing moment so offline and stepped
agree. A pacer: something to race inside every run. Once the line has reached an ending a second racer
joins, the quick cousin (the surface in 5 h): beating it to a mark pays double.

**Lighting the way** (the sister reef): on the shelf or above, while ahead of her and the race still on, a
choice: light the way (she climbs ×1.25 faster from then on, so later marks are harder; +3 lineage at the
release, and the ending has both reefs spawning under the same moon) or climb on alone.

**Expeditions** (from 150 m): shoals can be sent to a buried ruin of Thousandfold, one trip at a
time, five sites in order (150 m → 3300 m, 6 → 24 shoals, 6 → 30 minutes). Idle shoals go first,
then scouts, light-swimmers, feeders; while away they work no job, and at a fixed sim moment they
come home to the jobs they left, with half a scout's murmurs for the trip and a relic: a story card
and a lasting effect for this reef (bands ×0.85, plankton eaten ×0.75, lure +1, scouts ×1.25 and
murmurs fade ×0.5, Rasp sand ×1.3). The verb is committing: a costly pause for something lasting,
best timed before going away. When no ruin is in reach (the next too high, or all five found) the
shoals can **roam**: a quarter of them (at least 4) for 10 minutes, murmurs and a 35% shard chance,
repeatable. Halfway to a ruin the shoals meet something (seeded per trip; a reef's first trip always
finds the passage), with two ways, the second the default if unanswered: the passage (press on: trip
×1.5, a sure shard / home as planned), a sleeping squid (wait: ×1.3, hear ×1.5 / slip past: ×0.75, hear
×0.5), lost lights (follow: ×1.3, +2 shoals / carry on), a sponge garden (gather: ×1.2, a minute of
calcite / leave it), a fast current (ride: ×0.7 / around), a field of larvae (feed: ×1.2, a shard chance / pass). When the sister reef is near your depth the shoals can **visit** it instead (once per zone,
8 minutes, +1 lineage). Once the whale has come down (a moment) they can feed at the **whale fall** once
(10 minutes, 5 minutes of calcite). Shoals come back **seasoned**: feeding and light ×(1 + 0.02 per trip, at most 20 trips).
Shown in the world as a stream of shoal lights leaving for the
edge of the water and hanging far off as a flicker.

**Residents** (from 3000 m): the reef has homes for small animals that live with corals: one on
the shelf, a second at 3400 m, a third at 3800 m. Six ask (guard crabs: Rasp eat ×0.5; pistol shrimp:
silt swept +0.04/s; sea cucumbers: sand ×1.4; from 3400 m coral gobies: calcite ×1.15 and feather
dusters: plankton ×1.3; from 3800 m farmer damselfish: bloom ×1.3). Taking one in or letting it go
is free, so the verb is choosing a loadout that fits the zone (silt and Rasp on the shelf, bloom in
the light). Pairings that live together add a bonus (guard crabs + gobies: Rasp eat ×0.8; pistol shrimp + sea
cucumbers: sand ×1.2; feather dusters + damselfish: bloom ×1.15). They live visibly on the coral and in the journal ("Residents"), each tappable.

**Thorn stars** (Twilight Shelf and Sunlit Crown, while watching): now and then a coral-eating
starfish climbs the reef for 70 s; tap it off for 2 minutes of the zone's currency. Guard crabs at
home drive it off themselves at the last moment, for half (real biology: Trapezia crabs defend
corals from crown-of-thorns starfish).
On the Silt Floor (from 20 m) a drill snail bores into the coral; at the Breach a gull goes for the ripening spawn. In the Midnight Water the intruder is a dragonfish stalking the feeding shoals; a finished lantern
spire's lamps dazzle it away at the last moment, for half.

**The shoals' signal** (Midnight Water to the Sunlit Crown, while watching): every six minutes, for 75 s,
the lanternfish flash a pattern on four lamps; repeat it for 20 s of production per light. Patterns
grow from 3 to 8 lights as you answer right. One try per slot. A small memory game, never needed.

**A new day**: the first visit of each calendar day brings Ossel's morning gift (10 minutes of the zone's
currency and a shard roll). The day number comes from the client; the sim stays clock-free.

**Shells** (Sunlit Crown, while watching): every four minutes one washes up on the sand for 40 s; tap to keep
it. Eight kinds, kept by the line, +1% calcite each (+5% for all eight); a shelf in the Bands tab.

**Welcome back**: after an hour or more away, the away summary offers one of two gifts: a haul of
stone (5% of each second away's calcite production, at most 8 h of it) or a search of the silt
(three shard chances). A small choice on return; absence costs nothing and earns a little.

**The glimmerseed strain** (Act I's choice, at 15 m): blue (glow ×1.3), gold (polyps ×1.15) or violet
(scouts ×1.4 later); kept for the run and seen in the colour of the symbiont specks.

**The sport** (at 3000 m): the glimmerseed strain kept since 15 m throws a mutation, one of two per
strain: blue → ice (glow ×1.25) or lamp (lure +1); gold → amber (polyps feed ×1.12) or sun gold
(bloom ×1.2); violet → ultraviolet (murmurs ×1.3) or dusk (Readings and truce words ×0.8). The
symbiont specks take the sport's colour.

**The grain of the stone** (all run): every tenth band laid waits for its grain: dense (calcite
dissolves ×0.98 each), quick (the reef rises ×1.05 as fast after a band, each) or bright (glow
×1.04 each). Unset grains wait without blocking; the choices stack over the run, so the reef's
build leans one way. On the Silt Floor the grain bands show as coloured rings in the stone.

**Flaring the lure** (from 20 m, while watching): spend half the glow held for a burst of up to 30 s of
calcite (by how full the glow was), once a minute (button in the prep row, or L). Glow that sits full has
an active use.

**Sweep combos**: sweeps within 1.2 s of the last build a combo, +10% each up to ×2; a pause resets it.
A sweep pays a quarter second of the reef's calcite (plus 1), so it keeps its weight all game: tapping about once a second with the combo full adds a quarter to a half to the income (the greedy bot sweeping every second ends at 7h08, never sweeping 8h28; ECONOMY.md). Flurries (×3) are when it matters most.

**Flurries** (Silt Floor): every four minutes (the first at 2½ minutes, after the opening card) the Long Silt falls thick for 30 s; sweeps catch ×3 then
(on the sim clock, so the snow and the pay agree; the Soon line counts down to the next).

**Fanning shoals** (a fourth shoal job, on the shelf): each fanner sweeps +0.003 silt/s. Trips take fanners first
and bring them back to fanning.

**Upwellings** (Twilight Shelf, while watching): every eight minutes cold water wells up for a minute on
one side (out toward the open water, or along the shelf); setting the current that way while it lasts
catches it once: 90 s of calcite. The dial gets a reason to move.

**Swells** (the Breach, while watching, before the release): every few minutes a set of five big
swells rolls in; tap the crown (or S) as each crests (±SWELL.slack, 0.5 s) to send spawn up on it: 20 s of spawn per
crest caught. A ring closes on the crown toward each crest; a caught one flashes gold. Act V's waiting
gets a skill to play.

**Ossel’s questions** (at 200, 1500, 3100, 3850 and 3990 m): Ossel asks the reef something (what the silt is
for, whether to tell the spawn all of Thousandfold, what it would keep, what is past the light). No
effect on the numbers: Ossel answers back, the reef's own bands record it, and the ending carries it.

**The sea heals**: each ending the line reaches makes the Long Silt fall ×0.95 on every later reef (up to
six), and the Silt Floor's snow visibly thins: the world itself shows the line's progress.

**The day's sea**: each calendar day has one mild boon, the same for every reef that day (calm: calcite
×1.1, bright: glow ×1.2, rich: plankton ×1.2, sandy: sand ×1.2, clear: bloom ×1.15, a long swell: spawn
×1.1), set on load and shown in the water box. A small reason to look in each day.

**Dreams**: each new calendar day brings one with the morning gift (at most three kept). A dream sleeps
the reef a quarter of an hour forward at once (the exact offline advance) and shows the away summary.

**The rising** (Midnight Water and Twilight Shelf, while watching): for three minutes in every half
hour (half a cycle after the Sunlit's warm water) the deep's small life streams up past the reef.
The feeders can be sent into it once: four minutes of calcite times the share of shoals feeding, so
moving shoals onto feeding just before is the play. An instant haul, not a rate: plankton is a fast
stock, and a rate change would force tiny offline steps at every edge (tried: 2.7 s a month).

**Warm water** (Sunlit Crown): for four minutes in every thirty the shallows run warm. Polyps left
open take in sun ×1.6 for bloom but bleach (bloom fades ×5); closed polyps take half the sun, warm or
not, and never bleach. Open is right while bloom is low (the sun outruns the loss), closing is right
when a large bloom stock is at stake; whatever is set stays set while away. The scene shows an amber
haze, an open reef paling to bone and recovering after, closed polyps pulled in. The **Sun-shy** trait (a habit)
lets an open reef close itself for each spell and open after, away too: the stance only matters outside them.
A **shallow seamount** (hard place) has spells twice as long; growing to 3950 m there earns Sun-hardened (open
polyps bleach half as fast on every reef after). Its own moment: the water will not cool.

Falling feasts (from 42 m, late in the Silt Floor where buying slows): something dead sinks past the reef every few minutes; tap it (or F)
for 90 s of calcite. A reward for watching (principle 6: never needed, never lost offline), and the
"What falls" band made playable.

## Act III — The Twilight Shelf (3000–3800 m)
Entry requires the last Act II Reading (*Inside the wall*): the story turn opens the shelf.

- **Silt** (stock on the reef): the shelf collects the Long Silt sliding downslope.
  `dS/dt = F − (κ_flow·Q + κ_rasp·R)·S`; calcite is multiplied by `1 / (1 + S/S0)` (smothering).
- **The Rasp dial** (verb 1): the player sets how many Rasp grazers to admit, 0..Rmax.
  Each clears silt, grinds dead stone into **sand**, and eats calcite (an extra leak ρ·R).
  Too few: smothered. Too many: they eat the reef's store. The optimum moves as you grow.
- **Sand** (stock): produced by Rasp, settles slowly. Buys **sand bars** (more flow Q, which
  sweeps silt) and **feeding channels** (plankton ×).
- **The truce** (verb 2: choosing): three meetings with the Rasp, each unlocked by learning
  enough of their words (paid in **murmurs**, so scouting stays useful). Each meeting is a
  permanent choice between two terms, with economic and story consequences; the third is
  whether to give Ossel's wall to the Rasp. The choices colour the ending.
- **Grazing grounds** (calcite): raise Rmax.
- **The elder's riddles**: once the truce has begun, the Rasp elder asks six questions about the
  story, each after the band that answers it. Right: +2 lineage; wrong: nothing. Reading pays.
- **The current** (verb 3): a five-step dial. Toward the shelf it sweeps silt (+0.025/s a step) and
  brings less plankton (×0.88 a step); toward the open water it brings plankton (×1.12 a step) and
  sweeps less. The best setting moves with how hard the silt falls.
- **Favours** (once the first meeting is settled): ask the Rasp, paid in sand, dearer each time:
  turn the silt aside (silt swept +0.02/s for good, up to 10), grind a path (+2 shoals, up to 5),
  carry stone up (3 minutes of calcite now). A sand sink with three different returns.

## Act IV — The Sunlit Crown (3800–3980 m)
- **Sunlight** reaches the reef: `sun = base × (1 + (target − 3800)/60)` (rises toward the surface).
- **Bloom** (stock): sugar made by photosynthetic symbionts. `P = sun × symbionts × pigments × dialect`,
  slow fade. Calcite × `1 + √bloom / 50` (it feeds the polyps) — and bloom is also the currency
  for dialects and canopy, so spending it dims the reef for a while. Spend or keep.
- **Pigments** (calcite, max 12): bloom ×1.25 each. **Canopy** (bloom): sunlight ×1.2 each.
- **The verb: becoming.** Three tiers of **dialects** (what kind of reef you will be), three
  options each, one per tier, permanent, each unlocked at a band:
  - Tier 1 *Form*: Branching (bands cost ×0.6) · Massive (calcite dissolves ×0.4) · Plating (sun ×2)
  - Tier 2 *Craft*: Fluorescent (lure +2, glow ×2) · Sweeper tentacles (plankton ×3) ·
    Mucus nets (silt swept ×2, Rasp eat nothing)
  - Tier 3 *Spawn*: Broadcast · Brooding · Fragmenting — each shapes Act V's spawning.
  - Tier 4 *Song* (after *Storm*): Lullaby (bloom fades ×0.7) · Chorus (gifts ×2) · Call (requests ×1.5).
- **Full-moon spawning** (every zone below the Breach): at each full moon, while watching, a card:
  take it back in / feed on it (5 minutes of the zone's currency) or let it drift / add your own
  (+1 lineage, at most 3 per reef). In the Sunlit Crown the other reefs spawn around you (pink
  bundles rising everywhere). Once per moon; instant, so offline is untouched.
- The Form dialect changes the coral's silhouette in the Sunlit scene (tall branches, a domed
  boulder, or stacked tables): the choice is visible.

## Act V — The Breach (3980–4000 m)
- **Spawn** (stock): `P = polyps × rate × ripen × (broadcast ×2) × (1 + sun·symbionts/100)`, slow
  reabsorption. Target 1M (brooding ×0.6). **Ripen the spawn** (calcite) ×1.5 each.
  **Raise a sand cay** (sand, max 6): spawn ×1.1 each; a late sink for the Rasp's sand, drawn as low islands.
  **Sweeten the spawn** (bloom, 2e7 × 3^level, max 6): spawn ×1.1 each, a sink for the bloom that piles up late.
- **The Spawning Moon**: a 20-minute cycle in sim time, full for ±8% of it. The release is a
  player action and needs: the surface (4000 m), spawn ≥ target, and a full moon.
- **What the spawn carries** (the final verb: letting go): choose exactly 3 of the memories the
  run has earned (18 threads: bands and Readings, plus the gate, midden and harbour relics, the whole
  tablet, the squid moment and the sleeping turtle). The ending composes the release, one epilogue paragraph per
  memory, Ossel's closing (kept or let go), and the last line.

**The night sky** (the Breach, before the release): no reef has seen stars, so this one names them
after its own run: Ossel’s Cup (always), the Beak (the Rasp met), the Two Branches (the sister raced),
the Falling Whale, the Sleeper (turtle), the Lamp (lamp hall or the drifting lamp). Pick one in the
sky card and tap its stars in order in the scene; each named adds spawn ×1.04, stays drawn in the
sky, and the ending names them. Tracing is screen-only; only the naming is saved.

**The epilogue garden** (principle 10): after the release, children can be planted in the dawn
shallows (calcite, ×1.6 each, at most 12); each grows around the crown and adds +1 lineage when you
begin again.

Great tides: every third full moon carries four memories instead of three. Releasing at the
first full moon or waiting (up to 40 min) for a great tide is Act V's wait-or-go choice; the size of
the release also sets the lineage for beginning again. Every memory the line has ever carried adds +1% calcite to every reef after,
so carrying different ones across endings pays.

## Systems added in M6 (core loop)
- **Milestones**: polyps (10/25/50/100/150/200) and glimmerseed (10/25/50/100) double their kind;
  named, announced, shown on the reef. Cards show the next one.
- **Honest numbers**: cards show what one more level is worth now (settled), job rows what one more
  shoal is worth, the Rasp dial its two good settings (income vs hold for being away).
- **Falling feasts** (active only), **seagrass meadows** (Act IV sand sink), **great tides**
  (Act V wait-or-go: four memories every third moon).
- **Neighbours**: every creature drawn on screen is tappable: it is named, and most answer in
  their own way (eels duck, octopus inks, lure goes dark, manta rolls, tube worms withdraw...).
  Seen creatures add +2% calcite each, touched ones +1% more; a touch now and then brings a gift
  of the creature's own stock (light from glowing ones, sand from the Rasp); touching eight, and twenty-five, are feats. Trust: the line remembers touches per creature (known at 1, familiar
  at 5, a friend at 15); gifts ×1.5 when familiar, ×2 from a friend; feats for one friend and ten.
  Trust grows at most once a minute per creature (no tapping it up); each new friend of the line
  brings +1 lineage and +2% calcite. One touched creature can be kept close as the line's **companion**
  (☆ in the journal): its gifts ×2, twice as often. The journal keeps a portrait of
  each, cropped from the world the first time it was in full view (an album that is your own); a
  near-black crop (a jelly between pulses) is let go and retaken at a later look, and a creature
  drawn anew since the album was kept is photographed again (art versions, src/client/portraits.ts).

## Prestige — Lesser Spawnings and Lineage
- Available once the reef has reached 150 m (the Midnight Water, band *Eyes in the dark*) and
  until the ending. Releasing a lesser spawning starts a new run on a new seamount.
- **Lineage** gained: `floor(4·√(height/60))` (×1.5 with the Fragmenting dialect): 4 at 60 m,
  ~28 at 3000 m, 32 at the surface. Diminishing returns reward deeper runs a little.
- Kept across runs (`state.meta`): lineage, traits, number of spawnings, every story id ever
  seen (so bands do not re-pop as cards on reruns), best height.
- Reset: everything else (stocks, upgrades, shoals, readings, truce, dialects, height).
- **Traits** (lineage), shown in two groups:
  - *Gifts* (numbers): calcite ×1.5/level · polyp cost ×0.85 · start with 5 bands/level ·
    start with 3 shoals/level · glow ×1.5 · Readings cost ×0.5 · reef settles ×2 faster.
  - *Ways* (routes): Lamps in the snow (shoals in Act I) · Rasp kin (sand economy in Act II) ·
    Glass gardeners (a no-Rasp route) · Old habits (auto-buys cheap polyps/glimmerseed while
    watching) · Tide-reader (every full moon a great tide) · Shared table (missed feasts
    are eaten for you at half: tapping becomes optional) · Shoal sense (idle shoals placed and feed/light
    rebalanced every 30 s while watching) · Rasp sense (dial at best-for-income while watching, best-for-hold
    when the page is left). · Old maps (trips take half as long) · Open house (one more resident home) ·
    Water-wise (every water's discount 0.1 deeper) · Thorn-wise
    (intruders driven off for half with no crabs or lamps) · Moon-born (full-moon lineage cap 5).
- **Seamounts**: each spawning chooses where to settle: plain, warm (active-friendly), cold
  (idle-friendly), crowded (fast story, more silt). See ECONOMY.md for numbers.
- **Nurseries**: from 100 polyps, *Tend a daughter colony* (calcite ×4 each, one per daughter at the
  foot, at most 10) adds +1 lineage to the next spawning: a late calcite sink into prestige, drawn as
  grown, lit colonies.
- **Hard seamounts (trials)**, offered from the second reef on: hungry (polyps feed ×0.5, goal
  3000 m), silent (no Readings, goal 2800 m), lonely (at most 8 shoals, goal 3000 m), buried (silt
  ×3, goal 3600 m), dark (glow ×0.3, goal 2500 m; teaches glow ×1.25). Reaching the goal there (offline too; the sim records it) teaches the whole line
  a lasting gift: polyps ×1.1, scouts ×1.3, shoals cost ×0.8, silt ×0.8. Prestige that changes how
  a run is played, by choice.
- **Heirlooms**: a lesser spawning may carry one relic this reef found; its effect is in play on the
  next reef from the start (its ruin is still there to search, for the story).
- **Boons**: every reef after the first is offered three of seven boons (seeded by its seamount; a
  first reef earns the offer by keeping ten of Ossel's requests) and
  keeps one for that reef (rich currents, early lamps, quick stone, a warm heart, deep roots, a
  welcoming sea, near ruins): each run starts a little differently.
- **Lineage bands**: each spawning unlocks one short story of your descendants settling.
- Target: one spawning at ~3000 m finishes the game sooner than none; a bot test checks it.
- After the ending, **Begin again** is a spawning with a lineage bonus of 10 + 4 per doubling of
  spawn released over its target. Endings and memories carried are remembered across runs.

## Later systems (keeping, letting go, and luck)
- **Old stone**: grey knobs gather on the branch tips toward six (closed form, away too). Tapping one
  lets it go for a burst; every fourth held a memory of this reef. The theme in a verb: the reef that
  keeps everything bows to the floor. Built on by a trait (Light-boned), a hard seamount (heavy), a
  Reading (The kept stone), an Ossel mistake, a riddle and a memory. At the release all of it falls.
- **Lucky neighbours**: short spans in which one creature gives five times as much, at once.
  Rewards looking at the world rather than the panel.
- **Guard**: a fifth shoal job in the light; four guards drive intruders off for half, at the cost
  of feeding.
- **Vows**: after the first ending, harder ways to grow a reef, paid at its own ending.
- **Wishes**: a choice of three small gifts while stars fall at the Breach (sim-time showers).
- **The garden's kinds**: each child planted is a small, chosen gift to the next reef.
- **Seeing ahead**: the almanac strip (the next twenty minutes) and the time-lapse (T).

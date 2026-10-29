// A short guide to how the reef grows, for the Reef tab.

export const GUIDE: readonly [string, string][] = [
  ['Calcite', 'Your polyps make it. Tap the water to sweep for more; buy polyps to make it faster.'],
  ['Bands', 'Each band of stone raises the reef. Rising is the whole journey: four thousand metres to the surface.'],
  ['Holding', 'Stores fill toward what the reef can hold, then stop. A denser lattice holds more while you are away.'],
  ['Neighbours', 'Tap a creature to learn its name; some of them answer a touch. Each one seen feeds the reef a little, and a little more once touched. Now and then one is lucky (golden sparks): touch it then.'],
  ['Zones', 'Each zone of the sea brings a new way to grow: shoals, the Rasp, sunlight, the Spawning Moon.'],
  ['The water', 'Every ten minutes the water turns, and each kind makes one kind of growing cheaper. The line above the shoals says what comes next: buy now, or wait for the right water.'],
  ['Ossel asks', 'One small thing at a time. Do it while you watch, and the reef gets a burst of what it lives by.'],
  ['Moments', 'Now and then something happens to the reef, and you choose how to meet it. Each choice lasts for this reef.'],
  ['Expeditions', 'From the Midnight Water, shoals can go to Thousandfold’s ruins. They stop their work while away and come back with a relic; when no ruin is in reach, they can roam.'],
  ['Shards', 'Sweeping, catching what falls, touching neighbours and the shoals’ journeys sometimes turn up a shard of an old tablet. The whole line keeps them.'],
  ['Residents', 'From the Twilight Shelf, small animals ask for a home in your branches. Homes are few: choose who suits the water you are in.'],
  ['Great works', 'One large thing to build in each middle zone, in stages, each paid in two kinds at once.'],
  ['Intruders', 'Something comes to eat the reef in every zone: a snail, a dragonfish, a thorn star, a gull. Tap it away for a burst.'],
  ['The signal', 'The shoals sometimes flash a pattern of lights. Watch, then press the same lamps (or keys 7–0).'],
  ['The elder', 'Once the truce begins, the Rasp elder asks about what the bands told. Answer rightly for lineage.'],
  ['Shells', 'In the Sunlit Crown a shell washes up now and then. Tap it to keep it on the line’s shelf.'],
  ['Choices', 'The glimmerseed strain at 15 m and its sport at 3000 m, the grain of every tenth band, the current on the shelf, four tiers of dialects: each shapes the reef.'],
  ['Rhythms', 'Each zone has something to catch while you watch: flurries (sweep), the rising (send the feeders in), upwellings (turn the current), warm water (open or close), swells (tap on the crest). The water box says when.'],
  ['Old stone', 'Stone kept too long grows grey and heavy on the branch tips, up to six knobs, away or not. Tap one to break it off for a burst.'],
  ['Glow', 'Glow lures more calcite, calls shoals and weaves lamp-nets. When it sits full, flare it (L) for a burst of calcite.'],
  ['Shoals', 'Feed, light, scout; on the shelf fan the silt; in the light, four on guard drive intruders off by themselves. Trips take shoals away and bring them back seasoned.'],
  ['Ossel', 'Ossel asks seven questions on the way up and remembers your answers to the end. Ossel is also wrong about some things.'],
  ['The sky', 'At the Breach the reef names the stars after its own life: pick a figure and tap its stars in order.'],
  ['Each day', 'A new day brings a gift, a dream (sleep a quarter hour forward) and the day’s sea, a mild boon.'],
  ['After the end', 'Plant children in the garden at dawn, then begin again. The chronicle remembers every ending.'],
  ['Spawning early', 'A lesser spawning starts again on a new seamount with lineage to spend. Hard seamounts, once offered, teach the whole line something if you grow far enough on them.'],
  ['The goal', 'Reach the surface and release your spawn under the full moon, carrying what you choose to remember.'],
];

/** What each stock is, shown when it is tapped (or hovered) in the panel. */
export const STOCK_NOTES: Record<string, string> = {
  calcite: 'Stone, eaten and laid down. Everything is bought with it. The deep water dissolves what you hold, so stores fill toward a limit.',
  glow: 'Light from the glimmerseed in your tissue. It lures food in, and the lanternfish swim its patterns.',
  plankton: 'Food the feeding shoals herd to the reef. It multiplies your calcite while it lasts.',
  murmurs: 'What the scouting shoals hear in the buried bands. Spend it on readings of Thousandfold.',
  silt: 'The Long Silt settling on your polyps. It smothers them; the Rasp and the currents clear it.',
  sand: 'What the Rasp leave of the stone they eat. Sand bars, channels and meadows are built from it.',
  bloom: 'Sugar from the sunlight your symbionts catch. It multiplies your calcite; dialects and canopy cost it.',
  spawn: 'Eggs and sperm in bundles, ripening for the Spawning Moon. Release it at the surface under a full moon.',
};

/** Shown once (per browser line) after an update with new things to find; `id` changes per update. */
export const NEWS = {
  id: 'news:2026-10-29c',
  kicker: 'New in the sea',
  title: 'Old stone, and lucky neighbours',
  text: 'Grey knobs of old stone now gather on the reef’s tips, even while you are away: tap one to let it go, and now and ' +
    'then one held a memory. Some neighbours are lucky for a while (golden sparks): touch one then. The Midnight Water ' +
    'sometimes turns to a milky sea, and sweeps gather light. In the light, shoals can stand guard; the shelf has grottoes ' +
    'for more residents (a boxer crab among them); a fourth Form, Pillars; a heavy seamount; storms far off at the Breach; ' +
    'new moments, Readings, trips and creatures. The Reef tab’s guide has a line on each.',
} as const;

/** The first time the line enters a zone: what is new there, in a few lines (zones 2–5). */
export const ZONE_GUIDE: Record<number, { title: string; text: string }> = {
  2: { title: 'New in the Midnight Water',
    text: 'Shoals of lanternfish come when you pulse your glow: set them to feed, to light, or to scout the buried bands. ' +
      'Send them to Thousandfold’s ruins for relics. Every half hour the deep rises past you: put shoals on feeding and send them in. ' +
      'Answer their light signals, and watch for what hunts them.' },
  3: { title: 'New on the Twilight Shelf',
    text: 'Silt falls here and smothers the polyps. Let the Rasp graze (they grind silt and stone to sand), turn the current, ' +
      'set shoals to fan. Meet the Rasp and make terms; their elder asks riddles. Turn the current toward an upwelling when one comes. ' +
      'Small animals ask to live in your branches, and your glimmerseed throw a sport.' },
  4: { title: 'New in the Sunlit Crown',
    text: 'Sunlight feeds your symbionts: bloom, a new wealth, buys pigments, canopy and dialects, the shape your reef will be. ' +
      'Every half hour the water runs warm: stay open for more sun, or close up before you bleach. Shells wash up on the sand.' },
  5: { title: 'New at the Breach',
    text: 'Air. Ripen the spawn and wait for the full moon; a great tide carries four memories. Ride the swells as they crest, ' +
      'name the stars, and when the moon is full, let go.' },
};

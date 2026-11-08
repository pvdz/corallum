// Sound in a real browser (autoplay allowed, so no gesture is needed): every cue in every zone, the
// song and the rain, each scheduling something and none throwing. The other browser tests never turn
// sound on, so a fault here would otherwise go unseen. Run: node --no-warnings test/e2e/sound.ts

import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { startServer } from '../../src/server/server.ts';
import type { Cue } from '../../src/game/audio/audio.ts';

const pw = createRequire(process.env.PLAYWRIGHT_GLOBAL_ROOT ?? '/usr/lib/node_modules/')('playwright') as typeof import('playwright');
const CUES = ['buy', 'sweep', 'story', 'choice', 'release', 'spawning', 'whisper', 'feast', 'whale', 'zone', 'touch', 'shimmer', 'crunch',
  'dolphin', 'water', 'depart', 'shard', 'intruder', 'moment', 'gull', 'rising', 'heat', 'upwell', 'swell', 'thunder'] as const satisfies readonly Cue[];
// Every cue the game has, no more and no less: a new cue fails the typecheck until it is listed here.
const everyCue: [Exclude<Cue, (typeof CUES)[number]>] extends [never] ? true : never = true;
void everyCue;

const server = await startServer(0);
const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failed = false;
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/?fresh`);
  const silent = await page.evaluate(async (cues) => {
    // Count the sources each cue starts.
    let n = 0;
    for (const k of ['createOscillator', 'createBufferSource'] as const) {
      const orig = AudioContext.prototype[k] as () => AudioNode;
      (AudioContext.prototype as unknown as Record<string, () => AudioNode>)[k] = function (this: AudioContext) { n++; return orig.call(this); };
    }
    // The module as the page's server serves it (a path the typechecker cannot follow).
    const path = '/src/game/audio/audio.ts';
    const { createAudio } = await import(path) as typeof import('../../src/game/audio/audio.ts');
    const a = createAudio();
    a.setEnabled(true);
    a.wake(true);
    await new Promise((r) => setTimeout(r, 300));
    const out: string[] = [];
    for (const zone of [1, 2, 3, 4, 5]) {
      a.setZone(zone);
      a.setRain(zone === 5);
      for (const c of cues) {
        // Only the cue's own work is counted: its timers are caught instead of scheduled and run
        // straight after, all in one synchronous stretch the background music (intervals) cannot enter.
        const timers: (() => void)[] = [];
        const realTimeout = window.setTimeout;
        (window as unknown as { setTimeout: (f: () => void) => number }).setTimeout = (f) => { timers.push(f); return 0; };
        const before = n;
        try {
          a.cue(c as Parameters<typeof a.cue>[0]);
        } finally {
          window.setTimeout = realTimeout;
        }
        for (const f of timers) f();
        if (n === before) out.push(`${c} in zone ${zone}`);
        await new Promise((r) => setTimeout(r, 30));
      }
    }
    a.setSong('abc');
    await new Promise((r) => setTimeout(r, 1500));
    a.setEnabled(false);
    return out;
  }, CUES as unknown as string[]);
  if (silent.length) { failed = true; console.log(`FAIL silent cues: ${silent.join(', ')}`); }
  if (errors.length) { failed = true; console.log(`FAIL errors:\n${errors.join('\n')}`); }
  if (!failed) console.log(`ok   ${CUES.length} cues × 5 zones, the song and the rain: each sounds, no errors`);
} finally {
  await browser.close();
  server.close();
}
if (failed) process.exitCode = 1;

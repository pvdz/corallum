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
  // The Music and Sounds sliders: the melody and the release's music reach the music bus, every
  // other cue only the sounds bus (a cue on the music bus would go quiet with the music turned down).
  const misrouted = await page.evaluate(async (cues) => {
    const edges = new Map<AudioNode, AudioNode[]>();
    const sources: AudioNode[] = [];
    const connect = AudioNode.prototype.connect as (this: AudioNode, d: AudioNode) => AudioNode;
    (AudioNode.prototype as unknown as { connect: unknown }).connect = function (this: AudioNode, d: AudioNode | AudioParam, ...rest: number[]) {
      if (d instanceof AudioNode) edges.set(this, [...(edges.get(this) ?? []), d]);
      return (connect as (...a: unknown[]) => AudioNode).call(this, d, ...rest);
    };
    for (const k of ['createOscillator', 'createBufferSource'] as const) {
      const orig = AudioContext.prototype[k] as () => AudioNode;
      (AudioContext.prototype as unknown as Record<string, () => AudioNode>)[k] = function (this: AudioContext) { const o = orig.call(this); sources.push(o); return o; };
    }
    const path = '/src/game/audio/audio.ts';
    const { createAudio } = await import(path) as typeof import('../../src/game/audio/audio.ts');
    const a = createAudio();
    // The buses are told apart by their gain, set before the sound starts.
    a.setMusic(0.37);
    a.setVolume(0.61);
    a.setEnabled(true);
    a.wake(true);
    const reach = (src: AudioNode): Set<string> => {
      const found = new Set<string>(), seen = new Set<AudioNode>(), todo = [src];
      while (todo.length) {
        const nd = todo.pop()!;
        if (seen.has(nd)) continue;
        seen.add(nd);
        if (nd instanceof GainNode && Math.abs(nd.gain.value - 0.37) < 1e-6) found.add('music');
        else if (nd instanceof GainNode && Math.abs(nd.gain.value - 0.61) < 1e-6) found.add('sounds');
        else todo.push(...(edges.get(nd) ?? []));
      }
      return found;
    };
    const wrong: string[] = [];
    // The melody: wait for a note of it with no cue (the shallows' theme, quickest and fewest rests).
    a.setZone(4);
    sources.length = 0;
    for (let i = 0; i < 30 && !sources.some((s) => reach(s).has('music')); i++) await new Promise((r) => setTimeout(r, 500));
    if (!sources.some((s) => reach(s).has('music'))) wrong.push('no melody on the music bus');
    for (const c of cues) {
      sources.length = 0;
      const timers: (() => void)[] = [];
      const realTimeout = window.setTimeout;
      (window as unknown as { setTimeout: (f: () => void) => number }).setTimeout = (f) => { timers.push(f); return 0; };
      try { a.cue(c as Parameters<typeof a.cue>[0]); } finally { window.setTimeout = realTimeout; }
      for (const f of timers) f();
      const buses = new Set(sources.flatMap((s) => [...reach(s)]));
      const want = c === 'release' ? 'music,sounds' : 'sounds';
      if ([...buses].sort().join(',') !== want) wrong.push(`${c}: ${[...buses].sort().join(',') || 'nowhere'}`);
    }
    a.setEnabled(false);
    return wrong;
  }, CUES as unknown as string[]);
  if (misrouted.length) { failed = true; console.log(`FAIL music/sounds routing: ${misrouted.join('; ')}`); }
  else console.log('ok   the melody and the release play on the music bus, every other cue on the sounds bus');
  if (silent.length) { failed = true; console.log(`FAIL silent cues: ${silent.join(', ')}`); }
  if (errors.length) { failed = true; console.log(`FAIL errors:\n${errors.join('\n')}`); }
  if (!failed) console.log(`ok   ${CUES.length} cues × 5 zones, the song and the rain: each sounds, no errors`);
} finally {
  await browser.close();
  server.close();
}
if (failed) process.exitCode = 1;

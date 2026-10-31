// Procedural sound: a zone ambience and small sounds for actions. Nothing is loaded; every
// sound is synthesised with WebAudio. Off until the player turns it on (and browsers need a
// gesture before audio can start anyway).

export type Zone = 1 | 2 | 3 | 4 | 5;
export type Cue = 'buy' | 'sweep' | 'story' | 'choice' | 'release' | 'spawning' | 'whisper' | 'feast' | 'whale' | 'zone' | 'touch' | 'shimmer' | 'crunch' | 'dolphin' | 'water' | 'depart' | 'shard' | 'intruder' | 'moment' | 'gull' | 'rising' | 'heat' | 'upwell' | 'swell' | 'thunder';

/** Per zone: root frequency of the pad, pad brightness, and how much surf noise. */
const ZONES: Record<Zone, { root: number; bright: number; surf: number; notes: number[] }> = {
  1: { root: 55, bright: 300, surf: 0.02, notes: [0, 7, 12, 15] },
  2: { root: 61.74, bright: 450, surf: 0.015, notes: [0, 7, 10, 14] },
  3: { root: 73.42, bright: 800, surf: 0.05, notes: [0, 5, 9, 12] },
  4: { root: 82.41, bright: 1500, surf: 0.09, notes: [0, 4, 7, 11] },
  5: { root: 65.41, bright: 1000, surf: 0.14, notes: [0, 7, 12, 16] },
};

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

/**
 * Per zone, a slow melody over the pad: a scale (semitones over the root), the octave it sits
 * in, seconds between notes, and how often a beat is left silent. Deep zones are sparse and
 * low; the sunlit ones brighter and closer together.
 */
const THEMES: Record<Zone, { scale: number[]; octave: number; beat: number; rest: number; length: number }> = {
  1: { scale: [0, 3, 7, 10, 12, 15], octave: 4, beat: 3.2, rest: 0.55, length: 5 },
  2: { scale: [0, 2, 3, 7, 10, 12, 14], octave: 4, beat: 2.6, rest: 0.45, length: 4.5 },
  3: { scale: [0, 2, 5, 7, 9, 12, 14], octave: 4, beat: 2.2, rest: 0.4, length: 4 },
  4: { scale: [0, 2, 4, 7, 9, 11, 12, 16], octave: 8, beat: 1.8, rest: 0.35, length: 3.5 },
  5: { scale: [0, 4, 7, 9, 12, 16, 19], octave: 4, beat: 2.4, rest: 0.4, length: 5 },
};

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let pad: { oscs: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null;
  let surf: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  let zone: Zone = 1;
  let enabled = false;
  let volume = 0.9;
  let noteIndex = 0;
  // The melody: a wandering walk over the zone's scale, scheduled a little ahead of time.
  let nextBeat = 0;
  let step = 2;

  function ensure(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    // A gentle room so single notes do not sound dry.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.37;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    master.connect(ctx.destination);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(ctx.destination);
    master.connect(delay);
    startPad(ctx, master);
    startSurf(ctx, master);
    applyZone(true);
    return ctx;
  }

  function startPad(c: AudioContext, out: AudioNode): void {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    const gain = c.createGain();
    gain.gain.value = 0.05;
    filter.connect(gain).connect(out);
    const oscs = [0, 1, 2, 3].map((i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.detune.value = (i - 1.5) * 4;
      o.connect(filter);
      o.start();
      return o;
    });
    // Slow breathing on the pad's brightness.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    pad = { oscs, filter, gain };
  }

  function startSurf(c: AudioContext, out: AudioNode): void {
    const len = c.sampleRate * 3;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    // Brown-ish noise: integrated white noise, kept centred.
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995;
      data[i] = last * 3;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = c.createGain();
    gain.gain.value = 0;
    // Waves: a slow swell on the noise.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.5;
    const swell = c.createGain();
    swell.gain.value = 0.5;
    lfo.connect(lfoGain).connect(swell.gain);
    lfo.start();
    src.connect(filter).connect(swell).connect(gain).connect(out);
    src.start();
    surf = { gain, filter };
  }

  function applyZone(now = false): void {
    if (!ctx || !pad || !surf) return;
    const z = ZONES[zone];
    const t = ctx.currentTime;
    const ramp = now ? 0.05 : 6;
    pad.oscs.forEach((o, i) => {
      const f = z.root * 2 ** (z.notes[i]! / 12);
      o.frequency.setTargetAtTime(f, t, ramp / 3);
    });
    pad.filter.frequency.setTargetAtTime(z.bright, t, ramp / 3);
    surf.gain.gain.setTargetAtTime(z.surf, t, ramp / 3);
    surf.filter.frequency.setTargetAtTime(300 + z.surf * 4000, t, ramp / 3);
  }

  function scheduleMelody(): void {
    if (!ctx || !enabled) return;
    const th = THEMES[zone];
    if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.5;
    while (nextBeat < ctx.currentTime + 1.5) {
      if (Math.random() > th.rest) {
        // Mostly small steps, now and then a leap; phrases drift back toward the root.
        const move = Math.random() < 0.8 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -3 : 3);
        step = Math.max(0, Math.min(th.scale.length - 1, step + move));
        if (Math.random() < 0.15) step = 0;
        const f = ZONES[zone].root * th.octave * 2 ** (th.scale[step]! / 12);
        bell(f, 0.035, th.length * (song === 'lullaby' ? 1.6 : 1), nextBeat);
        // The reef's Song in the shallows: a chorus doubles each note a third above; a call answers
        // a phrase now and then with the root, high and clear.
        if (zone >= 4 && song === 'chorus') bell(f * 2 ** (4 / 12), 0.018, th.length, nextBeat + 0.03);
        if (zone >= 4 && song === 'call' && step === 0) bell(ZONES[zone].root * th.octave * 2, 0.025, th.length * 1.4, nextBeat + th.beat * 0.5);
      }
      nextBeat += th.beat * (Math.random() < 0.2 ? 1.5 : 1) * (zone >= 4 && song === 'lullaby' ? 1.4 : 1);
    }
  }
  setInterval(scheduleMelody, 500);

  // The Sunlit Crown crackles: snapping shrimp, thousands of tiny clicks, quiet under everything.
  let clickBuf: AudioBuffer | null = null;
  /** The reef's Song dialect, which colours the melody in the shallows. */
  let song = '';
  /** Rain on the water (set by the game while a shower falls at the Breach). */
  let raining = false;
  function crackle(): void {
    if (!ctx || !master || !enabled || (zone !== 4 && !(zone === 5 && raining))) return;
    if (!clickBuf) {
      const len = Math.floor(ctx.sampleRate * 0.004);
      clickBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = clickBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const src = ctx.createBufferSource();
      src.buffer = clickBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      // Rain is softer and lower than the shrimp: drops patting the surface.
      f.frequency.value = raining && zone === 5 ? 900 + Math.random() * 1200 : 2500 + Math.random() * 3000;
      const g = ctx.createGain();
      g.gain.value = raining && zone === 5 ? 0.01 + Math.random() * 0.015 : 0.015 + Math.random() * 0.025;
      src.connect(f).connect(g).connect(master);
      src.start(t + Math.random() * 0.1);
    }
  }
  setInterval(crackle, 100);

  /** Now and then a zone's own small sound: fish grunts on the shelf, a vent's rumble on the floor. */
  function zoneCall(): void {
    if (!ctx || !master || !enabled) return;
    if (zone === 3 && Math.random() < 0.35) {
      // Two or three low grunts, a fish talking to its neighbours.
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) glide(110 + Math.random() * 30, 80, 0.12, i * 0.22);
    } else if (zone === 1 && Math.random() < 0.3) {
      glide(48, 38, 2.2, 0);
    }
  }
  setInterval(zoneCall, 9000);

  /** A soft bell: a sine and its octave with a quick attack and long tail. */
  function bell(freq: number, gain: number, length = 1.6, at = 0): void {
    if (!ctx || !master || !enabled) return;
    const t = Math.max(at, ctx.currentTime);
    for (const [mult, g] of [[1, 1], [2, 0.3], [3.01, 0.12]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = freq * mult;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(gain * g, t + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, t + length);
      o.connect(e).connect(master);
      o.start(t);
      o.stop(t + length + 0.1);
    }
  }

  /** A long sliding sine with vibrato: whale song, far off. */
  function glide(from: number, to: number, length: number, delay: number): void {
    if (!ctx || !master || !enabled) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + length);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 4;
    vib.connect(vibGain).connect(o.frequency);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.05, t + length * 0.3);
    e.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(e).connect(master);
    o.start(t);
    vib.start(t);
    o.stop(t + length + 0.1);
    vib.stop(t + length + 0.1);
  }

  /** A short gritty crunch: band-passed white noise with a fast decay (a beak on stone). */
  function crunch(): void {
    if (!ctx || !master || !enabled) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2 * (i % 300 < 150 ? 1 : 0.4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 1.2;
    const e = ctx.createGain();
    e.gain.value = 0.12;
    src.connect(f).connect(e).connect(master);
    src.start(t);
  }

  /** Far thunder: a long low rumble of noise, rolling louder and away. */
  function thunder(): void {
    if (!ctx || !master || !enabled) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 3.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const u = i / len;
      // Brown-ish noise (each sample leans on the last), in rolls that swell and fade.
      last = 0.985 * last + 0.15 * (Math.random() * 2 - 1);
      d[i] = last * Math.min(1, u * 8) * (1 - u) ** 1.5 * (0.6 + 0.4 * Math.sin(u * 23));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const e = ctx.createGain();
    e.gain.value = 0.5;
    src.connect(f).connect(e).connect(master);
    src.start(t);
  }

  function bubble(): void {
    if (!ctx || !master || !enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(380 + Math.random() * 160, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.09);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(e).connect(master);
    o.start(t);
    o.stop(t + 0.2);
  }

  return {
    get enabled() {
      return enabled;
    },
    /** Turn sound on or off. Must be called from a user gesture the first time. */
    setEnabled(on: boolean): void {
      enabled = on;
      if (on) {
        const c = ensure();
        void c.resume();
      }
      if (ctx && master) master.gain.setTargetAtTime(on ? volume : 0, ctx.currentTime, 0.4);
      // Off: once faded, the sound stops working altogether (no pad playing at zero volume).
      if (!on && ctx) {
        const c = ctx;
        setTimeout(() => { if (!enabled) void c.suspend(); }, 2000);
      }
    },
    /**
     * The page hidden or shown: hidden, the sound sleeps (no pad playing to a background tab);
     * shown, or on any touch, it wakes. Phones interrupt audio in the background, and only
     * resume it from a gesture, so a touch is enough to bring it back.
     */
    wake(visible: boolean): void {
      if (!ctx) return;
      if (!visible) void ctx.suspend();
      else if (enabled && ctx.state !== 'running') void ctx.resume();
    },
    /** Overall loudness, 0..1. */
    setVolume(v: number): void {
      volume = Math.max(0, Math.min(1, v));
      if (ctx && master && enabled) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
    },
    get volume() {
      return volume;
    },
    setSong(s: string): void {
      song = s;
    },
    setRain(on: boolean): void {
      raining = on;
    },
    setZone(z: number): void {
      const next = Math.max(1, Math.min(5, Math.round(z))) as Zone;
      if (next === zone) return;
      zone = next;
      applyZone();
    },
    cue(c: Cue): void {
      if (!enabled || !ctx || ctx.state !== 'running') return;
      const root = ZONES[zone].root * 8;
      switch (c) {
        case 'buy':
          bell(root * 2 ** (PENTATONIC[noteIndex++ % PENTATONIC.length]! / 12), 0.06, 1.2);
          break;
        case 'sweep':
          bubble();
          break;
        case 'story':
          bell(root / 2, 0.08, 4);
          bell((root / 2) * 1.5, 0.04, 4);
          break;
        case 'zone':
          // A new zone: a slow rising chord, a fifth and an octave over the zone's root.
          for (const [i, n] of [0, 7, 12, 19].entries()) setTimeout(() => bell(root * 2 ** (n / 12) / 2, 0.05, 4), i * 260);
          break;
        case 'whale':
          // A far whale: two long sliding calls with a slow wobble, under everything else.
          glide(190, 120, 3.2, 0);
          glide(150, 210, 2.6, 3.6);
          break;
        case 'feast':
          // A quick rising run: something good came down.
          for (const [i, n] of [0, 4, 7, 12, 16].entries()) setTimeout(() => bell(root * 2 ** (n / 12), 0.05, 1.6), i * 70);
          break;
        case 'shimmer':
          // Something that glows answered: a quick rising sparkle of high bells.
          for (const [i, n] of [0, 7, 12, 19].entries()) setTimeout(() => bell(root * 8 * 2 ** (n / 12), 0.015, 0.7), i * 45);
          break;
        case 'crunch':
          crunch();
          break;
        case 'thunder':
          thunder();
          break;
        case 'water':
          // The water turns: a slow low swell, sliding up and back.
          glide(root / 2, root * 0.75, 2.4, 0);
          break;
        case 'depart':
          // Shoals setting out: a fading run of small lights going away, high to low.
          for (const [i, n] of [19, 16, 12, 7, 4].entries()) setTimeout(() => bell(root * 4 * 2 ** (n / 12), 0.02 * (1 - i * 0.15), 0.9), i * 110);
          break;
        case 'intruder':
          // Something has come to eat: two low notes a tritone apart.
          bell(root / 2, 0.07, 1.6);
          setTimeout(() => bell((root / 2) * 2 ** (6 / 12), 0.06, 1.8), 220);
          break;
        case 'gull':
          // Two falling cries.
          glide(1500, 900, 0.35, 0);
          glide(1400, 850, 0.4, 0.5);
          break;
        case 'rising':
          // The deep coming up: a long low swell climbing an octave, small bells rising out of it.
          glide(root / 4, root / 2, 4, 0);
          for (const [i, n] of [0, 5, 7, 12, 17].entries()) setTimeout(() => bell(root * 2 * 2 ** (n / 12), 0.02, 1.2), 900 + i * 260);
          break;
        case 'upwell':
          // Cold water welling up: a cluster of small bubbles rising, high and quick.
          for (let i = 0; i < 6; i++) setTimeout(() => bubble(), i * 90);
          bell(root * 3, 0.02, 1.5);
          break;
        case 'swell':
          // A set of swells coming: a long low surge, twice.
          glide(root / 4, root / 3, 1.6, 0);
          glide(root / 4, root / 3, 1.6, 2);
          break;
        case 'heat':
          // Warm water: a slow wavering tone, like air shimmering over sand.
          glide(root * 1.5, root * 1.5 * 2 ** (1 / 12), 1.4, 0);
          glide(root * 1.5 * 2 ** (1 / 12), root * 1.5, 1.4, 1.4);
          break;
        case 'moment':
          // A choice is waiting: a soft rising third.
          bell(root, 0.04, 2);
          setTimeout(() => bell(root * 2 ** (4 / 12), 0.04, 2.4), 180);
          break;
        case 'shard':
          // A shard of the tablet: two clear struck notes, a fourth apart, ringing long.
          bell(root * 3, 0.06, 3);
          setTimeout(() => bell(root * 3 * 2 ** (5 / 12), 0.05, 3.5), 160);
          break;
        case 'dolphin':
          // Two quick rising whistles.
          glide(1600, 2600, 0.35, 0);
          glide(1800, 3000, 0.3, 0.45);
          break;
        case 'touch':
          // A creature touched: a quiet high pair, like something answering.
          bell(root * 4, 0.025, 0.6);
          setTimeout(() => bell(root * 4 * 2 ** (4 / 12), 0.02, 0.8), 90);
          break;
        case 'whisper':
          // Ossel: low and close, a falling fourth.
          bell(root / 4, 0.05, 3);
          setTimeout(() => bell((root / 4) * 2 ** (-5 / 12), 0.04, 3.5), 380);
          break;
        case 'choice':
          for (const [i, n] of [0, 7, 12].entries()) setTimeout(() => bell(root * 2 ** (n / 12), 0.06, 2.5), i * 160);
          break;
        case 'release':
        case 'spawning':
          for (let i = 0; i < 10; i++)
            setTimeout(() => bell(root * 2 ** (PENTATONIC[i % PENTATONIC.length]! / 12), 0.05, 3), i * 220);
          break;
      }
    },
  };
}

export type Audio = ReturnType<typeof createAudio>;

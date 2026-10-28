// Procedural sound: a zone ambience and small sounds for actions. Nothing is loaded; every
// sound is synthesised with WebAudio. Off until the player turns it on (and browsers need a
// gesture before audio can start anyway).

export type Zone = 1 | 2 | 3 | 4 | 5;
export type Cue = 'buy' | 'sweep' | 'story' | 'choice' | 'release' | 'spawning' | 'whisper' | 'feast';

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
        bell(f, 0.035, th.length, nextBeat);
      }
      nextBeat += th.beat * (Math.random() < 0.2 ? 1.5 : 1);
    }
  }
  setInterval(scheduleMelody, 500);

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
      if (ctx && master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.4);
    },
    setZone(z: number): void {
      const next = Math.max(1, Math.min(5, Math.round(z))) as Zone;
      if (next === zone) return;
      zone = next;
      applyZone();
    },
    cue(c: Cue): void {
      if (!enabled || !ctx) return;
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
        case 'feast':
          // A quick rising run: something good came down.
          for (const [i, n] of [0, 4, 7, 12, 16].entries()) setTimeout(() => bell(root * 2 ** (n / 12), 0.05, 1.6), i * 70);
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

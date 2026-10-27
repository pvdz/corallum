// The contract between the game loop and a zone scene.

import type { Job } from '../content/act2.ts';

/** What a scene needs from the game state. */
export type ReefView = {
  polyps: number;
  symbionts: number;
  /** Metres of reef up the seamount. */
  height: number;
  /** 0..1, how strongly the glow lure is working. */
  glowLevel: number;
  /** Seconds since the last hand sweep, for the tentacle flick. */
  sinceSweep: number;
  /** Vent chimney tier, 0 = none. */
  vent: number;
  shoals: number;
  jobs: Record<Job, number>;
  /** 0..1 of plankton's effect, for how thick the plankton motes are. */
  planktonLevel: number;
  bands: readonly string[];
};

export type EffectKind = 'polyp' | 'skeleton' | 'symbiont' | 'lure' | 'lattice' | 'vent' | 'shoal';

/** The part of the canvas not covered by the panel, in device pixels. */
export type Focus = { x: number; y: number; w: number; h: number };

export type Scene = {
  resize(w: number, h: number, dpr: number, focus: Focus): void;
  draw(ctx: CanvasRenderingContext2D, t: number, view: ReefView): void;
  /** Play a one-off flourish (a purchase) starting at the next drawn frame. */
  effect(kind: EffectKind): void;
  /** 0 disables the bloom pass (quality tier). */
  bloomStrength: number;
};

/** Queue of running effects, stamped with scene time when first drawn. */
export function createEffects() {
  const running: { kind: EffectKind; start: number }[] = [];
  const pending: EffectKind[] = [];
  return {
    push(kind: EffectKind): void {
      pending.push(kind);
    },
    /** The live effects at time t with their age in seconds (expired ones are dropped). */
    live(t: number, life = 2.2): { kind: EffectKind; age: number; start: number }[] {
      while (pending.length) running.push({ kind: pending.shift()!, start: t });
      for (let i = running.length - 1; i >= 0; i--) {
        const age = t - running[i]!.start;
        if (age < 0 || age > life) running.splice(i, 1);
      }
      return running.map((e) => ({ kind: e.kind, age: t - e.start, start: e.start }));
    },
  };
}

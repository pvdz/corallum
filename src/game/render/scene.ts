// The contract between the game loop and a zone scene.

import type { Job } from '../content/act2.ts';
import type { DialectId } from '../content/act4.ts';
import type { UpgradeId } from '../content/types.ts';

/** What a scene needs from the game state. */
export type ReefView = {
  polyps: number;
  /** Milestones reached by polyps and by glimmerseed (fuller polyps, a brighter reef). */
  polypTier: number;
  glowTier: number;
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
  /** Thousandfold's bands read so far (0..9). */
  readings: number;
  /** 0..1, how smothered the reef is (Act III). */
  siltLevel: number;
  sandBars: number;
  /** Seagrass meadows sown on the sunlit sand. */
  meadows: number;
  /** Which seamount this run grows on (warm and cold tint the deep). */
  seamount: string;
  rasp: number;
  /** The truce choice about Ossel's wall. */
  wall: '' | 'a' | 'b';
  /** How the Rasp behave: trusting (story told as the bands tell it), polite (silt-only terms). */
  raspTrust: boolean;
  raspPolite: boolean;
  /** Glass gardeners (a lineage trait): shrimp graze the silt on the Twilight Shelf. */
  gardeners: boolean;
  /** The Form dialect, which shapes the sunlit reef. */
  form: DialectId | '';
  /** The Craft dialect: fluorescent polyps, mucus nets or sweeper tentacles. */
  craft: DialectId | '';
  /** The Spawn dialect: broadcast clouds, brooded larvae or breaking fragments. */
  spawnMode: DialectId | '';
  /** Act V: the moon (0..1, full at 0.5), spawn ripeness, seconds since the release (−1 before). */
  moonPhase: number;
  moonFull: boolean;
  /** This cycle's full moon is a great tide (four memories). */
  greatMoon: boolean;
  spawnLevel: number;
  sinceBreach: number;
};

/** Purchases (by upgrade id) and story moments a scene may flourish. */
export type EffectKind = UpgradeId | 'reading' | 'truce' | 'breach';

/** The part of the canvas not covered by the panel, in device pixels. */
export type Focus = { x: number; y: number; w: number; h: number };

export type Scene = {
  resize(w: number, h: number, dpr: number, focus: Focus): void;
  draw(ctx: CanvasRenderingContext2D, t: number, view: ReefView): void;
  /** Play a one-off flourish (a purchase) starting at the next drawn frame. */
  effect(kind: EffectKind): void;
  /** 0 disables the bloom pass (quality tier). */
  bloomStrength: number;
  /** Where the reef's crown polyp was last drawn, in device pixels. */
  crownAt: [number, number];
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

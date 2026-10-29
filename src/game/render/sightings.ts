// Scenes report the creatures they actually draw on screen; the game loop collects them for the
// journal (content/creatures.ts). A plain module-level set: rendering stays a pure function of
// (state, t) apart from this note-taking.

import type { CreatureId } from '../content/creatures.ts';

const seen = new Set<CreatureId>();

/** A creature was drawn this frame. */
export function sight(id: CreatureId): void {
  seen.add(id);
}

/** Everything sighted since the last call. */
export function takeSightings(): CreatureId[] {
  const out = [...seen];
  seen.clear();
  return out;
}

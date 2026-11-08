// The sister reef: another reef from Ossel's old wall, settled on the next seamount over when
// yours did. It grows on a fixed schedule (the same for every reef: it reaches the surface in
// eight hours) and shows on the depth gauge. Reaching each zone before it brings the line a
// little lineage; reaching the surface first, more.

export const SISTER = {
  name: 'The sister reef',
  /** [sim seconds, gauge fraction 0..1]: where the sister is, piecewise linear between. */
  schedule: [[0, 0], [1200, 0.2], [7200, 0.4], [16200, 0.6], [23400, 0.8], [28800, 1]] as readonly (readonly [number, number])[],
  /** Heights where the race is judged: each zone's start, and the surface. */
  marks: [60, 3000, 3800, 3980, 4000] as readonly number[],
  /** Lineage for reaching a mark first (the surface pays the last). */
  lineage: [1, 1, 1, 1, 2] as readonly number[],
  ahead: 'Ahead of the sister reef',
  record: 'A new best for the line',
  behind: 'The sister reef got there first',
  title: 'The sister reef: another child of Ossel’s wall, on the next seamount. Reach each zone before it for lineage.',
  /** Lighting the way for her (once you are ahead on the shelf): she climbs this much faster from then on; +lineage at the release. */
  lightSpeed: 1.25, lightLineage: 3,
  lightKicker: 'Your sister is behind you',
  lightText: 'Far off on the next seamount, the sister reef is still climbing through the dark you have left. You could light the way for her.',
  light: { label: 'Light the way for her', effect: 'she climbs\u00a0×1.25 faster from now ·\u00a0+3 lineage at the release' },
  alone: { label: 'Climb on alone', effect: 'the race as it is' },
} as const;

/** The quick cousin: once the line has reached an ending, a faster racer (the surface in five hours) for double lineage. */
export const COUSIN = {
  name: 'The quick cousin',
  schedule: [[0, 0], [600, 0.2], [4200, 0.4], [9600, 0.6], [14400, 0.8], [18000, 1]] as readonly (readonly [number, number])[],
  lineageFactor: 2,
  title: 'The quick cousin: another reef of the old wall, faster than any. Beat it to a zone for double lineage.',
} as const;

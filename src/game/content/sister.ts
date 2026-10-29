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
  behind: 'The sister reef got there first',
  title: 'The sister reef: another child of Ossel’s wall, on the next seamount. Reach each zone before it for lineage.',
} as const;

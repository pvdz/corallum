// The reef's colours: once pigments grow in the Sunlit Crown, the line can choose the palette its
// reefs wear in the light and at the surface. Purely how it looks; kept by the whole line.

export type PaletteId = '' | 'lagoon' | 'violet' | 'ember' | 'moon' | 'elder' | 'surf' | 'milk' | 'slate';

export type Palette = {
  id: PaletteId;
  name: string;
  /** Encrusting colours in the order pigments bring them (seven). */
  pigments: readonly string[];
  /** Polyp stalk and tentacle-tip colours ('' keeps the form's own). */
  polyp: readonly [string, string] | null;
  /** The Breach's moonlit crust (four). */
  night: readonly string[];
  /** A feat that earns it (none: open from the first pigment). */
  feat?: string;
};

export const PALETTE_TEXT = { label: 'Your colours', note: 'How your reefs wear the light, from the first pigment on.', locked: 'Earned by the feat' } as const;

export const PALETTES: readonly Palette[] = [
  { id: '', name: 'Reef', pigments: ['#ff4f8b', '#ffd23f', '#2ec4b6', '#ff6b3d', '#a35cff', '#9ef01a', '#3a86ff'], polyp: null,
    night: ['#8a4a3a', '#5a3c7a', '#8a7a3a', '#2a6a60'] },
  { id: 'lagoon', name: 'Lagoon', pigments: ['#2ec4b6', '#3a86ff', '#9ef01a', '#48cae4', '#90e0ef', '#06d6a0', '#caf0f8'],
    polyp: ['#b8f2e6', 'rgba(200,255,250,0.95)'], night: ['#1f5a6a', '#2a4a7a', '#2a6a50', '#3a7a8a'] },
  { id: 'violet', feat: 'friend', name: 'Violet', pigments: ['#a35cff', '#ff4fd8', '#6a4cff', '#c77dff', '#ff8fab', '#7b2cbf', '#e0aaff'],
    polyp: ['#e0c3ff', 'rgba(255,200,250,0.95)'], night: ['#5a3c7a', '#7a3a6a', '#3a2a7a', '#6a4a8a'] },
  { id: 'ember', feat: 'sister', name: 'Ember', pigments: ['#ff6b3d', '#ffd23f', '#ff4f4f', '#ffa62b', '#e85d04', '#ffba08', '#f48c06'],
    polyp: ['#ffd6a5', 'rgba(255,220,140,0.95)'], night: ['#8a4a3a', '#8a6a2a', '#7a3a2a', '#9a5a3a'] },
  { id: 'moon', feat: 'great-tide', name: 'Pale moon', pigments: ['#f1f1f1', '#ffd6e0', '#e2ece9', '#fde2e4', '#dfe7fd', '#fff1e6', '#cddafd'],
    polyp: ['#ffffff', 'rgba(240,240,255,0.95)'], night: ['#6a6a7a', '#7a7080', '#5a6070', '#8a8a96'] },
  { id: 'elder', feat: 'blessed', name: 'Old beak', pigments: ['#c9b48c', '#8fb3a8', '#d8c3a5', '#7f9c96', '#b9a27a', '#a8c0b8', '#e6dccb'],
    polyp: ['#e8e0cc', 'rgba(240,235,215,0.95)'], night: ['#6a6050', '#4a6058', '#7a6a58', '#58706a'] },
  { id: 'surf', feat: 'every-crest', name: 'Surf', pigments: ['#48cae4', '#ffffff', '#90e0ef', '#00b4d8', '#caf0f8', '#0096c7', '#ade8f4'],
    polyp: ['#e0fbff', 'rgba(230,250,255,0.95)'], night: ['#2a5a7a', '#5a7a8a', '#2a6a8a', '#4a8a9a'] },
  { id: 'milk', feat: 'milky', name: 'Milky sea', pigments: ['#bfe6ff', '#e8f6ff', '#9fd3f5', '#d6efff', '#7fc4ee', '#f4fbff', '#b3dcf7'],
    polyp: ['#f0faff', 'rgba(200,235,255,0.95)'], night: ['#3a5a7a', '#5a7a9a', '#4a6a8a', '#6a8aa8'] },
  { id: 'slate', feat: 'pruned', name: 'Light stone', pigments: ['#d9d4c8', '#9a958c', '#ff8a7a', '#c8c2b4', '#7d7a74', '#ffb8a0', '#ece8df'],
    polyp: ['#f4ece0', 'rgba(255,225,205,0.95)'], night: ['#6a6660', '#5a5650', '#7a6a62', '#8a8478'] },
];

export function palette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

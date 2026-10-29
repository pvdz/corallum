// Portraits for the journal: the first good look at each creature, cropped from the world canvas
// as it was drawn, kept small (JPEG) in localStorage. Kept in memory only for ephemeral sessions
// (?bot, ?t, ?fresh), so debugging never overwrites a player's album.

const KEY = 'corallum.portraits';
const SIZE = 160;

export function createPortraits(persist: boolean) {
  let album: Record<string, string> = {};
  try {
    const raw = persist ? localStorage.getItem(KEY) : null;
    if (raw) album = JSON.parse(raw) as Record<string, string>;
  } catch { album = {}; }
  let count = Object.keys(album).length;

  return {
    get(id: string): string | null {
      return album[id] ?? null;
    },
    has(id: string): boolean {
      return id in album;
    },
    /** How many are kept (the journal re-renders when it changes). */
    get count() {
      return count;
    },
    /**
     * Crop a square of side `side` centred on (x, y) from `src` (device pixels). The caller makes
     * sure it lies inside the visible scene.
     */
    capture(id: string, src: HTMLCanvasElement, x: number, y: number, side: number): void {
      const c = document.createElement('canvas');
      c.width = c.height = SIZE;
      const g = c.getContext('2d')!;
      g.drawImage(src, x - side / 2, y - side / 2, side, side, 0, 0, SIZE, SIZE);
      album[id] = c.toDataURL('image/jpeg', 0.78);
      count++;
      if (!persist) return;
      try { localStorage.setItem(KEY, JSON.stringify(album)); } catch { /* storage full: keep in memory */ }
    },
    /** Forget them all (a full reset). */
    clear(): void {
      album = {};
      count = 0;
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    },
  };
}

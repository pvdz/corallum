// Portraits for the journal: the first good look at each creature, cropped from the world canvas
// as it was drawn, kept small (JPEG) in localStorage. A closer look in zoomed view mode replaces
// it once with a sharper close-up. Kept in memory only for ephemeral sessions (?bot, ?t, ?fresh),
// so debugging never overwrites a player's album.

const KEY = 'corallum.portraits';
const CLOSE_KEY = 'corallum.portraits.close';
const ART_KEY = 'corallum.portraits.art';
const SIZE = 160;
/**
 * Creatures whose look changed, by art version: an album kept from before a version forgets their
 * portraits (and close-ups), so the journal takes them again at the next good look.
 */
export const REDRAWN: readonly (readonly string[])[] = [
  [],
  // 1 (2026-11-07/08: the day's and the night's close-up passes)
  ['anglerfish', 'gulper', 'barreleye', 'hatchetfish', 'grouper', 'nautilus', 'clownfish', 'shore-bird', 'garden-eel', 'whale',
    'tree-worms', 'sea-star', 'hermit-crab', 'squat-lobster', 'sailors', 'mola', 'barracuda', 'pyrosome', 'cuttlefish', 'vent-shrimp',
    'sea-snake', 'octopus', 'giant-clam', 'moray', 'frogfish', 'nudibranch', 'sea-cucumber', 'decorator-crab', 'boxer-crab', 'rasp',
    'rasp-herd', 'oarfish', 'manta', 'eagle-rays', 'trumpetfish', 'turtle', 'damselfish', 'chimaera', 'rattail', 'larvacean',
    'giant-squid', 'breaching', 'sardine-run', 'bait-ball', 'moon-jelly', 'hatchlings', 'flashlight-fish', 'man-o-war', 'vampire-squid',
    'reef-shark', 'petrel', 'dumbo', 'brine-pool', 'smokers'],
  // 2 (2026-11-08: the Silt Floor's first close-up pass, the lantern shark)
  ['tripod-fish', 'sea-lily', 'brittle-star', 'sea-pig', 'lantern-shark', 'sea-firefly', 'pelican', 'siphonophore', 'firefly-squid', 'isopod', 'star-march', 'cleaner-wrasse', 'host-anemone'],
  // 3 (2026-11-08 day: seamount scenery)
  ['smokers', 'sea-pen', 'glass-shrimp', 'mantis-shrimp', 'dugong'],
  // 4 (2026-11-08 evening: residents and the never-redrawn)
  ['guard-crab', 'goby', 'pistol-shrimp', 'whale-shark', 'sixgill', 'dragonfish', 'flying-fish', 'thorn-star', 'drill-snail', 'gull', 'fireworms', 'jelly', 'octopus'],
];
const ART_VERSION = REDRAWN.length - 1;

const DARK_TRIES = 12, DARK_REST = 5000;

/** Whether a crop is nearly black: even its brightest few pixels are dim. */
function tooDark(g: CanvasRenderingContext2D): boolean {
  const d = g.getImageData(0, 0, SIZE, SIZE).data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[Math.max(d[i]!, d[i + 1]!, d[i + 2]!)]!++;
  // The level the brightest 2% of pixels reach.
  let left = Math.ceil(SIZE * SIZE * 0.02);
  for (let v = 255; v >= 0; v--) if ((left -= hist[v]!) <= 0) return v < 40;
  return true;
}

export function createPortraits(persist: boolean) {
  let album: Record<string, string> = {};
  let close = new Set<string>();
  try {
    const raw = persist ? localStorage.getItem(KEY) : null;
    if (raw) album = JSON.parse(raw) as Record<string, string>;
    const rawClose = persist ? localStorage.getItem(CLOSE_KEY) : null;
    if (rawClose) close = new Set(JSON.parse(rawClose) as string[]);
  } catch { album = {}; }
  // Portraits of creatures drawn anew since this album was kept are let go.
  try {
    const art = persist ? Number(localStorage.getItem(ART_KEY) ?? 0) : ART_VERSION;
    if (art < ART_VERSION) {
      for (let v = Math.max(0, art) + 1; v <= ART_VERSION; v++) for (const id of REDRAWN[v]!) { delete album[id]; close.delete(id); }
      localStorage.setItem(KEY, JSON.stringify(album));
      localStorage.setItem(CLOSE_KEY, JSON.stringify([...close]));
      localStorage.setItem(ART_KEY, String(ART_VERSION));
    }
  } catch { /* no storage */ }
  let count = Object.keys(album).length + close.size;

  function store(): void {
    if (!persist) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(album));
      localStorage.setItem(CLOSE_KEY, JSON.stringify([...close]));
    } catch { /* storage full: keep in memory */ }
  }
  // The album is written a little after the last capture: one write for a burst of sightings.
  let storeTimer = 0;
  function storeSoon(): void {
    clearTimeout(storeTimer);
    storeTimer = window.setTimeout(store, 2000);
  }
  if (persist) window.addEventListener('pagehide', () => { if (storeTimer) store(); });
  /** Crops let go for being too dark, by creature, and when the last was (it rests a few seconds,
   *  so others on screen are taken meanwhile). */
  const dark = new Map<string, number>();
  const darkAt = new Map<string, number>();
  /** Crops being encoded (not wanted again meanwhile); a reset bumps the generation and drops them. */
  const pending = new Set<string>();
  let generation = 0;

  return {
    get(id: string): string | null {
      return album[id] ?? null;
    },
    /** Whether a portrait is still wanted: any at all, or (zoomed in) a close-up. */
    wants(id: string, closeUp: boolean): boolean {
      if (pending.has(`${id}|${closeUp}`)) return false;
      if (performance.now() - (darkAt.get(id) ?? -1e9) < DARK_REST) return false;
      return closeUp ? !close.has(id) : !(id in album);
    },
    /** Changes whenever a portrait is taken (the journal redraws). */
    get count() {
      return count;
    },
    /**
     * Crop a square of side `side` centred on (x, y) from `src` (device pixels). The caller makes
     * sure it lies inside the visible scene.
     */
    capture(id: string, src: HTMLCanvasElement, x: number, y: number, side: number, closeUp = false): void {
      // The crop is taken without waiting for the frame (createImageBitmap) and the JPEG is
      // encoded off the frame (toBlob): a first sighting does not stall the frame it happens in.
      const key = `${id}|${closeUp}`, gen = generation;
      pending.add(key);
      const encode = (c: HTMLCanvasElement) => c.toBlob((blob) => {
        if (!blob) { pending.delete(key); return; }
        const read = new FileReader();
        read.onloadend = () => {
          pending.delete(key);
          if (gen !== generation || typeof read.result !== 'string') return;
          album[id] = read.result;
          if (closeUp) close.add(id);
          count++;
          storeSoon();
        };
        read.readAsDataURL(blob);
      }, 'image/jpeg', 0.78);
      // The crop, sized: kept unless caught in a dark moment (a jelly between pulses, a light out),
      // when it is let go and the creature taken at a later look; one that stays this dark is kept
      // after a dozen tries.
      const sx = Math.round(x - side / 2), sy = Math.round(y - side / 2), sw = Math.round(side);
      const keep = (img: CanvasImageSource, ix: number, iy: number, iw: number, ih: number) => {
        const c = document.createElement('canvas');
        c.width = c.height = SIZE;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, ix, iy, iw, ih, 0, 0, SIZE, SIZE);
        if (tooDark(g) && (dark.get(id) ?? 0) < DARK_TRIES) {
          dark.set(id, (dark.get(id) ?? 0) + 1);
          darkAt.set(id, performance.now());
          pending.delete(key);
          return;
        }
        encode(c);
      };
      // Straight from the frame where createImageBitmap is missing or refuses the crop (older Safari):
      // a little dearer for that frame, but the journal still fills.
      const direct = () => { try { keep(src, sx, sy, sw, sw); } catch { pending.delete(key); } };
      if (typeof createImageBitmap !== 'function') { direct(); return; }
      createImageBitmap(src, sx, sy, sw, sw, { resizeWidth: SIZE, resizeHeight: SIZE, resizeQuality: 'medium' })
        .then((bmp) => {
          // Sized here too: a browser that ignores the resize options hands back the full crop.
          keep(bmp, 0, 0, bmp.width, bmp.height);
          bmp.close();
        }, direct);
    },
    /** Forget them all (a full reset). */
    clear(): void {
      generation++;
      pending.clear();
      dark.clear();
      darkAt.clear();
      clearTimeout(storeTimer);
      storeTimer = 0;
      album = {};
      close = new Set();
      count = 0;
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(CLOSE_KEY);
        localStorage.setItem(ART_KEY, String(ART_VERSION));
      } catch { /* ignore */ }
    },
  };
}

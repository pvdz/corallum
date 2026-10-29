// View-mode zoom: up to 3× into the world, by wheel, pinch or + / −. The scene is drawn under the
// transform (not upscaled), so the detail stays sharp. (cx, cy) is the world point at the centre.
// At 1× the transform is the identity.

import { zoom } from '../game/render/scene.ts';

const ZOOM_MAX = 3;

/** `active` says whether zooming is allowed now (view mode); `dpr` is the current device pixel ratio. */
export function createZoom(canvas: HTMLCanvasElement, active: () => boolean, dpr: () => number) {
  let cx = 0, cy = 0;

  function offset(): [number, number] {
    if (zoom.k === 1) return [0, 0];
    return [canvas.width / 2 - zoom.k * cx, canvas.height / 2 - zoom.k * cy];
  }
  function toWorld(sx: number, sy: number): [number, number] {
    const [ex, ey] = offset();
    return [(sx - ex) / zoom.k, (sy - ey) / zoom.k];
  }
  /** Zoom to `k`, keeping the world point under screen point (sx, sy) where it is; the view stays inside the world. */
  function zoomAt(k: number, sx: number, sy: number): void {
    const [wx, wy] = toWorld(sx, sy);
    zoom.k = Math.min(ZOOM_MAX, Math.max(1, k));
    const W = canvas.width, H = canvas.height;
    cx = Math.min(W - W / (2 * zoom.k), Math.max(W / (2 * zoom.k), wx - (sx - W / 2) / zoom.k));
    cy = Math.min(H - H / (2 * zoom.k), Math.max(H / (2 * zoom.k), wy - (sy - H / 2) / zoom.k));
  }

  canvas.addEventListener('wheel', (e) => {
    if (!active()) return;
    e.preventDefault();
    zoomAt(zoom.k * Math.exp(-e.deltaY * 0.0015), e.clientX * dpr(), e.clientY * dpr());
  }, { passive: false });

  // Pinch: two fingers zoom about their midpoint, and moving the midpoint pans.
  const fingers = new Map<number, [number, number]>();
  let pinch: { d: number; mx: number; my: number } | null = null;
  function pinchState(): { d: number; mx: number; my: number } {
    const [a, b] = [...fingers.values()] as [[number, number], [number, number]];
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
  }
  canvas.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, [e.clientX * dpr(), e.clientY * dpr()]);
    if (!pinch || fingers.size !== 2) return;
    const now = pinchState();
    // Pan by the midpoint's travel, then zoom about the new midpoint.
    cx -= (now.mx - pinch.mx) / zoom.k;
    cy -= (now.my - pinch.my) / zoom.k;
    zoomAt(zoom.k * (now.d / Math.max(1, pinch.d)), now.mx, now.my);
    pinch = now;
  });
  for (const type of ['pointerup', 'pointercancel'] as const) {
    canvas.addEventListener(type, (e) => {
      fingers.delete(e.pointerId);
      if (fingers.size < 2) pinch = null;
    });
  }

  return {
    toWorld,
    toScreen(wx: number, wy: number): [number, number] {
      const [ex, ey] = offset();
      return [wx * zoom.k + ex, wy * zoom.k + ey];
    },
    zoomAt,
    /** Draw under the zoom from here on. */
    apply(c: CanvasRenderingContext2D): void {
      const [ex, ey] = offset();
      c.setTransform(zoom.k, 0, 0, zoom.k, ex, ey);
    },
    reset(): void {
      zoom.k = 1;
    },
    /** Ease the view a step toward zoom `k` centred on world point (wx, wy); `f` is how far (0..1). */
    lookAt(k: number, wx: number, wy: number, f: number): void {
      const W = canvas.width, H = canvas.height;
      const kk = zoom.k + (Math.min(ZOOM_MAX, Math.max(1, k)) - zoom.k) * f;
      const tx = zoom.k === 1 ? wx : cx + (wx - cx) * f, ty = zoom.k === 1 ? wy : cy + (wy - cy) * f;
      zoom.k = kk;
      cx = Math.min(W - W / (2 * kk), Math.max(W / (2 * kk), tx));
      cy = Math.min(H - H / (2 * kk), Math.max(H / (2 * kk), ty));
    },
    /** A finger went down; true when it starts a pinch (zoom active), which is not a tap. */
    pinchDown(e: PointerEvent): boolean {
      if (!active() || e.pointerType !== 'touch') return false;
      fingers.set(e.pointerId, [e.clientX * dpr(), e.clientY * dpr()]);
      if (fingers.size !== 2) return false;
      pinch = pinchState();
      return true;
    },
  };
}

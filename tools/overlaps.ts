// Overlay texts that collide: the title, zone title, milestone, journal note, whisper, hints and
// the depth gauge, checked pairwise (and against the panel) by their words' boxes, sampled for
// 8 s at bot times through the game on every viewport. Prints the colliding pairs per state.
// Usage: node --no-warnings tools/overlaps.ts [comma-separated bot seconds; 5 = a fresh reef]

import { VIEWPORTS, withGame } from './browser.ts';
const IDS = ['title', 'zone-title', 'milestone', 'journal-note', 'whisper', 'sweep-hint', 'creature-label', 'depth-gauge', 'sound', 'view-mode'];
const times = (process.argv[2] ?? '5,300,2000,5000,9000,13000,17000,21000,25000').split(',').map(Number);
await withGame(async (open) => {
  for (const vp of VIEWPORTS) for (const at of times) {
    const { page } = await open(vp, at < 20 ? '?fresh' : `?bot=${at}`);
    await page.waitForFunction(() => (window as never as { corallum?: unknown }).corallum, null, { timeout: 90000 });
    const seen = new Set<string>();
    await page.waitForTimeout(3000);
    for (let k = 0; k < 12; k++) {
      await page.waitForTimeout(700);
      const hits = await page.evaluate((ids) => {
        const boxes = ids.map((id) => {
          const e = document.getElementById(id);
          if (!e) return null;
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.3 || (e as HTMLElement).hidden) return null;
          // The words' own boxes (text nodes), not the boxes of the blocks around them.
          const rs: DOMRect[] = [];
          const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            const range = document.createRange(); range.selectNodeContents(n);
            rs.push(...[...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2));
          }
          if (!rs.length) return null;
          return { id, l: Math.min(...rs.map((r) => r.left)), t: Math.min(...rs.map((r) => r.top)), r: Math.max(...rs.map((r) => r.right)), b: Math.max(...rs.map((r) => r.bottom)) };
        }).filter(Boolean) as { id: string; l: number; t: number; r: number; b: number }[];
        const panel = document.querySelector('.panel')?.getBoundingClientRect();
        const out: string[] = [];
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i]!;
          if (panel && a.r > panel.left + 2 && a.l < panel.right - 2 && a.b > panel.top + 2 && a.t < panel.bottom - 2 && a.id !== 'sound') out.push(`${a.id}~panel`);
          for (let j = i + 1; j < boxes.length; j++) {
            const b = boxes[j]!;
            if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) out.push(`${a.id}~${b.id}`);
          }
        }
        return out;
      }, IDS);
      hits.forEach((h) => seen.add(h));
    }
    console.log(vp.name, at, [...seen].join(' ') || '-');
    await page.context().close();
  }
});

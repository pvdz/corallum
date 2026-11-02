// UI audit: loads the game at a bot time in each zone and, on every visible tab (after its fade),
// reports what a player would trip over:
//   hidden  an element with the hidden attribute that still displays (a class setting display)
//   out     an element sticking out of the panel sideways
//   small   a tap target under 28 px on its short side (touch viewports only)
//   name    a control with no readable name (screen readers say just "button")
//   clip    a button whose text runs past its own edge
//   spill   text running out of its card, section or row
//   dim     small text under 4.5:1 against the panel (disabled buttons skipped; dimmed cards show)
//   console any warning or error
// Known and intended: 'dim' on held or finished cards (dimmed on purpose), and 'small' on the
// sheet's grabber (the stocks under it drag the sheet too).
// Usage: node --no-warnings tools/audit.ts [desktop|mobile|landscape|small] [t1,t2,...] [--big]   (~1 min)

import { VIEWPORTS, withGame } from './browser.ts';

// 'small' is a 360×640 phone; --big turns on Larger text.
const SMALL = { name: 'small', width: 360, height: 640, scale: 2, mobile: true };
const vp = process.argv[2] === 'small' ? SMALL : VIEWPORTS.find((v) => v.name === (process.argv[2] ?? 'mobile'))!;
const big = process.argv.includes('--big');
const times = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '600,5000,12000,19000,26000').split(',');

type Finding = [kind: string, what: string];

await withGame(async (open) => {
  const seen = new Map<string, string>();
  for (const at of times) {
    const { page, errors } = await open(vp, `?bot=${at}`);
    if (big) { await page.evaluate(() => localStorage.setItem('corallum.big', 'on')); await page.reload(); }
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
    await page.waitForFunction(() => (window as unknown as { corallum?: unknown }).corallum, null, { timeout: 90000 });
    await page.waitForTimeout(1500);
    const found = await page.evaluate(async (touch: boolean): Promise<Finding[]> => {
      const out: Finding[] = [];
      const bg = [12, 16, 38];
      const lum = (c: number[]) => {
        const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
      };
      const tag = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${[...e.classList].join('.')} "${(e.textContent ?? '').trim().slice(0, 24)}"`;
      const panel = document.querySelector('.panel')!.getBoundingClientRect();
      for (const tab of [...document.querySelectorAll<HTMLButtonElement>('.tab')].filter((t) => !t.hidden)) {
        tab.click();
        await new Promise((r) => setTimeout(r, 300));
        for (const e of document.querySelectorAll<HTMLElement>('[hidden]')) {
          if (getComputedStyle(e).display !== 'none') out.push(['hidden', tag(e)]);
        }
        for (const e of document.querySelectorAll<HTMLElement>('.panel *')) {
          if (e.offsetParent === null) continue;
          const r = e.getBoundingClientRect();
          if (r.width > 0 && (r.right > panel.right + 1 || r.left < panel.left - 1)) out.push(['out', tag(e)]);
          // Text of its own, and not just emoji (they draw in their own colours).
          const own = [...e.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent!));
          // Text running out of its card, section or row (unless something on the way clips it on purpose).
          if (own) {
            const box = e.closest('.card, .ask, section, .stock, .chip, .heat-row, .current-row');
            let clipped = false;
            for (let p: HTMLElement | null = e; p && p !== box; p = p.parentElement) { const o = getComputedStyle(p); if (o.overflowX !== 'visible' || o.textOverflow === 'ellipsis') { clipped = true; break; } }
            if (box && !clipped) {
              const range = document.createRange();
              range.selectNodeContents(e);
              const t = range.getBoundingClientRect(), bx = box.getBoundingClientRect();
              if (t.width > 0 && (t.right > bx.right + 0.5 || t.left < bx.left - 0.5)) out.push(['spill', `text ${Math.round(t.left)}–${Math.round(t.right)} in ${Math.round(bx.left)}–${Math.round(bx.right)} ${tag(e)}`]);
            }
          }
          if (!own || (e.closest('button') as HTMLButtonElement | null)?.disabled) continue;
          const cs = getComputedStyle(e);
          const m = cs.color.match(/[\d.]+/g)!.map(Number);
          let a = m[3] ?? 1;
          for (let p: HTMLElement | null = e; p; p = p.parentElement) a *= Number(getComputedStyle(p).opacity);
          const c = [0, 1, 2].map((i) => m[i]! * a + bg[i]! * (1 - a));
          const ratio = (Math.max(lum(c), lum(bg)) + 0.05) / (Math.min(lum(c), lum(bg)) + 0.05);
          if (ratio < 4.5 && parseFloat(cs.fontSize) < 18) out.push(['dim', `${ratio.toFixed(2)} ${tag(e)}`]);
        }
        for (const b of document.querySelectorAll<HTMLElement>('button, input, summary, [role=button]')) {
          if (b.offsetParent === null && getComputedStyle(b).position !== 'fixed') continue;
          // A control inside a label is tapped through the whole label.
          const r = (b.closest('label') ?? b).getBoundingClientRect();
          // The pseudo-element margins (style.css, pointer: coarse) count toward the tap target.
          const pad = touch && getComputedStyle(b, '::after').content !== 'none' ? 16 : 0;
          if (touch && Math.min(r.width + pad, r.height + pad) < 28) out.push(['small', `${Math.round(r.width)}x${Math.round(r.height)} ${tag(b)}`]);
          const name = (b.getAttribute('aria-label') || b.title || (b as HTMLInputElement).labels?.[0]?.textContent || b.textContent || '').trim();
          if (!name || /^[^\p{L}\p{N}]+$/u.test(name)) out.push(['name', tag(b)]);
          // Its text runs past its own edge (into the border, or out of a pill).
          // (Measured on the text itself: a tap area widened by a pseudo-element is not text.)
          if (b.tagName === 'BUTTON' && b.textContent!.trim()) {
            const range = document.createRange();
            range.selectNodeContents(b);
            const t = range.getBoundingClientRect(), r = b.getBoundingClientRect(), bcs = getComputedStyle(b);
            const inL = r.left + parseFloat(bcs.borderLeftWidth), inR = r.right - parseFloat(bcs.borderRightWidth);
            if (t.width > 0 && (t.right > inR + 0.5 || t.left < inL - 0.5)) out.push(['clip', `text ${Math.round(t.left)}–${Math.round(t.right)} in ${Math.round(inL)}–${Math.round(inR)} ${tag(b)}`]);
          }
        }
      }
      return out;
    }, vp.mobile);
    for (const w of [...warnings, ...errors]) found.push(['console', w.slice(0, 160)]);
    for (const [kind, what] of found) {
      const k = `${kind} ${what.replace(/"[^"]*"$/, '')}`;
      if (!seen.has(k)) seen.set(k, `${at.padStart(6)} ${kind.padEnd(7)} ${what}`);
    }
    await page.context().close();
  }
  for (const line of seen.values()) console.log(line);
  console.log(`${vp.name}: ${seen.size} finding${seen.size === 1 ? '' : 's'}`);
});

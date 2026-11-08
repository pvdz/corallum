// UI audit: loads the game at a bot time in each zone and, on every visible tab (after its fade),
// reports what a player would trip over:
//   hidden  an element with the hidden attribute that still displays (a class setting display)
//   out     an element sticking out of the panel sideways
//   small   a tap target under 28 px on its short side (touch viewports only)
//   name    a control with no readable name (screen readers say just "button")
//   clip    a button whose text runs past its own edge
//   spill   text running out of its card, section or row
//   overlap two pieces of text in one card or row drawn over each other
//   cut     a number cut short by an ellipsis or a clip
//   dim     small text under 4.5:1 against the panel (disabled buttons skipped; dimmed cards show)
//   console any warning or error
// Known and intended: 'dim' on held or finished cards (dimmed on purpose), and 'small' on the
// sheet's grabber (the stocks under it drag the sheet too).
// Usage: node --no-warnings tools/audit.ts [desktop|mobile|landscape|small|small-landscape|narrow-desktop|tablet|tiny|tiny-landscape|laptop] [t1,t2,...] [--big] [--sci]   (~1 min)

import { VIEWPORTS, withGame } from './browser.ts';

// 'small' is a 360×640 phone; --big turns on Larger text.
const SMALL = { name: 'small', width: 360, height: 640, scale: 2, mobile: true };
// 'small-landscape': a small phone on its side (667×375).
const SMALL_LANDSCAPE = { name: 'small-landscape', width: 667, height: 375, scale: 2, mobile: true };
// 'narrow-desktop': the narrowest window with a side panel (820×900, a browser beside another).
const NARROW_DESKTOP = { name: 'narrow-desktop', width: 820, height: 900, scale: 1, mobile: false };
// 'tablet': an upright tablet (768×1024: the phone sheet, much wider).
const TABLET = { name: 'tablet', width: 768, height: 1024, scale: 2, mobile: true };
// 'tiny': the smallest phone still in use (320×568, the first iPhone SE).
const TINY = { name: 'tiny', width: 320, height: 568, scale: 2, mobile: true };
// 'laptop': the most common laptop screen (1366×768).
const LAPTOP = { name: 'laptop', width: 1366, height: 768, scale: 1, mobile: false };
// 'tiny-landscape': the smallest phone on its side (568×320: the side panel, the narrowest scene).
const TINY_LANDSCAPE = { name: 'tiny-landscape', width: 568, height: 320, scale: 2, mobile: true };
const EXTRA: Record<string, typeof SMALL> = { small: SMALL, 'small-landscape': SMALL_LANDSCAPE, 'narrow-desktop': NARROW_DESKTOP, tablet: TABLET, tiny: TINY, laptop: LAPTOP, 'tiny-landscape': TINY_LANDSCAPE };
const vp = EXTRA[process.argv[2] ?? ''] ?? VIEWPORTS.find((v) => v.name === (process.argv[2] ?? 'mobile'))!;
const big = process.argv.includes('--big');
const sci = process.argv.includes('--sci');
const times = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '600,5000,12000,19000,26000').split(',');

type Finding = [kind: string, what: string];

await withGame(async (open) => {
  const seen = new Map<string, string>();
  for (const at of times) {
    const { page, errors } = await open(vp, `?bot=${at}`);
    if (big || sci) {
      await page.evaluate(([b, s]) => { if (b) localStorage.setItem('corallum.big', 'on'); if (s) localStorage.setItem('corallum.sci', 'on'); }, [big, sci]);
      await page.reload();
    }
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
          // A number cut short (an ellipsis or a clip over a value: flavour may be cut, numbers may not).
          if (/\d/.test(e.textContent ?? '') && e.offsetParent && !e.closest('details:not([open])')) {
            const cs0 = getComputedStyle(e);
            if (cs0.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1 && !e.classList.contains('flavour')) out.push(['cut', `${e.scrollWidth}>${e.clientWidth} ${tag(e)}`]);
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
        // Two pieces of text drawn over each other (within one card, section or row).
        for (const box of document.querySelectorAll<HTMLElement>('.panel .card, .panel section, .panel .ask, .panel .stocks, .panel .tabs')) {
          if (box.offsetParent === null) continue;
          const rects: [DOMRect, Element][] = [];
          const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            // (Inside a closed <details> nothing is drawn, though Chrome still lays it out at the summary.)
            const pe = n.parentElement;
            if (!/[\p{L}\p{N}]/u.test(n.textContent!) || !pe?.offsetParent || (pe.closest('details:not([open])') && !pe.closest('summary'))) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push([r, n.parentElement!]);
          }
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
            const [a, ea] = rects[i]!, [c, ec] = rects[j]!;
            if (ea === ec) continue;
            const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
            if (w > 2 && h > Math.min(a.height, c.height) * 0.4) out.push(['overlap', `${tag(ea)} × ${tag(ec)}`]);
          }
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

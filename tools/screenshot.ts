// Captures a screenshot series into screenshot/YYYY-MM-DD-HH-MM/ (local time).
// Usage: node tools/screenshot.ts [--t <seconds>] [--shot <tag>=<url params>]...
//   e.g. --shot start=fresh --shot act1-mid=bot=900
// Without --shot it takes one shot tagged "scene" of a fresh game.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { VIEWPORTS, withGame } from './browser.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] ?? fallback : fallback;
}

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
const dir = join('screenshot', stamp);
mkdirSync(dir, { recursive: true });

const t = arg('t', '42');
const shots: [string, string][] = [];
process.argv.forEach((a, i) => {
  if (a !== '--shot') return;
  const spec = process.argv[i + 1] ?? '';
  const eq = spec.indexOf('=');
  shots.push(eq < 0 ? [spec, ''] : [spec.slice(0, eq), spec.slice(eq + 1)]);
});
if (!shots.length) shots.push(['scene', 'fresh']);

await withGame(async (open) => {
  for (const [tag, extra] of shots) for (const vp of VIEWPORTS) {
    const { page, errors } = await open(vp, `?t=${t}${extra ? '&' + extra : ''}`);
    await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
    const file = join(dir, `${vp.name}-${tag}.png`);
    await page.screenshot({ path: file });
    console.log(file);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    }
  }
});

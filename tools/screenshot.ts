// Captures a screenshot series into screenshot/YYYY-MM-DD-HH-MM/ (local time).
// Usage: node tools/screenshot.ts [--t <seconds>] [--query "<extra url params>"] [--tag <name>]

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
const extra = arg('query', '');
const tag = arg('tag', 'scene');

await withGame(async (open) => {
  for (const vp of VIEWPORTS) {
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

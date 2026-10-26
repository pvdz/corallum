// Shared Playwright harness. Playwright is installed globally (not a project dependency), so it
// is loaded from the global module root. Starts the game server in-process on a free port.

import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { startServer } from '../src/server/server.ts';

type Playwright = typeof import('playwright');
export type Page = import('playwright').Page;

const GLOBAL_ROOT = process.env.PLAYWRIGHT_GLOBAL_ROOT ?? '/usr/lib/node_modules/';
const pw = createRequire(GLOBAL_ROOT)('playwright') as Playwright;

export type Viewport = { name: string; width: number; height: number; scale: number; mobile: boolean };

export const VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false },
  { name: 'mobile', width: 390, height: 844, scale: 3, mobile: true },
];

export async function withGame<T>(fn: (open: (vp: Viewport, query?: string) => Promise<{ page: Page; errors: string[] }>) => Promise<T>): Promise<T> {
  const server = await startServer(0);
  const port = (server.address() as AddressInfo).port;
  const browser = await pw.chromium.launch();
  try {
    return await fn(async (vp, query = '') => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.scale,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`http://127.0.0.1:${port}/${query}`);
      return { page, errors };
    });
  } finally {
    await browser.close();
    server.close();
  }
}

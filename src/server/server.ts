// Static dev/prod server for Corallum.
// Serves the client page and every `.ts` module under src/ with its types stripped by Node's
// own stripper, so the browser runs the same TypeScript sources Node does. Nothing is compiled
// to disk. Stripping replaces types with whitespace, so line/column numbers stay exact.

import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SERVED_DIRS = ['src'];

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

type CacheEntry = { mtimeMs: number; body: Buffer };
const stripCache = new Map<string, CacheEntry>();
/** Gzipped bodies of text files, for phones on the network; keyed by path, kept while the body is the same. */
const gzipCache = new Map<string, { body: Buffer; gz: Buffer }>();
const COMPRESSED = new Set(['.html', '.ts', '.js', '.css', '.json', '.svg', '.webmanifest']);

function gzipped(abs: string, body: Buffer): Buffer {
  const hit = gzipCache.get(abs);
  if (hit && (hit.body === body || hit.body.equals(body))) return hit.gz;
  const gz = gzipSync(body);
  gzipCache.set(abs, { body, gz });
  return gz;
}

async function loadFile(abs: string): Promise<Buffer> {
  const ext = extname(abs);
  if (ext !== '.ts') return readFile(abs);
  const { mtimeMs } = await stat(abs);
  const hit = stripCache.get(abs);
  if (hit && hit.mtimeMs === mtimeMs) return hit.body;
  const source = await readFile(abs, 'utf8');
  const body = Buffer.from(stripTypeScriptTypes(source, { mode: 'strip' }), 'utf8');
  stripCache.set(abs, { mtimeMs, body });
  return body;
}

/** Map a request path to an absolute file path, or null when it is outside the served dirs. */
export function resolveRequest(urlPath: string): string | null {
  let path: string;
  // A malformed escape (%E0%A4%A) is a bad request, not a crash.
  try { path = decodeURIComponent(urlPath.split('?')[0] ?? '/'); } catch { return null; }
  if (path === '/' || path === '/index.html') path = '/src/client/index.html';
  if (path === '/favicon.ico') path = '/src/client/favicon.svg';
  // The service worker sits at the root so its scope is the whole site.
  if (path === '/sw.js') path = '/src/client/sw.ts';
  const abs = normalize(join(ROOT, path));
  const ok = SERVED_DIRS.some((d) => abs.startsWith(join(ROOT, d) + sep));
  return ok ? abs : null;
}

export function startServer(port: number, host = '127.0.0.1'): Promise<Server> {
  const server = createServer(async (req, res) => {
    const abs = resolveRequest(req.url ?? '/');
    if (!abs) {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      // Revalidated on every load (no-cache), but an unchanged file answers 304 with no body:
      // a reload on a phone does not fetch every module again. The tag follows the source file.
      const { mtimeMs, size } = await stat(abs);
      const etag = `"${size.toString(36)}-${Math.floor(mtimeMs).toString(36)}"`;
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { etag, 'cache-control': 'no-cache', vary: 'accept-encoding' }).end();
        return;
      }
      const body = await loadFile(abs);
      const gz = COMPRESSED.has(extname(abs)) && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
      res.writeHead(200, {
        'content-type': MIME[extname(abs)] ?? 'application/octet-stream',
        'cache-control': 'no-cache',
        // Each file is only what its type says (a hosted copy never runs a mislabelled one).
        'x-content-type-options': 'nosniff',
        etag,
        vary: 'accept-encoding',
        ...(gz ? { 'content-encoding': 'gzip' } : {}),
      });
      res.end(gz ? gzipped(abs, body) : body);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'EISDIR') res.writeHead(404).end('not found');
      else {
        // The details go to the log, not to whoever asked (they name paths on the server).
        console.error(err);
        res.writeHead(500).end('server error');
      }
    }
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => ok(server));
  });
}

if (import.meta.main) {
  const arg = process.argv.indexOf('--port');
  const port = Number(arg > 0 ? process.argv[arg + 1] : process.env.PORT ?? 8080);
  const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
  await startServer(port, host);
  console.log(`Corallum on http://localhost:${port}/`);
  if (host === '0.0.0.0') {
    // Addresses a phone on the same network can open.
    for (const list of Object.values(networkInterfaces())) {
      for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) console.log(`  on your network: http://${a.address}:${port}/`);
    }
  }
}

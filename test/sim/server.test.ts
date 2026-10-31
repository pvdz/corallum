// The game server's path mapping: only files under src/ are served, and a malformed URL is
// refused instead of throwing (an unhandled throw in the handler would stop the server).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { resolveRequest, startServer } from '../../src/server/server.ts';

test('serves the page and sources, refuses anything outside src/ and malformed escapes', () => {
  assert.match(resolveRequest('/') ?? '', /src\/client\/index\.html$/);
  assert.match(resolveRequest('/src/client/main.ts?v=1') ?? '', /src\/client\/main\.ts$/);
  assert.match(resolveRequest('/sw.js') ?? '', /src\/client\/sw\.ts$/);
  for (const bad of ['/../package.json', '/src/../../etc/passwd', '/%2e%2e/package.json', '/package.json', '/%E0%A4%A']) {
    assert.equal(resolveRequest(bad), null, bad);
  }
});

test('an unchanged file revalidates to a bodiless 304', async () => {
  const server = await startServer(0);
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/src/client/main.ts`;
    const first = await fetch(url);
    const etag = first.headers.get('etag');
    assert.equal(first.status, 200);
    assert.ok(etag && (await first.text()).length > 0);
    const again = await fetch(url, { headers: { 'if-none-match': etag } });
    assert.equal(again.status, 304);
    assert.equal(await again.text(), '');
    const stale = await fetch(url, { headers: { 'if-none-match': '"other"' } });
    assert.equal(stale.status, 200);
    await stale.text();
  } finally {
    server.close();
  }
});

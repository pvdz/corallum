// The game server's path mapping: only files under src/ are served, and a malformed URL is
// refused instead of throwing (an unhandled throw in the handler would stop the server).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequest } from '../../src/server/server.ts';

test('serves the page and sources, refuses anything outside src/ and malformed escapes', () => {
  assert.match(resolveRequest('/') ?? '', /src\/client\/index\.html$/);
  assert.match(resolveRequest('/src/client/main.ts?v=1') ?? '', /src\/client\/main\.ts$/);
  for (const bad of ['/../package.json', '/src/../../etc/passwd', '/%2e%2e/package.json', '/package.json', '/%E0%A4%A']) {
    assert.equal(resolveRequest(bad), null, bad);
  }
});

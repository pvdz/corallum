// The sim must be a pure function of (state, dt, seed). This greps the sim sources for the
// usual leaks; it is a test rather than a lint rule so it can't be silenced inline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SIM_DIRS = ['src/game/sim', 'src/game/content'];
const BANNED = [/Math\.random/, /Date\.now/, /performance\.now/, /new Date\(/, /\bwindow\b/, /\bdocument\b/];

function* tsFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* tsFiles(p);
    else if (p.endsWith('.ts')) yield p;
  }
}

test('sim and content are free of clocks, Math.random and DOM', () => {
  const hits: string[] = [];
  for (const dir of SIM_DIRS)
    for (const file of tsFiles(dir))
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (line.trim().startsWith('//')) return;
        for (const re of BANNED) if (re.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  assert.deepEqual(hits, []);
});

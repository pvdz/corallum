// A doc comment belongs to the code right under it: one followed directly by another describes
// nothing (editors show only the last), and such orphans had piled up above the wrong functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['src', 'tools', 'test'];

function* tsFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* tsFiles(p);
    else if (p.endsWith('.ts')) yield p;
  }
}

test('no doc comment is followed directly by another', () => {
  const hits: string[] = [];
  for (const dir of DIRS)
    for (const file of tsFiles(dir)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      for (let i = 1; i < lines.length; i++)
        if (/^\s*\/\*\*/.test(lines[i]!) && /^\s*(\/\*\*.*)?\*\/\s*$/.test(lines[i - 1]!)) hits.push(`${file}:${i + 1}`);
    }
  assert.deepEqual(hits, [], `doc comments stacked on another (the upper one describes nothing):\n${hits.join('\n')}`);
});

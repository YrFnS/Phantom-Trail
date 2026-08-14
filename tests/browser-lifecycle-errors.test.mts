import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isControlledBrowserShutdown } from '../lib/browser-lifecycle-errors.mts';

test('classifies controlled browser shutdown and context invalidation', () => {
  assert.equal(
    isControlledBrowserShutdown(new Error('The browser is shutting down.')),
    true
  );
  assert.equal(
    isControlledBrowserShutdown(new Error('Extension context was invalidated')),
    true
  );
  assert.equal(isControlledBrowserShutdown(new Error('Quota exceeded')), false);
});

test('event reads guard controlled shutdown before logging an error', () => {
  const source = readFileSync(
    resolve(import.meta.dirname, '../lib/storage/events-storage.ts'),
    'utf8'
  );

  assert.match(
    source,
    /if \(!isControlledBrowserShutdown\(error\)\) \{\s*console\.error\(\s*'Failed to read protected detector events:'/u
  );
});

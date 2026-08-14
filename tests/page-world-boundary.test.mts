import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('does not expose or inject a page-world detector bridge', () => {
  assert.equal(
    existsSync(resolve(root, 'public/content-main-world.js')),
    false
  );
  assert.doesNotMatch(
    read('entrypoints/content/index.ts'),
    /content-main-world|createElement\(['"]script['"]\)/u
  );
  assert.doesNotMatch(
    read('entrypoints/content/dom-monitoring.ts'),
    /phantom-trail-detection|new\s+CustomEvent/u
  );
  assert.doesNotMatch(read('wxt.config.ts'), /web_accessible_resources/u);
  assert.equal(existsSync(resolve(root, 'lib/content-messaging.ts')), false);
  assert.equal(existsSync(resolve(root, 'lib/in-page-detector.ts')), false);
});

test('does not accept obsolete page-posted P2P discovery messages', () => {
  assert.doesNotMatch(
    read('entrypoints/content/messaging.ts'),
    /PHANTOM_TRAIL_P2P_DISCOVERY|window\.addEventListener\(['"]message/u
  );
});

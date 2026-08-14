import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(import.meta.dirname, '../scripts/chromium-lifecycle.mjs'),
  'utf8'
);

test('Chromium harness selects the packaged service-worker path', () => {
  assert.match(source, /manifest\.background\?\.service_worker/u);
  assert.match(source, /url\.pathname !== expectedWorkerPath/u);
});

test('Chromium harness waits for the extension runtime before using chrome APIs', () => {
  assert.match(source, /typeof chrome === 'undefined'/u);
  assert.match(source, /waitForExtensionRuntime\(instance\.cdp, workerSession/u);
  assert.match(source, /runtime\.manifest/u);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const matrix = JSON.parse(read('evidence/real-site-baseline-sites.v1.json'));

test('real-site baseline is versioned, bounded, and includes Iraqi cohorts', () => {
  assert.equal(matrix.schemaVersion, 1);
  assert.ok(matrix.sites.length >= 5 && matrix.sites.length <= 10);
  assert.ok(matrix.sites.some((site: { cohort: string }) => site.cohort === 'negative-control'));
  assert.ok(matrix.sites.some((site: { cohort: string }) => site.cohort === 'iraq-government'));
  assert.ok(matrix.sites.some((site: { cohort: string }) => site.cohort === 'iraq-education'));
  for (const site of matrix.sites) {
    const url = new URL(site.url);
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
    assert.equal(site.manualReviewStatus, 'pending');
  }
});

test('browser baselines do not claim to close human or accuracy gates', () => {
  const normalChrome = read('scripts/normal-chrome-popup-baseline.mjs');
  const realSites = read('scripts/real-site-observation-baseline.mjs');
  assert.match(normalChrome, /humanToolbarGateClosed:\s*false/u);
  assert.match(normalChrome, /humanAccessibilityGateClosed:\s*false/u);
  assert.match(realSites, /accuracyClaim:\s*'not-established'/u);
  assert.match(realSites, /releaseGateClosed:\s*false/u);
  assert.match(realSites, /manualReviewStatus:\s*'pending'/u);
});

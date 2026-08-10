import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTrackerUrl } from '../lib/tracker-match.mts';

const catalog = {
  'tracker.test': {
    domain: 'tracker.test',
    name: 'Fixture tracker',
    category: 'Analytics' as const,
    description: 'fixture',
    riskLevel: 'medium' as const,
  },
};

test('exact catalog matches carry high-confidence evidence', () => {
  const match = matchTrackerUrl('https://tracker.test/pixel', catalog);

  assert.equal(match?.matchType, 'catalog-exact-domain');
  assert.equal(match?.confidence, 'high');
  assert.equal(match?.rule, 'tracker.test');
});

test('catalog subdomains match without substring guessing', () => {
  const match = matchTrackerUrl('https://cdn.tracker.test/file.js', catalog);

  assert.equal(match?.matchType, 'catalog-subdomain');
  assert.equal(match?.confidence, 'high');
});

test('UTM and click identifiers alone do not create detector matches', () => {
  assert.equal(
    matchTrackerUrl(
      'https://shop.test/product?utm_source=newsletter&fbclid=123&gclid=456',
      catalog
    ),
    null
  );
});

test('path rules are low confidence and require complete path segments', () => {
  const match = matchTrackerUrl('https://example.test/collect/event', catalog);

  assert.equal(match?.matchType, 'path-pattern');
  assert.equal(match?.confidence, 'low');
  assert.equal(match?.rule, 'collect-segment');
});

test('ordinary words containing ads or stats do not match', () => {
  assert.equal(
    matchTrackerUrl('https://gladstone.test/assets/app.js', catalog),
    null
  );
  assert.equal(matchTrackerUrl('https://sadserver.test/home', catalog), null);
});

test('standalone hostname tokens produce a low-confidence match', () => {
  const match = matchTrackerUrl('https://metrics.example.test/v1', catalog);

  assert.equal(match?.matchType, 'url-heuristic');
  assert.equal(match?.confidence, 'low');
});

test('non-http and malformed values are ignored', () => {
  assert.equal(
    matchTrackerUrl('chrome-extension://abc/popup.js', catalog),
    null
  );
  assert.equal(matchTrackerUrl('not a url', catalog), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNetworkAttribution } from '../lib/event-attribution.mts';
import { shouldStoreNetworkMatch } from '../lib/network-match-policy.mts';

test('drops first-party catalog or path matches', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://example.test/analytics/collect',
    requestType: 'fetch',
    documentUrl: 'https://example.test/page',
  });

  assert.equal(context.party, 'first-party');
  assert.equal(shouldStoreNetworkMatch(context, 'high'), false);
  assert.equal(shouldStoreNetworkMatch(context, 'low'), false);
});

test('drops unattributed low-confidence broad matches', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://metrics.test/collect',
    requestType: 'fetch',
  });

  assert.equal(context.party, 'unknown');
  assert.equal(shouldStoreNetworkMatch(context, 'low'), false);
});

test('retains unattributed high-confidence catalog matches', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://catalog-tracker.test/pixel',
    requestType: 'image',
  });

  assert.equal(context.party, 'unknown');
  assert.equal(shouldStoreNetworkMatch(context, 'high'), true);
});

test('retains attributed third-party low-confidence matches for inspection', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://metrics.third.test/collect',
    requestType: 'fetch',
    documentUrl: 'https://page.test/article',
  });

  assert.equal(context.party, 'third-party');
  assert.equal(shouldStoreNetworkMatch(context, 'low'), true);
});

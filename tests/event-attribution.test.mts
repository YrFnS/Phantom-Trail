import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEventDeduplicationKey,
  classifyPartyRelationship,
  eventMatchesPageDomain,
  normalizeTrackingEvent,
  resolveNetworkAttribution,
} from '../lib/event-attribution.mts';

test('resolves a third-party subresource from documentUrl', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://cdn.example.net/collect',
    requestType: 'script',
    documentUrl: 'https://shop.example.com/product/1',
    tabId: 12,
    frameId: 0,
    requestId: 'r1',
  });

  assert.equal(context.pageDomain, 'shop.example.com');
  assert.equal(context.resourceDomain, 'cdn.example.net');
  assert.equal(context.party, 'third-party');
  assert.equal(context.attributionBasis, 'document-url');
  assert.equal(context.attributionConfidence, 'high');
});

test('uses the request itself for a main-frame navigation', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://example.com/path',
    requestType: 'main_frame',
  });

  assert.equal(context.pageDomain, 'example.com');
  assert.equal(context.resourceDomain, 'example.com');
  assert.equal(context.party, 'first-party');
  assert.equal(context.attributionBasis, 'main-frame');
});

test('falls back from an unusable initiator to the tab URL', () => {
  const context = resolveNetworkAttribution({
    requestUrl: 'https://tracker.test/pixel',
    requestType: 'image',
    initiator: 'null',
    tabUrl: 'https://news.test/story',
  });

  assert.equal(context.pageDomain, 'news.test');
  assert.equal(context.attributionBasis, 'tab-url');
  assert.equal(context.attributionConfidence, 'medium');
  assert.equal(context.party, 'third-party');
});

test('uses a disclosed site-key heuristic for sibling subdomains', () => {
  const relationship = classifyPartyRelationship(
    'shop.example.com',
    'cdn.example.com'
  );

  assert.equal(relationship.party, 'first-party');
  assert.equal(relationship.basis, 'same-site-heuristic');
  assert.equal(relationship.confidence, 'medium');
});

test('handles common two-level suffixes in the site-key heuristic', () => {
  const relationship = classifyPartyRelationship(
    'shop.example.co.uk',
    'cdn.example.co.uk'
  );

  assert.equal(relationship.party, 'first-party');
  assert.equal(relationship.basis, 'same-site-heuristic');
});

test('treats a direct parent/child hostname relationship as first-party', () => {
  const relationship = classifyPartyRelationship(
    'example.com',
    'cdn.example.com'
  );

  assert.equal(relationship.party, 'first-party');
  assert.equal(relationship.basis, 'subdomain');
  assert.equal(relationship.confidence, 'high');
});

test('migrates a legacy network event without inventing page attribution', () => {
  const migrated = normalizeTrackingEvent({
    id: 'legacy',
    timestamp: 1,
    url: 'https://tracker.test/pixel',
    domain: 'tracker.test',
    trackerType: 'analytics',
    riskLevel: 'low',
    description: 'legacy',
  });

  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.context?.pageDomain, '');
  assert.equal(migrated.context?.resourceDomain, 'tracker.test');
  assert.equal(migrated.context?.party, 'unknown');
  assert.equal(migrated.context?.attributionConfidence, 'low');
  assert.equal(eventMatchesPageDomain(migrated, 'tracker.test'), true);
});

test('dedupe keys keep identical resources on different pages separate', () => {
  const base = {
    schemaVersion: 2 as const,
    id: 'one',
    timestamp: 1,
    url: 'https://tracker.test/pixel',
    domain: 'tracker.test',
    trackerType: 'analytics' as const,
    riskLevel: 'low' as const,
    description: 'test',
    detector: {
      id: 'catalog-domain',
      matchType: 'catalog-exact-domain' as const,
      confidence: 'high' as const,
      evidence: ['tracker.test'],
    },
  };
  const first = {
    ...base,
    context: resolveNetworkAttribution({
      requestUrl: base.url,
      requestType: 'image',
      documentUrl: 'https://one.test/',
    }),
  };
  const second = {
    ...base,
    id: 'two',
    context: resolveNetworkAttribution({
      requestUrl: base.url,
      requestType: 'image',
      documentUrl: 'https://two.test/',
    }),
  };

  assert.notEqual(
    buildEventDeduplicationKey(first),
    buildEventDeduplicationKey(second)
  );
});

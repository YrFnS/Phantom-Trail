import test from 'node:test';
import assert from 'node:assert/strict';
import type { PrivacyScore, TrackingEvent } from '../lib/types.ts';
import {
  buildAISummaryPayload,
  getAIOutboundPreview,
} from '../lib/ai/outbound-payload.mts';

function createAttributedEvent(): TrackingEvent {
  const now = Date.now();
  return {
    schemaVersion: 2,
    id: 'outbound-fixture',
    timestamp: now,
    url: 'https://tracker.test/pixel?token=secret#fragment',
    domain: 'tracker.test',
    trackerType: 'analytics',
    riskLevel: 'medium',
    description:
      'Sensitive description with https://page.test/private?auth=secret',
    context: {
      source: 'network-request',
      pageUrl: 'https://page.test/private?auth=secret#profile',
      pageDomain: 'page.test',
      resourceUrl: 'https://tracker.test/pixel?token=secret#fragment',
      resourceDomain: 'tracker.test',
      requestType: 'image',
      requestMethod: 'GET',
      party: 'third-party',
      partyBasis: 'different-site-heuristic',
      partyConfidence: 'high',
      attributionBasis: 'document-url',
      attributionConfidence: 'high',
    },
    detector: {
      id: 'catalog-tracker-test',
      matchType: 'catalog-exact-domain',
      confidence: 'high',
      rule: 'tracker.test',
      evidence: ['Resource URL contained a secret query string'],
    },
    occurrences: 3,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

function createScore(): PrivacyScore {
  return {
    status: 'estimated',
    score: 92,
    grade: 'A',
    color: 'green',
    confidence: 'low',
    scope: { type: 'dataset' },
    breakdown: {
      totalTrackers: 1,
      highRisk: 0,
      mediumRisk: 1,
      lowRisk: 0,
      criticalRisk: 0,
      httpsBonus: false,
      excessiveTrackingPenalty: false,
      observedRows: 1,
      observedOccurrences: 3,
      qualifyingRows: 1,
      qualifyingOccurrences: 3,
      excludedRows: 0,
      excludedByReason: {
        'legacy-event': 0,
        'missing-page-attribution': 0,
        'page-scope-mismatch': 0,
        'unsupported-source': 0,
        'first-party-resource': 0,
        'unknown-party': 0,
        'missing-resource-domain': 0,
        'low-detector-confidence': 0,
        'low-attribution-confidence': 0,
        'low-party-confidence': 0,
      },
      uniqueThirdPartyParties: 1,
      pageApiUnits: 0,
      evidenceUnits: 1,
      highQualityUnits: 1,
      rawPenalty: 8,
      appliedPenalty: 8,
      contributions: [],
    },
    recommendations: [],
  };
}

test('counts-only OpenRouter payload contains aggregates and no browsing labels', () => {
  const event = createAttributedEvent();
  const payload = buildAISummaryPayload([event], createScore(), 'counts-only');
  const serialized = JSON.stringify(payload);

  assert.equal(payload.mode, 'counts-only');
  assert.equal(payload.observedRows, 1);
  assert.equal(payload.observedOccurrences, 3);
  assert.equal(payload.categoryCounts.analytics, 3);
  assert.equal(payload.severityCounts.medium, 3);
  assert.equal(payload.resourceDomainLabels, undefined);
  assert.equal(serialized.includes('page.test'), false);
  assert.equal(serialized.includes('tracker.test'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('Sensitive description'), false);
  assert.equal(
    serialized.includes('Resource URL contained a secret query string'),
    false
  );
  assert.equal(serialized.includes('"url"'), false);
});

test('domain-label mode includes only bounded third-party resource labels', () => {
  const event = createAttributedEvent();
  const payload = buildAISummaryPayload(
    [event],
    createScore(),
    'include-domain-labels'
  );
  const serialized = JSON.stringify(payload);

  assert.deepEqual(payload.resourceDomainLabels, [
    { domain: 'tracker.test', rows: 1 },
  ]);
  assert.equal(serialized.includes('page.test'), false);
  assert.equal(serialized.includes('/pixel'), false);
  assert.equal(serialized.includes('secret'), false);
});

test('OpenRouter preview is produced by the canonical payload shape', () => {
  const preview = getAIOutboundPreview('counts-only');
  assert.equal(preview.destination, 'OpenRouter');
  assert.equal(preview.sample.payloadVersion, 1);
  assert.equal(preview.sample.mode, 'counts-only');
  assert.equal(preview.sample.resourceDomainLabels, undefined);
  assert.ok(preview.excludedFields.some(field => field.includes('query')));
  assert.ok(preview.excludedFields.some(field => field.includes('OpenRouter')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { TrackingEvent } from '../lib/types.ts';
import {
  DEFAULT_DATA_PROTECTION_SETTINGS,
  MINIMIZED_DETAILS_NOTICE,
  eventContainsForbiddenUrlMaterial,
  normalizeDataProtectionSettings,
  sanitizeTextForStorage,
  sanitizeTrackingEventForStorage,
  sanitizeUrlForStorage,
} from '../lib/data-protection-policy.mts';

function createSensitiveEvent(): TrackingEvent {
  const now = Date.now();
  return {
    schemaVersion: 2,
    id: 'sensitive-event',
    timestamp: now,
    url: 'https://user:password@tracker.test/pixel/123456?token=secret#details',
    domain: 'tracker.test',
    trackerType: 'analytics',
    riskLevel: 'medium',
    description:
      'Requested https://tracker.test/collect/user@example.com?session=secret#fragment for inspection',
    context: {
      source: 'network-request',
      pageUrl:
        'https://user:password@page.test/account/user@example.com?auth=secret#profile',
      pageDomain: 'page.test',
      resourceUrl:
        'https://tracker.test/pixel/550e8400-e29b-41d4-a716-446655440000?uid=42#x',
      resourceDomain: 'tracker.test',
      initiator: 'https://page.test/path?debug=1#state',
      tabId: 4,
      frameId: 0,
      parentFrameId: -1,
      requestId: 'req-1',
      requestType: 'image',
      requestMethod: 'GET',
      party: 'third-party',
      partyBasis: 'different-site-heuristic',
      partyConfidence: 'high',
      attributionBasis: 'document-url',
      attributionConfidence: 'high',
    },
    detector: {
      id: 'fixture-detector',
      matchType: 'catalog-exact-domain',
      confidence: 'high',
      rule: 'https://tracker.test/rule?secret=yes',
      evidence: [
        'URL https://tracker.test/pixel/123456?token=secret#x',
        'Page https://page.test/private/user@example.com?key=value',
      ],
    },
    occurrences: 2,
    firstSeenAt: now,
    lastSeenAt: now,
    inPageTracking: {
      method: 'storage-access',
      details:
        '{"token":"secret","email":"user@example.com","url":"https://page.test/private?auth=x"}',
      apiCalls: [
        'localStorage.setItem("secret", "value")',
        'fetch(https://page.test/private?token=x)',
      ],
      frequency: 2,
    },
  };
}

test('origin-only mode removes paths, queries, fragments, and credentials', () => {
  const result = sanitizeTrackingEventForStorage(
    createSensitiveEvent(),
    DEFAULT_DATA_PROTECTION_SETTINGS,
    1_000
  );
  const event = result.event;

  assert.equal(result.changed, true);
  assert.equal(event.context?.pageUrl, 'https://page.test/');
  assert.equal(event.context?.resourceUrl, 'https://tracker.test/');
  assert.equal(event.context?.initiator, 'https://page.test/');
  assert.equal(event.url, 'https://tracker.test/');
  assert.equal(event.inPageTracking?.details, MINIMIZED_DETAILS_NOTICE);
  assert.equal(event.dataProtection?.urlRetentionMode, 'origin-only');
  assert.equal(event.dataProtection?.queryStripped, true);
  assert.equal(event.dataProtection?.fragmentStripped, true);
  assert.equal(event.dataProtection?.credentialsStripped, true);
  assert.equal(event.dataProtection?.rawDetailsRemoved, true);
  assert.ok((event.dataProtection?.pathSegmentsRedacted || 0) > 0);
  assert.equal(eventContainsForbiddenUrlMaterial(event), false);

  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('token=secret'), false);
  assert.equal(serialized.includes('user@example.com'), false);
  assert.equal(serialized.includes('#fragment'), false);
});

test('origin-and-path mode keeps ordinary paths and redacts identifier-like segments', () => {
  const value = sanitizeUrlForStorage(
    'https://page.test/users/user@example.com/orders/123456/assets/logo.svg?token=x#y',
    'origin-and-path'
  );

  assert.equal(
    value.value,
    'https://page.test/users/:redacted/orders/:redacted/assets/logo.svg'
  );
  assert.equal(value.queryStripped, true);
  assert.equal(value.fragmentStripped, true);
  assert.equal(value.pathSegmentsRedacted, 2);
});

test('URL-like substrings in text are minimized under the selected policy', () => {
  const text = sanitizeTextForStorage(
    'See https://page.test/private/123456?token=secret#x, then continue.',
    'origin-and-path'
  );
  assert.equal(
    text,
    'See https://page.test/private/:redacted, then continue.'
  );
});

test('applying the same policy twice is idempotent', () => {
  const first = sanitizeTrackingEventForStorage(
    createSensitiveEvent(),
    DEFAULT_DATA_PROTECTION_SETTINGS,
    1_000
  );
  const second = sanitizeTrackingEventForStorage(
    first.event,
    DEFAULT_DATA_PROTECTION_SETTINGS,
    2_000
  );

  assert.equal(second.changed, false);
  assert.deepEqual(second.event, first.event);
});

test('invalid settings fall back to the strict seven-day policy', () => {
  assert.deepEqual(
    normalizeDataProtectionSettings({
      urlRetentionMode: 'full-url',
      retentionDays: 365,
      rememberOpenRouterKey: 'yes',
      aiOutboundMode: 'raw-events',
    }),
    DEFAULT_DATA_PROTECTION_SETTINGS
  );
});

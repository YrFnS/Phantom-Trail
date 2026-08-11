import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTrackingEvent,
  resolveNetworkAttribution,
} from '../lib/event-attribution.mts';
import { mergeEventIntoList } from '../lib/event-storage-policy.mts';
import type { TrackingEvent } from '../lib/types.ts';

function createEvent(
  id: string,
  timestamp: number,
  pageUrl: string,
  resourceUrl = 'https://tracker.test/pixel'
): TrackingEvent {
  const context = resolveNetworkAttribution({
    requestUrl: resourceUrl,
    requestType: 'image',
    requestMethod: 'GET',
    documentUrl: pageUrl,
  });

  return {
    schemaVersion: 2,
    id,
    timestamp,
    url: resourceUrl,
    domain: 'tracker.test',
    trackerType: 'analytics',
    riskLevel: 'medium',
    description: 'fixture',
    context,
    detector: {
      id: 'fixture-detector',
      matchType: 'catalog-exact-domain',
      confidence: 'high',
      rule: 'tracker.test',
      evidence: ['fixture'],
    },
    occurrences: 1,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
  };
}

test('aggregates equivalent short-window events', () => {
  const first = mergeEventIntoList(
    [],
    createEvent('first', 1_000, 'https://page.test/one')
  );
  const second = mergeEventIntoList(
    first.events,
    createEvent('second', 1_250, 'https://page.test/one')
  );

  assert.equal(first.appended, true);
  assert.equal(second.appended, false);
  assert.equal(second.events.length, 1);
  assert.equal(second.events[0].occurrences, 2);
  assert.equal(second.events[0].firstSeenAt, 1_000);
  assert.equal(second.events[0].lastSeenAt, 1_250);
});

test('does not merge the same resource across different pages', () => {
  const first = mergeEventIntoList(
    [],
    createEvent('first', 1_000, 'https://one.test/')
  );
  const second = mergeEventIntoList(
    first.events,
    createEvent('second', 1_100, 'https://two.test/')
  );

  assert.equal(second.events.length, 2);
  assert.deepEqual(
    second.events.map(event => event.context?.pageDomain).sort(),
    ['one.test', 'two.test']
  );
});

test('does not merge events outside the short window', () => {
  const first = mergeEventIntoList(
    [],
    createEvent('first', 1_000, 'https://page.test/')
  );
  const second = mergeEventIntoList(
    first.events,
    createEvent('second', 7_000, 'https://page.test/')
  );

  assert.equal(second.events.length, 2);
});

test('enforces the bounded event-row cap', () => {
  let events: TrackingEvent[] = [];

  for (let index = 0; index < 4; index += 1) {
    events = mergeEventIntoList(
      events,
      createEvent(
        `event-${index}`,
        index * 10_000,
        `https://page-${index}.test/`
      ),
      5_000,
      3
    ).events;
  }

  assert.equal(events.length, 3);
  assert.deepEqual(
    events.map(event => event.id),
    ['event-1', 'event-2', 'event-3']
  );
});

test('legacy normalization does not invent a visited page', () => {
  const migrated = normalizeTrackingEvent({
    id: 'legacy',
    timestamp: 100,
    url: 'https://tracker.test/pixel',
    domain: 'tracker.test',
    trackerType: 'analytics',
    riskLevel: 'low',
    description: 'legacy fixture',
  });

  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.context?.source, 'legacy');
  assert.equal(migrated.context?.pageDomain, '');
  assert.equal(migrated.context?.resourceDomain, 'tracker.test');
  assert.equal(migrated.detector?.confidence, 'low');
});

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNetworkAttribution } from '../lib/event-attribution.mts';
import type { TrackingEvent } from '../lib/types.ts';

const values = new Map<string, unknown>();
const storageLocal = {
  async get(key: string | string[]): Promise<Record<string, unknown>> {
    const keys = Array.isArray(key) ? key : [key];
    return Object.fromEntries(
      keys.map(storageKey => [
        storageKey,
        structuredClone(values.get(storageKey)),
      ])
    );
  },
  async set(entries: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      values.set(key, structuredClone(value));
    }
  },
};

(globalThis as typeof globalThis & {
  chrome: { storage: { local: typeof storageLocal } };
}).chrome = { storage: { local: storageLocal } };

const { EventsStorage } = await import('../lib/storage/events-storage.ts');

beforeEach(async () => {
  values.clear();
  await EventsStorage.clearEvents();
});

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

test('aggregates equivalent short-window events', async () => {
  assert.equal(
    await EventsStorage.addEvent(
      createEvent('first', 1_000, 'https://page.test/one')
    ),
    true
  );
  assert.equal(
    await EventsStorage.addEvent(
      createEvent('second', 1_250, 'https://page.test/one')
    ),
    false
  );

  const stored = await EventsStorage.getTrackingEvents();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].occurrences, 2);
  assert.equal(stored[0].firstSeenAt, 1_000);
  assert.equal(stored[0].lastSeenAt, 1_250);
});

test('does not merge the same resource across different pages', async () => {
  await EventsStorage.addEvent(
    createEvent('first', 1_000, 'https://one.test/')
  );
  await EventsStorage.addEvent(
    createEvent('second', 1_100, 'https://two.test/')
  );

  const stored = await EventsStorage.getTrackingEvents();
  assert.equal(stored.length, 2);
  assert.deepEqual(
    stored.map(event => event.context?.pageDomain).sort(),
    ['one.test', 'two.test']
  );
});

test('does not merge events outside the short window', async () => {
  await EventsStorage.addEvent(
    createEvent('first', 1_000, 'https://page.test/')
  );
  await EventsStorage.addEvent(
    createEvent('second', 7_000, 'https://page.test/')
  );

  assert.equal((await EventsStorage.getTrackingEvents()).length, 2);
});

test('migrates legacy rows without inventing a visited page', async () => {
  values.set('phantom_trail_events', [
    {
      id: 'legacy',
      timestamp: 100,
      url: 'https://tracker.test/pixel',
      domain: 'tracker.test',
      trackerType: 'analytics',
      riskLevel: 'low',
      description: 'legacy fixture',
    },
  ]);

  const stored = await EventsStorage.getTrackingEvents();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].schemaVersion, 2);
  assert.equal(stored[0].context?.source, 'legacy');
  assert.equal(stored[0].context?.pageDomain, '');
  assert.equal(stored[0].context?.resourceDomain, 'tracker.test');
  assert.equal(stored[0].detector?.confidence, 'low');
});

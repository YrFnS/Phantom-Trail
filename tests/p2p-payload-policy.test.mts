import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getP2PGradeForScore,
  parseAnonymousPrivacyData,
} from '../lib/p2p-payload-policy.mts';
import {
  P2P_CONSENT_VERSION,
  P2P_PAYLOAD_VERSION,
} from '../lib/p2p-consent.mts';

const NOW = Date.UTC(2026, 7, 14, 12, 30, 0, 0);
const HOUR = Date.UTC(2026, 7, 14, 12, 0, 0, 0);

function validSample() {
  return {
    payloadVersion: P2P_PAYLOAD_VERSION,
    consentVersion: P2P_CONSENT_VERSION,
    privacyScore: 85,
    scoreStatus: 'estimated',
    scoreConfidence: 'medium',
    grade: 'B',
    trackerCount: 4,
    riskDistribution: { low: 25, medium: 50, high: 25, critical: 0 },
    websiteCategories: ['analytics', 'fingerprinting'],
    timestamp: HOUR,
  };
}

test('parses a valid sample into a fresh canonical object', () => {
  const source = validSample();
  const parsed = parseAnonymousPrivacyData(source, NOW);

  assert.ok(parsed);
  assert.notEqual(parsed, source);
  assert.deepEqual(parsed, source);
});

test('rejects scores outside the published range and inconsistent grades', () => {
  assert.equal(
    parseAnonymousPrivacyData({ ...validSample(), privacyScore: 1000 }, NOW),
    null
  );
  assert.equal(
    parseAnonymousPrivacyData({ ...validSample(), grade: 'A' }, NOW),
    null
  );
});

test('rejects malformed nested structures instead of throwing', () => {
  assert.doesNotThrow(() =>
    parseAnonymousPrivacyData(
      { ...validSample(), websiteCategories: null },
      NOW
    )
  );
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), riskDistribution: { low: 100 } },
      NOW
    ),
    null
  );
});

test('rejects stale, future, and unrounded timestamps', () => {
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), timestamp: NOW - 27 * 60 * 60 * 1000 },
      NOW
    ),
    null
  );
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), timestamp: NOW + 2 * 60 * 60 * 1000 },
      NOW
    ),
    null
  );
  assert.equal(
    parseAnonymousPrivacyData({ ...validSample(), timestamp: HOUR + 1 }, NOW),
    null
  );
});

test('rejects unknown fields, invalid categories, and oversized payloads', () => {
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), domain: 'private.test' },
      NOW
    ),
    null
  );
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), websiteCategories: ['not-a-category'] },
      NOW
    ),
    null
  );
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), websiteCategories: ['analytics', 'analytics'] },
      NOW
    ),
    null
  );
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), region: 'x'.repeat(3000) },
      NOW
    ),
    null
  );
});

test('does not throw when hostile objects reject reflection', () => {
  const prototypeHostile = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error('blocked');
      },
    }
  );
  const keyHostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('blocked');
      },
    }
  );

  for (const hostile of [prototypeHostile, keyHostile]) {
    assert.doesNotThrow(() => parseAnonymousPrivacyData(hostile, NOW));
    assert.equal(parseAnonymousPrivacyData(hostile, NOW), null);
  }
});

test('rejects accessors, symbols, and sparse category arrays', () => {
  const accessorSample = validSample() as Record<string, unknown>;
  Object.defineProperty(accessorSample, 'privacyScore', {
    enumerable: true,
    get() {
      throw new Error('must not execute');
    },
  });

  const symbolSample = validSample() as Record<PropertyKey, unknown>;
  symbolSample[Symbol('hidden')] = true;
  const sparse = new Array<string>(3);
  sparse[0] = 'analytics';
  sparse[2] = 'social';

  assert.doesNotThrow(() => parseAnonymousPrivacyData(accessorSample, NOW));
  assert.equal(parseAnonymousPrivacyData(accessorSample, NOW), null);
  assert.equal(parseAnonymousPrivacyData(symbolSample, NOW), null);
  assert.equal(
    parseAnonymousPrivacyData(
      { ...validSample(), websiteCategories: sparse },
      NOW
    ),
    null
  );
});

test('shared score bands are derived after rounding', () => {
  const roundedScore = Math.round(89 / 5) * 5;

  assert.equal(roundedScore, 90);
  assert.equal(getP2PGradeForScore(roundedScore), 'A');
});

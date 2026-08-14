import test from 'node:test';
import assert from 'node:assert/strict';
import { AnonymizationService } from '../lib/anonymization.mts';
import {
  acknowledgeP2PConsent,
  DEFAULT_P2P_SETTINGS,
  getP2POutboundPreview,
  hasCurrentP2PConsent,
  normalizeP2PSettings,
  P2P_CONSENT_VERSION,
  P2P_PAYLOAD_VERSION,
  P2P_ROOM_ID,
  P2P_STATS_ACTION,
} from '../lib/p2p-consent.mts';

test('legacy or unacknowledged P2P settings are forced off', () => {
  const normalized = normalizeP2PSettings({
    joinPrivacyNetwork: true,
    shareAnonymousData: true,
    shareRegionalData: true,
    maxConnections: 100,
  });

  assert.equal(hasCurrentP2PConsent(normalized), false);
  assert.equal(normalized.joinPrivacyNetwork, false);
  assert.equal(normalized.shareAnonymousData, false);
  assert.equal(normalized.shareRegionalData, false);
  assert.equal(normalized.maxConnections, 20);
});

test('acknowledging the current disclosure does not silently join or share', () => {
  const acknowledged = acknowledgeP2PConsent(DEFAULT_P2P_SETTINGS, true, 12345);

  assert.equal(hasCurrentP2PConsent(acknowledged), true);
  assert.equal(acknowledged.consentVersion, P2P_CONSENT_VERSION);
  assert.equal(acknowledged.consentAcknowledgedAt, 12345);
  assert.equal(acknowledged.joinPrivacyNetwork, false);
  assert.equal(acknowledged.shareAnonymousData, false);
});

test('revoking consent disables connection and sharing', () => {
  const consented = normalizeP2PSettings({
    ...DEFAULT_P2P_SETTINGS,
    joinPrivacyNetwork: true,
    shareAnonymousData: true,
    consentVersion: P2P_CONSENT_VERSION,
    consentAcknowledgedAt: 12345,
  });
  assert.equal(consented.joinPrivacyNetwork, true);
  assert.equal(consented.shareAnonymousData, true);

  const revoked = acknowledgeP2PConsent(consented, false);
  assert.equal(hasCurrentP2PConsent(revoked), false);
  assert.equal(revoked.joinPrivacyNetwork, false);
  assert.equal(revoked.shareAnonymousData, false);
  assert.equal(revoked.shareRegionalData, false);
});

test('Trystero transport identifiers stay within provider byte limits', () => {
  assert.ok(Buffer.byteLength(P2P_ROOM_ID, 'utf8') <= 20);
  assert.ok(Buffer.byteLength(P2P_STATS_ACTION, 'utf8') <= 12);
});

test('canonical preview exposes aggregate fields and excludes browsing labels', () => {
  const preview = getP2POutboundPreview();
  const serialized = JSON.stringify(preview.sample);

  assert.equal(preview.consentVersion, P2P_CONSENT_VERSION);
  assert.equal(preview.sample.payloadVersion, P2P_PAYLOAD_VERSION);
  assert.equal(preview.sample.consentVersion, P2P_CONSENT_VERSION);
  assert.equal(preview.sample.scoreStatus, 'estimated');
  assert.equal(serialized.includes('url'), false);
  assert.equal(serialized.includes('domain'), false);
  assert.equal(serialized.includes('description'), false);
  assert.ok(preview.excludedFields.some(field => field.includes('domain')));
  assert.ok(preview.connectionMetadataWarning.includes('IP addresses'));
});

test('local P2P payload stays canonical when rounding crosses a score band', () => {
  const settings = normalizeP2PSettings({
    ...DEFAULT_P2P_SETTINGS,
    joinPrivacyNetwork: true,
    shareAnonymousData: true,
    consentVersion: P2P_CONSENT_VERSION,
    consentAcknowledgedAt: Date.now(),
  });

  const sample = AnonymizationService.anonymizeForP2P(
    {
      averageScore: 89,
      scoreStatus: 'estimated',
      scoreConfidence: 'medium',
      grade: 'B',
      trackerCount: 3,
      events: [],
    },
    settings
  );

  assert.ok(sample);
  assert.equal(sample.privacyScore, 90);
  assert.equal(sample.grade, 'A');
  assert.equal(AnonymizationService.validateAnonymization(sample), true);
});

test('local P2P builder fails closed for invalid aggregate values', () => {
  const settings = normalizeP2PSettings({
    ...DEFAULT_P2P_SETTINGS,
    joinPrivacyNetwork: true,
    shareAnonymousData: true,
    consentVersion: P2P_CONSENT_VERSION,
    consentAcknowledgedAt: Date.now(),
  });

  const base = {
    averageScore: 80,
    scoreStatus: 'estimated' as const,
    scoreConfidence: 'medium' as const,
    grade: 'B' as const,
    trackerCount: 3,
    events: [],
  };

  assert.equal(
    AnonymizationService.anonymizeForP2P(
      { ...base, averageScore: Number.NaN },
      settings
    ),
    null
  );
  assert.equal(
    AnonymizationService.anonymizeForP2P(
      { ...base, averageScore: 101 },
      settings
    ),
    null
  );
  assert.equal(
    AnonymizationService.anonymizeForP2P(
      { ...base, trackerCount: Number.POSITIVE_INFINITY },
      settings
    ),
    null
  );
});

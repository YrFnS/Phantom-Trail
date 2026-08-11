import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeP2PConsent,
  DEFAULT_P2P_SETTINGS,
  getP2POutboundPreview,
  hasCurrentP2PConsent,
  normalizeP2PSettings,
  P2P_CONSENT_VERSION,
  P2P_PAYLOAD_VERSION,
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
  const acknowledged = acknowledgeP2PConsent(
    DEFAULT_P2P_SETTINGS,
    true,
    12345
  );

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

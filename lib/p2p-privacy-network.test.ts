/**
 * Compatibility tests for the P3 aggregate P2P transport and consent guardrails.
 */

import { P2PPrivacyNetwork } from '../lib/p2p-privacy-network';
import { AnonymizationService } from '../lib/anonymization.mts';
import {
  P2P_CONSENT_VERSION,
  P2P_PAYLOAD_VERSION,
} from '../lib/p2p-consent.mts';
import type { P2PSettings, PrivacyData } from '../lib/types';

const consentedSettings: P2PSettings = {
  joinPrivacyNetwork: true,
  shareAnonymousData: true,
  shareRegionalData: false,
  maxConnections: 10,
  consentVersion: P2P_CONSENT_VERSION,
  consentAcknowledgedAt: Date.now(),
};

(global as { chrome?: unknown }).chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ p2pSettings: consentedSettings }),
      set: jest.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    id: 'test-extension-id',
    onMessage: { addListener: jest.fn() },
  },
};

(global as { RTCPeerConnection?: unknown }).RTCPeerConnection = jest
  .fn()
  .mockImplementation(() => ({
    close: jest.fn(),
    iceConnectionState: 'connected',
    oniceconnectionstatechange: null,
  }));

describe('P2P Privacy Network', () => {
  let network: P2PPrivacyNetwork;

  beforeEach(() => {
    network = P2PPrivacyNetwork.getInstance();
  });

  test('should expose a numeric peer count', () => {
    expect(network.getConnectedPeerCount()).toBeGreaterThanOrEqual(0);
  });

  test('should expose a boolean active state', () => {
    expect(typeof network.isNetworkActive()).toBe('boolean');
  });

  test('should not provide domain reputation in P3', async () => {
    await expect(
      network.getDomainReputation('example.com')
    ).resolves.toBeNull();
  });
});

describe('Anonymization Service', () => {
  test('should build a versioned aggregate sample only with current consent', () => {
    const mockPrivacyData: PrivacyData = {
      averageScore: 87,
      scoreStatus: 'estimated',
      scoreConfidence: 'medium',
      grade: 'B',
      trackerCount: 23,
      events: [
        {
          id: '1',
          timestamp: Date.now(),
          url: 'https://page.test/',
          domain: 'resource.test',
          trackerType: 'advertising',
          riskLevel: 'medium',
          description: 'Minimized detector row',
        },
      ],
    };

    const anonymized = AnonymizationService.anonymizeForP2P(
      mockPrivacyData,
      consentedSettings
    );
    expect(anonymized).not.toBeNull();
    if (!anonymized) throw new Error('Expected a consented estimated sample');

    expect(anonymized.payloadVersion).toBe(P2P_PAYLOAD_VERSION);
    expect(anonymized.consentVersion).toBe(P2P_CONSENT_VERSION);
    expect(anonymized.privacyScore % 5).toBe(0);
    expect(anonymized.scoreStatus).toBe('estimated');
    expect(anonymized.scoreConfidence).toBe('medium');
    expect(anonymized.trackerCount).toBeLessThanOrEqual(50);
    expect(anonymized.websiteCategories.length).toBeLessThanOrEqual(3);
    expect(AnonymizationService.validateAnonymization(anonymized)).toBe(true);
    expect('url' in anonymized).toBe(false);
    expect('domain' in anonymized).toBe(false);
    expect('events' in anonymized).toBe(false);
  });

  test('should refuse missing consent and insufficient evidence', () => {
    const unknownData: PrivacyData = {
      averageScore: null,
      scoreStatus: 'insufficient-evidence',
      scoreConfidence: 'none',
      grade: 'N/A',
      trackerCount: 0,
      events: [],
    };

    expect(
      AnonymizationService.anonymizeForP2P(unknownData, consentedSettings)
    ).toBeNull();
    expect(
      AnonymizationService.anonymizeForP2P(
        {
          ...unknownData,
          averageScore: 90,
          scoreStatus: 'estimated',
          scoreConfidence: 'low',
          grade: 'A',
        },
        { ...consentedSettings, consentVersion: undefined }
      )
    ).toBeNull();
  });

  test('should reject legacy or unversioned peer samples', () => {
    const validData = {
      payloadVersion: P2P_PAYLOAD_VERSION,
      consentVersion: P2P_CONSENT_VERSION,
      privacyScore: 85,
      scoreStatus: 'estimated' as const,
      scoreConfidence: 'medium' as const,
      grade: 'B',
      trackerCount: 25,
      riskDistribution: { low: 10, medium: 20, high: 5, critical: 0 },
      websiteCategories: ['advertising', 'analytics'],
      timestamp: (() => {
        const value = new Date();
        value.setMinutes(0, 0, 0);
        return value.getTime();
      })(),
    };

    expect(AnonymizationService.validateAnonymization(validData)).toBe(true);
    expect(
      AnonymizationService.validateAnonymization({
        ...validData,
        payloadVersion: undefined,
      })
    ).toBe(false);
  });
});

export {};

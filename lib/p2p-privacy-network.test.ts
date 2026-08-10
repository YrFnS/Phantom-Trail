/**
 * Compatibility tests for the experimental P2P transport and score
 * anonymization guardrails.
 */

import { P2PPrivacyNetwork } from '../lib/p2p-privacy-network';
import { AnonymizationService } from '../lib/anonymization';
import type { PrivacyData } from '../lib/types';

(global as { chrome?: unknown }).chrome = {
  storage: {
    local: {
      get: jest
        .fn()
        .mockResolvedValue({ p2pSettings: { joinPrivacyNetwork: true } }),
      set: jest.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
  runtime: {
    id: 'test-extension-id',
    onMessage: { addListener: jest.fn() },
  },
};

(global as { RTCPeerConnection?: unknown }).RTCPeerConnection = jest
  .fn()
  .mockImplementation(() => ({
    createDataChannel: jest.fn().mockReturnValue({
      readyState: 'open',
      send: jest.fn(),
      close: jest.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
    }),
    close: jest.fn(),
    iceConnectionState: 'connected',
    oniceconnectionstatechange: null,
  }));

describe('P2P Privacy Network', () => {
  let network: P2PPrivacyNetwork;

  beforeEach(() => {
    network = P2PPrivacyNetwork.getInstance();
  });

  test('should initialize network', async () => {
    await network.initializeNetwork();
    expect(network.getNetworkStatus()).toContain('Searching for peers');
  });

  test('should get connected peer count', () => {
    const count = network.getConnectedPeerCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should check if network is active', () => {
    expect(typeof network.isNetworkActive()).toBe('boolean');
  });
});

describe('Anonymization Service', () => {
  test('should anonymize an estimated evidence-index sample', () => {
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
          url: 'https://example.com',
          domain: 'example.com',
          trackerType: 'advertising',
          riskLevel: 'medium',
          description: 'Test detector row',
        },
      ],
    };

    const anonymized = AnonymizationService.anonymizeForP2P(mockPrivacyData);
    expect(anonymized).not.toBeNull();
    if (!anonymized) throw new Error('Expected an estimated sample');

    expect(anonymized.privacyScore % 5).toBe(0);
    expect(anonymized.scoreStatus).toBe('estimated');
    expect(anonymized.scoreConfidence).toBe('medium');
    expect(anonymized.trackerCount).toBeLessThanOrEqual(50);
    expect(anonymized.websiteCategories.length).toBeLessThanOrEqual(3);
    expect(AnonymizationService.validateAnonymization(anonymized)).toBe(true);
  });

  test('should refuse to convert insufficient evidence into zero', () => {
    const unknownData: PrivacyData = {
      averageScore: null,
      scoreStatus: 'insufficient-evidence',
      scoreConfidence: 'none',
      grade: 'N/A',
      trackerCount: 0,
      events: [],
    };

    expect(AnonymizationService.anonymizeForP2P(unknownData)).toBeNull();
  });

  test('should validate only estimated P2 samples', () => {
    const validData = {
      privacyScore: 85,
      scoreStatus: 'estimated' as const,
      scoreConfidence: 'medium' as const,
      grade: 'B',
      trackerCount: 25,
      riskDistribution: { low: 10, medium: 20, high: 5, critical: 0 },
      websiteCategories: ['advertising', 'analytics'],
      timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(),
    };

    expect(AnonymizationService.validateAnonymization(validData)).toBe(true);
    expect(
      AnonymizationService.validateAnonymization({
        ...validData,
        privacyScore: 87,
      })
    ).toBe(false);
    expect(
      AnonymizationService.validateAnonymization({
        ...validData,
        scoreStatus: undefined,
      })
    ).toBe(false);
  });
});

export {};

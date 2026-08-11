import type {
  AnonymousPrivacyData,
  P2PSettings,
  RiskLevel,
} from './types.ts';

export const P2P_CONSENT_VERSION = 1;
export const P2P_PAYLOAD_VERSION = 1 as const;
/** Firebase signalling room IDs used by Trystero must not exceed 20 bytes. */
export const P2P_ROOM_ID = 'aggregate-v3';
/** Trystero action names must not exceed 12 UTF-8 bytes. */
export const P2P_STATS_ACTION = 'stats_v3';

export const DEFAULT_P2P_SETTINGS: P2PSettings = {
  joinPrivacyNetwork: false,
  shareAnonymousData: false,
  shareRegionalData: false,
  maxConnections: 10,
  autoReconnect: true,
};

export function hasCurrentP2PConsent(settings: P2PSettings): boolean {
  return (
    settings.consentVersion === P2P_CONSENT_VERSION &&
    typeof settings.consentAcknowledgedAt === 'number' &&
    Number.isFinite(settings.consentAcknowledgedAt) &&
    settings.consentAcknowledgedAt > 0
  );
}

export function normalizeP2PSettings(value: unknown): P2PSettings {
  const candidate =
    value && typeof value === 'object' ? (value as Partial<P2PSettings>) : {};
  const normalized: P2PSettings = {
    joinPrivacyNetwork: candidate.joinPrivacyNetwork === true,
    shareAnonymousData: candidate.shareAnonymousData === true,
    shareRegionalData: candidate.shareRegionalData === true,
    maxConnections: Math.max(
      1,
      Math.min(20, Number(candidate.maxConnections) || 10)
    ),
    autoReconnect: candidate.autoReconnect !== false,
    consentVersion: candidate.consentVersion,
    consentAcknowledgedAt: candidate.consentAcknowledgedAt,
  };

  if (!hasCurrentP2PConsent(normalized)) {
    normalized.joinPrivacyNetwork = false;
    normalized.shareAnonymousData = false;
    normalized.shareRegionalData = false;
    delete normalized.consentVersion;
    delete normalized.consentAcknowledgedAt;
  }

  if (!normalized.joinPrivacyNetwork) {
    normalized.shareAnonymousData = false;
    normalized.shareRegionalData = false;
  }

  if (!normalized.shareAnonymousData) {
    normalized.shareRegionalData = false;
  }

  return normalized;
}

export function acknowledgeP2PConsent(
  settings: P2PSettings,
  acknowledged: boolean,
  now = Date.now()
): P2PSettings {
  if (!acknowledged) {
    return {
      ...settings,
      joinPrivacyNetwork: false,
      shareAnonymousData: false,
      shareRegionalData: false,
      consentVersion: undefined,
      consentAcknowledgedAt: undefined,
    };
  }

  return normalizeP2PSettings({
    ...settings,
    consentVersion: P2P_CONSENT_VERSION,
    consentAcknowledgedAt: now,
  });
}

export interface P2POutboundPreview {
  destination: 'unauthenticated Trystero peers';
  consentVersion: number;
  includedFields: string[];
  excludedFields: string[];
  sample: AnonymousPrivacyData;
  connectionMetadataWarning: string;
}

export function getP2POutboundPreview(): P2POutboundPreview {
  const sampleDistribution: Record<RiskLevel, number> = {
    low: 50,
    medium: 50,
    high: 0,
    critical: 0,
  };

  return {
    destination: 'unauthenticated Trystero peers',
    consentVersion: P2P_CONSENT_VERSION,
    includedFields: [
      'payload and consent version',
      'rounded estimated evidence index and model band',
      'evidence-coverage confidence',
      'capped qualifying evidence-unit count',
      'prototype severity distribution percentages',
      'up to three prototype category labels',
      'timestamp rounded to the hour',
      'optional coarse region only when separately enabled',
    ],
    excludedFields: [
      'page and resource URLs',
      'paths, query strings, fragments, and URL credentials',
      'page and resource domain labels',
      'descriptions and detector evidence',
      'raw events and API details',
      'OpenRouter credentials and storage keys',
      'personal annotations and browsing-history lists',
    ],
    sample: {
      payloadVersion: P2P_PAYLOAD_VERSION,
      consentVersion: P2P_CONSENT_VERSION,
      privacyScore: 95,
      scoreStatus: 'estimated',
      scoreConfidence: 'low',
      grade: 'A',
      trackerCount: 2,
      riskDistribution: sampleDistribution,
      websiteCategories: ['analytics'],
      timestamp: 0,
    },
    connectionMetadataWarning:
      'WebRTC and signalling or relay infrastructure can expose ordinary connection metadata, including IP addresses, to peers and providers.',
  };
}

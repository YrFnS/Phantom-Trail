/**
 * Core types for Phantom Trail extension
 */

export type DetectionSource =
  | 'network-request'
  | 'dom-resource'
  | 'main-world-api'
  | 'user-interaction'
  | 'extension-internal'
  | 'legacy';

export type DetectionConfidence = 'low' | 'medium' | 'high';

export type PartyRelationship = 'first-party' | 'third-party' | 'unknown';

export type PartyBasis =
  | 'same-host'
  | 'subdomain'
  | 'same-site-heuristic'
  | 'different-site-heuristic'
  | 'missing-context';

export type AttributionBasis =
  | 'main-frame'
  | 'document-url'
  | 'initiator'
  | 'tab-url'
  | 'content-script'
  | 'legacy'
  | 'unknown';

export type DetectorMatchType =
  | 'catalog-exact-domain'
  | 'catalog-subdomain'
  | 'path-pattern'
  | 'url-heuristic'
  | 'dom-url-token'
  | 'api-threshold'
  | 'user-interaction'
  | 'internal'
  | 'legacy';

export type UrlRetentionMode = 'origin-only' | 'origin-and-path';
export type AIOutboundMode = 'counts-only' | 'include-domain-labels';

export interface DataProtectionSettings {
  schemaVersion: 1;
  urlRetentionMode: UrlRetentionMode;
  retentionDays: 1 | 7 | 14 | 30;
  rememberOpenRouterKey: boolean;
  aiOutboundMode: AIOutboundMode;
}

export interface TrackingEventDataProtection {
  policyVersion: 1;
  urlRetentionMode: UrlRetentionMode;
  sanitizedAt: number;
  queryStripped: boolean;
  fragmentStripped: boolean;
  credentialsStripped: boolean;
  pathSegmentsRedacted: number;
  rawDetailsRemoved: boolean;
}

export interface TrackingEventContext {
  source: DetectionSource;
  pageUrl: string;
  pageDomain: string;
  resourceUrl?: string;
  resourceDomain?: string;
  initiator?: string;
  tabId?: number;
  frameId?: number;
  parentFrameId?: number;
  requestId?: string;
  requestType?: string;
  requestMethod?: string;
  party: PartyRelationship;
  partyBasis: PartyBasis;
  partyConfidence: DetectionConfidence;
  attributionBasis: AttributionBasis;
  attributionConfidence: DetectionConfidence;
}

export interface DetectorEvidence {
  id: string;
  matchType: DetectorMatchType;
  confidence: DetectionConfidence;
  rule?: string;
  evidence: string[];
}

export interface TrackingEvent {
  /** P1 events use schema version 2. Missing means a legacy pre-P1 event. */
  schemaVersion?: 1 | 2;
  id: string;
  timestamp: number;
  /**
   * Compatibility alias retained for existing consumers and exports.
   * Network/DOM events use the resource URL; in-page events use the page URL.
   */
  url: string;
  /**
   * Compatibility alias retained for existing consumers and exports.
   * Network/DOM events use the resource domain; in-page events use the page domain.
   */
  domain: string;
  trackerType: TrackerType;
  riskLevel: RiskLevel;
  description: string;
  context?: TrackingEventContext;
  detector?: DetectorEvidence;
  occurrences?: number;
  firstSeenAt?: number;
  lastSeenAt?: number;
  privacyScore?: number;
  dataProtection?: TrackingEventDataProtection;
  inPageTracking?: {
    method: InPageTrackingMethod;
    details: string;
    apiCalls?: string[];
    frequency?: number;
  };
}

export interface TrackerInfo {
  domain: string;
  name: string;
  category: TrackerCategory;
  description: string;
  riskLevel: RiskLevel;
}

export interface TrackerMatch {
  tracker: TrackerInfo;
  detectorId: string;
  matchType: DetectorMatchType;
  rule: string;
  confidence: DetectionConfidence;
  evidence: string[];
}

export interface AIAnalysis {
  narrative: string;
  riskAssessment: RiskLevel;
  recommendations: string[];
  confidence: number;
}

export type TrackerType =
  | 'advertising'
  | 'analytics'
  | 'social'
  | 'fingerprinting'
  | 'cryptomining'
  | 'unknown';

export type TrackerCategory =
  | 'Advertising'
  | 'Analytics'
  | 'Social Media'
  | 'Fingerprinting'
  | 'Cryptomining'
  | 'CDN'
  | 'Unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type InPageTrackingMethod =
  | 'canvas-fingerprint'
  | 'storage-access'
  | 'mouse-tracking'
  | 'form-monitoring'
  | 'device-api'
  | 'clipboard-access'
  | 'webrtc-leak'
  | 'font-fingerprint'
  | 'audio-fingerprint'
  | 'webgl-fingerprint'
  | 'battery-api'
  | 'sensor-api';

export interface ExtensionSettings {
  /** @deprecated P3 migrates this value to dedicated credential storage. */
  openRouterApiKey?: string;
  enableAI: boolean;
  enableNotifications: boolean;
  riskThreshold: RiskLevel;
  aiModel?: string;
  notifications?: NotificationSettings;
  enablePrivacyPredictions?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  criticalOnly: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  quietHours: { start: string; end: string };
}

export type EvidenceScoreStatus = 'insufficient-evidence' | 'estimated';
export type EvidenceCoverageConfidence = 'none' | 'low' | 'medium' | 'high';
export type EvidenceScoreBand = 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
export type EvidenceScoreColor =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'gray';
export type EvidenceScoreScopeType = 'dataset' | 'page';

export type EvidenceExclusionReason =
  | 'legacy-event'
  | 'missing-page-attribution'
  | 'page-scope-mismatch'
  | 'unsupported-source'
  | 'first-party-resource'
  | 'unknown-party'
  | 'missing-resource-domain'
  | 'low-detector-confidence'
  | 'low-attribution-confidence'
  | 'low-party-confidence';

export interface EvidenceScoreScope {
  type: EvidenceScoreScopeType;
  pageDomain?: string;
}

export interface EvidenceScoreContribution {
  id: string;
  kind: 'third-party-resource' | 'page-api';
  pageDomain: string;
  resourceDomain?: string;
  source: DetectionSource;
  party: PartyRelationship;
  detectorIds: string[];
  detectorRules: string[];
  evidence: string[];
  riskLevel: RiskLevel;
  eventRows: number;
  occurrences: number;
  rawPenalty: number;
  appliedPenalty: number;
  highQuality: boolean;
}

export interface EvidenceScoreBreakdown {
  /** Compatibility field: number of score-qualified stored rows. */
  totalTrackers: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  criticalRisk: number;
  /** Compatibility fields retained as explicit false values in P2. */
  httpsBonus: false;
  excessiveTrackingPenalty: false;
  observedRows: number;
  observedOccurrences: number;
  qualifyingRows: number;
  qualifyingOccurrences: number;
  excludedRows: number;
  excludedByReason: Record<EvidenceExclusionReason, number>;
  uniqueThirdPartyParties: number;
  pageApiUnits: number;
  evidenceUnits: number;
  highQualityUnits: number;
  rawPenalty: number;
  appliedPenalty: number;
  contributions: EvidenceScoreContribution[];
}

export interface PrivacyScore {
  status: EvidenceScoreStatus;
  score: number | null;
  grade: EvidenceScoreBand;
  color: EvidenceScoreColor;
  confidence: EvidenceCoverageConfidence;
  scope: EvidenceScoreScope;
  breakdown: EvidenceScoreBreakdown;
  recommendations: string[];
}

export interface UserTrustedSite {
  domain: string;
  addedAt: number;
  reason?: string;
  allowedMethods?: InPageTrackingMethod[];
  temporary?: boolean;
}

export interface SecurityContext {
  isLoginPage: boolean;
  isBankingPage: boolean;
  isPaymentPage: boolean;
  hasPasswordField: boolean;
  hasAuthKeywords: boolean;
  confidence: 'low' | 'medium' | 'high';
}

export interface TrendData {
  date: string;
  privacyScore: number | null;
  scoreStatus?: EvidenceScoreStatus;
  scoreConfidence?: EvidenceCoverageConfidence;
  trackingEvents: number;
  riskDistribution: Record<RiskLevel, number>;
  topTrackers: string[];
}

export interface DailySnapshot {
  date: string;
  privacyScore: number | null;
  scoreStatus?: EvidenceScoreStatus;
  scoreConfidence?: EvidenceCoverageConfidence;
  eventCounts: {
    total: number;
    byRisk: Record<RiskLevel, number>;
    byType: Record<TrackerType, number>;
  };
  topDomains: Array<{ domain: string; count: number }>;
}

export interface WeeklyReport {
  weekStart: string;
  averageScore: number | null;
  scoreChange: number | null;
  newTrackers: string[];
  improvedSites: string[];
  riskySites: string[];
}

export interface Anomaly {
  date: string;
  type: 'score_drop' | 'tracking_spike' | 'new_tracker';
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: number;
  baseline: number;
}

export interface ComparisonData {
  categoryComparison: {
    percentile: number;
    betterThanAverage: boolean;
    insight: string;
  };
  userComparison?: {
    percentile: number;
    betterThanUsual: boolean;
    insight: string;
  };
  trustLevel: 'high' | 'medium' | 'low';
}

// P2P Privacy Sharing Types
export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  region?: string;
  lastSeen: number;
  isActive: boolean;
}

export interface NetworkMessage {
  type: 'privacy_data' | 'stats_request' | 'peer_discovery';
  data: AnonymousPrivacyData | CommunityStats;
  timestamp: number;
  sender: string;
}

export interface AnonymousPrivacyData {
  payloadVersion?: 1;
  consentVersion?: number;
  /** P2P samples may only contain an estimated numeric result. */
  privacyScore: number;
  scoreStatus?: 'estimated';
  scoreConfidence?: Exclude<EvidenceCoverageConfidence, 'none'>;
  grade: Exclude<EvidenceScoreBand, 'N/A'> | string;
  trackerCount: number;
  riskDistribution: Record<RiskLevel, number>;
  websiteCategories: string[];
  timestamp: number;
  region?: string;
}

export interface CommunityStats {
  connectedPeers: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  regionalData: Record<string, RegionalStats>;
  lastUpdated: number;
  dataFreshness: number;
}

export interface RegionalStats {
  averageScore: number;
  peerCount: number;
  topTrackers: string[];
  riskDistribution: Record<RiskLevel, number>;
}

export interface CommunityComparison {
  userScore: number;
  networkAverage: number;
  percentile: number;
  betterThan: number;
  recommendations: P2PRecommendation[];
}

export interface P2PRecommendation {
  type: 'tool' | 'setting' | 'behavior';
  title: string;
  description: string;
  adoptionRate: number;
  impact: 'low' | 'medium' | 'high';
}

export interface P2PSettings {
  joinPrivacyNetwork: boolean;
  shareAnonymousData: boolean;
  shareRegionalData: boolean;
  maxConnections: number;
  autoReconnect: boolean;
  consentVersion?: number;
  consentAcknowledgedAt?: number;
}

export interface PrivacyData {
  averageScore: number | null;
  scoreStatus?: EvidenceScoreStatus;
  scoreConfidence?: EvidenceCoverageConfidence;
  grade: EvidenceScoreBand;
  trackerCount: number;
  events?: TrackingEvent[];
}
